from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError

from app.core import security
from app.core.config import settings
from app.schemas import user as user_schema

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login/access-token")

# Pre-seeded recruiter accounts (in-memory, no database needed)
# In production, these would come from a database
fake_users_db = {
    "recruiter@company.com": {
        "id": 1,
        "email": "recruiter@company.com",
        "full_name": "Demo Recruiter",
        "role": "recruiter",
        "hashed_password": security.get_password_hash("recruiter123"),
    },
    "hr@techcorp.com": {
        "id": 2,
        "email": "hr@techcorp.com",
        "full_name": "HR Manager",
        "role": "recruiter",
        "hashed_password": security.get_password_hash("hr123456"),
    },
}


def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = fake_users_db.get(email)
    if user is None:
        raise credentials_exception
    return user

@router.post("/login/access-token", response_model=user_schema.Token)
def login_access_token(
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.

    Pre-seeded accounts:
    - recruiter@company.com / recruiter123
    - hr@techcorp.com / hr123456
    """
    user = fake_users_db.get(form_data.username)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    if not security.verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            subject=user["email"], expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }


@router.get("/me", response_model=user_schema.User)
def get_me(current_user: dict = Depends(get_current_user)) -> Any:
    """
    Get current user info from token
    """
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "role": current_user["role"],
    }

@router.post("/register", response_model=user_schema.User)
def register_user(
    *,
    user_in: user_schema.UserCreate,
) -> Any:
    """
    Create new recruiter account.
    Note: Candidates don't need accounts - they access interviews via unique links.
    """
    if user_in.email in fake_users_db:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system",
        )

    user_data = user_in.model_dump()
    hashed_password = security.get_password_hash(user_data["password"])
    del user_data["password"]
    user_data["hashed_password"] = hashed_password
    user_data["id"] = len(fake_users_db) + 1
    user_data["role"] = "recruiter"  # All registered users are recruiters

    fake_users_db[user_in.email] = user_data

    return user_data

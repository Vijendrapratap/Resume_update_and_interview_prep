import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            if (token) {
                try {
                    const userData = await api.get('/auth/me');
                    setUser(userData);
                } catch (error) {
                    // Token is invalid, clear it
                    console.error('Token validation failed:', error);
                    localStorage.removeItem('token');
                    setToken(null);
                    setUser(null);
                }
            }
            setLoading(false);
        };
        fetchUser();
    }, [token]);

    const login = async (email, password) => {
        try {
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);

            const response = await api.post('/auth/login/access-token', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const { access_token } = response;
            localStorage.setItem('token', access_token);
            setToken(access_token);

            // Fetch user info from /auth/me
            const userData = await api.get('/auth/me', {
                headers: { Authorization: `Bearer ${access_token}` }
            });
            setUser(userData);

            toast.success('Login successful!');
            navigate('/dashboard');
        } catch (error) {
            console.error('Login error:', error);
            toast.error(error.response?.data?.detail || 'Login failed');
            throw error;
        }
    };

    const register = async (userData) => {
        try {
            await api.post('/auth/register', userData);
            toast.success('Registration successful! Please login.');
            navigate('/login');
        } catch (error) {
            console.error('Registration error:', error);
            toast.error(error.response?.data?.detail || 'Registration failed');
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        navigate('/login');
        toast.success('Logged out successfully');
    };

    const value = {
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!token
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

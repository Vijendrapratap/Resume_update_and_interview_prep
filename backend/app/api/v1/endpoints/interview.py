"""
Interview Session Endpoints
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Optional
import uuid
import logging
from datetime import datetime

from app.schemas.interview import (
    InterviewStartRequest,
    InterviewStartResponse,
    InterviewQuestionResponse,
    InterviewResponseRequest,
    InterviewResponseResult,
    InterviewEndResponse,
    InterviewSession
)
from app.services.interview.engine import InterviewEngine
from app.services.tts.service import TTSService
from app.services.analytics.behavioral import BehavioralAnalytics
from app.api.v1.endpoints.resume import resume_storage
from app.api.v1.endpoints.analysis import analysis_storage

# Initialize behavioral analytics
behavioral_analyzer = BehavioralAnalytics()

router = APIRouter()
logger = logging.getLogger(__name__)

# Store interview sessions (replace with database in production)
interview_sessions = {}


@router.post("/start", response_model=InterviewStartResponse)
async def start_interview(request: InterviewStartRequest):
    """
    Start a new interview session.

    Parameters:
    - resume_id: ID of the uploaded resume
    - job_description: Optional JD for targeted questions
    - interview_type: screening, technical, behavioral, comprehensive
    - num_questions: Number of questions (5-10)
    - mode: text or voice
    """
    # Validate resume exists
    if request.resume_id not in resume_storage:
        raise HTTPException(status_code=404, detail="Resume not found")

    resume_data = resume_storage[request.resume_id]

    # Get analysis if available
    analysis_id = resume_data.get("analysis_id")
    analysis_data = analysis_storage.get(analysis_id, {}).get("result", {})

    try:
        # Create interview session
        session_id = str(uuid.uuid4())
        engine = InterviewEngine()

        # Initialize interview
        init_result = await engine.initialize_interview(
            resume_text=resume_data["text_content"],
            job_description=request.job_description,
            resume_analysis=analysis_data,
            interview_type=request.interview_type,
            num_questions=request.num_questions,
            difficulty=request.difficulty
        )

        # Store session
        interview_sessions[session_id] = {
            "id": session_id,
            "resume_id": request.resume_id,
            "job_description": request.job_description,
            "interview_type": request.interview_type,
            "mode": request.mode,
            "num_questions": request.num_questions,
            "difficulty": request.difficulty,
            "current_question_index": 0,
            "questions": [],
            "responses": [],
            "evaluations": [],
            "status": "in_progress",
            "started_at": datetime.utcnow().isoformat(),
            "engine": engine,
            "intro_message": init_result.get("intro_message", "")
        }

        # Generate first question
        first_question = await engine.generate_next_question(
            previous_questions=[],
            previous_responses=[],
            covered_topics=[]
        )

        interview_sessions[session_id]["questions"].append(first_question)

        return InterviewStartResponse(
            session_id=session_id,
            status="started",
            intro_message=init_result.get("intro_message", ""),
            first_question=InterviewQuestionResponse(
                question_number=1,
                total_questions=request.num_questions,
                question=first_question.get("question", ""),
                question_type=first_question.get("question_type", ""),
                topic=first_question.get("topic", "")
            )
        )

    except Exception as e:
        logger.error(f"Error starting interview: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error starting interview: {str(e)}"
        )


@router.post("/respond", response_model=InterviewResponseResult)
async def submit_response(request: InterviewResponseRequest):
    """
    Submit a text response to the current question.

    Implements a state machine for dynamic follow-up questions:
    - Evaluates answer depth
    - If shallow/vague, generates contextual follow-up (doesn't count toward question limit)
    - If adequate, moves to next topic
    """
    session = interview_sessions.get(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if session["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Interview is not in progress")

    try:
        engine: InterviewEngine = session["engine"]

        # Get current question
        current_q_index = session["current_question_index"]
        current_question = session["questions"][current_q_index]
        is_follow_up = current_question.get("is_follow_up", False)

        # Evaluate answer depth first (quick check)
        depth_evaluation = await engine.evaluate_answer_depth(
            question=current_question,
            response=request.response
        )

        # Full evaluation of response
        evaluation = await engine.evaluate_response(
            question=current_question,
            response=request.response,
            resume_text=resume_storage[session["resume_id"]]["text_content"]
        )

        # Behavioral analytics on the response
        behavioral_analysis = behavioral_analyzer.analyze_response(request.response)

        # Add behavioral metrics to evaluation
        evaluation["behavioral_analytics"] = {
            "filler_word_count": behavioral_analysis.filler_word_count,
            "filler_word_rate": behavioral_analysis.filler_word_rate,
            "confidence_score": behavioral_analysis.confidence_score,
            "clarity_score": behavioral_analysis.clarity_score,
            "vocabulary_diversity": behavioral_analysis.vocabulary_diversity,
            "sentiment": behavioral_analysis.sentiment,
            "red_flags": behavioral_analysis.red_flags
        }

        # Store response and evaluation
        session["responses"].append(request.response)
        session["evaluations"].append(evaluation)

        # Store behavioral analyses for session-level reporting
        if "behavioral_analyses" not in session:
            session["behavioral_analyses"] = []
        session["behavioral_analyses"].append(behavioral_analysis)

        # Track follow-up count to prevent infinite loops (max 1 follow-up per main question)
        follow_up_count = session.get("current_follow_up_count", 0)
        max_follow_ups = 1  # Allow 1 follow-up per main question

        # Determine if we should ask a follow-up
        # Conditions: (depth is shallow OR LLM recommends follow-up) AND we haven't hit follow-up limit
        should_follow_up = (
            (depth_evaluation.get("needs_follow_up", False) or evaluation.get("follow_up_recommended", False))
            and follow_up_count < max_follow_ups
            and not is_follow_up  # Don't follow-up on a follow-up
        )

        # Check if interview would be complete (only count main questions, not follow-ups)
        main_question_count = len([q for q in session["questions"] if not q.get("is_follow_up", False)])

        if not should_follow_up and main_question_count >= session["num_questions"]:
            session["status"] = "completed"
            session["ended_at"] = datetime.utcnow().isoformat()

            return InterviewResponseResult(
                session_id=request.session_id,
                evaluation_summary=evaluation.get("feedback", ""),
                scores=evaluation.get("scores", {}),
                is_complete=True,
                next_question=None
            )

        if should_follow_up:
            # Generate contextual follow-up question
            follow_up_reason = depth_evaluation.get("reason", "") or evaluation.get("follow_up_question", "")

            # Use LLM-generated follow-up if available, otherwise generate one
            if evaluation.get("follow_up_question"):
                follow_up_question = {
                    "question": evaluation["follow_up_question"],
                    "question_type": "follow_up",
                    "topic": current_question.get("topic", "clarification"),
                    "is_follow_up": True,
                    "parent_question": current_question.get("question", "")
                }
            else:
                follow_up_question = await engine.generate_follow_up(
                    original_question=current_question,
                    response=request.response,
                    reason=follow_up_reason
                )

            session["questions"].append(follow_up_question)
            session["current_question_index"] += 1
            session["current_follow_up_count"] = follow_up_count + 1

            # For follow-ups, show same question number (they're part of the same "question")
            display_q_num = main_question_count

            return InterviewResponseResult(
                session_id=request.session_id,
                evaluation_summary=f"Let me dig a bit deeper... {depth_evaluation.get('reason', '')}",
                scores=evaluation.get("scores", {}),
                is_complete=False,
                next_question=InterviewQuestionResponse(
                    question_number=display_q_num,
                    total_questions=session["num_questions"],
                    question=follow_up_question.get("question", ""),
                    question_type="follow_up",
                    topic=follow_up_question.get("topic", "clarification")
                )
            )

        # Reset follow-up counter for next main question
        session["current_follow_up_count"] = 0

        # Generate next main question
        next_question = await engine.generate_next_question(
            previous_questions=session["questions"],
            previous_responses=session["responses"],
            covered_topics=[q.get("topic") for q in session["questions"] if not q.get("is_follow_up")]
        )

        session["questions"].append(next_question)
        session["current_question_index"] += 1

        # Count main questions for display
        new_main_count = len([q for q in session["questions"] if not q.get("is_follow_up", False)])

        return InterviewResponseResult(
            session_id=request.session_id,
            evaluation_summary=evaluation.get("feedback", ""),
            scores=evaluation.get("scores", {}),
            is_complete=False,
            next_question=InterviewQuestionResponse(
                question_number=new_main_count,
                total_questions=session["num_questions"],
                question=next_question.get("question", ""),
                question_type=next_question.get("question_type", ""),
                topic=next_question.get("topic", "")
            )
        )

    except Exception as e:
        logger.error(f"Error processing response: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing response: {str(e)}"
        )


@router.post("/respond/audio")
async def submit_audio_response(
    session_id: str,
    audio: UploadFile = File(...)
):
    """
    Submit an audio response to the current question.
    Audio will be transcribed before evaluation.
    """
    session = interview_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if session["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Interview is not in progress")

    try:
        # Save audio file temporarily
        audio_content = await audio.read()

        # Transcribe audio
        tts_service = TTSService()
        transcription = await tts_service.transcribe_audio(audio_content)

        # Process as text response
        return await submit_response(
            InterviewResponseRequest(
                session_id=session_id,
                response=transcription
            )
        )

    except Exception as e:
        logger.error(f"Error processing audio response: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing audio response: {str(e)}"
        )


@router.get("/question/{session_id}", response_model=InterviewQuestionResponse)
async def get_current_question(session_id: str):
    """Get the current question for an interview session"""
    session = interview_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    current_q_index = session["current_question_index"]
    if current_q_index >= len(session["questions"]):
        raise HTTPException(status_code=400, detail="No more questions")

    current_question = session["questions"][current_q_index]

    return InterviewQuestionResponse(
        question_number=current_q_index + 1,
        total_questions=session["num_questions"],
        question=current_question.get("question", ""),
        question_type=current_question.get("question_type", ""),
        topic=current_question.get("topic", "")
    )


@router.post("/end/{session_id}", response_model=InterviewEndResponse)
async def end_interview(session_id: str):
    """End an interview session early"""
    session = interview_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    session["status"] = "completed"
    session["ended_at"] = datetime.utcnow().isoformat()

    # Calculate aggregate scores
    all_evaluations = session["evaluations"]
    aggregate_scores = calculate_aggregate_scores(all_evaluations)

    # Calculate aggregate behavioral analytics
    if session.get("responses"):
        behavioral_summary = behavioral_analyzer.analyze_interview_session(
            responses=session["responses"]
        )
        session["behavioral_summary"] = behavioral_summary

    return InterviewEndResponse(
        session_id=session_id,
        status="completed",
        questions_answered=len(session["responses"]),
        total_questions=session["num_questions"],
        aggregate_scores=aggregate_scores
    )


@router.get("/behavioral/{session_id}")
async def get_behavioral_analytics(session_id: str):
    """
    Get detailed behavioral analytics for an interview session.

    Returns:
    - Filler word analysis
    - Confidence and clarity scores
    - Speaking patterns
    - Recommendations for improvement
    """
    session = interview_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if not session.get("responses"):
        raise HTTPException(status_code=400, detail="No responses to analyze")

    # Generate comprehensive behavioral analysis
    behavioral_report = behavioral_analyzer.analyze_interview_session(
        responses=session["responses"]
    )

    return {
        "session_id": session_id,
        "analysis": behavioral_report
    }


@router.get("/session/{session_id}", response_model=InterviewSession)
async def get_session(session_id: str):
    """Get interview session details"""
    session = interview_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    return InterviewSession(
        id=session["id"],
        resume_id=session["resume_id"],
        interview_type=session["interview_type"],
        mode=session["mode"],
        status=session["status"],
        num_questions=session["num_questions"],
        questions_answered=len(session["responses"]),
        started_at=session["started_at"],
        ended_at=session.get("ended_at")
    )


@router.get("/sessions")
async def list_sessions():
    """List all interview sessions"""
    return {
        "sessions": [
            {
                "id": s["id"],
                "resume_id": s["resume_id"],
                "status": s["status"],
                "questions_answered": len(s["responses"]),
                "started_at": s["started_at"]
            }
            for s in interview_sessions.values()
        ]
    }


def calculate_aggregate_scores(evaluations: list) -> dict:
    """Calculate aggregate scores from all evaluations"""
    if not evaluations:
        return {}

    score_keys = ["content_relevance", "communication", "technical_accuracy",
                  "confidence", "depth"]

    aggregates = {}
    for key in score_keys:
        scores = [e.get("scores", {}).get(key, 0) for e in evaluations if e.get("scores")]
        if scores:
            aggregates[key] = round(sum(scores) / len(scores), 1)

    # Overall score
    if aggregates:
        aggregates["overall"] = round(sum(aggregates.values()) / len(aggregates), 1)

    return aggregates

"""
Interview Engine - AI-powered mock interviewer
"""

from typing import Dict, Optional, List
import logging

from app.core.config import model_config, settings

logger = logging.getLogger(__name__)


class InterviewEngine:
    """
    AI-powered interview engine.

    Features:
    - Adaptive question generation
    - Response evaluation
    - Follow-up question generation
    - Multi-dimensional scoring
    """

    def __init__(self):
        # Prefer OpenRouter if configured
        provider = "openrouter" if settings.OPENROUTER_API_KEY else None
        
        self.llm = LLMService(provider=provider, task="interview_questions")
        self.prompts = model_config.get_prompt("interview")

        # Session state
        self.resume_context = ""
        self.jd_context = ""
        self.analysis_context = {}
        self.interview_type = "comprehensive"
        self.difficulty = "mid"
        self.num_questions = 7

    async def initialize_interview(
        self,
        resume_text: str,
        job_description: Optional[str],
        resume_analysis: Optional[Dict],
        interview_type: str = "comprehensive",
        num_questions: int = 7,
        difficulty: str = "mid"
    ) -> Dict:
        """
        Initialize an interview session.

        Args:
            resume_text: Candidate's resume
            job_description: Target job description
            resume_analysis: Pre-computed resume analysis
            interview_type: screening, technical, behavioral, comprehensive
            num_questions: Number of questions to ask
            difficulty: entry, mid, senior, executive

        Returns:
            Dict with intro message and session info
        """
        # Store context
        self.resume_context = resume_text
        self.jd_context = job_description or ""
        self.analysis_context = resume_analysis or {}
        self.interview_type = interview_type
        self.num_questions = num_questions
        self.difficulty = difficulty

        # Generate intro message
        system_prompt = self.prompts.get("interviewer_system_prompt", "")

        init_prompt = self.prompts.get("interview_initialization_prompt", "").format(
            resume_text=self._summarize_text(resume_text, 1000),
            job_description=self._summarize_text(job_description or "General interview", 500),
            resume_analysis=str(resume_analysis or {}),
            num_questions=num_questions,
            interview_type=interview_type,
            focus_areas=self._determine_focus_areas(resume_analysis),
            difficulty=difficulty
        )

        try:
            intro_response = await self.llm.generate(
                prompt=init_prompt,
                system_prompt=system_prompt,
                temperature=0.7
            )

            return {
                "intro_message": intro_response,
                "session_initialized": True,
                "settings": {
                    "interview_type": interview_type,
                    "num_questions": num_questions,
                    "difficulty": difficulty
                }
            }

        except Exception as e:
            logger.error(f"Interview initialization failed: {str(e)}")
            # Return default intro
            return {
                "intro_message": f"Hello! Thank you for joining this {interview_type} interview. I'll be asking you {num_questions} questions to understand your background and qualifications better. Please take your time with each answer. Let's begin!",
                "session_initialized": True,
                "settings": {
                    "interview_type": interview_type,
                    "num_questions": num_questions,
                    "difficulty": difficulty
                }
            }

    async def generate_next_question(
        self,
        previous_questions: List[Dict],
        previous_responses: List[str],
        covered_topics: List[str]
    ) -> Dict:
        """
        Generate the next interview question.

        Args:
            previous_questions: Questions already asked
            previous_responses: Candidate's responses
            covered_topics: Topics already covered

        Returns:
            Dict with question details
        """
        system_prompt = self.prompts.get("interviewer_system_prompt", "")

        # Summarize previous evaluation if available
        prev_eval = ""
        if previous_responses:
            prev_eval = f"Previous response was received. Topics covered: {', '.join(covered_topics)}"

        prompt = self.prompts.get("question_generation_prompt", "").format(
            resume_summary=self._summarize_text(self.resume_context, 500),
            jd_summary=self._summarize_text(self.jd_context, 300),
            previous_questions="\n".join([q.get("question", "") for q in previous_questions]),
            covered_topics=", ".join(covered_topics) or "None",
            remaining_topics=self._get_remaining_topics(covered_topics),
            previous_response_evaluation=prev_eval
        )

        try:
            result = await self.llm.generate_json(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.7
            )

            # Validate and format result
            return {
                "question": result.get("question", "Tell me about yourself."),
                "question_type": result.get("question_type", "behavioral"),
                "topic": result.get("topic", "general"),
                "expected_elements": result.get("expected_elements", []),
                "difficulty": result.get("difficulty", self.difficulty),
                "follow_up_hints": result.get("follow_up_hints", [])
            }

        except Exception as e:
            logger.error(f"Question generation failed: {str(e)}")
            # Return fallback question
            return self._get_fallback_question(len(previous_questions))

    async def evaluate_response(
        self,
        question: Dict,
        response: str,
        resume_text: str
    ) -> Dict:
        """
        Evaluate candidate's response.

        Args:
            question: The question that was asked
            response: Candidate's response
            resume_text: Resume for context

        Returns:
            Dict with evaluation results
        """
        system_prompt = self.prompts.get("interviewer_system_prompt", "")

        prompt = self.prompts.get("response_evaluation_prompt", "").format(
            question=question.get("question", ""),
            question_type=question.get("question_type", ""),
            topic=question.get("topic", ""),
            expected_elements=str(question.get("expected_elements", [])),
            response=response,
            resume_summary=self._summarize_text(resume_text, 500)
        )

        try:
            result = await self.llm.generate_json(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.3  # Lower temperature for consistent evaluation
            )

            # Validate scores - updated to include new dimensions
            scores = result.get("scores", {})
            validated_scores = {}
            score_keys = ["content", "communication", "analytical", "technical_depth",
                          "star_method", "authenticity"]
            for key in score_keys:
                score = scores.get(key, 5)
                try:
                    validated_scores[key] = min(10, max(0, float(score)))
                except (ValueError, TypeError):
                    validated_scores[key] = 5

            # Calculate overall if not provided
            if validated_scores:
                default_overall = sum(validated_scores.values()) / len(validated_scores)
            else:
                default_overall = 5

            return {
                "scores": validated_scores,
                "overall_score": result.get("overall_score", default_overall),
                "strengths": result.get("strengths", []),
                "weaknesses": result.get("weaknesses", result.get("improvements", [])),
                "missing_elements": result.get("missing_elements", []),
                "feedback": result.get("feedback", "Thank you for your response."),
                "communication_assessment": result.get("communication_assessment", ""),
                "analytical_assessment": result.get("analytical_assessment", ""),
                "verification_notes": result.get("verification_notes", ""),
                "red_flags": result.get("red_flags", []),
                "ideal_response_elements": result.get("ideal_response_elements", []),
                "follow_up_recommended": result.get("follow_up_recommended", False),
                "follow_up_question": result.get("follow_up_question", "")
            }

        except Exception as e:
            logger.error(f"Response evaluation failed: {str(e)}")
            # Return default evaluation
            return {
                "scores": {
                    "content": 5,
                    "communication": 5,
                    "analytical": 5,
                    "technical_depth": 5,
                    "star_method": 5,
                    "authenticity": 5
                },
                "overall_score": 5,
                "strengths": ["Response provided"],
                "weaknesses": ["Evaluation unavailable"],
                "feedback": "Thank you for your response.",
                "communication_assessment": "",
                "analytical_assessment": "",
                "verification_notes": "",
                "red_flags": [],
                "follow_up_recommended": False
            }

    async def evaluate_answer_depth(
        self,
        question: Dict,
        response: str
    ) -> Dict:
        """
        Evaluate if an answer is deep enough or needs probing.
        Returns depth assessment and follow-up recommendation.
        """
        # Quick heuristics for shallow answers
        word_count = len(response.split())

        # Very short answers almost always need follow-up
        if word_count < 20:
            return {
                "depth": "shallow",
                "needs_follow_up": True,
                "reason": "Response is too brief - needs more detail",
                "suggested_probe": "Could you walk me through that in more detail?"
            }

        # Check for vague patterns
        vague_patterns = [
            "we did", "the team", "various", "many things",
            "a lot of", "stuff", "things like that", "etc",
            "you know", "basically", "kind of", "sort of"
        ]

        response_lower = response.lower()
        vague_count = sum(1 for p in vague_patterns if p in response_lower)

        # Check for specific indicators (numbers, names, concrete details)
        has_numbers = any(char.isdigit() for char in response)
        has_specific_tech = any(tech in response_lower for tech in [
            "python", "java", "react", "aws", "docker", "kubernetes",
            "sql", "mongodb", "redis", "api", "rest", "graphql"
        ])

        # Determine depth
        if word_count < 50 and vague_count >= 2:
            return {
                "depth": "shallow",
                "needs_follow_up": True,
                "reason": "Answer lacks specific details and uses vague language",
                "suggested_probe": "That's interesting. Can you give me a specific example?"
            }

        if "we" in response_lower and "i" not in response_lower:
            return {
                "depth": "unclear_contribution",
                "needs_follow_up": True,
                "reason": "Unclear about personal contribution vs team work",
                "suggested_probe": "What was your specific role in that?"
            }

        if word_count >= 50 and (has_numbers or has_specific_tech) and vague_count < 2:
            return {
                "depth": "adequate",
                "needs_follow_up": False,
                "reason": "Response has sufficient depth and specificity"
            }

        # Medium depth - might benefit from follow-up but not required
        return {
            "depth": "medium",
            "needs_follow_up": word_count < 80,
            "reason": "Response is acceptable but could be deeper",
            "suggested_probe": "What was the biggest challenge you faced there?"
        }

    async def generate_follow_up(
        self,
        original_question: Dict,
        response: str,
        reason: str
    ) -> Dict:
        """Generate a contextual follow-up question based on the response."""
        prompt = self.prompts.get("follow_up_question_prompt", "").format(
            original_question=original_question.get("question", ""),
            response=response,
            follow_up_reason=reason
        )

        try:
            follow_up = await self.llm.generate(
                prompt=prompt,
                temperature=0.7
            )
            return {
                "question": follow_up.strip(),
                "question_type": "follow_up",
                "topic": original_question.get("topic", "clarification"),
                "is_follow_up": True,
                "parent_question": original_question.get("question", "")
            }

        except Exception as e:
            logger.error(f"Follow-up generation failed: {str(e)}")
            return {
                "question": "Could you elaborate more on that?",
                "question_type": "follow_up",
                "topic": "clarification",
                "is_follow_up": True
            }

    async def generate_closing(
        self,
        num_questions: int,
        overall_performance: float,
        strengths: List[str],
        improvements: List[str]
    ) -> str:
        """Generate interview closing message."""
        prompt = self.prompts.get("interview_closing_prompt", "").format(
            num_questions=num_questions,
            overall_assessment=f"Score: {overall_performance}/10",
            strengths=", ".join(strengths[:3]) if strengths else "Various areas",
            improvements=", ".join(improvements[:3]) if improvements else "Some areas"
        )

        try:
            closing = await self.llm.generate(
                prompt=prompt,
                temperature=0.7
            )
            return closing.strip()

        except Exception as e:
            logger.error(f"Closing generation failed: {str(e)}")
            return "Thank you for your time today. We appreciate your thoughtful responses and will be in touch soon regarding next steps."

    def _summarize_text(self, text: str, max_length: int) -> str:
        """Truncate text to max length"""
        if not text:
            return ""
        if len(text) <= max_length:
            return text
        return text[:max_length] + "..."

    def _determine_focus_areas(self, analysis: Optional[Dict]) -> str:
        """Determine focus areas from resume analysis"""
        if not analysis:
            return "general skills and experience"

        focus_areas = []

        # Check for weak sections
        sections = analysis.get("sections", {})
        for section_name, section_data in sections.items():
            if isinstance(section_data, dict):
                score = section_data.get("score", 100)
                if score < 70:
                    focus_areas.append(section_name)

        # Check for missing skills
        keywords = analysis.get("keywords", {})
        missing = keywords.get("missing", [])
        if missing:
            focus_areas.append(f"validate skills: {', '.join(missing[:3])}")

        # Check for Gap Analysis / Job Hopping
        analytics = analysis.get("analytics", {})
        
        # Gap Analysis
        gap_analysis = analytics.get("gap_analysis", {})
        if gap_analysis.get("has_gaps"):
             for gap in gap_analysis.get("gaps", []):
                 focus_areas.append(f"Explain resume gap: {gap.get('between', 'between jobs')}")

        # Job Stability
        job_stability = analytics.get("job_stability", {})
        if job_stability.get("job_hopping_risk"):
            focus_areas.append("Discuss frequent job changes/short tenure")
            
        # Leadership Verification
        leadership = analytics.get("leadership_signals", [])
        if leadership:
            focus_areas.append(f"Verify leadership experience: {', '.join(leadership[:2])}")

        return ", ".join(focus_areas) if focus_areas else "comprehensive assessment"

    def _get_remaining_topics(self, covered: List[str]) -> str:
        """Get topics not yet covered"""
        all_topics = [
            "experience", "technical_skills", "problem_solving",
            "teamwork", "leadership", "communication",
            "motivation", "career_goals", "challenges"
        ]

        remaining = [t for t in all_topics if t not in covered]
        return ", ".join(remaining[:3]) if remaining else "wrap-up"

    def _get_fallback_question(self, question_number: int) -> Dict:
        """Get fallback question if generation fails"""
        fallback_questions = [
            {
                "question": "Tell me about yourself and your background.",
                "question_type": "behavioral",
                "topic": "introduction"
            },
            {
                "question": "What are your greatest strengths and how have you applied them professionally?",
                "question_type": "behavioral",
                "topic": "strengths"
            },
            {
                "question": "Describe a challenging project you've worked on. How did you handle it?",
                "question_type": "behavioral",
                "topic": "challenges"
            },
            {
                "question": "Why are you interested in this role?",
                "question_type": "motivation",
                "topic": "motivation"
            },
            {
                "question": "Where do you see yourself in the next few years?",
                "question_type": "motivation",
                "topic": "career_goals"
            },
            {
                "question": "Tell me about a time you worked effectively in a team.",
                "question_type": "behavioral",
                "topic": "teamwork"
            },
            {
                "question": "How do you handle tight deadlines or pressure?",
                "question_type": "situational",
                "topic": "stress_management"
            },
            {
                "question": "What's a skill you're currently working to improve?",
                "question_type": "behavioral",
                "topic": "growth"
            },
            {
                "question": "Do you have any questions for me?",
                "question_type": "closing",
                "topic": "closing"
            },
            {
                "question": "Is there anything else you'd like to share about your qualifications?",
                "question_type": "closing",
                "topic": "closing"
            }
        ]

        idx = min(question_number, len(fallback_questions) - 1)
        return {
            **fallback_questions[idx],
            "expected_elements": [],
            "difficulty": self.difficulty,
            "follow_up_hints": []
        }

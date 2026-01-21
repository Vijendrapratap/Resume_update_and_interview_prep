"""
Report Generator - Generate comprehensive reports
"""

from typing import Dict, Optional, List
import logging
from datetime import datetime

from app.services.llm import LLMService
from app.core.config import model_config
from app.services.analytics.behavioral import BehavioralAnalytics

logger = logging.getLogger(__name__)


class ReportGenerator:
    """
    Generate comprehensive reports for resume analysis and interviews.
    """

    def __init__(self):
        self.llm = LLMService(task="report_generation")
        self.prompts = model_config.get_prompt("report_generation")
        self.behavioral_analyzer = BehavioralAnalytics()

    async def generate_interview_report(
        self,
        session_data: Dict,
        resume_text: str,
        job_description: str
    ) -> Dict:
        """
        Generate comprehensive interview performance report.

        Args:
            session_data: Interview session data including Q&A and evaluations
            resume_text: Candidate's resume
            job_description: Target job description

        Returns:
            Comprehensive report dict
        """
        prompt = self.prompts.get("interview_report_prompt", "").format(
            resume_summary=resume_text[:1000],
            job_title=self._extract_job_title(job_description),
            company_industry="",
            duration=self._calculate_duration(
                session_data.get("started_at"),
                session_data.get("ended_at")
            ),
            num_questions=session_data.get("num_questions", 0),
            interview_type=session_data.get("interview_type", ""),
            question_responses=self._format_qa_pairs(
                session_data.get("questions", []),
                session_data.get("responses", []),
                session_data.get("evaluations", [])
            ),
            aggregate_scores=str(self._calculate_aggregates(
                session_data.get("evaluations", [])
            ))
        )

        try:
            result = await self.llm.generate_json(
                prompt=prompt,
                temperature=0.5
            )

            # Calculate scores if not in result
            evaluations = session_data.get("evaluations", [])
            aggregate_scores = self._calculate_aggregates(evaluations)

            # Generate behavioral analytics from responses
            responses = session_data.get("responses", [])
            behavioral_summary = {}
            if responses:
                behavioral_summary = self.behavioral_analyzer.analyze_interview_session(responses)

            return {
                "overall_score": result.get("overall_score", aggregate_scores.get("overall", 0)),
                "recommendation": result.get("recommendation", self._get_recommendation(aggregate_scores.get("overall", 0))),
                "executive_summary": result.get("executive_summary", ""),
                "performance_metrics": result.get("performance_metrics", aggregate_scores),
                "strengths": result.get("strengths", []),
                "areas_for_improvement": result.get("areas_for_improvement", []),
                "skill_assessment": result.get("skill_assessment", {}),
                "behavioral_competencies": result.get("behavioral_competencies", {}),
                "communication_analysis": result.get("communication_analysis", behavioral_summary.get("summary", {})),
                "question_feedback": self._format_question_feedback(
                    session_data.get("questions", []),
                    session_data.get("responses", []),
                    session_data.get("evaluations", [])
                ),
                "improvement_roadmap": result.get("improvement_roadmap", {
                    "immediate_actions": [],
                    "short_term": [],
                    "medium_term": []
                }),
                "interview_tips": result.get("interview_tips", []) + behavioral_summary.get("recommendations", []),
                "verification_status": session_data.get("verification_status", {}),
                "gap_analysis": session_data.get("gap_analysis", {}),
                "behavioral_analytics": behavioral_summary
            }

        except Exception as e:
            logger.error(f"Report generation failed: {str(e)}")
            return self._generate_fallback_interview_report(session_data)

    async def generate_resume_report(
        self,
        analysis_result: Dict,
        resume_text: str
    ) -> Dict:
        """
        Generate comprehensive resume analysis report.

        Args:
            analysis_result: Pre-computed analysis results
            resume_text: Full resume text

        Returns:
            Comprehensive report dict
        """
        analytics = analysis_result.get("analytics", {})
        
        prompt = self.prompts.get("resume_report_prompt", "").format(
            resume_text=resume_text,
            analysis_results=str(analysis_result), 
            analytics_deep_dive=str(analytics), # Pass detailed analytics
            job_description=""
        )

        try:
            result = await self.llm.generate_json(
                prompt=prompt,
                temperature=0.5
            )

            return {
                "overall_score": result.get("overall_score", analysis_result.get("overall_score", 0)),
                "score_breakdown": result.get("score_breakdown", {
                    "ats_score": analysis_result.get("ats_score", 0),
                    "content_score": analysis_result.get("content_score", 0),
                    "format_score": analysis_result.get("format_score", 0)
                }),
                "section_analysis": result.get("section_analysis", []),
                "keyword_analysis": result.get("keyword_analysis", analysis_result.get("keywords", {})),
                "ats_optimization": result.get("ats_optimization", {}),
                "priority_actions": result.get("priority_actions", []),
                "rewrite_examples": result.get("rewrite_examples", analysis_result.get("rewrite_examples", [])),
                "deep_analysis": analytics # Passthrough raw analytics for frontend
            }

        except Exception as e:
            logger.error(f"Resume report generation failed: {str(e)}")
            return {
                "overall_score": analysis_result.get("overall_score", 0),
                "score_breakdown": {
                    "ats_score": analysis_result.get("ats_score", 0),
                    "content_score": analysis_result.get("content_score", 0),
                    "format_score": analysis_result.get("format_score", 0)
                },
                "section_analysis": [],
                "keyword_analysis": analysis_result.get("keywords", {}),
                "ats_optimization": {},
                "priority_actions": analysis_result.get("improvements", []),
                "rewrite_examples": analysis_result.get("rewrite_examples", [])
            }

    async def generate_combined_report(
        self,
        resume_analysis: Dict,
        interview_data: Dict
    ) -> Dict:
        """
        Generate combined resume and interview report.

        Args:
            resume_analysis: Resume analysis results
            interview_data: Interview session data

        Returns:
            Combined report dict
        """
        prompt = self.prompts.get("combined_report_prompt", "").format(
            resume_analysis=str(resume_analysis),
            interview_performance=str(interview_data)
        )

        try:
            result = await self.llm.generate_json(
                prompt=prompt,
                temperature=0.5
            )

            return {
                "overall_assessment": result.get("overall_assessment", ""),
                "claims_vs_performance": result.get("claims_vs_performance", {}),
                "verified_skills": result.get("verified_skills", []),
                "areas_of_concern": result.get("areas_of_concern", []),
                "recommendation": result.get("recommendation", ""),
                "development_plan": result.get("development_plan", {})
            }

        except Exception as e:
            logger.error(f"Combined report generation failed: {str(e)}")
            return {
                "overall_assessment": "Unable to generate combined assessment",
                "claims_vs_performance": {},
                "verified_skills": [],
                "areas_of_concern": [],
                "recommendation": "",
                "development_plan": {}
            }

    async def generate_pdf(self, report_data: Dict, report_type: str) -> bytes:
        """
        Generate PDF from report data.

        Args:
            report_data: Report data dictionary
            report_type: Type of report (interview, resume)

        Returns:
            PDF bytes
        """
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib import colors
            import io

            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            styles = getSampleStyleSheet()

            # Custom styles
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=18,
                spaceAfter=30
            )

            story = []

            # Title
            if report_type == "interview":
                story.append(Paragraph("Interview Performance Report", title_style))
            else:
                story.append(Paragraph("Resume Analysis Report", title_style))

            story.append(Spacer(1, 12))

            # Overall Score
            score = report_data.get("overall_score", 0)
            story.append(Paragraph(f"<b>Overall Score:</b> {score}/100", styles['Normal']))
            story.append(Spacer(1, 12))

            # Executive Summary (for interview)
            if report_type == "interview" and report_data.get("executive_summary"):
                story.append(Paragraph("<b>Executive Summary</b>", styles['Heading2']))
                story.append(Paragraph(report_data["executive_summary"], styles['Normal']))
                story.append(Spacer(1, 12))

            # Strengths
            strengths = report_data.get("strengths", [])
            if strengths:
                story.append(Paragraph("<b>Strengths</b>", styles['Heading2']))
                for s in strengths[:5]:
                    story.append(Paragraph(f"- {s}", styles['Normal']))
                story.append(Spacer(1, 12))

            # Areas for Improvement
            improvements = report_data.get("areas_for_improvement", report_data.get("improvements", []))
            if improvements:
                story.append(Paragraph("<b>Areas for Improvement</b>", styles['Heading2']))
                for i in improvements[:5]:
                    if isinstance(i, dict):
                        story.append(Paragraph(f"- {i.get('suggestion', str(i))}", styles['Normal']))
                    else:
                        story.append(Paragraph(f"- {i}", styles['Normal']))
                story.append(Spacer(1, 12))

            # Build PDF
            doc.build(story)
            buffer.seek(0)
            return buffer.read()

        except ImportError:
            logger.warning("reportlab not installed, returning empty PDF")
            # Return minimal PDF
            return b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\nxref\n0 2\ntrailer<</Root 1 0 R>>\nstartxref\n0\n%%EOF"

    def _calculate_duration(self, start: Optional[str], end: Optional[str]) -> str:
        """Calculate interview duration"""
        if not start or not end:
            return "N/A"

        try:
            start_time = datetime.fromisoformat(start)
            end_time = datetime.fromisoformat(end)
            duration = end_time - start_time
            minutes = int(duration.total_seconds() / 60)
            return f"{minutes} minutes"
        except Exception:
            return "N/A"

    def _format_qa_pairs(
        self,
        questions: List[Dict],
        responses: List[str],
        evaluations: List[Dict]
    ) -> str:
        """Format Q&A pairs for prompt"""
        formatted = []
        for i, (q, r, e) in enumerate(zip(questions, responses, evaluations)):
            formatted.append(f"""
Question {i+1}: {q.get('question', '')}
Type: {q.get('question_type', '')}
Response: {r}
Scores: {e.get('scores', {})}
Feedback: {e.get('feedback', '')}
""")
        return "\n".join(formatted)

    def _format_question_feedback(
        self,
        questions: List[Dict],
        responses: List[str],
        evaluations: List[Dict]
    ) -> List[Dict]:
        """Format question-by-question feedback"""
        feedback = []
        for i, (q, r, e) in enumerate(zip(questions, responses, evaluations)):
            feedback.append({
                "question_number": i + 1,
                "question": q.get("question", ""),
                "response_summary": r[:200] + "..." if len(r) > 200 else r,
                "score": e.get("overall_score", 5),
                "strengths": e.get("strengths", []),
                "improvements": e.get("weaknesses", [])
            })
        return feedback

    def _calculate_aggregates(self, evaluations: List[Dict]) -> Dict:
        """Calculate aggregate scores"""
        if not evaluations:
            return {"overall": 0}

        score_keys = ["content_relevance", "communication", "technical_accuracy",
                      "confidence", "depth"]

        aggregates = {}
        for key in score_keys:
            scores = []
            for e in evaluations:
                if e.get("scores") and key in e["scores"]:
                    scores.append(float(e["scores"][key]))
            if scores:
                aggregates[key] = round(sum(scores) / len(scores) * 10, 1)

        if aggregates:
            aggregates["overall"] = round(sum(aggregates.values()) / len(aggregates), 1)

        return aggregates

    def _get_recommendation(self, score: float) -> str:
        """Get recommendation based on score"""
        if score >= 80:
            return "Strong Hire"
        elif score >= 65:
            return "Hire"
        elif score >= 50:
            return "Maybe"
        else:
            return "No Hire"

    def _extract_job_title(self, jd: str) -> str:
        """Extract job title from JD"""
        if not jd:
            return "Unknown Position"

        # Try to find title in first line or common patterns
        lines = jd.strip().split('\n')
        if lines:
            return lines[0][:50]
        return "Unknown Position"

    def _generate_fallback_interview_report(self, session_data: Dict) -> Dict:
        """Generate fallback report when LLM fails"""
        evaluations = session_data.get("evaluations", [])
        aggregates = self._calculate_aggregates(evaluations)

        return {
            "overall_score": aggregates.get("overall", 0),
            "recommendation": self._get_recommendation(aggregates.get("overall", 0)),
            "executive_summary": "Interview completed. See detailed feedback below.",
            "performance_metrics": aggregates,
            "strengths": ["Completed the interview"],
            "areas_for_improvement": ["Review detailed question feedback"],
            "skill_assessment": {},
            "behavioral_competencies": {},
            "communication_analysis": {},
            "question_feedback": self._format_question_feedback(
                session_data.get("questions", []),
                session_data.get("responses", []),
                evaluations
            ),
            "improvement_roadmap": {},
            "interview_tips": []
        }

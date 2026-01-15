"""
Resume Analyzer - AI-powered resume analysis
"""

from typing import Dict, Optional, List
import logging

from app.services.llm import LLMService
from app.core.config import model_config

logger = logging.getLogger(__name__)


class ResumeAnalyzer:
    """
    AI-powered resume analyzer.

    Features:
    - Comprehensive scoring
    - ATS compatibility check
    - Keyword analysis
    - JD comparison
    - Improvement suggestions
    """

    def __init__(self):
        self.llm = LLMService(task="resume_analysis")
        self.prompts = model_config.get_prompt("resume_analysis")

    async def analyze(
        self,
        resume_text: str,
        job_description: Optional[str] = None,
        analysis_type: str = "comprehensive"
    ) -> Dict:
        """
        Perform comprehensive resume analysis.

        Args:
            resume_text: Full text of the resume
            job_description: Optional JD for targeted analysis
            analysis_type: Type of analysis (comprehensive, quick, ats_focus)

        Returns:
            Dict with analysis results
        """
        # Build prompt - use different prompts based on JD presence
        system_prompt = self.prompts.get("system_prompt", "")

        # Choose the appropriate prompt based on whether JD is provided
        if job_description and job_description.strip():
            # Use JD-specific analysis prompt
            analysis_prompt = self.prompts.get("analysis_with_jd_prompt", "")
            if not analysis_prompt:
                # Fallback to default prompt
                analysis_prompt = self.prompts.get("analysis_prompt", "")

            prompt = analysis_prompt.format(
                resume_text=resume_text,
                job_description=job_description
            )
        else:
            # Use general analysis prompt (no JD)
            analysis_prompt = self.prompts.get("analysis_without_jd_prompt", "")
            if not analysis_prompt:
                # Fallback to default prompt
                analysis_prompt = self.prompts.get("analysis_prompt", "")
                prompt = analysis_prompt.format(
                    resume_text=resume_text,
                    job_description="No job description provided. Provide general analysis."
                )
            else:
                prompt = analysis_prompt.format(resume_text=resume_text)

        try:
            # Get LLM analysis
            result = await self.llm.generate_json(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.3  # Lower temperature for more consistent scoring
            )

            # Ensure required fields exist
            result = self._validate_result(result, has_jd=bool(job_description and job_description.strip()))

            return result

        except Exception as e:
            logger.error(f"Resume analysis failed: {str(e)}")
            raise

    async def quick_analyze(self, resume_text: str) -> Dict:
        """
        Perform quick resume analysis.

        Args:
            resume_text: Full text of the resume

        Returns:
            Dict with quick analysis summary
        """
        prompt = self.prompts.get("quick_analysis_prompt", "").format(
            resume_text=resume_text
        )

        try:
            response = await self.llm.generate(
                prompt=prompt,
                temperature=0.5
            )

            # Parse response into structured format
            return {
                "summary": response,
                "overall_score": self._estimate_quick_score(response),
                "top_strength": self._extract_strength(response),
                "top_improvement": self._extract_improvement(response)
            }

        except Exception as e:
            logger.error(f"Quick analysis failed: {str(e)}")
            raise

    async def compare_with_jd(
        self,
        resume_text: str,
        job_description: str
    ) -> Dict:
        """
        Compare resume against job description.

        Args:
            resume_text: Full text of the resume
            job_description: Job description text

        Returns:
            Dict with comparison results
        """
        prompt = self.prompts.get("jd_comparison_prompt", "").format(
            resume_text=resume_text,
            job_description=job_description
        )

        system_prompt = self.prompts.get("system_prompt", "")

        try:
            result = await self.llm.generate_json(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.3
            )

            return {
                "match_percentage": result.get("match_percentage", 0),
                "matched_requirements": result.get("matched_requirements", []),
                "missing_requirements": result.get("missing_requirements", []),
                "transferable_skills": result.get("transferable_skills", []),
                "recommendations": result.get("recommendations", []),
                "gap_analysis": result.get("gap_analysis", {})
            }

        except Exception as e:
            logger.error(f"JD comparison failed: {str(e)}")
            raise

    async def extract_keywords(self, resume_text: str) -> Dict:
        """
        Extract and categorize keywords from resume.

        Args:
            resume_text: Full text of the resume

        Returns:
            Dict with categorized keywords
        """
        prompt = self.prompts.get("keyword_extraction_prompt", "").format(
            resume_text=resume_text
        )

        try:
            result = await self.llm.generate_json(
                prompt=prompt,
                temperature=0.3
            )

            return {
                "technical_skills": result.get("technical_skills", result.get("Technical Skills", [])),
                "soft_skills": result.get("soft_skills", result.get("Soft Skills", [])),
                "tools_technologies": result.get("tools_technologies", result.get("Tools/Technologies", [])),
                "industry_terms": result.get("industry_terms", result.get("Industry Terms", [])),
                "certifications": result.get("certifications", result.get("Certifications", [])),
                "job_titles": result.get("job_titles", result.get("Job Titles/Roles", []))
            }

        except Exception as e:
            logger.error(f"Keyword extraction failed: {str(e)}")
            raise

    async def get_improvement_suggestions(self, resume_text: str) -> List[Dict]:
        """
        Get detailed improvement suggestions.

        Args:
            resume_text: Full text of the resume

        Returns:
            List of improvement suggestions
        """
        prompt = self.prompts.get("improvement_suggestions_prompt", "").format(
            resume_text=resume_text
        )

        try:
            result = await self.llm.generate_json(
                prompt=prompt,
                temperature=0.5
            )

            suggestions = result.get("suggestions", result.get("improvements", []))

            return suggestions

        except Exception as e:
            logger.error(f"Getting suggestions failed: {str(e)}")
            raise

    async def analyze_gaps(self, resume_text: str) -> Dict:
        """
        Analyze resume for career gaps and inconsistencies.
        """
        prompt = self.prompts.get("gap_analysis_prompt", "").format(
            resume_text=resume_text
        )
        
        system_prompt = self.prompts.get("system_prompt", "")
        
        try:
            result = await self.llm.generate_json(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.1
            )
            return result
        except Exception as e:
            logger.error(f"Gap analysis failed: {str(e)}")
            return {"error": str(e), "career_gaps": [], "timeline_issues": []}

    def _validate_result(self, result: Dict, has_jd: bool = False) -> Dict:
        """Ensure result has all required fields with defaults and calculate missing scores"""
        # Common defaults for all analyses - using weighted scoring
        # Skills: 40%, Experience: 30%, Education: 20%, Quality: 10%
        defaults = {
            # Weighted scores
            "skills_score": 0,
            "experience_score": 0,
            "education_score": 0,
            "quality_score": 0,
            "overall_score": 0,
            "technical_score": 0,
            "jd_match_score": None,
            # Red flags
            "red_flag_count": 0,
            "red_flag_severity": "none",
            "red_flags": [],
            "authenticity_score": 100,
            # Profile and skills
            "candidate_profile": {},
            "technical_skills": {},
            "soft_skills": [],
            "domain_expertise": {},
            "career_highlights": [],
            "experience_summary": [],
            "education": [],
            "certifications": [],
            "interview_topics": [],
            "key_skills": [],
            "verdict": ""
        }

        # Add JD-specific fields if JD was provided
        if has_jd:
            defaults.update({
                "jd_requirements": {},
                "skills_match": [],
                "gap_analysis": {},
                "hiring_recommendation": {}
            })
        else:
            # Add non-JD specific fields
            defaults.update({
                "strengths": [],
                "concerns": [],
                "verification_needed": [],
                "best_fit_roles": [],
                "jd_recommendation": {
                    "has_jd": False,
                    "recommendation_message": "Add a job description to unlock skills gap analysis, match percentage, and role-specific interview questions.",
                    "benefits_of_jd": [
                        "Identify skill gaps for target role",
                        "Calculate match percentage",
                        "Get tailored interview questions",
                        "Understand transferable skills"
                    ]
                }
            })

        for key, default in defaults.items():
            if key not in result:
                result[key] = default

        # Ensure scores are integers and not None
        score_fields = ["skills_score", "experience_score", "education_score", "quality_score", "overall_score", "technical_score"]
        for field in score_fields:
            if result.get(field) is None or result.get(field) == "":
                result[field] = 0
            else:
                try:
                    result[field] = int(float(result[field]))
                except (ValueError, TypeError):
                    result[field] = 0

        # If we have overall_score but missing component scores, estimate them
        # This handles cases where LLM returns overall but not components
        if result.get("overall_score", 0) > 0:
            overall = result["overall_score"]

            # If all component scores are 0 but overall is not, estimate components
            if (result.get("skills_score", 0) == 0 and
                result.get("experience_score", 0) == 0 and
                result.get("education_score", 0) == 0 and
                result.get("quality_score", 0) == 0):

                # Estimate component scores based on available data
                # Use overall as baseline and adjust based on resume content
                tech_skills = result.get("technical_skills", {})
                experience = result.get("experience_summary", [])
                education = result.get("education", [])
                highlights = result.get("career_highlights", [])

                # Skills score: Based on technical skills depth
                skills_count = sum(len(v) if isinstance(v, list) else 0 for v in tech_skills.values())
                if skills_count >= 15:
                    result["skills_score"] = min(95, overall + 10)
                elif skills_count >= 10:
                    result["skills_score"] = overall
                elif skills_count >= 5:
                    result["skills_score"] = max(50, overall - 10)
                else:
                    result["skills_score"] = max(40, overall - 20)

                # Experience score: Based on experience entries and highlights
                exp_count = len(experience)
                highlight_count = len(highlights)
                if exp_count >= 4 and highlight_count >= 3:
                    result["experience_score"] = min(95, overall + 5)
                elif exp_count >= 2:
                    result["experience_score"] = overall
                else:
                    result["experience_score"] = max(50, overall - 15)

                # Education score: Based on education entries
                edu_count = len(education)
                certs = result.get("certifications", [])
                if edu_count >= 2 or len(certs) >= 2:
                    result["education_score"] = min(90, overall + 5)
                elif edu_count >= 1:
                    result["education_score"] = overall - 5
                else:
                    result["education_score"] = max(50, overall - 20)

                # Quality score: Based on highlights with quantified results
                if highlight_count >= 4:
                    result["quality_score"] = min(90, overall + 5)
                elif highlight_count >= 2:
                    result["quality_score"] = overall
                else:
                    result["quality_score"] = max(55, overall - 10)

                # Ensure technical_score matches skills_score
                result["technical_score"] = result["skills_score"]

                logger.info(f"Estimated component scores from overall={overall}: skills={result['skills_score']}, exp={result['experience_score']}, edu={result['education_score']}, quality={result['quality_score']}")

        # If component scores exist but overall is 0, calculate overall
        elif (result.get("skills_score", 0) > 0 or result.get("experience_score", 0) > 0):
            result["overall_score"] = round(
                result.get("skills_score", 0) * 0.4 +
                result.get("experience_score", 0) * 0.3 +
                result.get("education_score", 0) * 0.2 +
                result.get("quality_score", 0) * 0.1
            )
            logger.info(f"Calculated overall_score={result['overall_score']} from components")

        # Ensure technical_score is set
        if result.get("technical_score", 0) == 0 and result.get("skills_score", 0) > 0:
            result["technical_score"] = result["skills_score"]

        return result

    def _estimate_quick_score(self, response: str) -> int:
        """Estimate score from quick analysis response"""
        # Look for score mentions in response
        import re
        score_match = re.search(r'(\d+)\s*(?:out of\s*)?(?:/\s*)?100|score[:\s]+(\d+)', response, re.IGNORECASE)
        if score_match:
            score = int(score_match.group(1) or score_match.group(2))
            return min(100, max(0, score))

        # Estimate based on sentiment
        positive_words = ['strong', 'excellent', 'good', 'well', 'impressive', 'solid']
        negative_words = ['weak', 'poor', 'lacking', 'missing', 'improve', 'needs']

        pos_count = sum(1 for word in positive_words if word.lower() in response.lower())
        neg_count = sum(1 for word in negative_words if word.lower() in response.lower())

        base_score = 60
        score = base_score + (pos_count * 5) - (neg_count * 5)

        return min(100, max(0, score))

    def _extract_strength(self, response: str) -> str:
        """Extract main strength from response"""
        # Look for strength indicators
        import re
        patterns = [
            r'strength[s]?\s*(?:is|are|:)\s*([^.]+)',
            r'(?:strong|excellent|impressive)\s+([^.]+)',
            r'(?:well|effectively)\s+([^.]+)'
        ]

        for pattern in patterns:
            match = re.search(pattern, response, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return "Unable to determine main strength"

    def _extract_improvement(self, response: str) -> str:
        """Extract main improvement area from response"""
        import re
        patterns = [
            r'improve[ment]?\s*(?:is|are|:)?\s*([^.]+)',
            r'(?:weak|lacking|missing)\s+([^.]+)',
            r'(?:should|could|need to)\s+([^.]+)'
        ]

        for pattern in patterns:
            match = re.search(pattern, response, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return "Unable to determine improvement area"

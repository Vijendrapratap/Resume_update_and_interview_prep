"""
Resume Analytics Service
- Gap Analysis
- Job Hopping Detection
- Leadership Signal Detection
"""

from typing import Dict, List, Optional
from datetime import datetime, date
import re
import logging

logger = logging.getLogger(__name__)

class ResumeAnalytics:
    """
    Advanced analytics for resume data.
    """

    def analyze(self, resume_data: Dict) -> Dict:
        """
        Perform comprehensive analysis on parsed resume data.
        """
        work_experience = resume_data.get("sections", {}).get("experience", [])
        if isinstance(work_experience, str):
            # If it's just raw text, we can't do structured analysis easily without LLM parsing first.
            # Assuming structred data or we skip.
            return {
                "gap_analysis": {"flags": [], "gaps": []},
                "job_stability": {"flags": [], "average_tenure_years": 0},
                "leadership_signals": []
            }

        # ensuring work_experience is a list of dicts (parsed structured data)
        # If the parser only returns text, we might need to rely on the LLM-extracted structure stored in 'chunks' or elsewhere.
        # For this implementation, we will assume 'work_experience' is a list of dicts with 'start_date', 'end_date'.
        # If not, we will fallback to a mock/heuristic or rely on LLM Extraction in a real scenario.
        
        # Since the current parser might be simple, let's assume we extract dates from the text if needed, 
        # but better to assume standard format: [{ "start": "2020-01", "end": "2021-01", "company": "..." }]
        
        return {
            "gap_analysis": self._analyze_gaps(work_experience),
            "job_stability": self._analyze_stability(work_experience),
            "leadership_signals": self._detect_leadership(resume_data.get("text_content", ""))
        }

    def _analyze_gaps(self, experience: List[Dict]) -> Dict:
        """
        Analyze employment gaps > 3 months.
        """
        gaps = []
        flags = []
        
        # Sort by start date (descending or ascending? usually descending in resumes)
        # We need to normalize dates first.
        timeline = []
        for job in experience:
            start = self._parse_date(job.get("start_date") or job.get("start"))
            end = self._parse_date(job.get("end_date") or job.get("end"))
            if start:
                if not end:
                    end = datetime.now() # Present
                timeline.append({"start": start, "end": end, "company": job.get("company", "Unknown")})
        
        # Sort ascending for gap check
        timeline.sort(key=lambda x: x["start"])
        
        for i in range(len(timeline) - 1):
            current_job = timeline[i]
            next_job = timeline[i+1]
            
            # Check gap between current_end and next_start
            # Wait, if current job overlaps next, no gap. 
            # Gap is between current job END and next job START (if strict seq)
            # But overlapping jobs exist. 
            
            # Simple logic: Gap if next_start > current_end + 3 months
            gap_days = (next_job["start"] - current_job["end"]).days
            if gap_days > 90:
                months = int(gap_days / 30)
                gaps.append({
                    "start": current_job["end"].strftime("%Y-%m"),
                    "end": next_job["start"].strftime("%Y-%m"),
                    "duration_months": months,
                    "between": f"{current_job['company']} and {next_job['company']}"
                })
                flags.append(f"Gap of {months} months detected between {current_job['company']} and {next_job['company']}")

        return {
            "has_gaps": len(gaps) > 0,
            "gaps": gaps,
            "flags": flags
        }

    def _analyze_stability(self, experience: List[Dict]) -> Dict:
        """
        Analyze job stability (Job Hopping).
        """
        short_tenures = []
        flags = []
        total_tenure_days = 0
        job_count = 0
        
        for job in experience:
            start = self._parse_date(job.get("start_date") or job.get("start"))
            end = self._parse_date(job.get("end_date") or job.get("end"))
            
            if start:
                if not end:
                    end = datetime.now()
                
                duration_days = (end - start).days
                total_tenure_days += duration_days
                job_count += 1
                
                # Flag < 1 year (365 days)
                if duration_days < 365:
                    months = int(duration_days / 30)
                    short_tenures.append({
                        "company": job.get("company", "Unknown"),
                        "duration_months": months
                    })
        
        if len(short_tenures) >= 2:
           flags.append(f"Job Hopping Risk: {len(short_tenures)} roles held for less than 1 year.")
           
        avg_tenure = (total_tenure_days / 365) / job_count if job_count > 0 else 0
        
        return {
            "job_hopping_risk": len(short_tenures) >= 2,
            "short_tenures": short_tenures,
            "average_tenure_years": round(avg_tenure, 1),
            "flags": flags
        }

    def _detect_leadership(self, text: str) -> List[str]:
        """
        Detect leadership signals in text.
        """
        signals = []
        text_lower = text.lower()
        
        patterns = [
            ("managed team", "Managed a team"),
            ("led team", "Led a team"),
            ("mentored", "Mentored junior engineers"),
            ("hired", "Involved in hiring/recruiting"),
            ("spearheaded", "Spearheaded initiatives"),
            ("strategic", "Strategic planning detected"),
            ("stakeholder", "Stakeholder management detected")
        ]
        
        for pattern, label in patterns:
            if pattern in text_lower:
                signals.append(label)
                
        return list(set(signals))

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """
        Parse flexible date strings.
        """
        if not date_str or str(date_str).lower() == "present":
            return None
            
        formats = ["%Y-%m-%d", "%Y-%m", "%b %Y", "%B %Y", "%Y"]
        for fmt in formats:
            try:
                return datetime.strptime(str(date_str).strip(), fmt)
            except ValueError:
                continue
        return None

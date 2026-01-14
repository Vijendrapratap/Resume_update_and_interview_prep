"""
Behavioral Analytics Service
Analyzes speech patterns, confidence indicators, and communication quality.
"""

import re
from typing import Dict, List, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class SpeechAnalysis:
    """Results from speech/text analysis"""
    filler_word_count: int
    filler_words_found: Dict[str, int]
    filler_word_rate: float  # per 100 words
    speaking_rate_wpm: Optional[float]
    confidence_score: float  # 0-100
    clarity_score: float  # 0-100
    vocabulary_diversity: float  # 0-100
    sentiment: str  # positive, neutral, negative, uncertain
    hedging_language_count: int
    assertive_language_count: int
    red_flags: List[str]


class BehavioralAnalytics:
    """
    Analyzes candidate responses for behavioral and communication patterns.

    Features:
    - Filler word detection and counting
    - Confidence indicators based on language patterns
    - Hedging vs assertive language detection
    - Vocabulary diversity analysis
    - Speaking rate estimation (if audio duration available)
    """

    # Common filler words and sounds
    FILLER_WORDS = {
        # Verbal fillers
        "um", "uh", "uhh", "umm", "erm", "er", "ah", "ahh",
        # Discourse markers used as fillers
        "like", "you know", "i mean", "basically", "actually", "literally",
        "so yeah", "yeah so", "right so", "so like",
        # Hesitation patterns
        "kind of", "sort of", "kinda", "sorta",
        # Trailing fillers
        "and stuff", "or something", "and things", "and whatnot",
        "you know what i mean", "if that makes sense"
    }

    # Hedging language (indicates uncertainty)
    HEDGING_PHRASES = {
        "i think", "i believe", "i guess", "maybe", "perhaps",
        "probably", "possibly", "might", "could be", "not sure",
        "i suppose", "it seems", "kind of", "sort of", "somewhat",
        "in a way", "to some extent", "more or less", "i feel like"
    }

    # Assertive language (indicates confidence)
    ASSERTIVE_PHRASES = {
        "i know", "i am certain", "definitely", "absolutely",
        "certainly", "clearly", "obviously", "without a doubt",
        "i'm confident", "i'm sure", "i can", "i will", "i did",
        "specifically", "precisely", "exactly", "in fact"
    }

    # Negative confidence indicators
    NEGATIVE_PATTERNS = {
        "i can't", "i don't know", "i'm not sure", "i haven't",
        "i couldn't", "i wouldn't", "i didn't", "never done",
        "no experience", "not familiar", "not really"
    }

    def __init__(self):
        pass

    def analyze_response(
        self,
        text: str,
        audio_duration_seconds: Optional[float] = None
    ) -> SpeechAnalysis:
        """
        Analyze a candidate's response for behavioral patterns.

        Args:
            text: Transcribed response text
            audio_duration_seconds: Optional duration of audio for WPM calculation

        Returns:
            SpeechAnalysis with detailed metrics
        """
        text_lower = text.lower()
        words = text.split()
        word_count = len(words)

        if word_count == 0:
            return self._empty_analysis()

        # Filler word analysis
        filler_analysis = self._count_fillers(text_lower, word_count)

        # Hedging vs assertive language
        hedging_count = self._count_patterns(text_lower, self.HEDGING_PHRASES)
        assertive_count = self._count_patterns(text_lower, self.ASSERTIVE_PHRASES)
        negative_count = self._count_patterns(text_lower, self.NEGATIVE_PATTERNS)

        # Calculate confidence score
        confidence_score = self._calculate_confidence_score(
            filler_rate=filler_analysis["rate"],
            hedging_count=hedging_count,
            assertive_count=assertive_count,
            negative_count=negative_count,
            word_count=word_count
        )

        # Calculate clarity score
        clarity_score = self._calculate_clarity_score(
            text=text,
            filler_rate=filler_analysis["rate"],
            word_count=word_count
        )

        # Vocabulary diversity
        vocab_diversity = self._calculate_vocabulary_diversity(words)

        # Sentiment analysis (simple rule-based)
        sentiment = self._analyze_sentiment(
            hedging_count, assertive_count, negative_count, word_count
        )

        # Speaking rate
        speaking_rate = None
        if audio_duration_seconds and audio_duration_seconds > 0:
            speaking_rate = (word_count / audio_duration_seconds) * 60

        # Identify red flags
        red_flags = self._identify_red_flags(
            filler_rate=filler_analysis["rate"],
            hedging_count=hedging_count,
            negative_count=negative_count,
            word_count=word_count,
            speaking_rate=speaking_rate
        )

        return SpeechAnalysis(
            filler_word_count=filler_analysis["total"],
            filler_words_found=filler_analysis["breakdown"],
            filler_word_rate=filler_analysis["rate"],
            speaking_rate_wpm=speaking_rate,
            confidence_score=confidence_score,
            clarity_score=clarity_score,
            vocabulary_diversity=vocab_diversity,
            sentiment=sentiment,
            hedging_language_count=hedging_count,
            assertive_language_count=assertive_count,
            red_flags=red_flags
        )

    def analyze_interview_session(
        self,
        responses: List[str],
        audio_durations: Optional[List[float]] = None
    ) -> Dict:
        """
        Analyze all responses from an interview session.

        Returns aggregate behavioral metrics.
        """
        if not responses:
            return {"error": "No responses to analyze"}

        all_analyses = []
        for i, response in enumerate(responses):
            duration = audio_durations[i] if audio_durations and i < len(audio_durations) else None
            analysis = self.analyze_response(response, duration)
            all_analyses.append(analysis)

        # Aggregate metrics
        total_fillers = sum(a.filler_word_count for a in all_analyses)
        avg_filler_rate = sum(a.filler_word_rate for a in all_analyses) / len(all_analyses)
        avg_confidence = sum(a.confidence_score for a in all_analyses) / len(all_analyses)
        avg_clarity = sum(a.clarity_score for a in all_analyses) / len(all_analyses)
        avg_vocab_diversity = sum(a.vocabulary_diversity for a in all_analyses) / len(all_analyses)

        # Aggregate filler breakdown
        combined_fillers = {}
        for analysis in all_analyses:
            for word, count in analysis.filler_words_found.items():
                combined_fillers[word] = combined_fillers.get(word, 0) + count

        # Most common fillers
        top_fillers = sorted(combined_fillers.items(), key=lambda x: x[1], reverse=True)[:5]

        # All red flags
        all_red_flags = []
        for analysis in all_analyses:
            all_red_flags.extend(analysis.red_flags)

        # Speaking rate analysis (if available)
        speaking_rates = [a.speaking_rate_wpm for a in all_analyses if a.speaking_rate_wpm]
        avg_speaking_rate = sum(speaking_rates) / len(speaking_rates) if speaking_rates else None

        # Confidence trend (improving, declining, stable)
        confidence_scores = [a.confidence_score for a in all_analyses]
        confidence_trend = self._calculate_trend(confidence_scores)

        return {
            "summary": {
                "overall_confidence": round(avg_confidence, 1),
                "overall_clarity": round(avg_clarity, 1),
                "vocabulary_richness": round(avg_vocab_diversity, 1),
                "speaking_rate_wpm": round(avg_speaking_rate, 1) if avg_speaking_rate else None,
                "confidence_trend": confidence_trend
            },
            "filler_analysis": {
                "total_fillers": total_fillers,
                "average_rate_per_100_words": round(avg_filler_rate, 2),
                "top_fillers": top_fillers,
                "assessment": self._assess_filler_usage(avg_filler_rate)
            },
            "language_patterns": {
                "hedging_heavy": sum(1 for a in all_analyses if a.hedging_language_count > a.assertive_language_count),
                "assertive_heavy": sum(1 for a in all_analyses if a.assertive_language_count > a.hedging_language_count),
                "balanced": sum(1 for a in all_analyses if abs(a.hedging_language_count - a.assertive_language_count) <= 1)
            },
            "red_flags": list(set(all_red_flags)),
            "per_response_scores": [
                {
                    "response_number": i + 1,
                    "confidence": round(a.confidence_score, 1),
                    "clarity": round(a.clarity_score, 1),
                    "filler_rate": round(a.filler_word_rate, 2)
                }
                for i, a in enumerate(all_analyses)
            ],
            "recommendations": self._generate_recommendations(
                avg_filler_rate, avg_confidence, avg_clarity,
                avg_speaking_rate, all_red_flags
            )
        }

    def _count_fillers(self, text: str, word_count: int) -> Dict:
        """Count filler words and calculate rate."""
        breakdown = {}
        total = 0

        for filler in self.FILLER_WORDS:
            # Use regex for word boundary matching
            pattern = r'\b' + re.escape(filler) + r'\b'
            matches = len(re.findall(pattern, text))
            if matches > 0:
                breakdown[filler] = matches
                total += matches

        rate = (total / word_count * 100) if word_count > 0 else 0

        return {
            "total": total,
            "breakdown": breakdown,
            "rate": round(rate, 2)
        }

    def _count_patterns(self, text: str, patterns: set) -> int:
        """Count occurrences of patterns in text."""
        count = 0
        for pattern in patterns:
            pattern_regex = r'\b' + re.escape(pattern) + r'\b'
            count += len(re.findall(pattern_regex, text))
        return count

    def _calculate_confidence_score(
        self,
        filler_rate: float,
        hedging_count: int,
        assertive_count: int,
        negative_count: int,
        word_count: int
    ) -> float:
        """
        Calculate confidence score (0-100) based on language patterns.
        """
        # Start with base score
        score = 70.0

        # Filler words reduce confidence (-2 points per % of filler rate)
        score -= filler_rate * 2

        # Hedging language reduces confidence
        hedging_ratio = (hedging_count / word_count * 100) if word_count > 0 else 0
        score -= hedging_ratio * 3

        # Assertive language increases confidence
        assertive_ratio = (assertive_count / word_count * 100) if word_count > 0 else 0
        score += assertive_ratio * 2

        # Negative patterns reduce confidence
        negative_ratio = (negative_count / word_count * 100) if word_count > 0 else 0
        score -= negative_ratio * 4

        # Clamp between 0 and 100
        return max(0, min(100, score))

    def _calculate_clarity_score(
        self,
        text: str,
        filler_rate: float,
        word_count: int
    ) -> float:
        """
        Calculate clarity score based on sentence structure and filler usage.
        """
        score = 80.0

        # Filler words reduce clarity
        score -= filler_rate * 1.5

        # Very short responses may lack clarity
        if word_count < 20:
            score -= 15
        elif word_count < 50:
            score -= 5

        # Very long responses may ramble
        if word_count > 300:
            score -= 10
        elif word_count > 200:
            score -= 5

        # Check for sentence structure (periods, question marks)
        sentences = len(re.findall(r'[.!?]+', text))
        if sentences > 0:
            avg_sentence_length = word_count / sentences
            # Optimal sentence length is 15-25 words
            if avg_sentence_length > 40:
                score -= 10  # Sentences too long
            elif avg_sentence_length < 8:
                score -= 5  # Sentences too short/fragmented

        return max(0, min(100, score))

    def _calculate_vocabulary_diversity(self, words: List[str]) -> float:
        """
        Calculate vocabulary diversity using type-token ratio.
        """
        if not words:
            return 0.0

        # Clean words
        clean_words = [w.lower().strip('.,!?;:') for w in words if w.isalpha()]

        if not clean_words:
            return 0.0

        unique_words = set(clean_words)

        # Type-token ratio, scaled to 0-100
        # Typical TTR for conversational speech is 0.4-0.6
        ttr = len(unique_words) / len(clean_words)

        # Scale: 0.3 TTR = 50, 0.5 TTR = 80, 0.7 TTR = 100
        score = (ttr - 0.2) / 0.5 * 100

        return max(0, min(100, score))

    def _analyze_sentiment(
        self,
        hedging: int,
        assertive: int,
        negative: int,
        word_count: int
    ) -> str:
        """Simple sentiment analysis based on language patterns."""
        if word_count == 0:
            return "neutral"

        negative_ratio = negative / word_count

        if negative_ratio > 0.02:
            return "uncertain"
        elif assertive > hedging + 2:
            return "positive"
        elif hedging > assertive + 2:
            return "uncertain"
        else:
            return "neutral"

    def _identify_red_flags(
        self,
        filler_rate: float,
        hedging_count: int,
        negative_count: int,
        word_count: int,
        speaking_rate: Optional[float]
    ) -> List[str]:
        """Identify behavioral red flags."""
        flags = []

        if filler_rate > 8:
            flags.append("Excessive use of filler words (>8%)")
        elif filler_rate > 5:
            flags.append("High filler word usage (5-8%)")

        hedging_ratio = (hedging_count / word_count * 100) if word_count > 0 else 0
        if hedging_ratio > 5:
            flags.append("Excessive hedging language - may indicate uncertainty")

        if negative_count > 3:
            flags.append("Multiple negative statements about capabilities")

        if word_count < 15:
            flags.append("Very brief response - may indicate disengagement")

        if speaking_rate:
            if speaking_rate > 180:
                flags.append("Speaking too fast (>180 WPM) - may indicate nervousness")
            elif speaking_rate < 80:
                flags.append("Speaking too slowly (<80 WPM) - may indicate uncertainty")

        return flags

    def _calculate_trend(self, scores: List[float]) -> str:
        """Calculate if scores are improving, declining, or stable."""
        if len(scores) < 3:
            return "insufficient_data"

        first_half = sum(scores[:len(scores)//2]) / (len(scores)//2)
        second_half = sum(scores[len(scores)//2:]) / (len(scores) - len(scores)//2)

        diff = second_half - first_half

        if diff > 5:
            return "improving"
        elif diff < -5:
            return "declining"
        else:
            return "stable"

    def _assess_filler_usage(self, rate: float) -> str:
        """Provide assessment of filler word usage."""
        if rate < 2:
            return "Excellent - minimal filler usage"
        elif rate < 4:
            return "Good - occasional fillers, within normal range"
        elif rate < 6:
            return "Moderate - noticeable filler usage, room for improvement"
        elif rate < 8:
            return "High - frequent fillers may distract from content"
        else:
            return "Excessive - significant filler usage affecting clarity"

    def _generate_recommendations(
        self,
        filler_rate: float,
        confidence: float,
        clarity: float,
        speaking_rate: Optional[float],
        red_flags: List[str]
    ) -> List[str]:
        """Generate actionable recommendations based on analysis."""
        recommendations = []

        if filler_rate > 4:
            recommendations.append(
                "Practice pausing instead of using filler words. "
                "A brief silence is more professional than 'um' or 'like'."
            )

        if confidence < 60:
            recommendations.append(
                "Use more assertive language. Replace 'I think' with 'I know' "
                "or 'In my experience' when discussing your actual experience."
            )

        if clarity < 60:
            recommendations.append(
                "Focus on structuring responses with clear beginning, middle, and end. "
                "Use the STAR method (Situation, Task, Action, Result) for behavioral questions."
            )

        if speaking_rate and speaking_rate > 160:
            recommendations.append(
                "Slow down your speaking pace. Take a breath between thoughts "
                "to improve clarity and appear more composed."
            )

        if any("hedging" in flag.lower() for flag in red_flags):
            recommendations.append(
                "Reduce hedging phrases like 'kind of' or 'sort of'. "
                "Commit to your statements with confidence."
            )

        if not recommendations:
            recommendations.append(
                "Strong communication skills demonstrated. "
                "Continue practicing to maintain this level of performance."
            )

        return recommendations

    def _empty_analysis(self) -> SpeechAnalysis:
        """Return empty analysis for empty input."""
        return SpeechAnalysis(
            filler_word_count=0,
            filler_words_found={},
            filler_word_rate=0.0,
            speaking_rate_wpm=None,
            confidence_score=0.0,
            clarity_score=0.0,
            vocabulary_diversity=0.0,
            sentiment="neutral",
            hedging_language_count=0,
            assertive_language_count=0,
            red_flags=["Empty response"]
        )

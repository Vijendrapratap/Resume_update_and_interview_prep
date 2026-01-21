"""
TTS/STT Service - Text-to-Speech and Speech-to-Text
"""

from typing import Optional, Dict, List
import logging
import httpx
import io
import uuid
from pathlib import Path

from app.core.config import model_config, settings, get_api_key

logger = logging.getLogger(__name__)


class TTSService:
    """
    Text-to-Speech and Speech-to-Text service.

    Supports multiple providers:
    - ElevenLabs (premium quality)
    - OpenAI TTS
    - Google TTS (free)
    - Edge TTS (free)
    """

    def __init__(self):
        self.config = model_config.tts

    async def synthesize(
        self,
        text: str,
        voice: Optional[str] = None,
        provider: Optional[str] = None,
        speed: float = 1.0
    ) -> bytes:
        """
        Convert text to speech.

        Args:
            text: Text to synthesize
            voice: Voice ID or name
            provider: TTS provider to use
            speed: Speech speed multiplier

        Returns:
            Audio bytes
        """
        provider = provider or self.config.get("default", "openai")
        provider_config = self.config.get("providers", {}).get(provider, {})

        if provider == "openai":
            return await self._synthesize_openai(text, voice, provider_config, speed)
        elif provider == "elevenlabs":
            return await self._synthesize_elevenlabs(text, voice, provider_config)
        elif provider == "google":
            return await self._synthesize_google(text, provider_config)
        elif provider == "edge":
            return await self._synthesize_edge(text, voice, provider_config)
        elif provider == "kokoro":
            return await self._synthesize_kokoro(text, voice, provider_config, speed)
        else:
            raise ValueError(f"Unknown TTS provider: {provider}")

    async def synthesize_to_url(
        self,
        text: str,
        voice: Optional[str] = None,
        provider: Optional[str] = None,
        speed: float = 1.0
    ) -> str:
        """
        Synthesize speech and save to file, return URL.

        Args:
            text: Text to synthesize
            voice: Voice ID or name
            provider: TTS provider
            speed: Speech speed

        Returns:
            URL to audio file
        """
        audio_bytes = await self.synthesize(text, voice, provider, speed)

        # Save to uploads directory
        filename = f"speech_{uuid.uuid4().hex[:8]}.mp3"
        file_path = settings.UPLOAD_DIR / filename

        with open(file_path, 'wb') as f:
            f.write(audio_bytes)

        return f"/uploads/{filename}"

    async def transcribe_audio(
        self,
        audio_data: bytes,
        filename: Optional[str] = None,
        provider: Optional[str] = None
    ) -> str:
        """
        Transcribe audio to text.

        Args:
            audio_data: Audio file bytes
            filename: Original filename (for format detection)
            provider: STT provider

        Returns:
            Transcribed text
        """
        stt_config = self.config.get("stt", {})
        provider = provider or stt_config.get("default", "whisper")

        if provider == "whisper":
            return await self._transcribe_whisper(audio_data, filename)
        else:
            raise ValueError(f"Unknown STT provider: {provider}")

    async def list_voices(self, provider: Optional[str] = None) -> List[Dict]:
        """
        List available voices.

        Args:
            provider: Filter by provider

        Returns:
            List of voice information
        """
        voices = []

        # OpenAI voices
        if not provider or provider == "openai":
            openai_voices = [
                {"id": "alloy", "name": "Alloy", "provider": "openai", "gender": "neutral"},
                {"id": "echo", "name": "Echo", "provider": "openai", "gender": "male"},
                {"id": "fable", "name": "Fable", "provider": "openai", "gender": "neutral"},
                {"id": "onyx", "name": "Onyx", "provider": "openai", "gender": "male"},
                {"id": "nova", "name": "Nova", "provider": "openai", "gender": "female"},
                {"id": "shimmer", "name": "Shimmer", "provider": "openai", "gender": "female"}
            ]
            voices.extend(openai_voices)

        # ElevenLabs voices
        if not provider or provider == "elevenlabs":
            elevenlabs_voices = [
                {"id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel", "provider": "elevenlabs", "gender": "female"},
                {"id": "ErXwobaYiN019PkySvjV", "name": "Antoni", "provider": "elevenlabs", "gender": "male"},
                {"id": "TxGEqnHWrfWFTfGW9XjX", "name": "Josh", "provider": "elevenlabs", "gender": "male"},
                {"id": "EXAVITQu4vr4xnSDxMaL", "name": "Bella", "provider": "elevenlabs", "gender": "female"}
            ]
            voices.extend(elevenlabs_voices)

        # Edge TTS voices
        if not provider or provider == "edge":
            edge_voices = [
                {"id": "en-US-AriaNeural", "name": "Aria (US)", "provider": "edge", "gender": "female"},
                {"id": "en-US-GuyNeural", "name": "Guy (US)", "provider": "edge", "gender": "male"},
                {"id": "en-GB-SoniaNeural", "name": "Sonia (UK)", "provider": "edge", "gender": "female"}
            ]
            voices.extend(edge_voices)

        # Kokoro voices
        if not provider or provider == "kokoro":
             kokoro_voices = [
                {"id": "af_heart", "name": "Heart", "provider": "kokoro", "gender": "female"},
                {"id": "af_bella", "name": "Bella", "provider": "kokoro", "gender": "female"},
                {"id": "af_nicole", "name": "Nicole", "provider": "kokoro", "gender": "female"},
                {"id": "am_michael", "name": "Michael", "provider": "kokoro", "gender": "male"},
                {"id": "am_adam", "name": "Adam", "provider": "kokoro", "gender": "male"}
             ]
             voices.extend(kokoro_voices)

        return voices

    async def get_provider_status(self) -> List[Dict]:
        """Get status of all providers."""
        providers = []

        # Check OpenAI
        openai_key = get_api_key("OPENAI_API_KEY")
        providers.append({
            "name": "openai",
            "available": bool(openai_key),
            "api_key_configured": bool(openai_key),
            "features": ["tts", "stt"]
        })

        # Check ElevenLabs
        elevenlabs_key = get_api_key("ELEVENLABS_API_KEY")
        providers.append({
            "name": "elevenlabs",
            "available": bool(elevenlabs_key),
            "api_key_configured": bool(elevenlabs_key),
            "features": ["tts", "voice_cloning"]
        })

        # Google TTS (free, always available)
        providers.append({
            "name": "google",
            "available": True,
            "api_key_configured": True,  # Uses gTTS, no key needed
            "features": ["tts"]
        })

        # Edge TTS (free, always available)
        providers.append({
            "name": "edge",
            "available": True,
            "api_key_configured": True,  # No key needed
            "features": ["tts"]
        })

        return providers

    async def _synthesize_openai(
        self,
        text: str,
        voice: Optional[str],
        config: Dict,
        speed: float
    ) -> bytes:
        """Synthesize using OpenAI TTS"""
        api_key = get_api_key("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key not configured")

        voice = voice or config.get("voice", "nova")
        model = config.get("model", "tts-1")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/audio/speech",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "input": text,
                    "voice": voice,
                    "speed": speed
                },
                timeout=30.0
            )
            response.raise_for_status()
            return response.content

    async def _synthesize_elevenlabs(
        self,
        text: str,
        voice: Optional[str],
        config: Dict
    ) -> bytes:
        """Synthesize using ElevenLabs"""
        api_key = get_api_key("ELEVENLABS_API_KEY")
        if not api_key:
            raise ValueError("ElevenLabs API key not configured")

        voice_id = voice or config.get("voice_id", "21m00Tcm4TlvDq8ikWAM")
        model_id = config.get("model_id", "eleven_multilingual_v2")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "text": text,
                    "model_id": model_id,
                    "voice_settings": {
                        "stability": config.get("stability", 0.5),
                        "similarity_boost": config.get("similarity_boost", 0.75)
                    }
                },
                timeout=30.0
            )
            response.raise_for_status()
            return response.content

    async def _synthesize_google(self, text: str, config: Dict) -> bytes:
        """Synthesize using Google TTS (gTTS)"""
        try:
            from gtts import gTTS

            tts = gTTS(
                text=text,
                lang=config.get("language", "en"),
                tld=config.get("tld", "com"),
                slow=config.get("slow", False)
            )

            # Save to bytes
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            return fp.read()

        except ImportError:
            raise ImportError("gTTS not installed. Run: pip install gTTS")

    async def _synthesize_edge(
        self,
        text: str,
        voice: Optional[str],
        config: Dict
    ) -> bytes:
        """Synthesize using Edge TTS (free Microsoft voices)"""
        try:
            import edge_tts

            # Use configured voice - AndrewNeural is natural and professional
            voice = voice or config.get("voice", "en-US-AndrewNeural")
            rate = config.get("rate", "-3%")  # Slightly slower for natural speech
            volume = config.get("volume", "+0%")
            pitch = config.get("pitch", "+0Hz")

            communicate = edge_tts.Communicate(
                text,
                voice,
                rate=rate,
                volume=volume,
                pitch=pitch
            )

            # Collect audio data
            audio_data = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data += chunk["data"]

            return audio_data

        except ImportError:
            raise ImportError("edge-tts not installed. Run: pip install edge-tts")


    async def _transcribe_whisper(
        self,
        audio_data: bytes,
        filename: Optional[str]
    ) -> str:
        """Transcribe using OpenAI Whisper"""
        api_key = get_api_key("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key not configured")

        # Determine file extension
        ext = ".mp3"
        if filename:
            ext = Path(filename).suffix or ".mp3"

        async with httpx.AsyncClient() as client:
            files = {
                "file": (f"audio{ext}", audio_data, "audio/mpeg"),
                "model": (None, "whisper-1")
            }

            response = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={
                    "Authorization": f"Bearer {api_key}"
                },
                files=files,
                timeout=60.0
            )
            response.raise_for_status()
            data = response.json()
            return data.get("text", "")
            
# Global cache for Kokoro pipeline to avoid reloading (High Latency Fix)
_KOKORO_PIPELINE = None

class TTSService:
    # ... (existing init methods) ...

    # ... (rest of the file until _synthesize_kokoro) ... 

    async def _synthesize_kokoro(
        self,
        text: str,
        voice: Optional[str],
        config: Dict,
        speed: float = 1.0
    ) -> bytes:
        """Synthesize using Kokoro (Local) with Caching"""
        global _KOKORO_PIPELINE
        try:
            from kokoro import KPipeline
            import soundfile as sf
            import numpy as np
            
            # Initialize pipeline only once (Singleton Pattern)
            if _KOKORO_PIPELINE is None:
                logger.info("Loading Kokoro Pipeline (First Run)...")
                # 'a' is for American English
                _KOKORO_PIPELINE = KPipeline(lang_code='a')
                logger.info("Kokoro Pipeline Loaded.")
            
            pipeline = _KOKORO_PIPELINE
            
            # Default voice
            voice = voice or config.get("voice", "af_heart")
            
            # Generate audio
            # generator returns (graphemes, phonemes, audio)
            generator = pipeline(text, voice=voice, speed=speed, split_pattern=r'\n+')
            
            all_audio = []
            for _, _, audio in generator:
                all_audio.append(audio)
                
            if not all_audio:
                raise ValueError("No audio generated")
                
            # Concatenate all audio segments
            full_audio = np.concatenate(all_audio)
            
            # Convert to bytes (WAV format)
            fp = io.BytesIO()
            sf.write(fp, full_audio, 24000, format='WAV')
            fp.seek(0)
            return fp.read()
            
        except ImportError:
            raise ImportError("kokoro not installed. Run: pip install kokoro soundfile")
        except Exception as e:
            logger.error(f"Kokoro synthesis error: {str(e)}")
            raise



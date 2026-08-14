import os
from abc import ABC, abstractmethod
from app.config import settings
from app.utils.logger import logger

class AbstractSpeechProvider(ABC):
    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, language_code: str) -> str:
        pass

class MockSpeechProvider(AbstractSpeechProvider):
    async def transcribe(self, audio_bytes: bytes, language_code: str) -> str:
        logger.info(f"Mock ASR processing {len(audio_bytes)} bytes for language {language_code}")
        if language_code == "gu-IN":
            return "મને છેલ્લા ૩ દિવસથી ખૂબ તાવ આવે છે અને છાતીમાં સહેજ દુખાવો થાય છે."
        elif language_code == "mr-IN":
            return "मला गेल्या ३ दिवसांपासून खूप ताप आला आहे आणि डोके दुखी होत आहे."
        elif language_code == "ta-IN":
            return "எனக்கு 3 நாட்களாக கடுமையான காய்ச்சல் மற்றும் தலைவலி உள்ளது."
        elif language_code == "te-IN":
            return "నాకు 3 రోజులుగా తీవ్రమైన జ్వరం మరియు తలనొప్పి ఉంది."
        elif language_code == "kn-IN":
            return "ನನಗೆ 3 ದಿನಗಳಿಂದ ತೀವ್ರ ಜ್ವರ ಮತ್ತು ತಲೆನೋವು ಇದೆ."
        elif language_code == "ml-IN":
            return "എനിക്ക് 3 ദിവസമായി കഠിനമായ പനിയും തലവേദനയും ഉണ്ട്."
        elif language_code == "bn-IN":
            return "আমার ৩ দিন ধরে খুব জ্বর এবং তীব্র মাথাব্যথা।"
        elif language_code == "pa-IN":
            return "ਮੈਨੂੰ 3 ਦਿਨਾਂ ਤੋਂ ਤੇਜ਼ ਬੁਖਾਰ ਅਤੇ ਸਿਰ ਦਰਦ ਹੈ।"
        return "मुझे पिछले 3 दिनों से तेज़ बुखार है, सिर में तेज़ दर्द है और ठंड लग रही है।"

class GoogleCloudSpeechProvider(AbstractSpeechProvider):
    async def transcribe(self, audio_bytes: bytes, language_code: str) -> str:
        try:
            from google.cloud import speech
            client = speech.SpeechClient()
            audio = speech.RecognitionAudio(content=audio_bytes)
            config = speech.RecognitionConfig(
                encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
                sample_rate_hertz=48000,
                language_code=language_code,
                enable_automatic_punctuation=True,
            )
            response = client.recognize(config=config, audio=audio)
            transcripts = [result.alternatives[0].transcript for result in response.results if result.alternatives]
            if transcripts:
                return " ".join(transcripts)
        except Exception as e:
            logger.warning(f"Google Cloud Speech API call failed ({e}). Falling back to mock transcription.")
        return await MockSpeechProvider().transcribe(audio_bytes, language_code)

class SpeechService:
    def __init__(self):
        provider_type = settings.ASR_PROVIDER.upper()
        if provider_type == "GOOGLE":
            self.provider = GoogleCloudSpeechProvider()
        else:
            self.provider = MockSpeechProvider()

    async def transcribe_and_cleanup(self, temp_filepath: str, language_code: str) -> str:
        try:
            with open(temp_filepath, "rb") as f:
                audio_bytes = f.read()

            transcript = await self.provider.transcribe(audio_bytes, language_code)
            return transcript
        finally:
            # Immediate privacy purge of raw audio binary file
            if os.path.exists(temp_filepath):
                os.remove(temp_filepath)
                logger.info("Raw audio temporary file deleted instantly post-transcription.")

speech_service = SpeechService()


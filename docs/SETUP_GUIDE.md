# Setup & Execution Guide

## Quick Start

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher
- npm or yarn

### 1. Clone and Setup

```bash
cd /home/pratap/work/Resume_update_and_interview_prep
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your API keys
nano .env  # or use any text editor
```

**Minimum Required:** At least one LLM API key (OpenAI recommended for full features)

### 3. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: http://localhost:8000
API docs at: http://localhost:8000/api/docs

### 4. Frontend Setup (New Terminal)

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at: http://localhost:3000

---

## API Keys Guide

### LLM Providers (Choose One or More)

#### OpenAI (Recommended)
- Sign up at: https://platform.openai.com
- Go to: API Keys section
- Create new key
- Add to `.env`: `OPENAI_API_KEY=sk-...`
- **Used for:** GPT-4, TTS, Whisper STT

#### Anthropic Claude
- Sign up at: https://console.anthropic.com
- Create API key
- Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-...`

#### Google Gemini
- Sign up at: https://aistudio.google.com
- Get API key
- Add to `.env`: `GOOGLE_API_KEY=...`

#### Groq (Fast & Free Tier)
- Sign up at: https://console.groq.com
- Create API key
- Add to `.env`: `GROQ_API_KEY=gsk_...`

#### Ollama (Local, Free)
- Install Ollama: https://ollama.ai
- Run: `ollama pull llama3.1`
- No API key needed
- Change default in config: `config/models/llm_config.yaml`

### TTS Providers (Optional)

#### ElevenLabs (Premium Voices)
- Sign up at: https://elevenlabs.io
- Get API key from profile
- Add to `.env`: `ELEVENLABS_API_KEY=...`

#### Free Options (No API Key)
- Google TTS (gTTS): Built-in, uses `gtts` library
- Edge TTS: Built-in, uses `edge-tts` library

---

## Configuration Guide

### Changing LLM Provider

Edit `config/models/llm_config.yaml`:

```yaml
# Change this to switch providers
default: "openai"  # Options: openai, claude, gemini, ollama, groq

# Or change specific model
providers:
  openai:
    model: "gpt-4o"  # Change to gpt-3.5-turbo for cheaper option
```

### Changing TTS Provider

Edit `config/models/tts_config.yaml`:

```yaml
default: "openai"  # Options: elevenlabs, openai, google, edge

providers:
  openai:
    voice: "nova"  # Options: alloy, echo, fable, onyx, nova, shimmer
```

### Customizing Prompts

All prompts are in `config/prompts/`:

- `resume_analysis.yaml` - Resume scoring prompts
- `interview.yaml` - Interview questions and evaluation
- `report_generation.yaml` - Report generation prompts

**Example: Customize interview style**
```yaml
# In config/prompts/interview.yaml
interviewer_system_prompt: |
  You are a friendly and supportive interviewer...
  # Add your customizations here
```

---

## Development Workflow

### Running Both Services

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Testing the API

Open http://localhost:8000/api/docs for Swagger UI

Test endpoints:
1. POST `/api/v1/resume/upload` - Upload resume
2. POST `/api/v1/analysis/analyze` - Analyze resume
3. POST `/api/v1/interview/start` - Start interview

### Building for Production

```bash
# Frontend build
cd frontend
npm run build

# The build output is in frontend/dist/
```

---

## Troubleshooting

### Common Issues

**1. "Module not found" errors**
```bash
cd backend
pip install -r requirements.txt
```

**2. CORS errors**
Check that frontend is running on port 3000 (configured in backend CORS)

**3. API key errors**
- Verify `.env` file exists with correct keys
- Restart the backend after changing `.env`

**4. PDF parsing errors**
```bash
pip install pdfplumber PyPDF2
```

**5. DOC file parsing issues**
The parser supports both `.docx` (modern) and `.doc` (legacy) Word files.

For best `.doc` file support, install antiword:
```bash
# Ubuntu/Debian
sudo apt-get install antiword

# macOS
brew install antiword

# Or use catdoc as alternative
sudo apt-get install catdoc
```

If antiword is not available, the parser will use a Python-based fallback (`olefile`).

**6. TTS not working**
```bash
pip install gTTS edge-tts
```

### Getting Help

- Check API docs: http://localhost:8000/api/docs
- Review logs in terminal
- Check browser console for frontend errors

---

## Project Structure Quick Reference

```
Resume_update_and_interview_prep/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/    # API routes
│   │   ├── core/config.py       # Configuration
│   │   ├── services/            # Business logic
│   │   │   ├── llm/             # LLM providers
│   │   │   ├── resume/          # Resume parsing/analysis
│   │   │   ├── interview/       # Interview engine
│   │   │   ├── tts/             # Text-to-speech
│   │   │   └── report/          # Report generation
│   │   └── schemas/             # Pydantic models
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   ├── services/api.js      # API client
│   │   └── styles/              # CSS/Tailwind
│   └── package.json
├── config/
│   ├── models/                  # Model configurations
│   └── prompts/                 # AI prompts
└── docs/                        # Documentation
```

---

## Adding New Features

### Adding a New LLM Provider

1. Create provider in `backend/app/services/llm/providers.py`
2. Add to `PROVIDERS` dict in `backend/app/services/llm/service.py`
3. Add config in `config/models/llm_config.yaml`

### Modifying Interview Flow

1. Edit prompts in `config/prompts/interview.yaml`
2. Modify engine logic in `backend/app/services/interview/engine.py`
3. Update frontend in `frontend/src/pages/InterviewPage.jsx`

### Adding Video Interview (Future)

Requirements:
1. Avatar API (D-ID, HeyGen, or Synthesia)
2. WebRTC for real-time video
3. Video analysis libraries (OpenCV, MediaPipe)

See `docs/ARCHITECTURE.md` for detailed architecture.

---

## Cost Optimization

### Free Options
- Use **Ollama** for local LLM (free, private)
- Use **gTTS** or **Edge TTS** for voice (free)
- Use **Groq** free tier for fast inference

### Cheaper Options
- Use **gpt-3.5-turbo** instead of gpt-4
- Use **Claude Haiku** for faster, cheaper responses
- Cache responses to reduce API calls

### Configuration for Cost Savings
```yaml
# config/models/llm_config.yaml
default: "groq"  # Fast and free tier available

providers:
  openai:
    model: "gpt-3.5-turbo"  # Cheaper than gpt-4
```

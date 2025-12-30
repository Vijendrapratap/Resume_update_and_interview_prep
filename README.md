# Resume Analyzer & Interview Preparation Platform

An AI-powered web application for comprehensive resume analysis and mock interview preparation.

## Features

### Resume Analysis
- **Multi-Format Support** - Upload resumes in PDF, DOCX, DOC, or TXT formats
- **AI-Powered Scoring** - Get comprehensive scores for content, format, and keywords
- **ATS Compatibility Check** - Ensure your resume passes Applicant Tracking Systems
- **Keyword Analysis** - Identify missing and present keywords
- **JD Matching** - Compare your resume against specific job descriptions
- **Improvement Suggestions** - Get actionable recommendations with before/after examples

### Mock Interviews
- **Text-Based Interview** - Practice with typed responses
- **Voice-Based Interview** - Speak naturally with AI interviewer
- **Adaptive Questions** - Questions tailored to your resume and target role
- **Real-time Evaluation** - Get immediate feedback on each response
- **Comprehensive Reports** - Detailed performance analysis

### Reports
- **Performance Metrics** - Visual breakdown of all scores
- **Strengths & Weaknesses** - Clear identification of areas
- **Improvement Roadmap** - 30/60/90 day action plans
- **PDF Export** - Download detailed reports

## Quick Start

```bash
# 1. Setup environment
cp .env.example .env
# Edit .env with your API keys

# 2. Start Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# 3. Start Frontend (new terminal)
cd frontend
npm install
npm run dev

# 4. Open http://localhost:3000
```

## API Keys Required

At minimum, you need ONE LLM provider:

| Provider | Get Key From | Cost |
|----------|-------------|------|
| OpenAI | [platform.openai.com](https://platform.openai.com) | Pay per use |
| Anthropic | [console.anthropic.com](https://console.anthropic.com) | Pay per use |
| Google | [aistudio.google.com](https://aistudio.google.com) | Free tier |
| Groq | [console.groq.com](https://console.groq.com) | Free tier |
| Ollama | [ollama.ai](https://ollama.ai) | Free (local) |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and components
- [Setup Guide](docs/SETUP_GUIDE.md) - Detailed installation instructions

## Tech Stack

**Backend:**
- FastAPI (Python)
- Pluggable LLM providers (OpenAI, Claude, Gemini, Ollama)
- Multiple TTS options (ElevenLabs, OpenAI, gTTS, Edge)

**Frontend:**
- React 18 + Vite
- Tailwind CSS
- Recharts for visualizations
- Framer Motion for animations

## Configuration

### Change LLM Provider
Edit `config/models/llm_config.yaml`:
```yaml
default: "openai"  # Change to: claude, gemini, ollama, groq
```

### Customize Prompts
Edit files in `config/prompts/`:
- `resume_analysis.yaml` - Resume scoring
- `interview.yaml` - Interview questions
- `report_generation.yaml` - Report content

## Project Structure

```
├── backend/           # FastAPI server
│   ├── app/
│   │   ├── api/       # REST endpoints
│   │   └── services/  # Business logic
├── frontend/          # React application
│   └── src/
│       ├── components/
│       └── pages/
├── config/            # Configuration files
│   ├── models/        # LLM/TTS settings
│   └── prompts/       # AI prompts
└── docs/              # Documentation
```

## Future Roadmap

- [ ] Video-based interview with AI avatar
- [ ] Multi-language support
- [ ] Resume builder
- [ ] Interview recording and playback
- [ ] User authentication and history

## License

MIT License

# AegisOps 🛡️

AegisOps is an autonomous, AI-powered Site Reliability Engineering (SRE) war-room platform designed for real-time system monitoring, automated anomaly detection, root-cause analysis (RCA), and simulated autonomous recovery.

The project is built specifically to fit 100% free-tier integrations (no credit cards or paid APIs required) while maintaining a modular structure that allows swapping in production-grade components (e.g. OpenAI GPT-4, Pinecone, Kubernetes) solely through configuration changes.

---

## 🚀 Key Capabilities

1. **Real-Time Monitoring**: Backend polls Prometheus metrics and streams live system status to a React dashboard via WebSockets.
2. **Machine Learning Anomaly Detection**: An Isolation Forest model trained on synthetic metrics flags anomalies in real time.
3. **AI Root Cause Analysis (RCA)**: A specialized SRE agent queries FAISS for historical context, compiles metrics/logs, and prompts Gemini 1.5 Flash to identify root causes and confidence scores.
4. **AI Recovery Planning**: The recovery agent generates a prioritized list of actions to resolve issues.
5. **Simulated Autonomous Recovery**: Operators can approve and execute recovery steps with real-time feedback.
6. **Failure Prediction**: Extrapolates metric trends to predict times-to-failure (TTF) and calculate risk scores.
7. **Demo & Hardening Mode**: High-reliability simulation scripts and a cached response mode to protect against API rate limits during demos.

---

## 🛠️ Technology Stack

| Layer | Technology | Role | Free-Tier Details |
|---|---|---|---|
| **LLM** | Gemini 1.5 Flash | AI Root Cause & Recovery Planning | Free (15 RPM, 1M tokens/day) |
| **LLM Framework** | LangChain | Linear pipeline coordination | Open-source library |
| **Vector Search** | FAISS | In-memory RAG for past incidents | Free local execution |
| **Embeddings** | `all-MiniLM-L6-v2` | Sentence transformer embeddings | Runs locally on CPU |
| **ML Model** | scikit-learn (Isolation Forest) | Anomaly classification | Trained locally in seconds |
| **Backend** | FastAPI + Python 3.11+ | High-performance API and WebSockets | Open-source |
| **Database** | PostgreSQL 15 | Relational storage for metrics & incidents | Hosted locally in Docker |
| **Caching** | Redis 7 | LLM response caching | Hosted locally in Docker |
| **Frontend** | React 18 + TS + Vite + Tailwind | Real-time SRE Dashboard | Static build |
| **Deployment** | Docker Compose | Local orchestration | Run locally in one command |

---

## 📂 Project Structure

```
aegisops/
├── docker-compose.yml
├── .env.example
├── README.md
├── backend/            # FastAPI Backend & DB Schema
├── agents/             # AI Agents (Anomaly, RCA, Recovery)
├── ml/                 # Isolation Forest Anomaly Detection Model
├── frontend/           # Vite + React + TS Dashboard
├── infra/              # Prometheus & Nginx Configs
├── scripts/            # Failure simulation & demo management
└── docs/               # System documentation & demo script
```

---

## ⚙️ Local Development Setup

### Prerequisites
- [Docker & Docker Compose](https://docs.docker.com/get-docker/)
- [Python 3.11+](https://www.python.org/downloads/)
- [Node.js v18+](https://nodejs.org/)

### 1. Configure Environment Variables
Copy `.env.example` in the root directory to `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in your free Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Run with Docker Compose (Recommended)
This runs the database, Redis, Prometheus, backend server, and Nginx proxy in unified containers:
```bash
docker-compose up --build
```
Once started:
- Access the frontend dashboard at `http://localhost:3000`
- Access the backend documentation (Swagger UI) at `http://localhost:8000/docs`
- Prometheus dashboard is active at `http://localhost:9090`

### 3. Running Backend Locally (Optional)
If you want to run the FastAPI app directly on your host machine:

Create and activate a virtual environment:
```bash
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Unix/macOS:
source venv/bin/activate
```
Install requirements:
```bash
pip install -r backend/requirements.txt
```
Start the local server:
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 🎯 Demo flow for Judges (5 Minutes)

1. **Clean State (0:00 - 0:30)**: Start with a healthy system (score ~98/100). Charts show stable flat lines.
2. **Inject Failure (0:30 - 1:00)**: Run the script `python scripts/simulate_failure.py`. The dashboard immediately turns red, and an incident card "Connection pool exhaustion detected" is triggered.
3. **AI Diagnostics (1:00 - 2:00)**: Under the Incident Command, click the active incident and run the RCA Agent. The AI will output the root cause with a confidence score and a step-by-step causal chain.
4. **Approve & Resolve (2:00 - 3:00)**: In the Recommendations tab, approve the highest-priority action and click "Execute". A scrolling terminal shows simulated recovery steps.
5. **System Recovery (3:00 - 4:00)**: Watch the metrics chart return to a normal range, and the health score climbs back to green.
6. **Failure Predictions (4:00 - 5:00)**: Show the trend prediction panel indicating time-to-failure calculations.

# Google ADK Multi-Agent System Boilerplate

A clean-slate, production-ready starter architecture for building autonomous multi-agent systems using the **Google Agent Development Kit (ADK)**, **Gemini 3.1 Pro / 3.8 Flash**, **FastAPI**, **Google Cloud Firestore**, **Firebase Authentication**, and **React + Vite**.

This boilerplate provides the core scaffolding needed to rapidly build, test, and deploy multi-agent applications:
- **Director Agent (Supervisor)**: Orchestrates workflows and delegates tasks to specialized sub-agents.
- **Multi-Model Provider Choices**: Switch seamlessly between **Google Gemini** (default), **OpenAI** (GPT-4o, o3-mini), **Anthropic** (Claude 3.7 / 3.5 Sonnet), and **Open-Source / Local** (Ollama, Groq, DeepSeek).
- **Pluggable Sub-Agents**: Modular, domain-specific agents registered as `AgentTool`s.
- **Enterprise Session Persistence**: User-isolated, distributed session management via Cloud Firestore.
- **Human-in-the-Loop (HITL)**: Asynchronous safety approval gates for critical actions.
- **Audit Logging**: Structured mutation logging stored in Firestore.
- **Streaming API**: Server-Sent Events (SSE) streaming real-time tokens and tool status.
- **Modern Web Interface**: React 19, TypeScript, and Vite with Google Sign-In, model switcher, and session history.
- **Headless CLI**: Terminal runner for local testing without the browser UI.


---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 React + Vite Frontend (Port 5173)           │
│  - Firebase Auth (Google Sign-In)                           │
│  - ChatInterface.tsx (SSE streaming tokens & status)        │
│  - AuditLogPanel.tsx & SettingsModal.tsx                    │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / SSE (Bearer Token)
┌──────────────────────────────▼──────────────────────────────┐
│                    FastAPI Backend (Port 8000)              │
│  - auth.py: Firebase ID token verification                  │
│  - api.py: REST + SSE streaming endpoints                   │
│  - Runner & App: ADK orchestrator & context caching         │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼─────────────┐ ┌──────────────▼──────────────┐
│  Firestore Session Service │ │   Agency Director (ADK)     │
│  - User-isolated sessions  │ │   - Root Agent (Gemini Pro) │
│  - Events & Audit Trail    │ │   - Sub-Agents (AgentTools) │
│  - HITL Safety Approvals   │ │   - MCP Toolsets (Zapier)   │
└────────────────────────────┘ └─────────────────────────────┘
```

---

## 📋 Prerequisites

Before running the application, ensure you have:
*   **Python 3.12+**
*   **Node.js 18+** & **npm**
*   **Google Cloud SDK** (for Firestore / Application Default Credentials)
*   **Docker** (optional, for containerized deployments)

---

## ⚙️ Environment Variables

Create or configure the `.env` file in the root project directory:

```ini
# Gemini API Key for Google ADK / GenAI (Default)
GOOGLE_API_KEY=your_gemini_api_key

# Optional Model Override (defaults to gemini-3.1-pro-preview)
DIRECTOR_MODEL=gemini-3.1-pro-preview

# Optional External Tool Integrations (e.g., Zapier MCP)
ZAPIER_MCP_URL=your_zapier_mcp_url

# Multi-Model Provider API Keys (optional server fallbacks)
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GROQ_API_KEY=your_groq_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
OLLAMA_API_BASE=http://localhost:11434

# Add your custom third-party API keys below
# CUSTOM_SERVICE_KEY=your_key_here

```

### Google Cloud & Firebase Authentication Setup
For Firestore session storage and Firebase Auth token verification:
1. **Local Development (Application Default Credentials)**:
   ```bash
   gcloud auth application-default login
   ```
   *Or set a Service Account JSON path:*
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
   ```
2. **Production (Google Cloud Run)**:
   No manual credentials required. Cloud Run automatically assumes the runtime service account identity. Ensure the service account has the **Cloud Datastore User** or **Firestore User** IAM role.

---

## 🚀 Quickstart & Local Development

### 1. Install Dependencies

**Backend (Python):**
```bash
pip install -r requirements.txt
```

**Frontend (React/Vite):**
```bash
cd frontend
npm install
cd ..
```

### 2. Run the Application

#### Option A: Concurrent Dev Script (Recommended)
Run both backend and frontend together with graceful shutdown:
```bash
chmod +x run_dev.sh
./run_dev.sh
```

- **Frontend UI**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`

#### Option B: Separate Terminals

**Terminal 1 (Backend API):**
```bash
uvicorn api:app --reload --port 8000
```

**Terminal 2 (Frontend UI):**
```bash
cd frontend
npm run dev
```

#### Option C: Headless CLI (No Browser Required)
Test the agent directly in your terminal:
```bash
python3 cli.py --user test_user --session test_session
```

---

## 🧩 Building Your Ideas (Clean Slate Guide)

### 1. Creating a Specialized Sub-Agent
Sub-agents are focused agents designed for specific domains (research, code generation, database querying, data transformation, etc.):

```python
# my_agent/agent.py
from google.adk import Agent

def my_custom_tool(query: str) -> str:
    """Useful tool description that helps Gemini decide when to call it.
    
    Args:
        query: Search or operational parameter.
    """
    return f"Processed query: {query}"

research_agent = Agent(
    model='gemini-3.8-flash',
    name='research_specialist',
    description="Specialized agent that performs deep research and data retrieval.",
    instruction="You are a research expert. Retrieve information and return clear summaries.",
    tools=[my_custom_tool],
)
```

### 2. Registering Sub-Agents with the Director
In `agency_director/agent.py`, wrap sub-agents in `AgentTool` and attach them to the Director:

```python
# agency_director/agent.py
from google.adk import Agent
from google.adk.tools import AgentTool
from my_agent.agent import research_agent

tools_list = [
    AgentTool(agent=research_agent),
    # Add more sub-agents or toolsets here
]

root_agent = Agent(
    model=os.environ.get("DIRECTOR_MODEL", "gemini-3.1-pro-preview"),
    name='agency_director',
    description="Primary orchestrator that coordinates tasks across the agency.",
    instruction="Coordinate requests across your team of specialized agents and report the outcome.",
    tools=tools_list,
)
```

### 3. Adding Human-in-the-Loop (HITL) Safety Gates
To require explicit human approval before executing sensitive operations:

```python
from shared.approval import request_approval

async def delete_or_mutate_resource(resource_id: str) -> str:
    """Performs a sensitive operation that requires user confirmation."""
    confirmed = await request_approval(
        action="delete_resource",
        target_type="database_record",
        details={"resource_id": resource_id},
        timeout_seconds=180,
    )
    if not confirmed:
        return "Operation cancelled or timed out by the user."
    
    # Proceed with action
    return f"Successfully deleted resource {resource_id}"
```

### 4. Logging Audited Operations
Record state changes and actions into the user's Firestore audit collection:

```python
from shared.audit_log import log_action

log_action(
    user_id="system",  # Automatically resolved to authenticated user
    action="create_record",
    target_type="document",
    target_id="doc_12345",
    details={"name": "New Document", "status": "active"},
    status="success",
)
```

---

## 📡 API Endpoints Reference

All endpoints (except `/health`) require a valid Firebase ID token in the `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat` | Send prompt and receive SSE stream of tokens and status updates |
| `POST` | `/sessions` | Create a new conversation session |
| `GET` | `/sessions` | List all sessions for the authenticated user |
| `GET` | `/sessions/{id}/history` | Retrieve message history for a session |
| `DELETE` | `/sessions/{id}` | Delete a session and its events |
| `GET` | `/sessions/{id}/approvals` | Poll pending Human-in-the-Loop approval requests |
| `POST` | `/sessions/{id}/approvals/{id}/respond` | Approve or reject a pending operation |
| `GET` | `/audit-log` | Retrieve chronological audit trail entries |
| `GET` | `/stats` | Aggregate operational metrics |
| `GET` | `/me` | Get profile info of current authenticated user |
| `GET` | `/health` | Anonymous health check endpoint |

---

## 📦 Containerization & Deployment

### Docker Multi-Stage Build
The multi-stage `Dockerfile` compiles the React frontend with Node 22 and packages it alongside the Python backend into a single container:

```bash
docker build -t multi-agent-starter .
docker run -p 8080:8080 --env-file .env multi-agent-starter
```
The entire application (API + UI) will be served from `http://localhost:8080`.

### Google Cloud Run Deployment
Deploy as a scalable, serverless container on Cloud Run:

```bash
# Build and push container
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/multi-agent-app:latest

# Deploy to Cloud Run
gcloud run deploy multi-agent-app \
  --image gcr.io/YOUR_PROJECT_ID/multi-agent-app:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi --cpu 1 --timeout 300 \
  --set-env-vars "DIRECTOR_MODEL=gemini-3.1-pro-preview" \
  --set-secrets "GOOGLE_API_KEY=GOOGLE_API_KEY:latest"
```

---

## 📂 Project Structure

```
project-newdawn/
├── agency_director/
│   └── agent.py              # Root Director agent & tool registration
├── web_researcher/
│   ├── search_agent.py       # Google Search sub-agent (Gemini 3.8 Flash)
│   ├── scraper_agent.py      # Web Scraper sub-agent (Gemini 3.8 Flash)
│   └── tools.py              # URL scraping & text cleaning tool
├── shared/
│   ├── auth.py               # Firebase Auth middleware
│   ├── approval.py           # Human-in-the-Loop (HITL) safety gates
│   ├── audit_log.py          # Firestore mutation audit logging
│   └── state_store.py        # Shared cache for cross-agent state
├── frontend/
│   ├── src/
│   │   ├── components/       # ChatInterface, AuditLogPanel, SettingsModal, LoginPage
│   │   ├── contexts/         # AuthContext (Firebase Google Sign-In)
│   │   ├── lib/firebase.ts   # Firebase client configuration
│   │   ├── App.tsx           # Main application shell
│   │   └── main.tsx
│   └── package.json
├── api.py                    # FastAPI server & ADK Runner orchestration
├── cli.py                    # Headless terminal CLI runner
├── firestore_session.py      # Firestore session service implementation
├── run_dev.sh                # Local concurrent development launcher
├── Dockerfile                # Production multi-stage container
├── requirements.txt          # Python dependencies
└── .env                      # Environment configuration
```
---

## 🚀 Quick Checklist When Duplicating for a New Client

When copying `project-newdawn` to start a new client engagement:

1. **Reset Secrets and `.env`**:
   - Copy `.env.example` to `.env` and plug in the client's own API keys (`GOOGLE_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `ZAPIER_MCP_URL`).
2. **Configure Client GCP / Firebase Project**:
   - Update the Firebase client config in `frontend/.env.development` and `frontend/.env.production`.
   - Set Google Application Default Credentials (`gcloud auth application-default login`) to the client's GCP project for Firestore.
3. **Configure Firestore Database**:
   - Ensure Cloud Firestore is enabled in the client's GCP project in Native mode.
   - Sessions, audit logs, and approval requests will be automatically created under user-scoped collections.
4. **Customize Agents & Branding**:
   - Update the supervisor's system prompt in `agency_director/agent.py`.
   - Add client-specific tools or sub-agents in place of (or alongside) `web_researcher`.
   - Update the UI branding and title in `frontend/`.
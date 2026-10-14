from pathlib import Path

from dotenv import load_dotenv
load_dotenv()  # Load .env before any code reads os.environ

from fastapi import FastAPI, HTTPException, Request, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from google.adk.runners import Runner
from google.genai.types import Content, Part
from agency_director.agent import root_agent, get_director_agent
from firestore_session import FirestoreSessionService
from google.adk.apps.app import App
from google.adk.agents.context_cache_config import ContextCacheConfig
from shared.auth import get_current_user, AuthenticatedUser
import os
import uuid
import logging
import traceback
import time
from contextlib import asynccontextmanager
from google.adk.models import LLMRegistry, LiteLlm
from typing import Optional, Any
import json

# Administrator accounts with unlimited demo access
ADMIN_EMAILS = {"reilly4181@gmail.com"}
DEMO_MESSAGE_LIMIT = int(os.environ.get("DEMO_MESSAGE_LIMIT", "15"))

# In-memory rate limiting tracker (timestamp of last request per user)
_last_request_time: dict[str, float] = {}

import litellm

# Ensure unsupported provider parameters are gracefully dropped across providers
litellm.drop_params = True

# Whitelist reasoning_effort in LiteLLM's OpenAI config so it is not dropped when reasoning_effort='none' is set
from litellm.llms.openai.chat.gpt_transformation import OpenAIGPTConfig
_orig_openai_get_supported_params = OpenAIGPTConfig.get_supported_openai_params
def _patched_openai_get_supported_params(self, model=None):
    params = _orig_openai_get_supported_params(self, model=model)
    if "reasoning_effort" not in params:
        params.append("reasoning_effort")
    return params
OpenAIGPTConfig.get_supported_openai_params = _patched_openai_get_supported_params

# Register additional frontier providers with ADK LiteLLM bridge
LLMRegistry._register(r'(xai|grok|glm|moonshot|zai)\/.*', LiteLlm)


# Configure logging for production
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("multi_agent_starter_api")

from shared.config import APP_NAME

session_service = FirestoreSessionService()

# ---------------------------------------------------------------------------
# Supported Multi-Model Catalog
# ---------------------------------------------------------------------------
AVAILABLE_MODELS = [
    # Google Gemini
    {
        "id": "gemini-3.1-pro-preview",
        "name": "Gemini 3.1 Pro (Preview)",
        "provider": "google",
        "description": "Google's premier orchestration model for multi-agent systems and deep context reasoning.",
        "is_default": True,
    },
    {
        "id": "gemini-3.8-flash",
        "name": "Gemini 3.8 Flash",
        "provider": "google",
        "description": "Ultra-fast multimodal agent model with lightning execution speeds.",
        "is_default": False,
    },


    # OpenAI GPT-6 Tier
    {
        "id": "openai/gpt-6-astra",
        "name": "GPT-6 Astra",
        "provider": "openai",
        "description": "OpenAI flagship high-intelligence model for top-tier reasoning and synthesis.",
        "is_default": False,
    },
    {
        "id": "openai/gpt-6.1-sol",
        "name": "GPT-6.1 Sol",
        "provider": "openai",
        "description": "Scaled professional and agent coding model balancing intelligence with throughput.",
        "is_default": False,
    },
    {
        "id": "openai/gpt-6-luna",
        "name": "GPT-6 Luna",
        "provider": "openai",
        "description": "High-speed, cost-efficient GPT-6 tier designed for rapid tool-calling workflows.",
        "is_default": False,
    },

    {
        "id": "openai/o3-mini",
        "name": "o3-mini",
        "provider": "openai",
        "description": "Specialized STEM and deep multi-step algorithmic reasoning model.",
        "is_default": False,
    },

    # Anthropic Claude 5.5 Series
    {
        "id": "anthropic/claude-opus-5-5",
        "name": "Claude Opus 5.5",
        "provider": "anthropic",
        "description": "Benchmark-leading frontier model for complex architectural design and analysis.",
        "is_default": False,
    },
    {
        "id": "anthropic/claude-sonnet-5-5",
        "name": "Claude Sonnet 5.5",
        "provider": "anthropic",
        "description": "Premier hybrid reasoning engine engineered for agile agentic orchestration.",
        "is_default": False,
    },

    # Groq LPU Ultra-Fast Inference
    {
        "id": "groq/llama-3.3-70b-versatile",
        "name": "Llama 3.3 70B Versatile",
        "provider": "groq",
        "description": "Meta 70B flagship running on Groq LPUs at 300+ tok/s with 128K context.",
        "is_default": False,
    },
    {
        "id": "groq/llama-3.1-8b-instant",
        "name": "Llama 3.1 8B Instant",
        "provider": "groq",
        "description": "Ultra-low latency model for high-speed sub-second agent routing and tool calls.",
        "is_default": False,
    },
    {
        "id": "groq/openai/gpt-oss-120b",
        "name": "GPT-OSS 120B (Groq)",
        "provider": "groq",
        "description": "High-capacity open weights reasoning model running on Groq LPU architecture.",
        "is_default": False,
    },

    # xAI Grok Series
    {
        "id": "xai/grok-4.7",
        "name": "Grok 4.7",
        "provider": "xai",
        "description": "xAI flagship frontier reasoning model with 500K context and native multimodality.",
        "is_default": False,
    },
    {
        "id": "xai/grok-4.6",
        "name": "Grok 4.6",
        "provider": "xai",
        "description": "High-throughput frontier model engineered for complex code generation and STEM reasoning.",
        "is_default": False,
    },

    # Frontier Cloud Intelligence
    {
        "id": "deepseek/deepseek-v4.1-flash",
        "name": "DeepSeek-V4.1-Flash",
        "provider": "cloud",
        "description": "High-speed search and reasoning-enhanced frontier cloud model.",
        "is_default": False,
    },
    {
        "id": "glm/glm-5.3",
        "name": "GLM-5.3",
        "provider": "cloud",
        "description": "Z.ai flagship coding and long-horizon agentic model with 1M context window.",
        "is_default": False,
    },
    {
        "id": "glm/glm-5.3-flash",
        "name": "GLM-5.3-Flash",
        "provider": "cloud",
        "description": "Fast 1M context agent model optimized for high-volume code generation.",
        "is_default": False,
    },
    {
        "id": "moonshot/kimi-k3",
        "name": "Kimi K3",
        "provider": "cloud",
        "description": "Moonshot AI native multimodal agentic model for extended tasks.",
        "is_default": False,
    },

    # Local & Open-Weight (Ollama / MLX)
    {
        "id": "ollama/qwen3.8-flash-next",
        "name": "Qwen 3.8 Flash-Next",
        "provider": "open_source",
        "description": "125B MoE (6B active) multimodal open model with 256K native context.",
        "is_default": False,
    },
    {
        "id": "ollama/nemotron-3.5-lightning",
        "name": "Nemotron 3.5 Lightning",
        "provider": "open_source",
        "description": "NVIDIA 30B MoE (3B active) model optimized for continuous local tool use.",
        "is_default": False,
    },
    {
        "id": "ollama/meta-muse-glimmer",
        "name": "Meta Muse Glimmer",
        "provider": "open_source",
        "description": "30B Apache 2.0 local multimodal agent model optimized for Apple Silicon / MLX.",
        "is_default": False,
    },
    {
        "id": "ollama/granite-4.2",
        "name": "IBM Granite 4.2",
        "provider": "open_source",
        "description": "Enterprise-focused open weights model built for high-security RAG.",
        "is_default": False,
    },
    {
        "id": "ollama/qwen3.8:27b",
        "name": "Qwen 3.8 27B",
        "provider": "open_source",
        "description": "Dense local multimodal model with 256K context running on consumer hardware.",
        "is_default": False,
    },
]


# Dynamic runner cache indexed by model identifier
_runner_cache: dict[str, Runner] = {}

def get_runner_for_model(model_name: Optional[str] = None) -> tuple[Runner, str]:
    """Retrieve or create an ADK Runner configured for the given model."""
    target_model = (model_name or os.environ.get("DIRECTOR_MODEL", "gemini-3.1-pro-preview")).strip()
    if target_model not in _runner_cache:
        director = get_director_agent(model=target_model)
        app_instance = App(
            name=APP_NAME,
            root_agent=director,
            context_cache_config=ContextCacheConfig(
                min_tokens=2048,
                ttl_seconds=1800,
                cache_intervals=10,
            ),
        )
        _runner_cache[target_model] = Runner(
            app=app_instance,
            session_service=session_service,
        )
        logger.info(f"Initialized new ADK Runner for model: {target_model}")
    return _runner_cache[target_model], target_model

# ---------------------------------------------------------------------------
# Lifespan – currently a no-op for Firestore
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Using Firestore for sessions.")
    yield
    logger.info("Lifespan ended.")

app = FastAPI(
    title="NewDawn Agency OS API",
    description="Enterprise Multi-Agent Orchestration & Governance API powered by Google ADK.",
    version="1.1.0",
    lifespan=lifespan,
)

# Add CORS middleware
_cors_origins_raw = os.environ.get("ALLOWED_ORIGINS", "*").strip()
_cors_origins = [o.strip() for o in _cors_origins_raw.split(",") if o.strip()] if _cors_origins_raw != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True if _cors_origins_raw != "*" else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------
class ModelOption(BaseModel):
    id: str
    name: str
    provider: str
    description: str
    is_default: bool = False

class ChatRequest(BaseModel):
    session_id: str
    message: str
    model: Optional[str] = None

class CreateSessionRequest(BaseModel):
    model: Optional[str] = None


class ChatResponse(BaseModel):
    response: str

class SessionInfo(BaseModel):
    session_id: str
    user_id: str
    created_at: Optional[str] = None
    last_update: Optional[str] = None
    message_count: int = 0
    preview: str = ""
    model: Optional[str] = None

class CreateSessionResponse(BaseModel):
    session_id: str

class SessionHistoryMessage(BaseModel):
    role: str
    content: str

class ApprovalResponse(BaseModel):
    response: str

class ApprovalInfo(BaseModel):
    id: str
    status: str
    action: str
    target_type: str
    details: dict
    timestamp: str

class McpConnection(BaseModel):
    id: str
    name: str
    type: str = "mcp_url"  # "mcp_url" or "api_key"
    url_or_key: str
    description: Optional[str] = ""
    enabled: bool = True

class IntegrationsSettings(BaseModel):
    service_api_key: Optional[str] = None
    zapier_mcp_url: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    xai_api_key: Optional[str] = None
    deepseek_api_key: Optional[str] = None
    ollama_api_base: Optional[str] = None
    custom_connections: Optional[list[McpConnection]] = []

def setup_user_model_credentials(user_uid: str) -> None:
    """Load user-specific credentials for external model providers if configured in Firestore."""
    from shared.audit_log import _get_db
    try:
        db = _get_db()
        doc_ref = db.collection("adk_apps").document(APP_NAME).collection("users").document(user_uid).collection("settings").document("integrations")
        doc = doc_ref.get()
        if doc.exists:
            data = doc.to_dict() or {}
            if data.get("openai_api_key"):
                os.environ["OPENAI_API_KEY"] = data["openai_api_key"].strip()
            if data.get("anthropic_api_key"):
                os.environ["ANTHROPIC_API_KEY"] = data["anthropic_api_key"].strip()
            if data.get("groq_api_key"):
                os.environ["GROQ_API_KEY"] = data["groq_api_key"].strip()
            if data.get("xai_api_key"):
                os.environ["XAI_API_KEY"] = data["xai_api_key"].strip()
            if data.get("deepseek_api_key"):
                os.environ["DEEPSEEK_API_KEY"] = data["deepseek_api_key"].strip()
            if data.get("ollama_api_base"):
                os.environ["OLLAMA_API_BASE"] = data["ollama_api_base"].strip()
            if data.get("service_api_key"):
                os.environ["CUSTOM_SERVICE_KEY"] = data["service_api_key"].strip()
    except Exception as e:
        logger.warning(f"Could not load custom model credentials for user {user_uid}: {e}")

def get_user_demo_turns(user_uid: str) -> int:
    """Retrieve count of demo messages submitted using the server's shared API key."""
    from shared.audit_log import _get_db
    try:
        db = _get_db()
        doc = db.collection("adk_apps").document(APP_NAME).collection("users").document(user_uid).get()
        if doc.exists:
            return int((doc.to_dict() or {}).get("demo_turns_used", 0))
        return 0
    except Exception as e:
        logger.warning(f"Could not read demo turns for {user_uid}: {e}")
        return 0


def increment_user_demo_turns(user_uid: str) -> int:
    """Increment demo turn counter in Firestore for the given user."""
    from shared.audit_log import _get_db
    from google.cloud import firestore
    try:
        db = _get_db()
        doc_ref = db.collection("adk_apps").document(APP_NAME).collection("users").document(user_uid)
        doc_ref.set({"demo_turns_used": firestore.Increment(1)}, merge=True)
        doc = doc_ref.get()
        return int((doc.to_dict() or {}).get("demo_turns_used", 1))
    except Exception as e:
        logger.warning(f"Could not increment demo turns for {user_uid}: {e}")
        return 1


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/models", response_model=list[ModelOption])
async def list_models(user: AuthenticatedUser = Depends(get_current_user)):
    """List all supported model choices across Google, OpenAI, Anthropic, and Open Source."""
    return AVAILABLE_MODELS



@app.post("/chat")
async def chat_endpoint(request: ChatRequest, user: AuthenticatedUser = Depends(get_current_user)):
    logger.info(f"Received chat request from user: {user.uid}, session: {request.session_id}, model: {request.model}")
    
    if not request.message.strip():
        logger.warning(f"Empty message received from user: {user.uid}")
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # 1. Anti-spam rate limiting (minimum 2 seconds between consecutive prompts)
    now = time.time()
    last_req = _last_request_time.get(user.uid, 0.0)
    if now - last_req < 2.0:
        logger.warning(f"Rate limit triggered for user {user.uid} (dt={now - last_req:.2f}s)")
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded: Please wait at least 2 seconds between prompts."
        )
    _last_request_time[user.uid] = now

    # 2. Demo Quota Enforcement on shared server GOOGLE_API_KEY
    is_admin = bool(user.email and user.email.lower() in {e.lower() for e in ADMIN_EMAILS})
    if not is_admin:
        turns_used = get_user_demo_turns(user.uid)
        if turns_used >= DEMO_MESSAGE_LIMIT:
            logger.warning(f"User {user.uid} ({user.email}) reached demo quota ({turns_used}/{DEMO_MESSAGE_LIMIT})")
            raise HTTPException(
                status_code=429,
                detail=f"Demo quota reached ({DEMO_MESSAGE_LIMIT}/{DEMO_MESSAGE_LIMIT} free messages). To continue using the workspace, connect your own API key in Settings (⚙️) or contact our team to deploy a private instance."
            )
        # Increment quota on successful submission
        increment_user_demo_turns(user.uid)

    # Ensure the session exists – create it on first message
    existing = await session_service.get_session(
        app_name=APP_NAME,
        user_id=user.uid,
        session_id=request.session_id,
    )
    if existing is None:
        initial_state = {}
        if request.model:
            initial_state["_selected_model"] = request.model
        await session_service.create_session(
            app_name=APP_NAME,
            user_id=user.uid,
            session_id=request.session_id,
            state=initial_state,
        )
        logger.info(f"Auto-created session {request.session_id} for user {user.uid}")

    # Determine which model to execute
    chosen_model = request.model
    if not chosen_model and existing and hasattr(existing, "state") and existing.state:
        chosen_model = existing.state.get("_selected_model")

    runner_instance, resolved_model = get_runner_for_model(chosen_model)

    # Persist the chosen model into session state
    if existing:
        current_model = (getattr(existing, "state", {}) or {}).get("_selected_model")
        if current_model != resolved_model:
            try:
                await session_service.update_session_state(
                    app_name=APP_NAME,
                    user_id=user.uid,
                    session_id=request.session_id,
                    state_updates={"_selected_model": resolved_model}
                )
            except Exception as e:
                logger.warning(f"Could not persist _selected_model to session state: {e}")

    new_message = Content(parts=[Part.from_text(text=request.message)], role="user")
    
    async def generate():
        try:
            from shared.audit_log import active_user_id, active_session_id
            active_user_id.set(user.uid)
            active_session_id.set(request.session_id)
            setup_user_model_credentials(user.uid)
            async for event in runner_instance.run_async(
                user_id=user.uid,
                session_id=request.session_id,
                new_message=new_message
            ):
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        if part.text:
                            yield f"data: {json.dumps({'type': 'token', 'text': part.text})}\n\n"
                        elif part.function_call:
                            tool_name = part.function_call.name
                            logger.info(f"Agent invoked tool: {tool_name}")
                            status_map = {
                                # Sub-Agents
                                "search_specialist_agent": "STATUS: Consulting Google Search Specialist for live data...",
                                "web_scraper_agent": "STATUS: Delegating URL inspection to Web Scraper Agent...",
                                "web_researcher_agent": "STATUS: Delegating task to Web Researcher Agent...",

                                # Custom Tools
                                "google_search": "STATUS: Grounding on the live web via Google Search...",
                                "scrape_website": "STATUS: Scraping and reading web page content...",

                                # Zapier MCP External Tools
                                "slack_send_direct_message": "STATUS: Dispatching real-time notification to Slack...",
                                "gmail_find_email": "STATUS: Locating communication threads in Gmail...",
                                "google_calendar_find_event": "STATUS: Checking agenda in Google Calendar...",
                                "google_calendar_quick_add_event": "STATUS: Scheduling Google Calendar event...",
                                "google_sheets_create_spreadsheet": "STATUS: Exporting data to Google Sheets...",
                            }
                            # fallback to using the tool name with a generic prefix
                            status = status_map.get(tool_name, f"STATUS: Interacting with {tool_name}...")
                            yield f"data: {json.dumps({'type': 'status', 'text': status})}\n\n"
                            
            logger.info(f"Successfully processed chat for user: {user.uid}, session: {request.session_id}")
            
        except Exception as e:
            error_trace = traceback.format_exc()
            logger.error(f"Error during agent execution: {str(e)}\n{error_trace}")
            err_str = str(e)
            if any(term in err_str.lower() for term in ["api_key", "api key", "authentication", "auth", "unauthorized"]):
                user_friendly = f"Authentication Error ({resolved_model}): {err_str}. Please configure the provider's API key in Settings or your environment."
            else:
                user_friendly = f"Execution Error ({resolved_model}): {err_str}"
            yield f"data: {json.dumps({'type': 'error', 'text': user_friendly})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")



@app.post("/sessions", response_model=CreateSessionResponse)
async def create_session(
    background_tasks: BackgroundTasks,
    request: Optional[CreateSessionRequest] = None,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Create a new chat session and return its ID."""
    new_id = str(uuid.uuid4())
    initial_state = {}
    if request and request.model:
        initial_state["_selected_model"] = request.model
    await session_service.create_session(
        app_name=APP_NAME,
        user_id=user.uid,
        session_id=new_id,
        state=initial_state,
    )
    logger.info(f"Created new session {new_id} for user {user.uid}")

    # Alert admin in background when a new prospect launches the workspace
    from lead_service import record_and_notify_workspace_entry
    background_tasks.add_task(
        record_and_notify_workspace_entry,
        user.uid,
        user.email,
        user.name,
        user.picture
    )

    return CreateSessionResponse(session_id=new_id)


@app.get("/sessions", response_model=list[SessionInfo])
async def list_sessions(user: AuthenticatedUser = Depends(get_current_user)):
    """List all sessions for the authenticated user, newest first."""
    from datetime import datetime, timezone

    try:
        sessions = await session_service.list_sessions(
            app_name=APP_NAME,
            user_id=user.uid,
        )
    except Exception as e:
        logger.error(f"Failed to list sessions for {user.uid}: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve sessions.")

    result: list[SessionInfo] = []
    session_list = sessions.sessions if hasattr(sessions, "sessions") else (sessions or [])

    for s in session_list:
        # list_sessions doesn't include events – fetch each session to get them
        preview = ""
        msg_count = 0
        session_model = None
        try:
            full_session = await session_service.get_session(
                app_name=APP_NAME,
                user_id=user.uid,
                session_id=s.id,
            )
            if full_session:
                state = getattr(full_session, "state", {}) or {}
                session_model = state.get("_selected_model")
                if hasattr(full_session, "events") and full_session.events:
                    msg_count = len(full_session.events)
                    # Check if we already stored a title in session state
                    if state.get("_session_title"):
                        preview = state["_session_title"]
                    else:
                        # Extract from the first user message
                        for ev in full_session.events:
                            if ev.content and ev.content.role == "user" and ev.content.parts:
                                first_text = next((p.text for p in ev.content.parts if p.text), None)
                                if first_text:
                                    preview = first_text[:80] + ("..." if len(first_text) > 80 else "")
                                    break
        except Exception as e:
            logger.warning(f"Could not fetch session {s.id} for preview: {e}")

        created = None
        updated = None
        if hasattr(s, "last_update_time") and s.last_update_time:
            ts = datetime.fromtimestamp(s.last_update_time, tz=timezone.utc).isoformat()
            updated = ts
            created = ts  # FirestoreSessionService tracks timestamp
        elif hasattr(s, "create_time") and s.create_time:
            created = str(s.create_time)
        if hasattr(s, "update_time") and s.update_time:
            updated = str(s.update_time)

        result.append(SessionInfo(
            session_id=s.id,
            user_id=user.uid,
            created_at=created,
            last_update=updated,
            message_count=msg_count,
            preview=preview,
            model=session_model,
        ))

    # Sort newest first
    result.sort(key=lambda x: x.last_update or x.created_at or "", reverse=True)
    return result



@app.get("/sessions/{session_id}/history", response_model=list[SessionHistoryMessage])
async def get_session_history(session_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    """Return the conversation history for a specific session."""
    session = await session_service.get_session(
        app_name=APP_NAME,
        user_id=user.uid,
        session_id=session_id,
    )
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    messages: list[SessionHistoryMessage] = []
    if hasattr(session, "events") and session.events:
        for ev in session.events:
            if ev.content and ev.content.parts:
                text_parts = [p.text for p in ev.content.parts if p.text]
                if text_parts:
                    messages.append(SessionHistoryMessage(
                        role=ev.content.role or "model",
                        content="\n".join(text_parts),
                    ))
    return messages


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    """Delete a session by ID."""
    try:
        await session_service.delete_session(
            app_name=APP_NAME,
            user_id=user.uid,
            session_id=session_id,
        )
        logger.info(f"Deleted session {session_id} for user {user.uid}")
        return {"status": "deleted", "session_id": session_id}
    except Exception as e:
        logger.error(f"Failed to delete session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Could not delete session.")


@app.get("/audit-log")
async def get_audit_log(limit: int = 50, user: AuthenticatedUser = Depends(get_current_user)):
    """Return the most recent audit log entries for the authenticated user."""
    from shared.audit_log import get_recent_actions
    entries = get_recent_actions(user_id=user.uid, limit=limit)
    return {"entries": entries, "total": len(entries)}


@app.get("/stats")
async def get_agency_stats(user: AuthenticatedUser = Depends(get_current_user)):
    """Compute KPI metrics dynamically by reading the user's Firestore audit log collection."""
    from shared.audit_log import get_recent_actions
    # Fetch up to 100 recent entries to aggregate stats
    entries = get_recent_actions(user_id=user.uid, limit=100)
    
    successful_actions = 0
    
    for entry in entries:
        status = entry.get("status")
        if status == "success":
            successful_actions += 1
            
    return {
        "successful_actions": successful_actions,
        "total_actions": len(entries)
    }



@app.get("/sessions/{session_id}/approvals", response_model=list[ApprovalInfo])
async def list_pending_approvals(session_id: str, user: AuthenticatedUser = Depends(get_current_user)):
    """List all pending approval requests for the active session."""
    from shared.audit_log import _get_db
    try:
        db = _get_db()
        approvals_ref = db.collection("adk_apps") \
                          .document(APP_NAME) \
                          .collection("users") \
                          .document(user.uid) \
                          .collection("sessions") \
                          .document(session_id) \
                          .collection("approvals") \
                          .where("status", "==", "pending")

        docs = approvals_ref.stream()
        results = []
        for doc in docs:
            data = doc.to_dict()
            results.append(ApprovalInfo(
                id=data["id"],
                status=data["status"],
                action=data["action"],
                target_type=data["target_type"],
                details=data["details"],
                timestamp=data["timestamp"]
            ))
        return results
    except Exception as e:
        logger.error(f"Failed to fetch pending approvals for session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve pending approvals.")


@app.post("/sessions/{session_id}/approvals/{approval_id}/respond")
async def respond_to_approval(
    session_id: str,
    approval_id: str,
    payload: ApprovalResponse,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Approve or reject a pending operation request."""
    from shared.audit_log import _get_db
    if payload.response not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Response must be 'approve' or 'reject'.")

    try:
        db = _get_db()
        doc_ref = db.collection("adk_apps") \
                    .document(APP_NAME) \
                    .collection("users") \
                    .document(user.uid) \
                    .collection("sessions") \
                    .document(session_id) \
                    .collection("approvals") \
                    .document(approval_id)

        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Approval request not found.")

        status = "approved" if payload.response == "approve" else "rejected"
        doc_ref.update({"status": status})
        
        logger.info(f"User {user.uid} responded '{payload.response}' to approval {approval_id}")
        return {"status": "ok", "approval_id": approval_id, "response": status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to submit approval response for {approval_id}: {e}")
        raise HTTPException(status_code=500, detail="Could not submit response.")


@app.get("/me")
async def get_current_user_info(user: AuthenticatedUser = Depends(get_current_user)):
    """Return the authenticated user's profile info and demo quota status."""
    is_admin = bool(user.email and user.email.lower() in {e.lower() for e in ADMIN_EMAILS})
    demo_turns_used = get_user_demo_turns(user.uid)
    return {
        "uid": user.uid,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "is_admin": is_admin,
        "demo_turns_used": demo_turns_used,
        "demo_turns_limit": DEMO_MESSAGE_LIMIT,
    }


@app.get("/health")
def health_check():
    return {"status": "ok", "app": APP_NAME, "session_backend": "firestore"}

@app.get("/settings", response_model=IntegrationsSettings)
async def get_settings(user: AuthenticatedUser = Depends(get_current_user)):
    """Retrieve user's integrations settings from Firestore."""
    from shared.audit_log import _get_db
    try:
        db = _get_db()
        doc_ref = db.collection("adk_apps").document(APP_NAME).collection("users").document(user.uid).collection("settings").document("integrations")
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict()
        return IntegrationsSettings()
    except Exception as e:
        logger.error(f"Failed to fetch settings for {user.uid}: {e}")
        return IntegrationsSettings()

@app.post("/settings", response_model=IntegrationsSettings)
async def update_settings(settings: IntegrationsSettings, user: AuthenticatedUser = Depends(get_current_user)):
    """Update user's integrations settings in Firestore."""
    from shared.audit_log import _get_db
    try:
        db = _get_db()
        doc_ref = db.collection("adk_apps").document(APP_NAME).collection("users").document(user.uid).collection("settings").document("integrations")
        doc_ref.set(settings.model_dump(exclude_unset=True), merge=True)
        logger.info(f"Updated integrations settings for user {user.uid}")
        
        # Return updated document
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict()
        return settings
    except Exception as e:
        logger.error(f"Failed to update settings for {user.uid}: {e}")
        raise HTTPException(status_code=500, detail="Could not update settings.")

# ---------------------------------------------------------------------------
# Scoping Consultation Intake & Autonomous Intelligence Pipeline
# ---------------------------------------------------------------------------
class ScopingRequest(BaseModel):
    name: str
    email: str
    company: Optional[str] = ""
    industry: Optional[str] = "finance"
    scope: Optional[str] = ""
    timestamp: Optional[str] = None

@app.post("/api/scoping-requests")
async def handle_scoping_request(req: ScopingRequest, background_tasks: BackgroundTasks):
    """Receive client consultation request, queue autonomous intelligence research and Zapier email dispatch."""
    from lead_service import process_scoping_lead
    data = req.model_dump()
    background_tasks.add_task(process_scoping_lead, data)
    return {
        "status": "ok",
        "message": "Scoping consultation request received. Autonomous intelligence research initialized."
    }

@app.get("/api/scoping-requests")
async def list_scoping_requests():
    """Retrieve logged client scoping inquiries."""
    from lead_service import get_all_leads
    return {"leads": get_all_leads()}

# ---------------------------------------------------------------------------
# Serve the React frontend (production only)
# ---------------------------------------------------------------------------
FRONTEND_DIR = Path(__file__).parent / "frontend" / "dist"

if FRONTEND_DIR.is_dir():
    # Serve static assets (JS, CSS, images) from the Vite build output
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="frontend-assets")

    # SPA fallback: any unmatched GET request serves index.html so
    # client-side routing works correctly.
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # If a real file exists in dist/, serve it (e.g. favicon, manifest)
        file_path = FRONTEND_DIR / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIR / "index.html")

    logger.info(f"Serving frontend from {FRONTEND_DIR}")
else:
    logger.info("No frontend/dist found — running API-only mode")

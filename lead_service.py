"""
Lead Intake & Autonomous Intelligence Service.

Processes client scoping requests from the Landing Page:
1. Conducts AI intelligence analysis on the prospect's company & target scope.
2. Formulates custom Google ADK multi-agent architecture recommendations.
3. Dispatches executive dossier notification to reilly4181@gmail.com via Zapier MCP Gmail.
4. Dispatches personalized follow-up acknowledgment to the prospect via Zapier MCP Gmail.
5. Persists the lead to local storage and Firestore.
"""

import os
import json
import logging
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

from google import genai
from google.genai import types
from google.adk.tools.mcp_tool import McpToolset, StreamableHTTPConnectionParams

logger = logging.getLogger("multi_agent.lead_service")

DATA_DIR = Path(__file__).parent / "data"
LEADS_FILE = DATA_DIR / "scoping_requests.json"
ADMIN_EMAIL = "reilly4181@gmail.com"


def _ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not LEADS_FILE.exists():
        LEADS_FILE.write_text("[]", encoding="utf-8")


def get_all_leads() -> list[Dict[str, Any]]:
    """Retrieve all logged scoping requests."""
    _ensure_data_dir()
    try:
        with open(LEADS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to read leads file: {e}")
        return []


def save_lead_record(record: Dict[str, Any]):
    """Save lead to local JSON and attempt Firestore persistence."""
    _ensure_data_dir()
    try:
        leads = get_all_leads()
        leads.insert(0, record)
        with open(LEADS_FILE, "w", encoding="utf-8") as f:
            json.dump(leads, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save lead locally: {e}")

    # Optional Firestore save
    try:
        from shared.audit_log import _get_db
        db = _get_db()
        app_name = os.environ.get("APP_NAME", "multi_agent_starter")
        db.collection("adk_apps").document(app_name).collection("scoping_leads").add(record)
        logger.info(f"Saved lead to Firestore collection 'scoping_leads'")
    except Exception as e:
        logger.debug(f"Firestore lead save skipped or unavailable: {e}")


async def send_email_via_zapier(to_email: str, subject: str, body: str) -> bool:
    """Send an email using Zapier MCP Gmail tool."""
    zapier_url = os.environ.get("ZAPIER_MCP_URL")
    if not zapier_url:
        logger.warning("ZAPIER_MCP_URL not configured. Email dispatch skipped.")
        return False

    try:
        params = StreamableHTTPConnectionParams(url=zapier_url, timeout=60.0)
        toolset = McpToolset(connection_params=params)
        tools = await toolset.get_tools()
        send_tool = next((t for t in tools if getattr(t, 'name', '') == 'gmail_send_email'), None)
        if not send_tool:
            logger.warning("gmail_send_email tool not found on Zapier MCP server.")
            return False

        mgr = getattr(send_tool, '_mcp_session_manager', None)
        if not mgr:
            logger.warning("No session manager on Zapier MCP tool.")
            return False

        session = await mgr.create_session()
        result = await session.call_tool(
            name="gmail_send_email",
            arguments={
                "to": [to_email],
                "subject": subject,
                "body": body,
                "body_type": "plain",
                "output_hint": "id and status"
            }
        )
        logger.info(f"Zapier MCP email successfully sent to {to_email}. Result: {result}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email via Zapier MCP to {to_email}: {e}")
        return False


async def process_scoping_lead(data: Dict[str, Any]):
    """Autonomous pipeline for new client scoping inquiries."""
    name = data.get("name", "Prospect")
    email = data.get("email", "")
    company = data.get("company", "Enterprise Client")
    industry = data.get("industry", "Technology")
    scope = data.get("scope", "Custom Agentic Automation")
    timestamp = data.get("timestamp") or datetime.utcnow().isoformat()

    logger.info(f"🚀 [NEW LEAD RECEIVED] {name} ({email}) from {company} [{industry}]")
    print(f"\n=======================================================")
    print(f"🔥 NEW CLIENT INQUIRY RECEIVED")
    print(f"👤 Name:     {name}")
    print(f"📧 Email:    {email}")
    print(f"🏢 Company:  {company} ({industry})")
    print(f"🎯 Scope:    {scope}")
    print(f"=======================================================\n")

    # Step 1: Generate AI Research Dossier & Personalized Follow-Up
    api_key = os.environ.get("GOOGLE_API_KEY")
    ai_dossier = ""
    suggested_agents = []
    followup_subject = f"New Dawn AI: Custom Multi-Agent Architecture for {company}"
    followup_body = (
        f"Hi {name},\n\n"
        f"Thank you for requesting a technical scoping consultation with New Dawn.\n"
        f"We have received your parameters regarding {scope} for {company}.\n\n"
        f"Our engineering team is preparing a custom Google ADK architecture blueprint and will follow up shortly to coordinate calendar availability.\n\n"
        f"Best regards,\nJoseph Reilly\nNew Dawn Engineering"
    )

    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"""You are an elite enterprise AI solutions architect at New Dawn.
A prospective client just requested a technical scoping consultation:
- Name: {name}
- Work Email: {email}
- Company: {company}
- Industry: {industry}
- Stated Automation Goal: "{scope}"

Tasks:
1. Intelligence Dossier: In 2 concise paragraphs, summarize what {company} likely does, their domain requirements, and which specific Google ADK sub-agents (e.g. Document Extraction Specialist, Market Benchmarking Scraper, CRM Sync Tool, Human-in-the-Loop Gatekeeper) should be deployed for their stated goal.
2. Personalized Client Follow-Up Email: Write a warm, hyper-personalized, executive-level email from New Dawn Engineering (from Joseph Reilly) acknowledging their specific goals, mentioning the exact sub-agent architecture we will blueprint for them, and offering our calendar link to review the topology.

Format output as JSON with keys:
{{
  "dossier": "...",
  "suggested_agents": ["..."],
  "followup_subject": "...",
  "followup_body": "..."
}}
"""
            gemini_model = os.environ.get("SEARCH_MODEL", "gemini-3.8-flash")
            response = client.models.generate_content(
                model=gemini_model,
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            parsed = json.loads(response.text)
            ai_dossier = parsed.get("dossier", "")
            suggested_agents = parsed.get("suggested_agents", [])
            if parsed.get("followup_subject"):
                followup_subject = parsed["followup_subject"]
            if parsed.get("followup_body"):
                followup_body = parsed["followup_body"]

            logger.info(f"Generated AI Intelligence Dossier for {company}")
        except Exception as e:
            logger.error(f"Failed to generate AI dossier with Gemini: {e}")

    # Step 2: Record details
    lead_record = {
        "name": name,
        "email": email,
        "company": company,
        "industry": industry,
        "scope": scope,
        "timestamp": timestamp,
        "dossier": ai_dossier,
        "suggested_agents": suggested_agents,
        "status": "processed"
    }
    save_lead_record(lead_record)

    # Step 3: Send Executive Dossier to Admin (reilly4181@gmail.com) via Zapier
    admin_subject = f"🔥 New Client Lead: {name} ({company}) - AI Scoping Dossier"
    admin_body = (
        f"New Technical Scoping Consultation Request Received:\n\n"
        f"-----------------------------------------\n"
        f"CLIENT CONTACT DETAILS:\n"
        f"Name: {name}\n"
        f"Work Email: {email}\n"
        f"Company: {company}\n"
        f"Industry: {industry}\n"
        f"Requested Scope: {scope}\n"
        f"Submitted At: {timestamp}\n"
        f"-----------------------------------------\n\n"
        f"AI COMPANY INTELLIGENCE & DOSSIER:\n"
        f"{ai_dossier}\n\n"
        f"RECOMMENDED SUB-AGENT TOPOLOGY:\n"
        f"{', '.join(suggested_agents) if suggested_agents else 'Custom Director + Sub-agents'}\n\n"
        f"-----------------------------------------\n"
        f"AUTOMATED CLIENT FOLLOW-UP EMAIL SENT:\n"
        f"Subject: {followup_subject}\n\n"
        f"{followup_body}\n"
    )

    logger.info(f"Dispatching notification email to {ADMIN_EMAIL} via Zapier MCP...")
    await send_email_via_zapier(
        to_email=ADMIN_EMAIL,
        subject=admin_subject,
        body=admin_body
    )

    # Step 4: Send Follow-Up Email to the Client (if email is valid and not test/placeholder)
    if email and "@" in email and not email.endswith("@example.com"):
        logger.info(f"Dispatching follow-up email to client {email} via Zapier MCP...")
        await send_email_via_zapier(
            to_email=email,
            subject=followup_subject,
            body=followup_body
        )


async def record_and_notify_workspace_entry(user_uid: str, user_email: str, user_name: str, picture: str = ""):
    """Notify admin when a prospect signs in and launches the live demo workspace."""
    if not user_email or user_email.endswith("@example.com") or user_uid == "dev-user-local":
        return

    _ensure_data_dir()
    visitors_file = DATA_DIR / "workspace_visitors.json"
    if not visitors_file.exists():
        visitors_file.write_text("[]", encoding="utf-8")

    try:
        with open(visitors_file, "r", encoding="utf-8") as f:
            visitors = json.load(f)
    except Exception:
        visitors = []

    already_seen = any(v.get("uid") == user_uid or (v.get("email") and v.get("email") == user_email) for v in visitors)
    timestamp = datetime.utcnow().isoformat()

    if not already_seen:
        new_visitor = {
            "uid": user_uid,
            "email": user_email,
            "name": user_name or "Prospect",
            "picture": picture,
            "first_visit": timestamp,
            "last_active": timestamp
        }
        visitors.insert(0, new_visitor)
        try:
            with open(visitors_file, "w", encoding="utf-8") as f:
                json.dump(visitors, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to write visitor record: {e}")

        # Also store to Firestore visitors collection if available
        try:
            from shared.audit_log import _get_db
            db = _get_db()
            app_name = os.environ.get("APP_NAME", "multi_agent_starter")
            db.collection("adk_apps").document(app_name).collection("workspace_visitors").document(user_uid).set(new_visitor)
        except Exception:
            pass

        # Dispatch immediate notification to reilly4181@gmail.com via Zapier MCP!
        subject = f"🚀 Prospect Active in Live Demo: {user_name or user_email}"
        body = (
            f"A prospect has signed in with Google and launched the New Dawn Live Workspace!\n\n"
            f"-----------------------------------------\n"
            f"PROSPECT CREDENTIALS:\n"
            f"Name:         {user_name or 'N/A'}\n"
            f"Google Email: {user_email}\n"
            f"Firebase UID: {user_uid}\n"
            f"First Login:  {timestamp}\n"
            f"-----------------------------------------\n\n"
            f"They are now actively testing the multi-agent chat interface."
        )
        logger.info(f"Dispatching workspace entry alert for {user_email} to {ADMIN_EMAIL}...")
        await send_email_via_zapier(
            to_email=ADMIN_EMAIL,
            subject=subject,
            body=body
        )

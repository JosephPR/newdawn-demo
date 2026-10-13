import os
import sys
import logging
from datetime import datetime

from google.adk import Agent
from google.adk.tools import AgentTool
from google.adk.tools.mcp_tool import McpToolset, StreamableHTTPConnectionParams
from web_researcher import search_agent, web_scraper_agent

logger = logging.getLogger("multi_agent.director")

# ==============================================================================
# 1. Sub-Agents & External Integrations
# ==============================================================================

# Register specialized sub-agents
tools_list = [
    AgentTool(agent=search_agent),
    AgentTool(agent=web_scraper_agent),
]

# Optional Zapier MCP external toolset
zapier_mcp_url = os.environ.get("ZAPIER_MCP_URL")

if zapier_mcp_url:
    try:
        zapier_params = StreamableHTTPConnectionParams(url=zapier_mcp_url, timeout=60.0)
        zapier_toolset = McpToolset(connection_params=zapier_params)
        tools_list.append(zapier_toolset)
        logger.info("Zapier MCP toolset loaded successfully")
    except Exception as e:
        logger.warning(
            f"Zapier MCP toolset failed to initialize (URL: {zapier_mcp_url}). "
            f"Agency will start without Zapier tools. Error: {e}"
        )
else:
    logger.warning("ZAPIER_MCP_URL not set in environment. Zapier toolset will not be loaded.")

# ==============================================================================
# 2. Director Agent (Supervisor)
# ==============================================================================

from google.adk.models import LiteLlm

def get_director_agent(model: str | None = None) -> Agent:
    """Factory creating an agency director agent configured with the given model."""
    selected_model = (model or os.environ.get("DIRECTOR_MODEL", "gemini-3.1-pro-preview")).strip()
    
    # OpenAI gpt-6-luna requires reasoning_effort='none' when using function tools on /v1/chat/completions
    model_arg: str | LiteLlm = selected_model
    if "gpt-6-luna" in selected_model:
        model_arg = LiteLlm(
            model=selected_model,
            reasoning_effort="none",
            allowed_openai_params=["reasoning_effort"],
        )

    return Agent(
        model=model_arg,
        name='agency_director',
        description="The primary Director agent that routes tasks across specialized sub-agents.",
        instruction=(
            f"You are the Director Agent. Today's date is {datetime.now().strftime('%A, %B %d, %Y')}. "
            "You manage a specialized team of AI agents: "
            "- `search_specialist_agent`: Use this agent to search the live web via Google Search for real-time facts, current news, and documentation links. "
            "- `web_scraper_agent`: Use this agent to scrape, read, and extract content from specific website URLs and domains. "
            "You also have direct access to the Zapier MCP Toolset to communicate outside the agency (e.g., sending Slack messages, drafting Gmails, managing Google Calendar events) if configured. "
            "You do not solve complex research or domain tasks yourself. You coordinate your team, delegate tasks to the appropriate sub-agent, use external tools when needed, and synthesize the final outcome to the user."
        ),
        tools=tools_list,
    )

root_agent = get_director_agent()



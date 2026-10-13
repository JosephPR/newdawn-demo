import os
import logging
from google.adk import Agent
from google.adk.tools import google_search

logger = logging.getLogger("multi_agent.search_agent")

# ==============================================================================
# Google Search Specialist Sub-Agent
# ==============================================================================

search_agent = Agent(
    model=os.environ.get("SEARCH_MODEL", "gemini-3.8-flash"),
    name='search_specialist_agent',
    description=(
        "Specialized sub-agent that searches the live web using Google Search "
        "for real-time facts, recent developments, current news, and documentation links."
    ),
    instruction=(
        "You are an expert Google Search Specialist. "
        "Your mission is to query the live web to find the most accurate, current, and relevant information. "
        "Use your `google_search` tool to look up facts, recent events, documentation, or discovery URLs. "
        "Return concise, factual summaries with source citations whenever applicable."
    ),
    tools=[google_search],
)

import os
import logging
from google.adk import Agent
from .tools import scrape_website

logger = logging.getLogger("multi_agent.web_scraper")

# ==============================================================================
# Web Scraper & Page Reader Sub-Agent
# ==============================================================================

web_scraper_agent = Agent(
    model=os.environ.get("RESEARCHER_MODEL", "gemini-3.8-flash"),
    name='web_scraper_agent',
    description=(
        "Specialized sub-agent that scrapes, reads, and extracts full text content "
        "from specific website URLs and domains."
    ),
    instruction=(
        "You are an expert Web Page Scraper and Reader. "
        "When given a URL or web domain: "
        "1. Use `scrape_website` to retrieve and read the visible page text. "
        "2. Parse the content to extract key facts, structured data, or answer questions about the page. "
        "3. Return clean, structured summaries back to the Director Agent."
    ),
    tools=[scrape_website],
)

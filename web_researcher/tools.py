import logging
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("multi_agent.tools.web_scraper")

def scrape_website(url: str) -> str:
    """Scrapes the visible text content from a web page URL.

    Strips boilerplate elements like scripts, styles, navigation, and footers,
    returning clean readable text capped to 5,000 characters.

    Args:
        url: The full web address to fetch (e.g. 'https://example.com' or 'example.com').
    """
    try:
        url = url.strip()
        if not url.startswith(('http://', 'https://')):
            url = f"https://{url}"

        headers = {
            'User-Agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/124.0.0.0 Safari/537.36'
            ),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }

        logger.info(f"Fetching website content from: {url}")
        response = requests.get(url, headers=headers, timeout=12)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Remove irrelevant elements that inflate context size
        for element in soup(["script", "style", "nav", "footer", "header", "noscript", "svg"]):
            element.extract()

        # Extract text and normalize whitespace
        text = soup.get_text(separator=' ')
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        clean_text = '\n'.join(chunk for chunk in chunks if chunk)

        if not clean_text:
            return f"Page at {url} loaded successfully but no visible text content was found."

        # Cap text to 5,000 characters to prevent excessive token consumption
        return clean_text[:5000]

    except requests.exceptions.Timeout:
        return f"Error: Request timed out while attempting to reach {url}."
    except requests.exceptions.RequestException as e:
        return f"Error fetching {url}: {str(e)}"
    except Exception as e:
        return f"Unexpected error scraping {url}: {str(e)}"

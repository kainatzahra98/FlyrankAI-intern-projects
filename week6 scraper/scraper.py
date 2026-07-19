import requests
from bs4 import BeautifulSoup
import urllib.robotparser
import time
import logging
from urllib.parse import urlparse, urljoin

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class ProfessionalScraper:
    def __init__(self, start_url, user_agent="Bot/1.0 (+http://example.com/bot)", rate_limit=1.0):
        self.start_url = start_url
        self.user_agent = user_agent
        self.rate_limit = rate_limit
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': self.user_agent})
        
        parsed_url = urlparse(start_url)
        self.base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
        
        # Initialize Robot File Parser
        self.rp = urllib.robotparser.RobotFileParser()
        robots_url = urljoin(self.base_url, "/robots.txt")
        self.rp.set_url(robots_url)
        try:
            self.rp.read()
            logging.info(f"robots.txt from {robots_url} parsed successfully.")
        except Exception as e:
            logging.warning(f"Could not read robots.txt: {e}")

    def can_fetch(self, url):
        """Check if we are allowed to scrape this URL according to robots.txt"""
        # If robots.txt doesn't exist or is empty, can_fetch defaults to True in Python.
        # But we also add a failsafe if self.rp wasn't initialized correctly.
        try:
            return self.rp.can_fetch(self.user_agent, url)
        except Exception:
            return True

    def fetch(self, url):
        """Fetch HTML content with rate limiting and error handling."""
        if not self.can_fetch(url):
            logging.warning(f"Scraping blocked by robots.txt for: {url}")
            return None
            
        logging.info(f"Fetching: {url}")
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            # Professional bots always respect rate limits (politeness delay)
            time.sleep(self.rate_limit)
            
            return response.text
        except requests.RequestException as e:
            logging.error(f"Error fetching {url}: {e}")
            return None

    def clean_text(self, text):
        """Basic text cleaning utility to normalize whitespaces."""
        if not text:
            return ""
        return " ".join(text.split())

    def parse_quotes(self, html):
        """
        Extraction logic: parse the HTML and extract useful fields.
        This logic is tailored for quotes.toscrape.com.
        """
        soup = BeautifulSoup(html, 'html.parser')
        quotes_data = []
        
        # Extract records
        quotes = soup.find_all('div', class_='quote')
        for quote in quotes:
            # Extract fields
            text = quote.find('span', class_='text').get_text()
            author = quote.find('small', class_='author').get_text()
            tags = [tag.get_text() for tag in quote.find_all('a', class_='tag')]
            
            # Structure into a dictionary
            quotes_data.append({
                'text': self.clean_text(text),
                'author': self.clean_text(author),
                'tags': tags
            })
            
        # Find next page link if it exists
        next_btn = soup.find('li', class_='next')
        next_url = None
        if next_btn and next_btn.find('a'):
            next_url = urljoin(self.base_url, next_btn.find('a')['href'])
            
        return quotes_data, next_url

    def run(self, max_pages=3):
        """Orchestrate the scraping pipeline."""
        all_data = []
        current_url = self.start_url
        pages_scraped = 0
        
        while current_url and pages_scraped < max_pages:
            html = self.fetch(current_url)
            if not html:
                break
                
            data, next_url = self.parse_quotes(html)
            all_data.extend(data)
            logging.info(f"Scraped {len(data)} items from page {pages_scraped + 1}.")
            
            current_url = next_url
            pages_scraped += 1
            
        return all_data

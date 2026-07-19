from scraper import ProfessionalScraper
from storage import Storage
import logging

def main():
    # As no practice site was provided, we use a standard sandbox site for testing scrapers.
    target_url = "http://quotes.toscrape.com/"
    
    # A professional bot should identify itself and provide a way for webmasters to contact it
    bot_user_agent = "DataGatheringBot/1.0 (+http://your-domain.com/bot)"
    
    logging.info(f"Starting scraper for {target_url}")
    
    scraper = ProfessionalScraper(
        start_url=target_url, 
        user_agent=bot_user_agent, 
        rate_limit=1.5  # 1.5 seconds between requests for politeness
    )
    
    # Run the pipeline (Fetch -> Parse -> Extract -> Clean -> Structure)
    # We limit to 5 pages for demonstration
    scraped_records = scraper.run(max_pages=5)
    
    logging.info(f"Total records scraped: {len(scraped_records)}")
    
    # Save structured data (output becomes the RAG corpus)
    if scraped_records:
        storage = Storage(output_dir="data")
        storage.save_json(scraped_records, "quotes_corpus.json")
        logging.info("Pipeline completed successfully.")

if __name__ == "__main__":
    main()

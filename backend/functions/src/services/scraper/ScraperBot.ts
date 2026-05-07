import * as admin from 'firebase-admin';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { IScrapedLink } from '../../domain/link.model';

/**
 * ScraperBot handles automated data collection from news outlets.
 * It strictly follows the SOLID principles by separating fetching, parsing, and storage.
 */
export class ScraperBot {
  private readonly db = admin.firestore();
  private readonly LINKS_COLLECTION = 'links';

  // Broadened selectors to ensure we catch content even if site structure shifts slightly
  private readonly SOURCES = [
  { 
    name: 'Ynet Economy', 
    url: 'https://www.ynet.co.il/economy', 
    selector: 'a' 
  },
  { 
    name: 'Calcalist Career', 
    url: 'https://www.calcalist.co.il/career/human_resources', 
    selector: '.newsItem a' 
  },
  { 
    name: 'Maariv Business', 
    url: 'https://www.maariv.co.il/news/Business', 
    selector: '.category-item-title a' 
  }
];

  public async executeDailyScrape(): Promise<void> {
    console.log("--- Starting Scrape Cycle ---");
    
    for (const source of this.SOURCES) {
      try {
        console.log(`Fetching content from: ${source.name}...`);
        const foundLinks = await this.scrapeSource(source.url, source.name, source.selector);
        
        console.log(`Source ${source.name}: Found ${foundLinks.length} potential articles.`);

        if (foundLinks.length > 0) {
          await this.persistLinks(foundLinks);
          console.log(`Persisted ${foundLinks.length} links to Firestore.`);
        }
      } catch (error) {
        // Logging the error with context to allow for easy troubleshooting in production.[cite: 1]
        console.error(`Scraping failed for ${source.name}:`, error);
      }
    }
    console.log("--- Scrape Cycle Completed ---");
  }

  private async scrapeSource(url: string, sourceName: string, selector: string): Promise<Partial<IScrapedLink>[]> {
    const { data } = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36' 
      }
    });
    
    const $ = cheerio.load(data);
    const links: Partial<IScrapedLink>[] = [];

    $(selector).each((_, el) => {
      const href = $(el).attr('href');
      const title = $(el).text().trim();

      // Heuristic: Employment articles usually have titles longer than 30 characters
      if (href && title.length > 30) {
        const fullUrl = href.startsWith('http') ? href : new URL(href, url).href;
        
        // Basic keyword filter to ensure relevance to employment/economy
        const keywords = ['עבודה', 'שכר', 'משק', 'כלכלה', 'גיוס', 'עובדים', 'תעסוקה','מעסיקים'];
        const isRelevant = keywords.some(keyword => title.includes(keyword) || fullUrl.includes(keyword));

        if (isRelevant) {
          links.push({
            url: fullUrl,
            title: title,
            sourceName: sourceName,
            status: 'pending' // Default status for RBAC manager approval[cite: 1]
          });
        }
      }
    });

    return links.slice(0, 10); // Return top 10 relevant links
  }

  private async persistLinks(links: Partial<IScrapedLink>[]): Promise<void> {
    const batch = this.db.batch();

    links.forEach(link => {
      if (!link.url) return;
      
      // Use Base64 of the URL as a unique ID to prevent duplicates in the database.[cite: 1]
      const linkId = Buffer.from(link.url).toString('base64').substring(0, 50);
      const docRef = this.db.collection(this.LINKS_COLLECTION).doc(linkId);

      batch.set(docRef, {
        ...link,
        scrapedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    await batch.commit();
  }
}
import * as admin from 'firebase-admin';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { IArticle } from '../../domain/article.model';

/**
 * ScraperBot handles automated content collection and persists it directly 
 * to the central articles collection for moderation.
 */
export class ScraperBot {
  private readonly db = admin.firestore();
  private readonly ARTICLES_COLLECTION = 'articles';

  private readonly SOURCES = [
  { 
    name: 'Ynet Economy', 
    url: 'https://www.ynet.co.il/economy', 
    selector: 'a' 
  },
  { 
    name: 'Calcalist Career', 
    url: 'https://www.calcalist.co.il/career', // Updated to a broader URL
    selector: 'a' 
  },
  { 
    name: 'Maariv Business', 
    url: 'https://www.maariv.co.il/news/business', // Fixed case-sensitivity (lowercase)
    selector: 'a' 
  }
];

  /**
   * Main entry point for the daily scraping job.
   */
  public async executeDailyScrape(): Promise<void> {
    console.log("--- Starting Scrape Cycle ---");
    
    for (const source of this.SOURCES) {
      try {
        const foundArticles = await this.scrapeSource(source.url, source.name, source.selector);
        
        if (foundArticles.length > 0) {
          await this.persistArticles(foundArticles);
          console.log(`Successfully persisted ${foundArticles.length} articles from ${source.name}.`);
        }
      } catch (error) {
        // Log error with source context for production debugging
        console.error(`Scraping failed for ${source.name}:`, error);
      }
    }
    console.log("--- Scrape Cycle Completed ---");
  }

  /**
   * Fetches and parses a specific source URL to find relevant employment content.
   */
  private async scrapeSource(url: string, sourceName: string, selector: string): Promise<Partial<IArticle>[]> {
  const { data } = await axios.get(url, {
    headers: { 
      // Enhanced headers to prevent 403 Forbidden from Akamai/Cloudflare
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    },
    timeout: 10000 // 10 seconds timeout to prevent hanging
  });
    
    const $ = cheerio.load(data);
    const articles: Partial<IArticle>[] = [];

    $(selector).each((_, el) => {
      const href = $(el).attr('href');
      const title = $(el).text().trim();

      // Heuristic: Ensure the title is descriptive enough and relevant to Jerusalem employment
      if (href && title.length > 30) {
        const fullUrl = href.startsWith('http') ? href : new URL(href, url).href;
        const keywords = ['עבודה', 'שכר', 'משק', 'כלכלה', 'גיוס', 'עובדים', 'תעסוקה', 'מעסיקים'];
        const isRelevant = keywords.some(keyword => title.includes(keyword) || fullUrl.includes(keyword));

        if (isRelevant) {
          articles.push({
            url: fullUrl,
            title: title,
            sourceName: sourceName,
            status: 'pending', // Requires Admin/Manager approval before publishing[cite: 1]
            category: 'article'
          });
        }
      }
    });

    return articles.slice(0, 10);
  }

  /**
   * Saves articles to Firestore using a batch write for atomicity and performance.
   */
  private async persistArticles(articles: Partial<IArticle>[]): Promise<void> {
    const batch = this.db.batch();

    articles.forEach(article => {
      if (!article.url) return;
      
      // Use URL Base64 as ID to prevent duplicate articles in the 'articles' collection[cite: 1]
      const articleId = Buffer.from(article.url).toString('base64').substring(0, 50);
      const docRef = this.db.collection(this.ARTICLES_COLLECTION).doc(articleId);

      batch.set(docRef, {
        ...article,
        publishedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true }); // Merge ensures we don't overwrite manual edits if a link is re-scraped
    });

    await batch.commit();
  }
}
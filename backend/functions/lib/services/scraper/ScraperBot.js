"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperBot = void 0;
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
/**
 * ScraperBot handles automated content collection and persists it directly
 * to the central articles collection for moderation.
 */
class ScraperBot {
    db = admin.firestore();
    ARTICLES_COLLECTION = 'articles';
    DEFAULT_SOURCES = [
        {
            name: 'Ynet Economy',
            url: 'https://www.ynet.co.il/economy',
            selector: 'a'
        },
        {
            name: 'Calcalist Career',
            url: 'https://www.calcalist.co.il/career',
            selector: 'a'
        },
        {
            name: 'Maariv Business',
            url: 'https://www.maariv.co.il/news/business',
            selector: 'a'
        }
    ];
    DEFAULT_KEYWORDS = ['עבודה', 'שכר', 'משק', 'כלכלה', 'גיוס', 'עובדים', 'תעסוקה', 'מעסיקים'];
    async getBotConfig() {
        const docRef = this.db.collection('settings').doc('bot_config');
        const doc = await docRef.get();
        if (!doc.exists) {
            const defaultConfig = { sources: this.DEFAULT_SOURCES, keywords: this.DEFAULT_KEYWORDS };
            await docRef.set(defaultConfig);
            return defaultConfig;
        }
        return doc.data();
    }
    /**
     * Main entry point for the daily scraping job.
     */
    async executeDailyScrape() {
        console.log("--- Starting Scrape Cycle ---");
        const config = await this.getBotConfig();
        const sources = config.sources || this.DEFAULT_SOURCES;
        const keywords = config.keywords || this.DEFAULT_KEYWORDS;
        for (const source of sources) {
            try {
                const foundArticles = await this.scrapeSource(source.url, source.name, source.selector, keywords);
                if (foundArticles.length > 0) {
                    await this.persistArticles(foundArticles);
                    console.log(`Successfully persisted ${foundArticles.length} articles from ${source.name}.`);
                }
            }
            catch (error) {
                // Log error with source context for production debugging
                console.error(`Scraping failed for ${source.name}:`, error);
            }
        }
        console.log("--- Scrape Cycle Completed ---");
    }
    /**
     * Fetches and parses a specific source URL to find relevant employment content.
     */
    async scrapeSource(url, sourceName, selector, keywords) {
        const { data } = await axios_1.default.get(url, {
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
        const articles = [];
        $(selector).each((_, el) => {
            const href = $(el).attr('href');
            const title = $(el).text().trim();
            // Heuristic: Ensure the title is descriptive enough and relevant to Jerusalem employment
            if (href && title.length > 30) {
                const fullUrl = href.startsWith('http') ? href : new URL(href, url).href;
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
        const topArticles = articles.slice(0, 10);
        // Perform a secondary fetch to grab rich metadata (og:image, description) for the found articles
        for (const article of topArticles) {
            if (!article.url)
                continue;
            try {
                const { data: articleHtml } = await axios_1.default.get(article.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept-Language': 'he-IL,he;q=0.9'
                    },
                    timeout: 5000
                });
                const $article = cheerio.load(articleHtml);
                const imageUrl = $article('meta[property="og:image"]').attr('content') || $article('meta[name="twitter:image"]').attr('content');
                const description = $article('meta[property="og:description"]').attr('content') || $article('meta[name="description"]').attr('content');
                if (imageUrl)
                    article.imageUrl = imageUrl;
                if (description)
                    article.content = description.substring(0, 300); // Limit length
            }
            catch (e) {
                console.warn(`Failed to fetch rich metadata for ${article.url}`);
            }
        }
        return topArticles;
    }
    /**
     * Saves articles to Firestore using a batch write for atomicity and performance.
     */
    async persistArticles(articles) {
        const batch = this.db.batch();
        articles.forEach(article => {
            if (!article.url)
                return;
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
exports.ScraperBot = ScraperBot;

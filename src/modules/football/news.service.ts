import axios from 'axios';
import MatchNews from './models/news.model';

export class NewsService {
    private static FEED_URLS = [
        'https://feeds.bbci.co.uk/sport/football/rss.xml',
        'https://www.skysports.com/rss/11095'
    ];

    /**
     * Simple XML parser to extract items from RSS feed
     */
    private static parseRss(xml: string) {
        const items: any[] = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;

        while ((match = itemRegex.exec(xml)) !== null) {
            const itemContent = match[1];
            if (!itemContent) continue;

            const title = itemContent.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] 
                || itemContent.match(/<title>([\s\S]*?)<\/title>/)?.[1];
            const description = itemContent.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1]
                || itemContent.match(/<description>([\s\S]*?)<\/description>/)?.[1];
            const link = itemContent.match(/<link>([\s\S]*?)<\/link>/)?.[1];
            const pubDate = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1];


            if (title && description) {
                items.push({
                    title: title.trim(),
                    description: description.trim(),
                    link: link?.trim(),
                    pubDate: pubDate ? new Date(pubDate) : new Date()
                });
            }
        }
        return items;
    }

    /**
     * Scrape news from multiple sources and store in DB
     */
    static async scrapeAndStoreNews() {
        console.log('Starting news scraping...');
        let totalAdded = 0;

        for (const url of this.FEED_URLS) {
            try {
                const { data } = await axios.get(url);
                const items = this.parseRss(data);

                for (const item of items) {
                    // Simple logic to associate news with teams
                    // We can expand this later with a dedicated team list

                    
                    const existing = await MatchNews.findOne({ content: item.description, teamName: item.title });
                    if (!existing) {
                        await MatchNews.create({
                            teamName: item.title.slice(0, 100), // Using title as a proxy for team/topic
                            content: item.description,
                            source: url.includes('bbc') ? 'BBC Sport' : 'Sky Sports',
                            url: item.link,
                            publishedAt: item.pubDate
                        });
                        totalAdded++;
                    }
                }
            } catch (error) {
                console.error(`Error scraping ${url}:`, error);
            }
        }

        console.log(`News scraping finished. Added ${totalAdded} new items.`);
        return totalAdded;
    }

    /**
     * Get news for a specific team by searching content
     */
    static async getNewsForTeam(teamName: string) {
        const regex = new RegExp(teamName, 'i');
        return MatchNews.find({
            $or: [
                { teamName: regex },
                { content: regex }
            ]
        }).limit(5).sort({ publishedAt: -1 });
    }
}

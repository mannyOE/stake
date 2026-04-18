import { Agenda } from "agenda";
import moment from "moment";
import { FootballService } from "../../football/football.service";
import { NewsService } from "../../football/news.service";
import { ResultService } from "../../football/result.service";
import { buildFootballLLMRequest } from "../../ai/ai.services";
import { OpenAIClient } from "../../ai/openai.services";
import Prediction from "../../football/models/prediction.model";

const aiClient = new OpenAIClient();

export default async (agenda: Agenda) => {
    /**
     * Job: Scrape football news
     * Runs every 2 hours to keep the MatchNews collection fresh
     */
    agenda.define('scrape football news', async () => {
        console.log('[Job] Starting news scraping');
        await NewsService.scrapeAndStoreNews();
        console.log('[Job] News scraping finished');
    });

    /**
     * Job: Track and resolve yesterday's results
     * Runs at 11:30 PM UTC
     */
    agenda.define('track daily results', async () => {
        console.log('[Job] Starting result tracking');
        await ResultService.updateDailyResults();
        console.log('[Job] Result tracking finished');
    });

    /**
     * Job: Primary Football Prediction Orchestrator
     * Runs at 4 AM UTC daily
     */
    agenda.define('generate football predictions', async () => {
        console.log('[Job] Starting football prediction generation');

        const today = moment().format('YYYY-MM-DD');
        
        // 1. Fetch data
        const [apiFixtures, stakeEvents] = await Promise.all([
            FootballService.fetchFixturesForDate(today),
            FootballService.fetchStakeEvents(200)
        ]);

        console.log(`[Job] Found ${apiFixtures.length} fixtures and ${stakeEvents.length} Stake events`);

        // 2. Match them
        const matched = FootballService.matchFixtures(apiFixtures, stakeEvents);
        console.log(`[Job] Successfully matched ${matched.length} fixtures`);

        // 3. Process matches in small batches to respect rate limits
        for (const pair of matched.slice(0, 20)) { // Limit to 20 matches for now to avoid long runs
            try {
                const { api, stake } = pair;
                
                // Fetch stats (rate limited)
                const stats = await FootballService.fetchMatchStats(api.fixture.id);
                
                // Fetch local news from our DB
                const homeNews = await NewsService.getNewsForTeam(api.teams.home.name);
                const awayNews = await NewsService.getNewsForTeam(api.teams.away.name);
                const news = [...homeNews, ...awayNews];

                // Build AI request
                const payload = {
                    stats,
                    outcomes: stake.markets, // Markets and outcomeIds from Stake
                    news: news.map(n => n.content)
                };

                const request = await buildFootballLLMRequest(payload);
                const fullPrompt = request.input.map(m => `[${m.role}]\n${m.content}`).join('\n\n');
                const response = await aiClient.generate(request.input);

                try {
                    const data = JSON.parse(response.data);
                    
                    // Store cumulated ticket
                    if (data.cumulated_ticket) {
                        await Prediction.create({
                            fixtureId: api.fixture.id,
                            stakeEventId: stake.id,
                            type: 'cumulated',
                            legs: data.cumulated_ticket.legs,
                            totalOdds: parseFloat(data.cumulated_ticket.total_odds || '0'),
                            estimatedProbability: data.cumulated_ticket.estimated_probability,
                            reasoning: data.cumulated_ticket.reasoning,
                            status: 'pending',
                            prompt: fullPrompt,
                            rawAIResponse: response.data
                        });
                    }

                    // Store optimal combinations
                    if (Array.isArray(data.optimal_combinations)) {
                        for (const combo of data.optimal_combinations) {
                            await Prediction.create({
                                fixtureId: api.fixture.id,
                                stakeEventId: stake.id,
                                type: 'optimal',
                                legs: combo.legs,
                                totalOdds: parseFloat(combo.total_odds || '0'),
                                estimatedProbability: combo.estimated_probability,
                                reasoning: combo.reasoning,
                                status: 'pending',
                                prompt: fullPrompt,
                                rawAIResponse: response.data
                            });
                        }
                    }
                } catch (parseError) {
                    console.error('[Job] Failed to parse AI response JSON:', response.data);
                }

            } catch (matchError) {
                console.error(`[Job] Error processing match ${pair.api.fixture.id}:`, matchError);
            }
        }

        console.log('[Job] Football prediction generation finished');
    });
};
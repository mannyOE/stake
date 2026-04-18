import axios from 'axios';
import Bottleneck from 'bottleneck';

// Rate limiter for API-Football (10 requests per minute as requested)
const limiter = new Bottleneck({
    minTime: 6000, // 6 seconds per request = 10 requests per minute
});

const API_FOOTBALL_KEY = '14cdbdb430234743abc1715715736f40';
const API_BASE = 'https://api-football-v1.p.rapidapi.com/v3';

/**
 * Service to handle all football data fetching and matching
 */
export class FootballService {
    /**
     * Fetch top 10 active leagues for the day
     */
    static async fetchTopActiveLeagues() {
        try {
            const response = await axios.get(`${API_BASE}/leagues`, {
                headers: {
                    'X-RapidAPI-Key': API_FOOTBALL_KEY,
                    'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
                }
            });

            // For now, let's return the most popular ones or first 10
            // In a real scenario, we'd check which ones have fixtures today
            const popularIds = [2, 3, 39, 140, 78, 135, 61, 94, 88, 144]; // Top European + a few others
            const leagues = response.data?.response || [];
            return leagues
                .filter((l: any) => popularIds.includes(l.league.id))
                .map((l: any) => l.league.id)
                .slice(0, 10);
        } catch (error) {
            console.error('Error fetching leagues:', error);
            return [39, 140, 78, 135, 61]; // Default fallback
        }
    }

    /**
     * Fetch all fixtures for a given date across the top leagues
     */
    static async fetchFixturesForDate(date: string) {
        try {
            const leagueIds = await this.fetchTopActiveLeagues();
            const response = await axios.get(`${API_BASE}/fixtures`, {
                headers: {
                    'X-RapidAPI-Key': API_FOOTBALL_KEY,
                    'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
                },
                params: { date, ids: leagueIds.join('-') }
            });

            return response.data?.response || [];
        } catch (error) {
            console.error('Error fetching fixtures:', error);
            return [];
        }
    }

    /**
     * Fetch match statistics for a specific fixture (Rate limited)
     */
    static async fetchMatchStats(fixtureId: number) {
        return limiter.schedule(async () => {
            try {
                const response = await axios.get(`${API_BASE}/fixtures/statistics`, {
                    headers: {
                        'X-RapidAPI-Key': API_FOOTBALL_KEY,
                        'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
                    },
                    params: { fixture: fixtureId }
                });
                return response.data?.response || [];
            } catch (error) {
                console.error(`Error fetching stats for fixture ${fixtureId}:`, error);
                return [];
            }
        });
    }

    /**
     * Fetch upcoming events from Stake.com using GraphQL
     */
    static async fetchStakeEvents(limit = 100) {
        const query = `query SportsEvents($first: Int!, $sportSlug: String!) {
          sportsEvents(first: $first, sportSlug: $sportSlug) {
            edges {
              node {
                id
                name
                startTime
                league { name }
                competitors { name }
                markets {
                  id
                  name
                  outcomes {
                    id
                    name
                    odds
                  }
                }
              }
            }
          }
        }`;

        const variables = { first: limit, sportSlug: "football" };

        try {
            const res = await axios.post('https://stake.com/_api/graphql', {
                query,
                variables,
                operationName: "SportsEvents"
            }, {
                headers: { 
                    'x-access-token': process.env['STAKE_API_KEY'] || '', 
                    'Content-Type': 'application/json' 
                }
            });

            return res.data?.data?.sportsEvents?.edges?.map((e: any) => e.node) || [];
        } catch (e: any) {
            console.error('❌ Fetch Stake events error:', e.message);
            return [];
        }
    }

    /**
     * Simple Levenshtein distance for fuzzy matching team names
     */
    static getSimilarity(s1: string, s2: string): number {
        const len1 = s1.length;
        const len2 = s2.length;
        const matrix: number[][] = [];

        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        for (let j = 1; j <= len2; j++) {
            matrix[0]![j] = j;
        }

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                matrix[i]![j] = Math.min(
                    matrix[i - 1]![j]! + 1,
                    matrix[i]![j - 1]! + 1,
                    matrix[i - 1]![j - 1]! + cost
                );
            }
        }

        return 1 - (matrix[len1]?.[len2] || 0) / Math.max(len1, len2);
    }


    /**
     * Match API-Football fixtures with Stake events
     */
    static matchFixtures(apiFixtures: any[], stakeEvents: any[]) {
        const matches: Array<{ api: any; stake: any }> = [];

        for (const apiFix of apiFixtures) {
            const apiHome = apiFix.teams.home.name.toLowerCase();
            const apiAway = apiFix.teams.away.name.toLowerCase();

            let bestMatch = null;
            let highestScore = 0;

            for (const stakeEv of stakeEvents) {
                // Stake event name is usually "Home vs Away"
                const stakeNames = stakeEv.name.toLowerCase().split(' vs ');
                if (stakeNames.length < 2) continue;

                const stakeHome = stakeNames[0].trim();
                const stakeAway = stakeNames[1].trim();

                const homeScore = this.getSimilarity(apiHome, stakeHome);
                const awayScore = this.getSimilarity(apiAway, stakeAway);
                const avgScore = (homeScore + awayScore) / 2;

                if (avgScore > 0.8 && avgScore > highestScore) {
                    highestScore = avgScore;
                    bestMatch = stakeEv;
                }
            }

            if (bestMatch) {
                matches.push({ api: apiFix, stake: bestMatch });
            }
        }

        return matches;
    }
}

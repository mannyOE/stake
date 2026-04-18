import Prediction from './models/prediction.model';
import { FootballService } from './football.service';
import moment from 'moment';

export class ResultService {
    /**
     * Fetch actual results for pending predictions and update their status
     */
    static async updateDailyResults() {
        console.log('Starting daily result updates...');
        
        // Find all pending predictions
        const pending = await Prediction.find({ status: 'pending' });
        if (!pending.length) {
            console.log('No pending predictions to update.');
            return;
        }

        const today = moment().format('YYYY-MM-DD');
        const fixtures = await FootballService.fetchFixturesForDate(today);

        let updatedCount = 0;

        for (const pred of pending) {
            const fixture = fixtures.find((f: any) => f.fixture.id === pred.fixtureId);
            
            if (fixture && fixture.fixture.status.short === 'FT') {
                const homeGoals = fixture.goals.home;
                const awayGoals = fixture.goals.away;
                const score = `${homeGoals}-${awayGoals}`;

                // Simple check for 1x2 markets (can be expanded for other markets)
                let resultStatus: 'won' | 'lost' = 'lost';
                
                for (const leg of pred.legs) {
                    // Logic to check if the specific leg won
                    // This depends on the market name/description
                    // For now, let's assume it's 1X2 for simplicity
                    if (leg.market.toLowerCase().includes('home')) {
                        if (homeGoals > awayGoals) resultStatus = 'won';
                    } else if (leg.market.toLowerCase().includes('away')) {
                        if (awayGoals > homeGoals) resultStatus = 'won';
                    } else if (leg.market.toLowerCase().includes('draw')) {
                        if (homeGoals === awayGoals) resultStatus = 'won';
                    }
                    // Add more market logic as needed (Over/Under, BTTS, etc.)
                }

                pred.status = resultStatus;
                pred.actualResult = { score, goals: fixture.goals };
                pred.resolvedAt = new Date();
                await pred.save();
                updatedCount++;
            }
        }

        console.log(`Result updates finished. Updated ${updatedCount} predictions.`);
        return updatedCount;
    }
}

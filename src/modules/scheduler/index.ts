import { Agenda } from 'agenda';
import config from '../../config/config';
import backgroundTasks from './jobs/backgroundTasks';

const agenda = new Agenda({
  db: {
    address: `${config.mongoose.url}`,
    collection: process.env['SCHEDULER_COLLECTION'] || 'crons',
  },
});

// Map job types to their implementations (all defined in backgroundTasks.ts)
const registerJobs = (agenda: Agenda) => {
  backgroundTasks(agenda);
};

registerJobs(agenda);

agenda.on('ready', async () => {
  await agenda.start();
  console.log('Agenda started and ready');

  // Schedule: Scrape news every 2 hours
  await agenda.every('2 hours', 'scrape football news');

  // Schedule: Generate predictions daily at 4 AM UTC
  await agenda.every('0 4 * * *', 'generate football predictions');

  // Schedule: Track results daily at 11:30 PM UTC
  await agenda.every('30 23 * * *', 'track daily results');

  console.log('Daily jobs scheduled');
});

const graceful = () => {
  agenda.stop().then(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', graceful);
process.on('SIGINT', graceful);

export { agenda };
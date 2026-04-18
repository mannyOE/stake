import mongoose from 'mongoose';
import config from './config/config';
import { agenda } from './modules/scheduler/index';

mongoose.connect(config.mongoose.url).then(async () => {
  console.info('Connected to MongoDB');
  console.info('Background Worker Started');
});

const exitHandler = () => {
  agenda.stop().then(() => {
    console.info('Agenda stopped');
    process.exit(1);
  });
};

const unexpectedErrorHandler = (error: any) => {
  console.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  console.info('SIGTERM received');
  agenda.stop().then(() => {
    console.info('Agenda stopped');
    process.exit(0);
  });
});

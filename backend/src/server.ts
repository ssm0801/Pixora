import 'dotenv/config';
import app from './app';
import connectDB from './config/db';
import { schedulePurge } from './utils/purgeDeletedEvents';

const PORT = parseInt(process.env.PORT || '5000', 10);

const start = async () => {
  await connectDB();
  schedulePurge(); // run at startup + every 24 h
  app.listen(PORT, () => {
    console.log(`Pixora API running on http://localhost:${PORT}`);
  });
};

start();

import 'dotenv/config';
import app from './app';
import connectDB from './config/db';

const PORT = parseInt(process.env.PORT || '5000', 10);

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Pixora API running on http://localhost:${PORT}`);
  });
};

start();

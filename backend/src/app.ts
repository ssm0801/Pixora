import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import './config/passport'; // register Google strategy
import passport from 'passport';
import authRoutes from './routes/authRoutes';
import eventRoutes from './routes/eventRoutes';
import photoRoutes from './routes/photoRoutes';
import mediaRoutes from './routes/mediaRoutes';
import folderRoutes from './routes/folderRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import notificationRoutes from './routes/notificationRoutes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize()); // no sessions — JWT only

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/events', folderRoutes);
app.use('/api/events', analyticsRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/media',  mediaRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;

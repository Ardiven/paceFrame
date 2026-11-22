import express from 'express';
import cors from 'cors';
import coachRoutes from './routes/coachRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import onboardingRoutes from './routes/onboardingRoutes.js';
import mutationRoutes from './routes/mutationRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import { authMiddleware } from './middleware/authMiddleware.js';

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      app: 'PaceFrame AI',
      timestamp: new Date().toISOString()
    });
  });

  // Global Auth / Single-User identity injection
  app.use(authMiddleware);

  // API Routes
  app.use('/api/coach', coachRoutes);
  app.use('/api/schedules', scheduleRoutes);
  app.use('/api/onboarding', onboardingRoutes);
  app.use('/api/mutations', mutationRoutes);
  app.use('/api/account', accountRoutes);

  return app;
}

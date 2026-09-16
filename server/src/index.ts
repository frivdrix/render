import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import accountsRoutes from './routes/accounts.routes.js';
import campaignsRoutes from './routes/campaigns.routes.js';
import leadsRoutes from './routes/leads.routes.js';
import trackingRoutes from './routes/tracking.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import { QueueService } from './services/queue.service.js';
import { ReplyScannerService } from './services/reply-scanner.service.js';
import { db } from './database/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and rich JSON parsing (supports large pasted Excel spreadsheets)
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});
app.get('/api/health', (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API Routes
app.use('/api/accounts', accountsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);

// Tracking Endpoints (Open pixel & Click redirects)
app.use('/t', trackingRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

// Start Background Campaign Queue Engine & Reply Scanner Worker (24/7 automated)
QueueService.start();
ReplyScannerService.start();

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 NexusSend Cold Email CRM Backend is live on port ${PORT}`);
  console.log(`📡 Tracking Base URL: http://localhost:${PORT}/t`);
  console.log(`====================================================`);
});

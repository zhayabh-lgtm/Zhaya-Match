import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Repository } from './src/lib/repository.js';
import { calculateRecommendation } from './src/domain/recommendation.js';
import { generateWidgetScript } from './src/widget/standaloneWidget.js';
import { verifyAdminAuth } from './src/lib/adminAuth.js';
import adminAnalyticsHandler from './api/admin/analytics.js';
import adminDiagnosticsHandler from './api/admin/diagnostics.js';
import publicAnalyticsHandler from './api/public/analytics.js';
import publicFeedbackHandler from './api/public/feedback.js';
import publicHealthHandler from './api/public/health.js';
import publicConfigHandler from './api/public/config.js';
import adminLiveInvitesHandler from './api/admin/live-invites.js';
import publicLiveInviteHandler from './api/public/live-invite.js';
import publicLiveIcsHandler from './api/public/live-ics.js';
import publicLiveClickHandler from './api/public/live-click.js';
import adminBestSellersHandler from './serverless/best-sellers/admin-lists.js';
import adminBestSellerProductsHandler from './serverless/best-sellers/admin-products.js';
import publicBestSellersHandler from './serverless/best-sellers/public-list.js';
import publicBestSellerClickHandler from './serverless/best-sellers/public-click.js';
import unifiedBestSellersHandler from './api/best-sellers.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for Cloud Run and reverse proxies
  app.set('trust proxy', true);

  app.use(express.json());

  // Global CORS Middleware for public widget API and standalone script
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  // 1. Standalone embeddable Widget JS endpoint
  app.get('/widget.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    const forwardedProto = req.headers['x-forwarded-proto'];
    const protoStr = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0].trim() : req.protocol;
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';

    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const protocol = isLocal ? protoStr : 'https';
    const appUrl = `${protocol}://${host}`;

    const isDev = process.env.NODE_ENV !== 'production';

    if (isDev) {
      // In development: Always generate dynamically from standaloneWidget.ts without caching or stale public file interference
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      const script = generateWidgetScript(appUrl);
      return res.status(200).send(script);
    }

    // In production: Max 60 seconds cache, serving static build output if available
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');

    const distWidgetPath = path.join(process.cwd(), 'dist', 'widget.js');
    if (fs.existsSync(distWidgetPath)) {
      return res.sendFile(distWidgetPath);
    }

    const publicWidgetPath = path.join(process.cwd(), 'public', 'widget.js');
    if (fs.existsSync(publicWidgetPath)) {
      return res.sendFile(publicWidgetPath);
    }

    const script = generateWidgetScript(appUrl);
    return res.status(200).send(script);
  });

  // 2. Diagnostic public endpoint for Widget status
  app.get('/widget-status', async (req, res) => {
    try {
      const forwardedProto = req.headers['x-forwarded-proto'];
      const protoStr = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0].trim() : req.protocol;
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';

      const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
      const protocol = isLocal ? protoStr : 'https';
      const appUrl = `${protocol}://${host}`;

      let version = 1;
      let allowedDomains = [
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'https://zhaya.com.br',
        'https://www.zhaya.com.br',
      ];

      try {
        const config = await Repository.getConfig();
        if (config.version) version = config.version;
        if (config.allowedDomains && config.allowedDomains.length > 0) {
          allowedDomains = Array.from(new Set([
            ...allowedDomains,
            ...config.allowedDomains,
          ]));
        }
      } catch (e) {
        // Fallback to default list
      }

      res.status(200);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      return res.json({
        status: 'published',
        widgetUrl: `${appUrl}/widget.js`,
        expectedHttpResponse: 200,
        contentType: 'application/javascript; charset=utf-8',
        version: version,
        publicConfigEndpoint: `${appUrl}/api/public/config`,
        allowedDomains: allowedDomains,
      });
    } catch (err: any) {
      return res.status(500).json({
        status: 'error',
        message: err?.message || 'SERVER_ERROR',
      });
    }
  });

  // 3. Public API - Full widget initial config
  app.get('/api/public/config', publicConfigHandler);

  // Legacy fallback URL for widget backwards compatibility
  app.get('/api/public/products/:id', publicConfigHandler);

  // 4. Public API - Server-side recommendation endpoint
  app.post('/api/public/recommend', async (req, res) => {
    try {
      const { productTypeId, userMeasurements } = req.body;
      const productTypes = await Repository.getProductTypes();
      const productType = productTypes.find((pt) => pt.id === productTypeId);

      if (!productType) {
        return res.status(404).json({ error: 'PRODUCT_TYPE_NOT_FOUND' });
      }

      const result = calculateRecommendation(productType, userMeasurements || {});
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      return res.json(result);
    } catch (err: any) {
      console.error('Recommendation API Error:', err);
      return res.status(500).json({ error: 'CALCULATION_FAILED' });
    }
  });

  // 5. Public API - Analytics Event Ingestion
  app.post('/api/public/analytics', publicAnalyticsHandler);

  // 5b. Public API - Feedback Survey Ingestion
  app.post('/api/public/feedback', publicFeedbackHandler);

  // 6. Admin API - Analytics Summary
  app.get('/api/admin/analytics', adminAnalyticsHandler);

  // 6b. Admin API - Diagnostics Status
  app.get('/api/admin/diagnostics', adminDiagnosticsHandler);

  // 6c. Admin API - Live Invites (Management)
  app.all('/api/admin/live-invites', adminLiveInvitesHandler);

  // 6d. Public API - Live Invite Public Lookup & ICS Generation & Click Counter
  app.all('/api/public/live-invite', publicLiveInviteHandler);
  app.all('/api/public/live-ics', publicLiveIcsHandler);
  app.all('/api/public/live-click', publicLiveClickHandler);

  // 6e. Unified Best Sellers API (mesma função usada na Vercel Hobby)
  app.all('/api/best-sellers', unifiedBestSellersHandler);

  // 6e. Admin API - Mais Vendidos do Dia (Lists & Products Management)
  app.all('/api/admin/best-sellers', adminBestSellersHandler);
  app.all('/api/admin/best-seller-products', adminBestSellerProductsHandler);

  // 6f. Public API - Mais Vendidos do Dia (Vitrine & Tracking de Cliques)
  app.all('/api/public/best-sellers', publicBestSellersHandler);
  app.all('/api/public/best-seller-click', publicBestSellerClickHandler);

  // 7. Admin API - System Activity Monitor
  app.get('/api/admin/activity-status', async (req, res) => {
    try {
      const auth = await verifyAdminAuth(req);
      if (!auth.authorized) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: auth.error });
      }

      const status = await Repository.getActivityStatus();
      return res.json(status);
    } catch (err: any) {
      console.error('Activity Status Error:', err);
      return res.status(500).json({ error: 'FAILED_TO_GET_ACTIVITY_STATUS' });
    }
  });

  // 8. Public Health Check Endpoints
  app.get('/api/health', publicHealthHandler);
  app.get('/api/public/health', publicHealthHandler);

  // 9. Automated Cron Trigger Endpoint
  app.all('/api/cron/health', async (req, res) => {
    try {
      const cronSecret = process.env.CRON_SECRET;
      const authHeader = req.headers.authorization;
      const isVercelCron = req.headers['x-vercel-cron'] === '1';

      if (cronSecret) {
        const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
        if (token !== cronSecret && !isVercelCron) {
          return res.status(401).json({ error: 'UNAUTHORIZED_CRON_REQUEST' });
        }
      }

      const result = await Repository.runActivityCheck();
      return res.json({
        success: result.ok,
        executedAt: new Date().toISOString(),
        status: result.status,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: 'CRON_EXECUTION_FAILED',
        message: err?.message || 'Erro durante a execução do cron de saúde.',
      });
    }
  });

  // Vite Middleware or Static Production Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Zhaya Match Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

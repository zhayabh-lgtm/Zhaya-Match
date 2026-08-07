import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Repository } from './src/lib/repository';
import { calculateRecommendation } from './src/domain/recommendation';
import { generateWidgetScript } from './src/widget/standaloneWidget';
import { verifyAdminAuth } from './src/lib/adminAuth';

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
  app.get('/api/public/config', async (req, res) => {
    try {
      const productTypes = await Repository.getProductTypes();
      const appearance = await Repository.getAppearance();
      const texts = await Repository.getTexts();
      const measurementHelps = await Repository.getMeasurementHelps();
      const config = await Repository.getConfig();

      const defaultDomains = [
        'zhaya.com.br',
        'www.zhaya.com.br',
        'localhost',
        '127.0.0.1',
        'localhost:8080',
        '127.0.0.1:8080',
      ];

      const allowedDomains = (config.allowedDomains && config.allowedDomains.length > 0)
        ? Array.from(new Set([...config.allowedDomains, ...defaultDomains]))
        : defaultDomains;

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
      return res.json({
        enabled: config.enabled !== false,
        version: config.version || 1,
        allowedDomains: allowedDomains,
        testMode: config.testMode || false,
        productTypes: productTypes.filter((pt) => pt.active !== false),
        appearance,
        texts,
        measurementHelps,
      });
    } catch (err: any) {
      console.error('API Error:', err);
      return res.status(500).json({ enabled: false, error: 'SERVER_ERROR' });
    }
  });

  // Legacy fallback URL for widget backwards compatibility
  app.get('/api/public/products/:id', async (req, res) => {
    try {
      const productTypes = await Repository.getProductTypes();
      const appearance = await Repository.getAppearance();
      const texts = await Repository.getTexts();
      const measurementHelps = await Repository.getMeasurementHelps();
      const config = await Repository.getConfig();

      const defaultDomains = [
        'zhaya.com.br',
        'www.zhaya.com.br',
        'localhost',
        '127.0.0.1',
        'localhost:8080',
        '127.0.0.1:8080',
      ];

      const allowedDomains = (config.allowedDomains && config.allowedDomains.length > 0)
        ? Array.from(new Set([...config.allowedDomains, ...defaultDomains]))
        : defaultDomains;

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
      return res.json({
        enabled: config.enabled !== false,
        version: config.version || 1,
        allowedDomains: allowedDomains,
        testMode: config.testMode || false,
        productTypes: productTypes.filter((pt) => pt.active !== false),
        appearance,
        texts,
        measurementHelps,
      });
    } catch (err: any) {
      return res.status(500).json({ enabled: false, error: 'SERVER_ERROR' });
    }
  });

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
  app.post('/api/public/analytics', async (req, res) => {
    try {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      const body = req.body || {};
      const {
        eventId,
        eventName,
        visitorId,
        sessionId,
        productTypeId,
        productTypeName,
        productCategory,
        recommendationStatus,
        sourceDomain,
        pagePath,
        deviceType,
        configVersion,
        metadata,
      } = body;

      const ALLOWED_EVENTS = [
        'launcher_viewed',
        'launcher_clicked',
        'widget_opened',
        'flow_started',
        'product_type_selected',
        'measurements_started',
        'recommendation_generated',
        'recommendation_not_found',
        'measurement_help_opened',
        'widget_closed',
      ];

      if (!eventName || !ALLOWED_EVENTS.includes(eventName)) {
        return res.status(400).json({ error: 'INVALID_EVENT_NAME' });
      }

      if (!sessionId) {
        return res.status(400).json({ error: 'MISSING_SESSION_ID' });
      }

      // Sanitiza caminho da página (remove query strings privados)
      let cleanPath = typeof pagePath === 'string' ? pagePath.split('?')[0].trim() : '/';
      if (cleanPath.length > 200) cleanPath = cleanPath.slice(0, 200);

      // Determina e limpa o domínio de origem
      let domain = typeof sourceDomain === 'string' ? sourceDomain.trim() : '';
      if (req.headers.origin) {
        try {
          domain = new URL(req.headers.origin as string).hostname;
        } catch (e) {}
      } else if (req.headers.referer) {
        try {
          domain = new URL(req.headers.referer as string).hostname;
        } catch (e) {}
      }

      const cleanEventId = typeof eventId === 'string' && eventId.length >= 10
        ? eventId
        : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      await Repository.saveAnalyticsEvent({
        eventId: cleanEventId,
        eventName,
        visitorId: typeof visitorId === 'string' ? visitorId : undefined,
        sessionId,
        productTypeId: typeof productTypeId === 'string' ? productTypeId : undefined,
        productTypeName: typeof productTypeName === 'string' ? productTypeName : undefined,
        productCategory: typeof productCategory === 'string' ? productCategory : undefined,
        recommendationStatus:
          recommendationStatus === 'recommended' ||
          recommendationStatus === 'between_sizes' ||
          recommendationStatus === 'not_found'
            ? recommendationStatus
            : undefined,
        sourceDomain: domain || undefined,
        pagePath: cleanPath,
        deviceType: deviceType === 'mobile' ? 'mobile' : 'desktop',
        configVersion: typeof configVersion === 'number' ? configVersion : 1,
        metadata: typeof metadata === 'object' && metadata ? metadata : {},
        occurredAt: new Date().toISOString(),
      });

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('Analytics API Error:', err);
      // Retorna 200 para garantir que erros de analytics não quebrem a UX do cliente
      return res.status(200).json({ success: false, error: 'SILENT_ERROR' });
    }
  });

  // 6. Admin API - Analytics Summary
  app.get('/api/admin/analytics', async (req, res) => {
    try {
      const auth = await verifyAdminAuth(req);
      if (!auth.authorized) {
        return res.status(401).json({ error: 'UNAUTHORIZED', message: auth.error });
      }

      const period = (req.query.period as any) || '7days';
      const customStart = req.query.start as string;
      const customEnd = req.query.end as string;

      const summary = await Repository.getAnalyticsSummary(period, customStart, customEnd);
      return res.json(summary);
    } catch (err: any) {
      console.error('Admin Analytics Error:', err);
      return res.status(500).json({ error: 'FAILED_TO_LOAD_ANALYTICS' });
    }
  });

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

  // 8. Public Health Check Endpoint
  app.get('/api/health', async (req, res) => {
    try {
      const isConfigured = Boolean(
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
      ) && Boolean(
        process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      if (!isConfigured) {
        return res.status(200).json({
          success: false,
          status: 'configuration_error',
          services: {
            api: 'healthy',
            database: 'not_configured',
          },
          message: 'Configuração do Supabase ausente.',
          timestamp: new Date().toISOString(),
        });
      }

      const activity = await Repository.getActivityStatus();
      const isDbHealthy = activity.lastStatus === 'healthy' || activity.lastStatus === 'success';

      return res.status(200).json({
        success: isDbHealthy,
        status: isDbHealthy ? 'healthy' : activity.lastStatus,
        services: {
          api: 'healthy',
          database: isDbHealthy ? 'healthy' : 'unhealthy',
        },
        activity,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        status: 'database_error',
        services: {
          api: 'healthy',
          database: 'unhealthy',
        },
        message: 'Falha ao realizar health check.',
        timestamp: new Date().toISOString(),
      });
    }
  });

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

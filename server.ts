import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Repository } from './src/lib/repository';
import { calculateRecommendation } from './src/domain/recommendation';
import { generateWidgetScript } from './src/widget/standaloneWidget';

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
    const forwardedProto = req.headers['x-forwarded-proto'];
    const protoStr = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0].trim() : req.protocol;
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';

    // Ensure https is used for non-local hosts to avoid http -> https 302 redirects
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
    const protocol = isLocal ? protoStr : 'https';
    const appUrl = `${protocol}://${host}`;

    const script = generateWidgetScript(appUrl);

    res.status(200);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=1200');
    res.send(script);
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

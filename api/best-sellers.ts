import adminListsHandler from '../serverless/best-sellers/admin-lists.js';
import adminProductsHandler from '../serverless/best-sellers/admin-products.js';
import publicListHandler from '../serverless/best-sellers/public-list.js';
import publicClickHandler from '../serverless/best-sellers/public-click.js';
import adminMediaHandler from '../serverless/best-sellers/admin-media.js';
import adminLibraryHandler from '../serverless/best-sellers/admin-library.js';
import analyticsHandler from '../serverless/best-sellers/analytics.js';
import extensionHandler from '../serverless/best-sellers/extension.js';
import liveSessionHandler from '../serverless/best-sellers/live-session.js';
import formsHandler from '../serverless/best-sellers/forms.js';
import couponsHandler from '../serverless/coupons/index.js';

/**
 * Consolida as rotas de Mais Vendidos em uma única Vercel Function.
 * Isso mantém o projeto dentro do limite de Functions do plano Hobby.
 */
export default async function handler(req: any, res: any) {
  const url = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
  const mode = String(req.query?.mode || url.searchParams.get('mode') || '');

  if (mode.startsWith('coupon-')) {
    return couponsHandler(req, res);
  }

  switch (mode) {
    case 'admin-lists':
      return adminListsHandler(req, res);
    case 'admin-products':
      return adminProductsHandler(req, res);
    case 'public-list':
      return publicListHandler(req, res);
    case 'public-click':
      return publicClickHandler(req, res);
    case 'admin-media':
      return adminMediaHandler(req, res);
    case 'admin-library':
      return adminLibraryHandler(req, res);
    case 'analytics':
      return analyticsHandler(req, res);
    case 'extension':
      return extensionHandler(req, res);
    case 'live-session':
      return liveSessionHandler(req, res);
    case 'forms':
      return formsHandler(req, res);
    default:
      res.setHeader('Cache-Control', 'no-store');
      return res.status(404).json({
        success: false,
        error: 'BEST_SELLERS_ROUTE_NOT_FOUND',
      });
  }
}

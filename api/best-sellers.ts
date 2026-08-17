import adminListsHandler from '../serverless/best-sellers/admin-lists.js';
import adminProductsHandler from '../serverless/best-sellers/admin-products.js';
import publicListHandler from '../serverless/best-sellers/public-list.js';
import publicClickHandler from '../serverless/best-sellers/public-click.js';

/**
 * Consolida as quatro APIs de Mais Vendidos em uma única Vercel Function.
 * Isso mantém o projeto dentro do limite de Functions do plano Hobby.
 */
export default async function handler(req: any, res: any) {
  const url = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
  const mode = String(req.query?.mode || url.searchParams.get('mode') || '');

  switch (mode) {
    case 'admin-lists':
      return adminListsHandler(req, res);
    case 'admin-products':
      return adminProductsHandler(req, res);
    case 'public-list':
      return publicListHandler(req, res);
    case 'public-click':
      return publicClickHandler(req, res);
    default:
      res.setHeader('Cache-Control', 'no-store');
      return res.status(404).json({
        success: false,
        error: 'BEST_SELLERS_ROUTE_NOT_FOUND',
      });
  }
}

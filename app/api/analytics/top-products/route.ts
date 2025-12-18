import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/turso';

interface TopProduct {
  id: number;
  name: string;
  category: string;
  brand: string | null;
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  averagePrice: number;
  averageProfit: number;
  lastSoldAt: string | null;
}

/**
 * GET /api/analytics/top-products - Best sellers by volume and profit
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sortBy = searchParams.get('sortBy') || 'volume'; // 'volume' | 'revenue' | 'profit'
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const category = searchParams.get('category');

    let orderBy: string;
    switch (sortBy) {
      case 'revenue':
        orderBy = 'total_revenue DESC';
        break;
      case 'profit':
        orderBy = 'total_profit DESC';
        break;
      case 'volume':
      default:
        orderBy = 'total_sales DESC';
        break;
    }

    const categoryFilter = category
      ? 'AND np.category = ?'
      : '';

    const args = category ? [category, limit] : [limit];

    const products = await query<{
      id: number;
      name: string;
      category: string;
      brand: string | null;
      total_sales: number;
      total_revenue: number;
      total_profit: number;
      avg_price: number;
      avg_profit: number;
      last_sold_at: string | null;
    }>(
      `SELECT
        np.id,
        np.name,
        np.category,
        np.brand,
        COUNT(s.id) as total_sales,
        COALESCE(SUM(s.sale_price_vnd), 0) as total_revenue,
        COALESCE(SUM(s.profit_vnd), 0) as total_profit,
        COALESCE(AVG(s.sale_price_vnd), 0) as avg_price,
        COALESCE(AVG(s.profit_vnd), 0) as avg_profit,
        MAX(s.synced_at) as last_sold_at
      FROM normalized_products np
      JOIN sales s ON np.id = s.product_id
      WHERE 1=1 ${categoryFilter}
      GROUP BY np.id
      HAVING total_sales > 0
      ORDER BY ${orderBy}
      LIMIT ?`,
      args
    );

    const topProducts: TopProduct[] = products.map((p) => ({
      id: Number(p.id),
      name: p.name,
      category: p.category,
      brand: p.brand,
      totalSales: Number(p.total_sales),
      totalRevenue: Number(p.total_revenue),
      totalProfit: Number(p.total_profit),
      averagePrice: Number(p.avg_price),
      averageProfit: Number(p.avg_profit),
      lastSoldAt: p.last_sold_at,
    }));

    return NextResponse.json({
      products: topProducts,
      sortBy,
      total: topProducts.length,
    });
  } catch (error) {
    console.error('Error fetching top products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top products' },
      { status: 500 }
    );
  }
}

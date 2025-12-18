import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/turso';

interface CategoryStats {
  category: string;
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  averageProfit: number;
  profitMargin: number;
  uniqueProducts: number;
  topProduct: string | null;
  recentSales: number;
}

/**
 * GET /api/analytics/categories - Category breakdown with revenue and profit
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Calculate date threshold for "recent" stats
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    const dateStr = dateThreshold.toISOString().split('T')[0];

    // Get category breakdown
    const categories = await query<{
      category: string;
      total_sales: number;
      total_revenue: number;
      total_profit: number;
      avg_profit: number;
      unique_products: number;
    }>(
      `SELECT
        np.category,
        COUNT(s.id) as total_sales,
        COALESCE(SUM(s.sale_price_vnd), 0) as total_revenue,
        COALESCE(SUM(s.profit_vnd), 0) as total_profit,
        COALESCE(AVG(s.profit_vnd), 0) as avg_profit,
        COUNT(DISTINCT np.id) as unique_products
      FROM normalized_products np
      JOIN sales s ON np.id = s.product_id
      GROUP BY np.category
      ORDER BY total_revenue DESC`
    );

    // Get recent sales count per category
    const recentSales = await query<{
      category: string;
      recent_count: number;
    }>(
      `SELECT
        np.category,
        COUNT(s.id) as recent_count
      FROM normalized_products np
      JOIN sales s ON np.id = s.product_id
      JOIN batches b ON s.batch_id = b.id
      WHERE b.synced_at >= ?
      GROUP BY np.category`,
      [dateStr]
    );

    const recentMap = new Map(
      recentSales.map((r) => [r.category, Number(r.recent_count)])
    );

    // Get top product per category
    const topProducts = await query<{
      category: string;
      product_name: string;
    }>(
      `SELECT np.category, np.name as product_name
      FROM normalized_products np
      WHERE np.id IN (
        SELECT np2.id
        FROM normalized_products np2
        JOIN sales s ON np2.id = s.product_id
        WHERE np2.category = np.category
        GROUP BY np2.id
        ORDER BY COUNT(s.id) DESC
        LIMIT 1
      )`
    );

    const topProductMap = new Map(
      topProducts.map((t) => [t.category, t.product_name])
    );

    const categoryStats: CategoryStats[] = categories.map((c) => {
      const totalRevenue = Number(c.total_revenue);
      const totalProfit = Number(c.total_profit);

      return {
        category: c.category,
        totalSales: Number(c.total_sales),
        totalRevenue,
        totalProfit,
        averageProfit: Number(c.avg_profit),
        profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        uniqueProducts: Number(c.unique_products),
        topProduct: topProductMap.get(c.category) || null,
        recentSales: recentMap.get(c.category) || 0,
      };
    });

    // Calculate totals
    const totals = categoryStats.reduce(
      (acc, cat) => ({
        totalSales: acc.totalSales + cat.totalSales,
        totalRevenue: acc.totalRevenue + cat.totalRevenue,
        totalProfit: acc.totalProfit + cat.totalProfit,
      }),
      { totalSales: 0, totalRevenue: 0, totalProfit: 0 }
    );

    return NextResponse.json({
      categories: categoryStats,
      totals,
      periodDays: days,
    });
  } catch (error) {
    console.error('Error fetching category analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category analytics' },
      { status: 500 }
    );
  }
}

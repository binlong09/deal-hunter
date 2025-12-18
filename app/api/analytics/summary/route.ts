import { NextRequest, NextResponse } from 'next/server';
import { turso, queryOne, query } from '@/lib/turso';

interface SummaryStats {
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  averageProfit: number;
  totalCustomers: number;
  totalBatches: number;
  recentSales: number;
  recentRevenue: number;
  recentProfit: number;
  paymentBreakdown: {
    paid: number;
    unpaid: number;
    deposit: number;
    unknown: number;
  };
  topCategory: string | null;
  topCategoryRevenue: number;
}

/**
 * GET /api/analytics/summary - Overall business stats
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Calculate date threshold for "recent" stats
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    const dateStr = dateThreshold.toISOString().split('T')[0];

    // Get all-time totals
    const allTime = await queryOne<{
      total_sales: number;
      total_revenue: number;
      total_profit: number;
    }>(
      `SELECT
        COUNT(*) as total_sales,
        COALESCE(SUM(sale_price_vnd), 0) as total_revenue,
        COALESCE(SUM(profit_vnd), 0) as total_profit
      FROM sales`
    );

    // Get recent stats (last N days based on batch sync time)
    const recent = await queryOne<{
      recent_sales: number;
      recent_revenue: number;
      recent_profit: number;
    }>(
      `SELECT
        COUNT(*) as recent_sales,
        COALESCE(SUM(s.sale_price_vnd), 0) as recent_revenue,
        COALESCE(SUM(s.profit_vnd), 0) as recent_profit
      FROM sales s
      JOIN batches b ON s.batch_id = b.id
      WHERE b.synced_at >= ?`,
      [dateStr]
    );

    // Get unique customers count
    const customers = await queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT customer_name) as count FROM sales WHERE customer_name IS NOT NULL`
    );

    // Get batch count
    const batches = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM batches`
    );

    // Get payment status breakdown
    const paymentStats = await query<{ status: string; count: number }>(
      `SELECT
        COALESCE(payment_status, 'unknown') as status,
        COUNT(*) as count
      FROM sales
      GROUP BY payment_status`
    );

    const paymentBreakdown = {
      paid: 0,
      unpaid: 0,
      deposit: 0,
      unknown: 0,
    };

    for (const stat of paymentStats) {
      const status = stat.status as keyof typeof paymentBreakdown;
      if (status in paymentBreakdown) {
        paymentBreakdown[status] = Number(stat.count);
      }
    }

    // Get top category
    const topCategory = await queryOne<{
      category: string;
      revenue: number;
    }>(
      `SELECT
        np.category,
        COALESCE(SUM(s.sale_price_vnd), 0) as revenue
      FROM sales s
      JOIN normalized_products np ON s.product_id = np.id
      GROUP BY np.category
      ORDER BY revenue DESC
      LIMIT 1`
    );

    const totalSales = Number(allTime?.total_sales || 0);
    const totalProfit = Number(allTime?.total_profit || 0);

    const summary: SummaryStats = {
      totalSales,
      totalRevenue: Number(allTime?.total_revenue || 0),
      totalProfit,
      averageProfit: totalSales > 0 ? totalProfit / totalSales : 0,
      totalCustomers: Number(customers?.count || 0),
      totalBatches: Number(batches?.count || 0),
      recentSales: Number(recent?.recent_sales || 0),
      recentRevenue: Number(recent?.recent_revenue || 0),
      recentProfit: Number(recent?.recent_profit || 0),
      paymentBreakdown,
      topCategory: topCategory?.category || null,
      topCategoryRevenue: Number(topCategory?.revenue || 0),
    };

    return NextResponse.json({ summary, periodDays: days });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics summary' },
      { status: 500 }
    );
  }
}

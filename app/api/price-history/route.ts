import { NextRequest, NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

// GET /api/price-history?productId=123&limit=30
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const limit = parseInt(searchParams.get('limit') || '30');

    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      );
    }

    // Get price history for the product
    const result = await turso.execute({
      sql: `
        SELECT
          id,
          price,
          currency,
          in_stock,
          sale_badge,
          checked_at
        FROM price_history
        WHERE tracked_product_id = ?
        ORDER BY checked_at ASC
        LIMIT ?
      `,
      args: [productId, limit],
    });

    const history = result.rows.map((row) => ({
      id: Number(row.id),
      price: Number(row.price),
      currency: row.currency,
      in_stock: row.in_stock === 1,
      sale_badge: row.sale_badge,
      checked_at: row.checked_at,
      date: row.checked_at, // For chart compatibility
    }));

    // Calculate statistics
    if (history.length > 0) {
      const prices = history.map((h) => h.price);
      const currentPrice = prices[prices.length - 1];
      const lowestPrice = Math.min(...prices);
      const highestPrice = Math.max(...prices);
      const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

      return NextResponse.json({
        history,
        stats: {
          currentPrice,
          lowestPrice,
          highestPrice,
          averagePrice,
          checkCount: history.length,
          priceChange: currentPrice - prices[0],
          priceChangePercent: ((currentPrice - prices[0]) / prices[0]) * 100,
        },
      });
    }

    return NextResponse.json({
      history: [],
      stats: null,
    });
  } catch (error) {
    console.error('Error fetching price history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price history' },
      { status: 500 }
    );
  }
}

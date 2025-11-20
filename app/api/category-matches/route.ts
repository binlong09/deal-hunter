import { NextRequest, NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

// GET /api/category-matches?trackerId=123 - Get matches for a category tracker
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const trackerId = searchParams.get('trackerId');

    if (!trackerId) {
      return NextResponse.json(
        { error: 'trackerId is required' },
        { status: 400 }
      );
    }

    const result = await turso.execute({
      sql: `
        SELECT *
        FROM category_matches
        WHERE category_tracker_id = ?
        AND is_available = 1
        ORDER BY match_score DESC, first_seen_at DESC
        LIMIT 50
      `,
      args: [trackerId],
    });

    const matches = result.rows.map((row) => ({
      id: Number(row.id),
      category_tracker_id: Number(row.category_tracker_id),
      product_url: row.product_url,
      product_name: row.product_name,
      current_price: Number(row.current_price),
      original_price: Number(row.original_price),
      currency: row.currency,
      image_url: row.image_url,
      store_name: row.store_name,
      discount_percent: Number(row.discount_percent),
      match_score: Number(row.match_score),
      is_available: row.is_available,
      first_seen_at: row.first_seen_at,
      last_checked_at: row.last_checked_at,
    }));

    return NextResponse.json({ matches });
  } catch (error) {
    console.error('Error fetching category matches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category matches' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { query, turso } from '@/lib/turso';

interface UnsoldItem {
  id: number;
  productName: string;
  category: string | null;
  brand: string | null;
  sourceStore: string | null;
  postedAt: string;
  costUsd: number | null;
  listedPriceVnd: number | null;
  daysSincePosted: number;
}

/**
 * GET /api/analytics/unsold - Items posted but not sold
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const daysThreshold = parseInt(searchParams.get('days') || '14', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Calculate date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysThreshold);
    const dateStr = dateThreshold.toISOString();

    // Get unsold items (posted > N days ago, not matched to a sale)
    const unsoldItems = await query<{
      id: number;
      product_name: string;
      category: string | null;
      brand: string | null;
      source_store: string | null;
      posted_at: string;
      cost_usd: number | null;
      listed_price_vnd: number | null;
    }>(
      `SELECT
        id,
        product_name,
        category,
        brand,
        source_store,
        posted_at,
        cost_usd,
        listed_price_vnd
      FROM posted_items
      WHERE sold = 0
        AND matched_sale_id IS NULL
        AND posted_at < ?
      ORDER BY posted_at ASC
      LIMIT ?`,
      [dateStr, limit]
    );

    const now = new Date();
    const items: UnsoldItem[] = unsoldItems.map((item) => {
      const postedDate = new Date(item.posted_at);
      const daysSincePosted = Math.floor(
        (now.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: Number(item.id),
        productName: item.product_name,
        category: item.category,
        brand: item.brand,
        sourceStore: item.source_store,
        postedAt: item.posted_at,
        costUsd: item.cost_usd ? Number(item.cost_usd) : null,
        listedPriceVnd: item.listed_price_vnd ? Number(item.listed_price_vnd) : null,
        daysSincePosted,
      };
    });

    // Get category breakdown of unsold items
    const categoryBreakdown = await query<{
      category: string;
      count: number;
    }>(
      `SELECT
        COALESCE(category, 'uncategorized') as category,
        COUNT(*) as count
      FROM posted_items
      WHERE sold = 0
        AND matched_sale_id IS NULL
        AND posted_at < ?
      GROUP BY category
      ORDER BY count DESC`,
      [dateStr]
    );

    // Get total counts
    const totals = await query<{
      total_posted: number;
      total_unsold: number;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM posted_items) as total_posted,
        (SELECT COUNT(*) FROM posted_items WHERE sold = 0 AND matched_sale_id IS NULL AND posted_at < ?) as total_unsold`,
      [dateStr]
    );

    const totalPosted = Number(totals[0]?.total_posted || 0);
    const totalUnsold = Number(totals[0]?.total_unsold || 0);
    const unsoldRate = totalPosted > 0 ? (totalUnsold / totalPosted) * 100 : 0;

    return NextResponse.json({
      items,
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c.category,
        count: Number(c.count),
      })),
      summary: {
        totalPosted,
        totalUnsold,
        unsoldRate,
        daysThreshold,
      },
    });
  } catch (error) {
    console.error('Error fetching unsold items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unsold items' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analytics/unsold - Run unsold detection and matching
 * Attempts to match posted items with sales
 */
export async function POST(request: NextRequest) {
  try {
    // Get all unmatched posted items
    const unmatchedItems = await query<{
      id: number;
      product_name: string;
      product_id: number | null;
      posted_at: string;
    }>(
      `SELECT id, product_name, product_id, posted_at
       FROM posted_items
       WHERE sold = 0 AND matched_sale_id IS NULL`
    );

    let matchedCount = 0;

    for (const item of unmatchedItems) {
      // Try to find a matching sale
      // First by product_id if available, then by fuzzy name match
      let matchedSale = null;

      if (item.product_id) {
        // Exact match by normalized product
        const sales = await query<{ id: number }>(
          `SELECT s.id
           FROM sales s
           WHERE s.product_id = ?
             AND s.synced_at >= ?
           ORDER BY s.synced_at ASC
           LIMIT 1`,
          [item.product_id, item.posted_at]
        );
        matchedSale = sales[0];
      }

      if (!matchedSale) {
        // Fuzzy match by product name
        const searchTerm = item.product_name.toLowerCase().split(' ').slice(0, 3).join('%');
        const sales = await query<{ id: number }>(
          `SELECT s.id
           FROM sales s
           WHERE LOWER(s.product_name_raw) LIKE ?
             AND s.synced_at >= ?
           ORDER BY s.synced_at ASC
           LIMIT 1`,
          [`%${searchTerm}%`, item.posted_at]
        );
        matchedSale = sales[0];
      }

      if (matchedSale) {
        // Mark as sold and link to the sale
        await turso.execute({
          sql: `UPDATE posted_items
                SET sold = 1, matched_sale_id = ?, matched_at = datetime('now')
                WHERE id = ?`,
          args: [matchedSale.id, item.id],
        });
        matchedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      itemsProcessed: unmatchedItems.length,
      newMatches: matchedCount,
    });
  } catch (error) {
    console.error('Error running unsold detection:', error);
    return NextResponse.json(
      { error: 'Failed to run unsold detection' },
      { status: 500 }
    );
  }
}

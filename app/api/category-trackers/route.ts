import { NextRequest, NextResponse } from 'next/server';
import { turso } from '@/lib/turso';
import { searchProducts } from '@/lib/category-matcher';

// GET /api/category-trackers - List all category trackers
export async function GET(request: NextRequest) {
  try {
    const result = await turso.execute(`
      SELECT
        ct.*,
        (SELECT COUNT(*) FROM category_matches WHERE category_tracker_id = ct.id AND is_available = 1) as active_matches,
        (SELECT COUNT(*) FROM category_alerts WHERE category_tracker_id = ct.id AND is_read = 0) as unread_alerts
      FROM category_trackers ct
      ORDER BY ct.created_at DESC
    `);

    const trackers = result.rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      description: row.description,
      search_keywords: row.search_keywords,
      max_price: row.max_price,
      min_price: row.min_price,
      min_discount_percent: row.min_discount_percent,
      category: row.category,
      store_filter: row.store_filter ? JSON.parse(row.store_filter as string) : null,
      is_active: row.is_active,
      check_frequency: row.check_frequency,
      last_checked_at: row.last_checked_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      active_matches: Number(row.active_matches),
      unread_alerts: Number(row.unread_alerts),
    }));

    return NextResponse.json({ trackers });
  } catch (error) {
    console.error('Error fetching category trackers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category trackers' },
      { status: 500 }
    );
  }
}

// POST /api/category-trackers - Create new category tracker
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      search_keywords,
      max_price,
      min_price,
      min_discount_percent,
      category,
      store_filter,
    } = body;

    if (!name || !search_keywords) {
      return NextResponse.json(
        { error: 'Name and search keywords are required' },
        { status: 400 }
      );
    }

    // Insert category tracker
    const result = await turso.execute({
      sql: `INSERT INTO category_trackers (
              name, description, search_keywords, max_price, min_price,
              min_discount_percent, category, store_filter
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        name,
        description || null,
        search_keywords,
        max_price || null,
        min_price || null,
        min_discount_percent || null,
        category || null,
        store_filter ? JSON.stringify(store_filter) : null,
      ],
    });

    const trackerId = Number(result.lastInsertRowid);

    // Immediately search for matching products
    console.log(`Searching for products matching: ${search_keywords}`);
    const stores = store_filter || ['Amazon'];
    const matches = await searchProducts({
      keywords: search_keywords,
      maxPrice: max_price,
      minPrice: min_price,
      stores,
    });

    console.log(`Found ${matches.length} matching products`);

    if (matches.length === 0) {
      console.log('⚠️ No products found. Amazon scraping may be blocked.');
      console.log('💡 Category tracker created but no initial matches. Consider adding products manually or using a product API.');
    }

    // Store matches
    for (const match of matches.slice(0, 10)) {
      // Top 10 matches
      try {
        await turso.execute({
          sql: `INSERT INTO category_matches (
                  category_tracker_id, product_url, product_name, current_price,
                  original_price, currency, image_url, store_name, discount_percent,
                  match_score, first_seen_at, last_checked_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          args: [
            trackerId,
            match.url,
            match.productName,
            match.price,
            match.originalPrice || match.price,
            match.currency,
            match.imageUrl,
            match.storeName,
            match.discountPercent || 0,
            match.matchScore,
          ],
        });

        // Create alert for new match
        await turso.execute({
          sql: `INSERT INTO category_alerts (
                  category_tracker_id, category_match_id, alert_type,
                  product_name, product_url, current_price, message
                ) VALUES (?, last_insert_rowid(), ?, ?, ?, ?, ?)`,
          args: [
            trackerId,
            'new_match',
            match.productName,
            match.url,
            match.price,
            `New product found: ${match.productName} at $${match.price}`,
          ],
        });
      } catch (error: any) {
        // Ignore duplicate errors
        if (!error.message?.includes('UNIQUE constraint')) {
          console.error('Error storing match:', error);
        }
      }
    }

    return NextResponse.json({
      id: trackerId,
      name,
      matches_found: matches.length,
      message: matches.length === 0
        ? 'Category tracker created, but no products found. Amazon may be blocking scraping. Try adding products manually or consider using a product API for automated search.'
        : `Found ${matches.length} matching products!`,
    });
  } catch (error) {
    console.error('Error creating category tracker:', error);
    return NextResponse.json(
      { error: 'Failed to create category tracker: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

// DELETE /api/category-trackers?id=123 - Delete category tracker
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Tracker ID is required' }, { status: 400 });
    }

    await turso.execute({
      sql: 'DELETE FROM category_trackers WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category tracker:', error);
    return NextResponse.json(
      { error: 'Failed to delete category tracker' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { turso } from '@/lib/turso';
import { extractPriceFromHTML } from '@/lib/price-extractor';

// GET /api/tracked-products - List all tracked products
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let sql = `
      SELECT
        tp.*,
        (SELECT COUNT(*) FROM price_history WHERE tracked_product_id = tp.id) as price_check_count,
        (SELECT COUNT(*) FROM deal_alerts WHERE tracked_product_id = tp.id AND is_read = 0) as unread_alerts
      FROM tracked_products tp
    `;

    if (activeOnly) {
      sql += ' WHERE tp.is_active = 1';
    }

    sql += ' ORDER BY tp.priority ASC, tp.created_at DESC';

    const result = await turso.execute(sql);

    const products = result.rows.map((row) => ({
      id: Number(row.id),
      url: row.url,
      product_name: row.product_name,
      current_price: row.current_price,
      currency: row.currency,
      image_url: row.image_url,
      store_name: row.store_name,
      priority: row.priority,
      check_frequency: row.check_frequency,
      last_checked_at: row.last_checked_at,
      last_price_change_at: row.last_price_change_at,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      price_check_count: Number(row.price_check_count),
      unread_alerts: Number(row.unread_alerts),
    }));

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching tracked products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tracked products' },
      { status: 500 }
    );
  }
}

// POST /api/tracked-products - Add new product to track
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, priority = 2 } = body; // default to medium priority

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Check if already tracking this URL
    const existingResult = await turso.execute({
      sql: 'SELECT id FROM tracked_products WHERE url = ?',
      args: [url],
    });

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'This product is already being tracked' },
        { status: 409 }
      );
    }

    // Extract initial product info
    console.log('Extracting initial product info for:', url);
    const priceInfo = await extractPriceFromHTML(url);

    // Determine store name from URL
    const domain = new URL(url).hostname.replace('www.', '');
    let storeName = domain.split('.')[0];
    storeName = storeName.charAt(0).toUpperCase() + storeName.slice(1);

    // Set check frequency based on priority
    const checkFrequency = priority === 1 ? 180 : priority === 2 ? 720 : 1440; // 3h, 12h, 24h

    // Insert tracked product
    const result = await turso.execute({
      sql: `INSERT INTO tracked_products (
              url, product_name, current_price, currency, image_url,
              store_name, priority, check_frequency, last_checked_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        url,
        priceInfo.productName || 'Unknown Product',
        priceInfo.price,
        priceInfo.currency,
        priceInfo.imageUrl,
        storeName,
        priority,
        checkFrequency,
      ],
    });

    const productId = Number(result.lastInsertRowid);

    // Add initial price to history if we got one
    if (priceInfo.price) {
      await turso.execute({
        sql: `INSERT INTO price_history (
                tracked_product_id, price, currency, in_stock, sale_badge
              ) VALUES (?, ?, ?, ?, ?)`,
        args: [
          productId,
          priceInfo.price,
          priceInfo.currency,
          priceInfo.inStock ? 1 : 0,
          priceInfo.saleBadge,
        ],
      });
    }

    return NextResponse.json({
      id: productId,
      url,
      product_name: priceInfo.productName,
      current_price: priceInfo.price,
      currency: priceInfo.currency,
      image_url: priceInfo.imageUrl,
      store_name: storeName,
      extraction_method: priceInfo.extractionMethod,
    });
  } catch (error) {
    console.error('Error adding tracked product:', error);
    return NextResponse.json(
      { error: 'Failed to add product: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

// PUT /api/tracked-products?id=123 - Update tracked product
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const { priority, is_active, check_frequency } = body;

    const updates: string[] = [];
    const args: any[] = [];

    if (priority !== undefined) {
      updates.push('priority = ?');
      args.push(priority);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      args.push(is_active);
    }

    if (check_frequency !== undefined) {
      updates.push('check_frequency = ?');
      args.push(check_frequency);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = datetime("now")');
    args.push(id);

    await turso.execute({
      sql: `UPDATE tracked_products SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating tracked product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE /api/tracked-products?id=123 - Remove tracked product
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    // Delete will cascade to price_history and deal_alerts
    await turso.execute({
      sql: 'DELETE FROM tracked_products WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tracked product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}

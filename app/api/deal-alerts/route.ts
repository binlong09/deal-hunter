import { NextRequest, NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

// GET /api/deal-alerts - Get deal alerts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    let sql = `
      SELECT
        da.*,
        tp.product_name,
        tp.image_url,
        tp.url,
        tp.store_name,
        tp.currency
      FROM deal_alerts da
      JOIN tracked_products tp ON da.tracked_product_id = tp.id
    `;

    if (unreadOnly) {
      sql += ' WHERE da.is_read = 0';
    }

    sql += ` ORDER BY da.created_at DESC LIMIT ${limit}`;

    const result = await turso.execute(sql);

    const alerts = result.rows.map((row) => ({
      id: Number(row.id),
      tracked_product_id: Number(row.tracked_product_id),
      alert_type: row.alert_type,
      old_price: row.old_price,
      new_price: row.new_price,
      discount_percent: row.discount_percent,
      deal_score: row.deal_score,
      deal_quality: row.deal_quality,
      message: row.message,
      is_read: row.is_read,
      is_notified: row.is_notified,
      created_at: row.created_at,
      product: {
        product_name: row.product_name,
        image_url: row.image_url,
        url: row.url,
        store_name: row.store_name,
        currency: row.currency,
      },
    }));

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Error fetching deal alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deal alerts' },
      { status: 500 }
    );
  }
}

// PUT /api/deal-alerts?id=123 - Mark alert as read
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 });
    }

    await turso.execute({
      sql: 'UPDATE deal_alerts SET is_read = 1 WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating deal alert:', error);
    return NextResponse.json(
      { error: 'Failed to update deal alert' },
      { status: 500 }
    );
  }
}

// DELETE /api/deal-alerts?id=123 - Delete alert
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 });
    }

    await turso.execute({
      sql: 'DELETE FROM deal_alerts WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting deal alert:', error);
    return NextResponse.json(
      { error: 'Failed to delete deal alert' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { turso, query, queryOne } from '@/lib/turso';

// GET /api/products - List products with filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tripId = searchParams.get('tripId');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const starred = searchParams.get('starred');

    let sql = 'SELECT * FROM products WHERE 1=1';
    const args: any[] = [];

    if (tripId) {
      sql += ' AND trip_id = ?';
      args.push(tripId);
    }

    if (status) {
      sql += ' AND status = ?';
      args.push(status);
    }

    if (category) {
      sql += ' AND category = ?';
      args.push(category);
    }

    if (starred === 'true') {
      sql += ' AND starred = 1';
    }

    sql += ' ORDER BY capture_timestamp DESC';

    const products = await query(sql, args);
    return NextResponse.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// PATCH /api/products?id=123 - Update product
export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const {
      product_name,
      sku,
      current_price,
      original_price,
      discount_percent,
      category,
      status,
      starred,
      shelf_info_json,
    } = body;

    const updates: string[] = [];
    const args: any[] = [];

    if (product_name !== undefined) {
      updates.push('product_name = ?');
      args.push(product_name);
    }

    if (sku !== undefined) {
      updates.push('sku = ?');
      args.push(sku);
    }

    if (current_price !== undefined) {
      updates.push('current_price = ?');
      args.push(current_price);
    }

    if (original_price !== undefined) {
      updates.push('original_price = ?');
      args.push(original_price);
    }

    if (discount_percent !== undefined) {
      updates.push('discount_percent = ?');
      args.push(discount_percent);
    }

    if (category !== undefined) {
      updates.push('category = ?');
      args.push(category);
    }

    if (status !== undefined) {
      updates.push('status = ?');
      args.push(status);
    }

    if (starred !== undefined) {
      updates.push('starred = ?');
      args.push(starred ? 1 : 0);
    }

    if (shelf_info_json !== undefined) {
      updates.push('shelf_info_json = ?');
      args.push(JSON.stringify(shelf_info_json));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    args.push(id);

    await turso.execute({
      sql: `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    const product = await queryOne(`SELECT * FROM products WHERE id = ?`, [id]);

    return NextResponse.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE /api/products?id=123 - Delete product
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    await turso.execute({
      sql: 'DELETE FROM products WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}

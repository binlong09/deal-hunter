import { NextRequest, NextResponse } from 'next/server';
import { turso } from '@/lib/turso';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productIds, updates } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'productIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'updates must be an object' },
        { status: 400 }
      );
    }

    const updateFields: string[] = [];
    const args: any[] = [];

    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      args.push(updates.status);
    }

    if (updates.starred !== undefined) {
      updateFields.push('starred = ?');
      args.push(updates.starred ? 1 : 0);
    }

    if (updates.category !== undefined) {
      updateFields.push('category = ?');
      args.push(updates.category);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      );
    }

    const placeholders = productIds.map(() => '?').join(',');
    const sql = `UPDATE products SET ${updateFields.join(', ')} WHERE id IN (${placeholders})`;

    await turso.execute({
      sql,
      args: [...args, ...productIds],
    });

    return NextResponse.json({
      success: true,
      updated: productIds.length,
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json(
      { error: 'Bulk update failed' },
      { status: 500 }
    );
  }
}

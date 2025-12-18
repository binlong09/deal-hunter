import { NextRequest, NextResponse } from 'next/server';
import { turso, query, queryOne } from '@/lib/turso';
import { normalizeProductName, findOrCreateNormalizedProduct } from '@/lib/product-normalizer';

interface PostedItemPayload {
  productName: string;
  category?: string;
  brand?: string;
  sourceStore?: string;
  costUsd?: number;
  listedPriceVnd?: number;
  generatedPostId?: number;
}

/**
 * GET /api/posted-items - List posted items
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const soldOnly = searchParams.get('soldOnly') === 'true';
    const unsoldOnly = searchParams.get('unsoldOnly') === 'true';

    let whereClause = '1=1';
    if (soldOnly) {
      whereClause = 'sold = 1';
    } else if (unsoldOnly) {
      whereClause = 'sold = 0';
    }

    const items = await query<{
      id: number;
      product_id: number | null;
      generated_post_id: number | null;
      product_name: string;
      category: string | null;
      brand: string | null;
      source_store: string | null;
      posted_at: string;
      cost_usd: number | null;
      listed_price_vnd: number | null;
      sold: number;
      matched_sale_id: number | null;
      matched_at: string | null;
    }>(
      `SELECT * FROM posted_items
       WHERE ${whereClause}
       ORDER BY posted_at DESC
       LIMIT ?`,
      [limit]
    );

    return NextResponse.json({
      items: items.map((item) => ({
        id: Number(item.id),
        productId: item.product_id ? Number(item.product_id) : null,
        generatedPostId: item.generated_post_id ? Number(item.generated_post_id) : null,
        productName: item.product_name,
        category: item.category,
        brand: item.brand,
        sourceStore: item.source_store,
        postedAt: item.posted_at,
        costUsd: item.cost_usd ? Number(item.cost_usd) : null,
        listedPriceVnd: item.listed_price_vnd ? Number(item.listed_price_vnd) : null,
        sold: item.sold === 1,
        matchedSaleId: item.matched_sale_id ? Number(item.matched_sale_id) : null,
        matchedAt: item.matched_at,
      })),
      total: items.length,
    });
  } catch (error) {
    console.error('Error fetching posted items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posted items' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posted-items - Log a posted item
 * Called when user copies/downloads a generated post
 */
export async function POST(request: NextRequest) {
  try {
    const payload: PostedItemPayload = await request.json();
    const {
      productName,
      category,
      brand,
      sourceStore,
      costUsd,
      listedPriceVnd,
      generatedPostId,
    } = payload;

    if (!productName) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }

    // Normalize the product name and find/create a normalized product
    let productId: number | null = null;
    let normalizedCategory: string | undefined = category;
    let normalizedBrand: string | null | undefined = brand;

    try {
      const normalized = await normalizeProductName(productName);
      productId = await findOrCreateNormalizedProduct(normalized);
      normalizedCategory = normalizedCategory || normalized.category;
      normalizedBrand = normalizedBrand || normalized.brand;
    } catch (error) {
      console.error('Error normalizing product:', error);
    }

    // Insert the posted item
    const result = await turso.execute({
      sql: `INSERT INTO posted_items (
              product_id, generated_post_id, product_name, category, brand,
              source_store, cost_usd, listed_price_vnd
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        productId,
        generatedPostId || null,
        productName,
        normalizedCategory || null,
        normalizedBrand || null,
        sourceStore || null,
        costUsd || null,
        listedPriceVnd || null,
      ],
    });

    const postedItemId = Number(result.lastInsertRowid);

    return NextResponse.json({
      success: true,
      id: postedItemId,
      productId,
      normalized: {
        category: normalizedCategory,
        brand: normalizedBrand,
      },
    });
  } catch (error) {
    console.error('Error logging posted item:', error);
    return NextResponse.json(
      { error: 'Failed to log posted item' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/posted-items?id=X - Update a posted item (e.g., mark as sold)
 */
export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { sold, matchedSaleId } = body;

    const updates: string[] = [];
    const args: (string | number | null)[] = [];

    if (sold !== undefined) {
      updates.push('sold = ?');
      args.push(sold ? 1 : 0);
    }

    if (matchedSaleId !== undefined) {
      updates.push('matched_sale_id = ?');
      updates.push('matched_at = datetime("now")');
      args.push(matchedSaleId);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    args.push(id);

    await turso.execute({
      sql: `UPDATE posted_items SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating posted item:', error);
    return NextResponse.json(
      { error: 'Failed to update posted item' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posted-items?id=X - Delete a posted item
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await turso.execute({
      sql: 'DELETE FROM posted_items WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting posted item:', error);
    return NextResponse.json(
      { error: 'Failed to delete posted item' },
      { status: 500 }
    );
  }
}

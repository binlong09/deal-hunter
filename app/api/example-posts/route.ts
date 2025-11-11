import { NextRequest, NextResponse } from 'next/server';
import { turso, query, queryOne } from '@/lib/turso';

// GET /api/example-posts - List all example posts
export async function GET() {
  try {
    const posts = await query(
      `SELECT * FROM example_posts WHERE is_active = 1 ORDER BY created_at DESC`
    );
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Get example posts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch example posts' },
      { status: 500 }
    );
  }
}

// POST /api/example-posts - Create new example post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      product_category,
      product_type,
      post_text,
      style_notes,
      emoji_density = 0.1,
    } = body;

    if (!post_text) {
      return NextResponse.json(
        { error: 'post_text is required' },
        { status: 400 }
      );
    }

    const result = await turso.execute({
      sql: `INSERT INTO example_posts
            (product_category, product_type, post_text, style_notes, emoji_density)
            VALUES (?, ?, ?, ?, ?)`,
      args: [product_category, product_type, post_text, style_notes, emoji_density],
    });

    const post = await queryOne(
      `SELECT * FROM example_posts WHERE id = ?`,
      [Number(result.lastInsertRowid)]
    );

    return NextResponse.json(post);
  } catch (error) {
    console.error('Create example post error:', error);
    return NextResponse.json(
      { error: 'Failed to create example post' },
      { status: 500 }
    );
  }
}

// PATCH /api/example-posts?id=123 - Update example post
export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    const {
      product_category,
      product_type,
      post_text,
      style_notes,
      emoji_density,
      is_active,
    } = body;

    const updates: string[] = [];
    const args: any[] = [];

    if (product_category !== undefined) {
      updates.push('product_category = ?');
      args.push(product_category);
    }

    if (product_type !== undefined) {
      updates.push('product_type = ?');
      args.push(product_type);
    }

    if (post_text !== undefined) {
      updates.push('post_text = ?');
      args.push(post_text);
    }

    if (style_notes !== undefined) {
      updates.push('style_notes = ?');
      args.push(style_notes);
    }

    if (emoji_density !== undefined) {
      updates.push('emoji_density = ?');
      args.push(emoji_density);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      args.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    args.push(id);

    await turso.execute({
      sql: `UPDATE example_posts SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    const post = await queryOne(`SELECT * FROM example_posts WHERE id = ?`, [id]);

    return NextResponse.json(post);
  } catch (error) {
    console.error('Update example post error:', error);
    return NextResponse.json(
      { error: 'Failed to update example post' },
      { status: 500 }
    );
  }
}

// DELETE /api/example-posts?id=123 - Delete example post
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    await turso.execute({
      sql: 'DELETE FROM example_posts WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete example post error:', error);
    return NextResponse.json(
      { error: 'Failed to delete example post' },
      { status: 500 }
    );
  }
}

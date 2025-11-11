import { NextRequest, NextResponse } from 'next/server';
import { turso, query, queryOne } from '@/lib/turso';

// GET /api/generated-posts - List generated posts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') || '50';

    let sql = `
      SELECT gp.*, p.product_name, p.image_url, p.category
      FROM generated_posts gp
      LEFT JOIN products p ON gp.product_id = p.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (status) {
      sql += ' AND gp.status = ?';
      args.push(status);
    }

    sql += ' ORDER BY gp.scheduled_date DESC, gp.scheduled_time DESC LIMIT ?';
    args.push(parseInt(limit));

    const posts = await query(sql, args);
    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Get generated posts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch generated posts' },
      { status: 500 }
    );
  }
}

// PATCH /api/generated-posts?id=123 - Update generated post
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
      status,
      scheduled_date,
      scheduled_time,
      post_text,
      posted_at,
      likes_count,
      comments_count,
      orders_count,
    } = body;

    const updates: string[] = [];
    const args: any[] = [];

    if (status !== undefined) {
      updates.push('status = ?');
      args.push(status);

      // If status is 'posted', set posted_at to now
      if (status === 'posted' && !posted_at) {
        updates.push("posted_at = datetime('now')");
      }
    }

    if (scheduled_date !== undefined) {
      updates.push('scheduled_date = ?');
      args.push(scheduled_date);
    }

    if (scheduled_time !== undefined) {
      updates.push('scheduled_time = ?');
      args.push(scheduled_time);
    }

    if (post_text !== undefined) {
      updates.push('post_text = ?');
      args.push(post_text);
    }

    if (posted_at !== undefined) {
      updates.push('posted_at = ?');
      args.push(posted_at);
    }

    if (likes_count !== undefined) {
      updates.push('likes_count = ?');
      args.push(likes_count);
    }

    if (comments_count !== undefined) {
      updates.push('comments_count = ?');
      args.push(comments_count);
    }

    if (orders_count !== undefined) {
      updates.push('orders_count = ?');
      args.push(orders_count);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    args.push(id);

    await turso.execute({
      sql: `UPDATE generated_posts SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    const post = await queryOne(
      `SELECT gp.*, p.product_name, p.image_url, p.category
       FROM generated_posts gp
       LEFT JOIN products p ON gp.product_id = p.id
       WHERE gp.id = ?`,
      [id]
    );

    return NextResponse.json(post);
  } catch (error) {
    console.error('Update generated post error:', error);
    return NextResponse.json(
      { error: 'Failed to update generated post' },
      { status: 500 }
    );
  }
}

// DELETE /api/generated-posts?id=123 - Delete generated post
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
      sql: 'DELETE FROM generated_posts WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete generated post error:', error);
    return NextResponse.json(
      { error: 'Failed to delete generated post' },
      { status: 500 }
    );
  }
}

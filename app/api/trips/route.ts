import { NextRequest, NextResponse } from 'next/server';
import { turso, query, queryOne } from '@/lib/turso';

// GET /api/trips - List all trips
export async function GET() {
  try {
    const trips = await query(
      `SELECT * FROM trips ORDER BY created_at DESC`
    );
    return NextResponse.json({ trips });
  } catch (error) {
    console.error('Get trips error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trips' },
      { status: 500 }
    );
  }
}

// POST /api/trips - Create a new trip
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { store = 'costco' } = body;

    const result = await turso.execute({
      sql: `INSERT INTO trips (store, date) VALUES (?, datetime('now'))`,
      args: [store],
    });

    const trip = await queryOne(
      `SELECT * FROM trips WHERE id = ?`,
      [Number(result.lastInsertRowid)]
    );

    return NextResponse.json(trip);
  } catch (error) {
    console.error('Create trip error:', error);
    return NextResponse.json(
      { error: 'Failed to create trip' },
      { status: 500 }
    );
  }
}

// PATCH /api/trips?id=123 - Update trip
export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Trip ID is required' },
        { status: 400 }
      );
    }

    const { status, total_items } = body;

    const updates: string[] = [];
    const args: any[] = [];

    if (status) {
      updates.push('status = ?');
      args.push(status);
    }

    if (total_items !== undefined) {
      updates.push('total_items = ?');
      args.push(total_items);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    args.push(id);

    await turso.execute({
      sql: `UPDATE trips SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    const trip = await queryOne(`SELECT * FROM trips WHERE id = ?`, [id]);

    return NextResponse.json(trip);
  } catch (error) {
    console.error('Update trip error:', error);
    return NextResponse.json(
      { error: 'Failed to update trip' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { uploadImage } from '@/lib/blob';
import { turso } from '@/lib/turso';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const tripId = formData.get('tripId') as string;
    const category = formData.get('category') as string;

    if (!file || !tripId || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: image, tripId, or category' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Upload image to Vercel Blob
    const { url, thumbnailUrl } = await uploadImage(file, `products/${tripId}`);

    // Save to database
    const result = await turso.execute({
      sql: `INSERT INTO products (trip_id, image_url, thumbnail_url, category, capture_timestamp)
            VALUES (?, ?, ?, ?, datetime('now'))`,
      args: [tripId, url, thumbnailUrl, category],
    });

    // Update trip item count
    await turso.execute({
      sql: `UPDATE trips
            SET total_items = (SELECT COUNT(*) FROM products WHERE trip_id = ?)
            WHERE id = ?`,
      args: [tripId, tripId],
    });

    return NextResponse.json({
      id: result.lastInsertRowid,
      image_url: url,
      thumbnail_url: thumbnailUrl,
      category,
      trip_id: tripId,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

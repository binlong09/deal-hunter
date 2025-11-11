import { NextRequest, NextResponse } from 'next/server';
import { uploadImage } from '@/lib/blob';
import { turso } from '@/lib/turso';
import { extractProductInfo } from '@/lib/ocr';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const tripId = formData.get('tripId') as string;
    const clientTimestamp = formData.get('captureTimestamp') as string;

    if (!file || !tripId) {
      return NextResponse.json(
        { error: 'Missing required fields: image or tripId' },
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

    // Extract product info using OCR (including category detection)
    let productInfo;
    try {
      productInfo = await extractProductInfo(url);
      console.log('OCR extracted:', productInfo);
    } catch (error) {
      console.error('OCR failed, continuing without extracted data:', error);
      productInfo = { product_name: 'Unknown Product', category: 'other', confidence: 0 };
    }

    // Use client's local timestamp if provided, otherwise use server time
    const captureTimestamp = clientTimestamp || new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Save to database with extracted information (auto-approved, using OCR-detected category)
    const result = await turso.execute({
      sql: `INSERT INTO products (
              trip_id, image_url, thumbnail_url, category,
              product_name, sku, current_price, original_price, discount_percent,
              shelf_info_json, ocr_confidence_score, status, capture_timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        tripId,
        url,
        thumbnailUrl,
        productInfo.category, // Use OCR-detected category
        productInfo.product_name,
        productInfo.sku || null,
        productInfo.current_price || null,
        productInfo.original_price || null,
        productInfo.discount_percent || null,
        JSON.stringify({
          brand: productInfo.brand,
          size: productInfo.size,
          quantity: productInfo.quantity,
          unit: productInfo.unit,
        }),
        productInfo.confidence,
        'approved', // Auto-approve all uploads
        captureTimestamp,
      ],
    });

    // Update trip item count
    await turso.execute({
      sql: `UPDATE trips
            SET total_items = (SELECT COUNT(*) FROM products WHERE trip_id = ?)
            WHERE id = ?`,
      args: [tripId, tripId],
    });

    return NextResponse.json({
      id: Number(result.lastInsertRowid),
      image_url: url,
      thumbnail_url: thumbnailUrl,
      category: productInfo.category,
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

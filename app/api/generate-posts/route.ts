import { NextRequest, NextResponse } from 'next/server';
import { turso, query } from '@/lib/turso';
import { generatePost } from '@/lib/claude';
import { optimizeForFacebook } from '@/lib/blob';

interface Product {
  id: number;
  product_name: string;
  category: string;
  current_price: number;
  original_price: number;
  discount_percent: number;
  image_url: string;
  sku?: string;
  shelf_info_json?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productIds, schedule = true } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'productIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Get selected products
    const placeholders = productIds.map(() => '?').join(',');
    const products = await query<Product>(
      `SELECT * FROM products WHERE id IN (${placeholders})`,
      productIds
    );

    if (products.length === 0) {
      return NextResponse.json(
        { error: 'No products found' },
        { status: 404 }
      );
    }

    // Get example posts
    const examples = await query<{ post_text: string }>(
      'SELECT post_text FROM example_posts WHERE is_active = 1 ORDER BY created_at DESC LIMIT 20'
    );

    const exampleTexts = examples.map((e) => e.post_text);

    console.log(`Found ${exampleTexts.length} active example posts for generation`);
    if (exampleTexts.length > 0) {
      console.log('First example preview:', exampleTexts[0].substring(0, 100) + '...');
    } else {
      console.warn('WARNING: No active example posts found! Generated posts may not match desired style.');
    }

    // Generate posts without scheduling - use current timestamp
    const generatedPosts = [];

    // Helper function to format date as YYYY-MM-DD in local timezone
    const formatLocalDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Helper function to format time as HH:MM:SS in local timezone
    const formatLocalTime = (date: Date): string => {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    };

    for (const product of products) {
      try {
        // Parse shelf info JSON if available
        let shelfInfo: any = {};
        if (product.shelf_info_json) {
          try {
            shelfInfo = JSON.parse(product.shelf_info_json);
          } catch (e) {
            console.error('Failed to parse shelf_info_json:', e);
          }
        }

        // Generate post text with full product data
        const postText = await generatePost(
          {
            product_name: product.product_name || 'Product',
            category: product.category || 'general',
            current_price: product.current_price || 0,
            original_price: product.original_price || 0,
            discount_percent: product.discount_percent || 0,
            sku: product.sku,
            brand: shelfInfo.brand,
            size: shelfInfo.size,
            quantity: shelfInfo.quantity,
          },
          exampleTexts
        );

        // Optimize image for Facebook
        let fbImageUrl = product.image_url;
        try {
          fbImageUrl = await optimizeForFacebook(product.image_url);
        } catch (error) {
          console.error('Image optimization failed, using original:', error);
        }

        // Use current timestamp for generated posts
        const now = new Date();
        const scheduledDate = formatLocalDate(now);
        const scheduledTime = formatLocalTime(now);

        console.log(`=== POST GENERATION DEBUG ===`);
        console.log(`Raw Date object:`, now);
        console.log(`Formatted date:`, scheduledDate);
        console.log(`Formatted time:`, scheduledTime);
        console.log(`Product: ${product.product_name}`);
        console.log(`===========================`);

        // Save to database
        const result = await turso.execute({
          sql: `INSERT INTO generated_posts
                (product_id, scheduled_date, scheduled_time, post_text, optimized_image_url)
                VALUES (?, ?, ?, ?, ?)`,
          args: [
            product.id,
            scheduledDate,
            scheduledTime,
            postText,
            fbImageUrl,
          ],
        });

        generatedPosts.push({
          id: Number(result.lastInsertRowid),
          product_id: product.id,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime,
          post_text: postText,
          optimized_image_url: fbImageUrl,
          status: 'generated',
        });
      } catch (error) {
        console.error(`Failed to generate post for product ${product.id}:`, error);
        // Continue with next product
      }
    }

    return NextResponse.json({
      posts: generatedPosts,
      total: generatedPosts.length,
    });
  } catch (error) {
    console.error('Generate posts error:', error);
    return NextResponse.json(
      { error: 'Failed to generate posts: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

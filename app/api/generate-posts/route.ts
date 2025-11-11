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

    // Generate posts with scheduling
    const generatedPosts = [];
    const postsPerDay = 3;
    let currentDate = new Date();
    let postCountToday = 0;

    for (const product of products) {
      try {
        // Generate post text
        const postText = await generatePost(
          {
            product_name: product.product_name || 'Product',
            category: product.category || 'general',
            current_price: product.current_price || 0,
            original_price: product.original_price || 0,
            discount_percent: product.discount_percent || 0,
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

        // Calculate scheduled time
        if (schedule) {
          if (postCountToday >= postsPerDay) {
            currentDate.setDate(currentDate.getDate() + 1);
            postCountToday = 0;
          }
        }

        const times = ['10:00:00', '14:00:00', '19:00:00'];
        const scheduledTime = schedule ? times[postCountToday] : '10:00:00';
        const scheduledDate = schedule
          ? currentDate.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

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
          id: result.lastInsertRowid,
          product_id: product.id,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledTime,
          post_text: postText,
          optimized_image_url: fbImageUrl,
          status: 'generated',
        });

        postCountToday++;
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

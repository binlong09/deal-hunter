import { NextRequest, NextResponse } from 'next/server';
import { turso, query, queryOne } from '@/lib/turso';

interface ProductScore {
  id: number;
  name: string;
  category: string;
  brand: string | null;
  score: number;
  factors: {
    sellThrough: number;
    profitMargin: number;
    recency: number;
    volume: number;
  };
  reason: string;
  totalSales: number;
  avgProfit: number;
  lastSold: string | null;
  daysSincePosted: number | null;
}

interface CategoryScore {
  category: string;
  score: number;
  avgMargin: number;
  avgSellTime: number;
  totalSales: number;
  recommendation: 'hot' | 'good' | 'neutral' | 'avoid';
  reason: string;
}

/**
 * GET /api/recommendations - What to post next
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all'; // 'all' | 'products' | 'categories'
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const results: {
      postToday: ProductScore[];
      hotCategories: CategoryScore[];
      avoidCategories: CategoryScore[];
      recentlyPosted: string[];
    } = {
      postToday: [],
      hotCategories: [],
      avoidCategories: [],
      recentlyPosted: [],
    };

    // Get recently posted items (last 7 days) to exclude
    const recentPosted = await query<{ product_name: string }>(
      `SELECT product_name FROM posted_items
       WHERE posted_at >= datetime('now', '-7 days')
       ORDER BY posted_at DESC`
    );
    results.recentlyPosted = recentPosted.map((p) => p.product_name);

    if (type === 'all' || type === 'products') {
      results.postToday = await getProductRecommendations(
        limit,
        results.recentlyPosted
      );
    }

    if (type === 'all' || type === 'categories') {
      const categoryScores = await getCategoryScores();
      results.hotCategories = categoryScores.filter((c) =>
        ['hot', 'good'].includes(c.recommendation)
      );
      results.avoidCategories = categoryScores.filter(
        (c) => c.recommendation === 'avoid'
      );
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}

async function getProductRecommendations(
  limit: number,
  recentlyPosted: string[]
): Promise<ProductScore[]> {
  // Get products with their sales stats
  const products = await query<{
    id: number;
    name: string;
    category: string;
    brand: string | null;
    total_sales: number;
    total_profit: number;
    avg_profit: number;
    last_sold_at: string | null;
    total_revenue: number;
  }>(
    `SELECT
      np.id,
      np.name,
      np.category,
      np.brand,
      np.total_sales,
      np.total_profit_vnd as total_profit,
      COALESCE(AVG(s.profit_vnd), 0) as avg_profit,
      np.last_sold_at,
      np.total_revenue_vnd as total_revenue
    FROM normalized_products np
    LEFT JOIN sales s ON np.id = s.product_id
    WHERE np.total_sales > 0
    GROUP BY np.id
    ORDER BY np.total_sales DESC
    LIMIT 100`
  );

  // Get posted items stats
  const postedStats = await query<{
    product_id: number | null;
    times_posted: number;
    times_sold: number;
    last_posted: string;
  }>(
    `SELECT
      product_id,
      COUNT(*) as times_posted,
      SUM(CASE WHEN sold = 1 THEN 1 ELSE 0 END) as times_sold,
      MAX(posted_at) as last_posted
    FROM posted_items
    GROUP BY product_id`
  );

  const postedMap = new Map(
    postedStats.map((p) => [
      p.product_id,
      {
        timesPosted: Number(p.times_posted),
        timesSold: Number(p.times_sold),
        lastPosted: p.last_posted,
      },
    ])
  );

  // Calculate scores
  const scored: ProductScore[] = [];
  const now = new Date();

  for (const product of products) {
    // Skip recently posted
    if (
      recentlyPosted.some(
        (name) =>
          name.toLowerCase().includes(product.name.toLowerCase()) ||
          product.name.toLowerCase().includes(name.toLowerCase())
      )
    ) {
      continue;
    }

    const postedInfo = postedMap.get(product.id);
    const totalSales = Number(product.total_sales);
    const avgProfit = Number(product.avg_profit);
    const totalRevenue = Number(product.total_revenue);
    const totalProfit = Number(product.total_profit);

    // Factor 1: Sell-through rate (0-100)
    let sellThrough = 0;
    if (postedInfo && postedInfo.timesPosted > 0) {
      sellThrough = Math.min(
        100,
        (postedInfo.timesSold / postedInfo.timesPosted) * 100
      );
    } else if (totalSales > 0) {
      sellThrough = 70; // Default for products sold but no posted tracking
    }

    // Factor 2: Profit margin (0-100)
    const profitMargin =
      totalRevenue > 0
        ? Math.min(100, (totalProfit / totalRevenue) * 100 * 3) // Scale up since typical margins are ~20-30%
        : 0;

    // Factor 3: Recency - how recently was this sold (0-100)
    let recency = 0;
    if (product.last_sold_at) {
      const daysSince = Math.floor(
        (now.getTime() - new Date(product.last_sold_at).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      recency = Math.max(0, 100 - daysSince * 2); // Decay over ~50 days
    }

    // Factor 4: Sales volume (0-100)
    const maxSales = Math.max(...products.map((p) => Number(p.total_sales)));
    const volume = maxSales > 0 ? (totalSales / maxSales) * 100 : 0;

    // Combined score (weighted average)
    const weights = {
      sellThrough: 0.35,
      profitMargin: 0.25,
      recency: 0.25,
      volume: 0.15,
    };

    const score =
      sellThrough * weights.sellThrough +
      profitMargin * weights.profitMargin +
      recency * weights.recency +
      volume * weights.volume;

    // Generate reason
    const reasons: string[] = [];
    if (sellThrough >= 80) reasons.push('high sell-through');
    if (profitMargin >= 60) reasons.push('good profit margin');
    if (recency >= 70) reasons.push('recent sales');
    if (volume >= 50) reasons.push('popular item');

    scored.push({
      id: product.id,
      name: product.name,
      category: product.category,
      brand: product.brand,
      score: Math.round(score),
      factors: {
        sellThrough: Math.round(sellThrough),
        profitMargin: Math.round(profitMargin),
        recency: Math.round(recency),
        volume: Math.round(volume),
      },
      reason: reasons.length > 0 ? reasons.join(', ') : 'consistent performer',
      totalSales,
      avgProfit,
      lastSold: product.last_sold_at,
      daysSincePosted: postedInfo
        ? Math.floor(
            (now.getTime() - new Date(postedInfo.lastPosted).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : null,
    });
  }

  // Sort by score and return top N
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

async function getCategoryScores(): Promise<CategoryScore[]> {
  // Get category stats
  const categories = await query<{
    category: string;
    total_sales: number;
    total_revenue: number;
    total_profit: number;
    avg_profit: number;
    unique_products: number;
  }>(
    `SELECT
      np.category,
      SUM(np.total_sales) as total_sales,
      SUM(np.total_revenue_vnd) as total_revenue,
      SUM(np.total_profit_vnd) as total_profit,
      AVG(s.profit_vnd) as avg_profit,
      COUNT(DISTINCT np.id) as unique_products
    FROM normalized_products np
    LEFT JOIN sales s ON np.id = s.product_id
    GROUP BY np.category
    HAVING total_sales > 0`
  );

  // Get unsold rates by category
  const unsoldRates = await query<{
    category: string;
    total_posted: number;
    total_unsold: number;
  }>(
    `SELECT
      category,
      COUNT(*) as total_posted,
      SUM(CASE WHEN sold = 0 AND posted_at < datetime('now', '-14 days') THEN 1 ELSE 0 END) as total_unsold
    FROM posted_items
    WHERE category IS NOT NULL
    GROUP BY category`
  );

  const unsoldMap = new Map(
    unsoldRates.map((u) => [
      u.category,
      {
        posted: Number(u.total_posted),
        unsold: Number(u.total_unsold),
        rate: u.total_posted > 0 ? Number(u.total_unsold) / Number(u.total_posted) : 0,
      },
    ])
  );

  return categories.map((cat) => {
    const totalSales = Number(cat.total_sales);
    const totalRevenue = Number(cat.total_revenue);
    const totalProfit = Number(cat.total_profit);
    const avgProfit = Number(cat.avg_profit);
    const unsoldInfo = unsoldMap.get(cat.category);

    // Calculate margin
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Calculate score
    const unsoldPenalty = unsoldInfo ? unsoldInfo.rate * 50 : 0;
    const marginBonus = Math.min(50, margin * 2);
    const volumeBonus = Math.min(30, totalSales / 10);

    const score = Math.max(
      0,
      Math.min(100, 50 + marginBonus + volumeBonus - unsoldPenalty)
    );

    // Determine recommendation
    let recommendation: CategoryScore['recommendation'];
    let reason: string;

    if (unsoldInfo && unsoldInfo.rate > 0.5) {
      recommendation = 'avoid';
      reason = `${Math.round(unsoldInfo.rate * 100)}% unsold rate`;
    } else if (score >= 75 && margin > 15) {
      recommendation = 'hot';
      reason = `High margin (${margin.toFixed(1)}%) and strong sales`;
    } else if (score >= 60) {
      recommendation = 'good';
      reason = 'Consistent performance';
    } else if (score < 40 || margin < 5) {
      recommendation = 'avoid';
      reason = margin < 5 ? 'Low profit margin' : 'Poor sales performance';
    } else {
      recommendation = 'neutral';
      reason = 'Average performance';
    }

    return {
      category: cat.category,
      score: Math.round(score),
      avgMargin: margin,
      avgSellTime: 0, // Would need more data to calculate
      totalSales,
      recommendation,
      reason,
    };
  });
}

/**
 * POST /api/recommendations - Regenerate recommendations
 */
export async function POST(request: NextRequest) {
  try {
    // Clear old recommendations
    await turso.execute({
      sql: `DELETE FROM recommendations WHERE valid_until < datetime('now')`,
      args: [],
    });

    // Generate fresh recommendations and cache them
    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + 24); // Valid for 24 hours

    const products = await getProductRecommendations(20, []);
    const categories = await getCategoryScores();

    // Store product recommendations
    for (const product of products) {
      await turso.execute({
        sql: `INSERT OR REPLACE INTO recommendations
              (product_id, category, recommendation_type, score, factors, reason, generated_at, valid_until)
              VALUES (?, ?, 'post_today', ?, ?, ?, datetime('now'), ?)`,
        args: [
          product.id,
          product.category,
          product.score,
          JSON.stringify(product.factors),
          product.reason,
          validUntil.toISOString(),
        ],
      });
    }

    // Store category recommendations
    for (const cat of categories) {
      const type =
        cat.recommendation === 'hot' || cat.recommendation === 'good'
          ? 'hot_category'
          : cat.recommendation === 'avoid'
          ? 'avoid'
          : null;

      if (type) {
        await turso.execute({
          sql: `INSERT OR REPLACE INTO recommendations
                (product_id, category, recommendation_type, score, factors, reason, generated_at, valid_until)
                VALUES (NULL, ?, ?, ?, ?, ?, datetime('now'), ?)`,
          args: [
            cat.category,
            type,
            cat.score,
            JSON.stringify({ margin: cat.avgMargin, sales: cat.totalSales }),
            cat.reason,
            validUntil.toISOString(),
          ],
        });
      }
    }

    return NextResponse.json({
      success: true,
      productsScored: products.length,
      categoriesScored: categories.length,
      validUntil: validUntil.toISOString(),
    });
  } catch (error) {
    console.error('Error regenerating recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate recommendations' },
      { status: 500 }
    );
  }
}

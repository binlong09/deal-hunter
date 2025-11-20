/**
 * Deal Authenticity Checker
 * Combines Wayback Machine data + our own database + AI analysis
 * to detect fake deals and inflated "original prices"
 */

import Anthropic from '@anthropic-ai/sdk';
import { fetchWaybackPriceHistory, calculatePriceStats } from './wayback-fetcher';
import { turso } from './turso';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key',
});

export interface AuthenticityResult {
  score: number; // 0-100, higher = more authentic
  verdict: 'GENUINE' | 'LIKELY_GENUINE' | 'SUSPICIOUS' | 'LIKELY_FAKE' | 'UNKNOWN';
  reasoning: string;
  redFlags: string[];
  priceAnalysis: {
    claimedOriginalPrice?: number;
    currentPrice: number;
    claimedDiscount?: number;
    actualAveragePrice?: number;
    historicalLowPrice?: number;
    historicalHighPrice?: number;
    realDiscountEstimate?: number;
  };
  historicalData: {
    hasWaybackData: boolean;
    hasOurData: boolean;
    dataPoints: number;
    dateRange?: string;
  };
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Check deal authenticity using all available data
 */
export async function checkDealAuthenticity(
  productUrl: string,
  currentPrice: number,
  claimedOriginalPrice?: number,
  productName?: string
): Promise<AuthenticityResult> {
  console.log(`\n🔍 Checking deal authenticity for: ${productName || productUrl}`);

  try {
    // 1. Fetch historical data from Wayback Machine
    const waybackPrices = await fetchWaybackPriceHistory(productUrl, 90); // Last 90 days

    // 2. Fetch our own historical data (if product has been tracked)
    const ourPrices = await getOurHistoricalPrices(productUrl);

    // 3. Combine all price data
    const allPrices = [...waybackPrices, ...ourPrices];
    const stats = allPrices.length > 0 ? calculatePriceStats(allPrices) : null;

    console.log(`📊 Historical data: ${waybackPrices.length} Wayback + ${ourPrices.length} our DB = ${allPrices.length} total`);

    // 4. Analyze with AI
    const aiAnalysis = await analyzeWithAI({
      productName: productName || 'Unknown product',
      productUrl,
      currentPrice,
      claimedOriginalPrice,
      historicalStats: stats,
      hasHistoricalData: allPrices.length > 0,
    });

    // 5. Combine into final result
    const result: AuthenticityResult = {
      score: aiAnalysis.score,
      verdict: aiAnalysis.verdict,
      reasoning: aiAnalysis.reasoning,
      redFlags: aiAnalysis.redFlags,
      priceAnalysis: {
        currentPrice,
        claimedOriginalPrice,
        claimedDiscount: claimedOriginalPrice
          ? Math.round(((claimedOriginalPrice - currentPrice) / claimedOriginalPrice) * 100)
          : undefined,
        actualAveragePrice: stats?.averagePrice,
        historicalLowPrice: stats?.lowestPrice,
        historicalHighPrice: stats?.highestPrice,
        realDiscountEstimate: stats
          ? Math.round(((stats.averagePrice - currentPrice) / stats.averagePrice) * 100)
          : undefined,
      },
      historicalData: {
        hasWaybackData: waybackPrices.length > 0,
        hasOurData: ourPrices.length > 0,
        dataPoints: allPrices.length,
        dateRange: stats
          ? `${new Date(stats.dateRange.from).toLocaleDateString()} - ${new Date(stats.dateRange.to).toLocaleDateString()}`
          : undefined,
      },
      confidence: allPrices.length >= 3 ? 'HIGH' : allPrices.length > 0 ? 'MEDIUM' : 'LOW',
    };

    console.log(`✅ Authenticity check complete: ${result.verdict} (${result.score}/100)\n`);

    return result;
  } catch (error) {
    console.error('Error checking authenticity:', error);

    return {
      score: 50,
      verdict: 'UNKNOWN',
      reasoning: 'Unable to verify deal authenticity due to technical error',
      redFlags: [],
      priceAnalysis: { currentPrice },
      historicalData: {
        hasWaybackData: false,
        hasOurData: false,
        dataPoints: 0,
      },
      confidence: 'LOW',
    };
  }
}

/**
 * Get historical prices from our own database
 */
async function getOurHistoricalPrices(productUrl: string) {
  try {
    // Find product by URL
    const productResult = await turso.execute({
      sql: 'SELECT id FROM tracked_products WHERE url = ?',
      args: [productUrl],
    });

    if (productResult.rows.length === 0) {
      return [];
    }

    const productId = productResult.rows[0].id;

    // Get price history
    const historyResult = await turso.execute({
      sql: `SELECT price, checked_at FROM price_history
            WHERE tracked_product_id = ?
            ORDER BY checked_at DESC
            LIMIT 30`,
      args: [productId],
    });

    return historyResult.rows.map((row) => ({
      price: Number(row.price),
      currency: 'USD',
      date: row.checked_at as string,
      source: 'our_database' as const,
    }));
  } catch (error) {
    console.error('Error fetching our historical prices:', error);
    return [];
  }
}

/**
 * Use AI to analyze price authenticity
 */
async function analyzeWithAI(data: {
  productName: string;
  productUrl: string;
  currentPrice: number;
  claimedOriginalPrice?: number;
  historicalStats: any;
  hasHistoricalData: boolean;
}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return basicAnalysis(data);
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `Analyze if this product deal is authentic or if the "original price" is inflated.

Product: ${data.productName}
URL: ${data.productUrl}

Current Price: $${data.currentPrice}
${data.claimedOriginalPrice ? `Claimed Original Price: $${data.claimedOriginalPrice}` : 'No original price claimed'}
${data.claimedOriginalPrice ? `Claimed Discount: ${Math.round(((data.claimedOriginalPrice - data.currentPrice) / data.claimedOriginalPrice) * 100)}%` : ''}

${
  data.hasHistoricalData
    ? `Historical Price Data (last 90 days):
- Lowest: $${data.historicalStats.lowestPrice}
- Highest: $${data.historicalStats.highestPrice}
- Average: $${data.historicalStats.averagePrice}
- Trend: ${data.historicalStats.trend}
- Data points: ${data.historicalStats.dataPoints}`
    : 'No historical price data available'
}

Analyze and return JSON:
{
  "score": 0-100,
  "verdict": "GENUINE" | "LIKELY_GENUINE" | "SUSPICIOUS" | "LIKELY_FAKE" | "UNKNOWN",
  "reasoning": "detailed explanation",
  "redFlags": ["list of red flags if any"]
}

Scoring guide:
- 80-100: GENUINE - Price is fair, discount is real
- 60-79: LIKELY_GENUINE - Probably a real deal, minor concerns
- 40-59: SUSPICIOUS - Several red flags, proceed with caution
- 20-39: LIKELY_FAKE - Strong evidence of inflated pricing
- 0-19: FAKE - Clear evidence of deceptive pricing

Red flags to look for:
- Claimed discount >80% (almost always fake)
- Claimed original price much higher than historical average
- Recent price increase followed by "sale"
- Round number pricing ($999 → $99)
- Current price is actually normal/average price`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return basicAnalysis(data);
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      score: Math.min(100, Math.max(0, result.score || 50)),
      verdict: result.verdict || 'UNKNOWN',
      reasoning: result.reasoning || 'Unable to determine authenticity',
      redFlags: result.redFlags || [],
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    return basicAnalysis(data);
  }
}

/**
 * Basic analysis without AI (fallback)
 */
function basicAnalysis(data: {
  currentPrice: number;
  claimedOriginalPrice?: number;
  historicalStats: any;
  hasHistoricalData: boolean;
}) {
  const redFlags: string[] = [];
  let score = 70; // Start neutral

  if (data.claimedOriginalPrice) {
    const discount = ((data.claimedOriginalPrice - data.currentPrice) / data.claimedOriginalPrice) * 100;

    // Check for extreme discounts
    if (discount > 80) {
      redFlags.push('Extremely high discount (>80%) - often indicates fake pricing');
      score -= 30;
    } else if (discount > 60) {
      redFlags.push('Very high discount (>60%) - verify authenticity');
      score -= 15;
    }

    // Check against historical data
    if (data.hasHistoricalData) {
      const avgPrice = data.historicalStats.averagePrice;

      if (data.claimedOriginalPrice > avgPrice * 1.5) {
        redFlags.push('Claimed original price is 50%+ higher than historical average');
        score -= 25;
      }

      if (data.currentPrice > avgPrice * 1.1) {
        redFlags.push('Current "sale" price is actually above historical average');
        score -= 20;
      } else if (data.currentPrice < avgPrice * 0.8) {
        score += 10; // Actually a good deal!
      }
    }
  } else if (data.hasHistoricalData) {
    // No claimed original price, but we can still compare to history
    const avgPrice = data.historicalStats.averagePrice;

    if (data.currentPrice < avgPrice * 0.9) {
      score += 10;
    }
  }

  score = Math.min(100, Math.max(0, score));

  let verdict: AuthenticityResult['verdict'];
  if (score >= 80) verdict = 'GENUINE';
  else if (score >= 60) verdict = 'LIKELY_GENUINE';
  else if (score >= 40) verdict = 'SUSPICIOUS';
  else if (score >= 20) verdict = 'LIKELY_FAKE';
  else verdict = 'UNKNOWN';

  return {
    score,
    verdict,
    reasoning: redFlags.length > 0 ? redFlags.join('. ') : 'Deal appears legitimate',
    redFlags,
  };
}

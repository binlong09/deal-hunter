/**
 * Deal Scorer Service
 * Uses Claude Haiku 3.5 to evaluate deal quality
 * Smart, fast, and cost-effective
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key',
});

export interface DealScore {
  score: number; // 0-100
  quality: 'poor' | 'fair' | 'good' | 'great' | 'amazing';
  reasoning: string;
  recommendation: string;
  priceAnalysis: {
    discountPercent: number;
    isPriceDropSignificant: boolean;
    isHistoricalLow: boolean;
  };
}

export interface PriceHistoryData {
  currentPrice: number;
  previousPrice: number | null;
  lowestPrice: number | null;
  highestPrice: number | null;
  averagePrice: number | null;
  priceHistory: Array<{ price: number; date: string }>;
}

/**
 * Score a deal using Claude Haiku 3.5
 */
export async function scoreDeal(
  productName: string,
  productUrl: string,
  priceHistory: PriceHistoryData,
  storeName?: string,
  saleBadge?: string
): Promise<DealScore> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }

  try {
    const { currentPrice, previousPrice, lowestPrice, highestPrice, averagePrice } = priceHistory;

    // Calculate discount percent
    const discountPercent = previousPrice
      ? ((previousPrice - currentPrice) / previousPrice) * 100
      : 0;

    // Prepare context for AI
    const priceContext = `
Current Price: $${currentPrice}
Previous Price: ${previousPrice ? `$${previousPrice}` : 'N/A'}
Lowest Ever: ${lowestPrice ? `$${lowestPrice}` : 'N/A'}
Highest Ever: ${highestPrice ? `$${highestPrice}` : 'N/A'}
Average Price: ${averagePrice ? `$${averagePrice}` : 'N/A'}
Discount: ${discountPercent > 0 ? `${discountPercent.toFixed(1)}% off` : 'No discount'}
${saleBadge ? `Sale Badge: ${saleBadge}` : ''}
${storeName ? `Store: ${storeName}` : ''}
`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Haiku 3.5 - fast and cheap
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `You are a deal evaluation expert. Analyze this product deal and provide a score.

Product: ${productName}
URL: ${productUrl}

Price Information:
${priceContext}

Price History (last entries):
${priceHistory.priceHistory.slice(-5).map(p => `- $${p.price} on ${p.date}`).join('\n')}

Evaluate this deal and respond in this EXACT JSON format:
{
  "score": 85,
  "quality": "great",
  "reasoning": "Brief explanation of why this is a good/bad deal",
  "recommendation": "Should they buy now or wait?",
  "isPriceDropSignificant": true,
  "isHistoricalLow": false
}

Scoring criteria:
- 0-20: Poor deal (price increase or minimal discount)
- 21-40: Fair deal (small discount, not special)
- 41-60: Good deal (decent discount, worth considering)
- 61-80: Great deal (significant discount, good time to buy)
- 81-100: Amazing deal (historical low or exceptional discount)

Quality must be one of: "poor", "fair", "good", "great", "amazing"

Consider:
1. How significant is the discount?
2. Is this near the historical low price?
3. Is the sale badge indicating a special event (Black Friday, etc.)?
4. Price trend - is it dropping or stable?`,
        },
      ],
    });

    // Parse response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Could not extract JSON from AI response');
    }

    const aiResult = JSON.parse(jsonMatch[0]);

    return {
      score: Math.min(100, Math.max(0, aiResult.score || 0)),
      quality: aiResult.quality || 'fair',
      reasoning: aiResult.reasoning || 'Unable to evaluate',
      recommendation: aiResult.recommendation || 'Monitor price',
      priceAnalysis: {
        discountPercent: Math.round(discountPercent * 10) / 10,
        isPriceDropSignificant: aiResult.isPriceDropSignificant || false,
        isHistoricalLow: aiResult.isHistoricalLow || false,
      },
    };
  } catch (error) {
    console.error('Deal scoring error:', error);

    // Fallback to simple calculation if AI fails
    const discountPercent = priceHistory.previousPrice
      ? ((priceHistory.previousPrice - priceHistory.currentPrice) / priceHistory.previousPrice) * 100
      : 0;

    let score = 50;
    let quality: 'poor' | 'fair' | 'good' | 'great' | 'amazing' = 'fair';

    if (discountPercent >= 50) {
      score = 90;
      quality = 'amazing';
    } else if (discountPercent >= 30) {
      score = 75;
      quality = 'great';
    } else if (discountPercent >= 15) {
      score = 60;
      quality = 'good';
    } else if (discountPercent >= 5) {
      score = 45;
      quality = 'fair';
    } else {
      score = 25;
      quality = 'poor';
    }

    return {
      score,
      quality,
      reasoning: 'AI scoring unavailable, using discount percentage',
      recommendation: discountPercent > 20 ? 'Consider buying' : 'Monitor price',
      priceAnalysis: {
        discountPercent: Math.round(discountPercent * 10) / 10,
        isPriceDropSignificant: discountPercent >= 15,
        isHistoricalLow: false,
      },
    };
  }
}

/**
 * Quick discount evaluation (no AI, instant)
 */
export function quickEvaluate(currentPrice: number, previousPrice: number | null): {
  discountPercent: number;
  worthNotifying: boolean;
} {
  if (!previousPrice || currentPrice >= previousPrice) {
    return { discountPercent: 0, worthNotifying: false };
  }

  const discountPercent = ((previousPrice - currentPrice) / previousPrice) * 100;

  return {
    discountPercent: Math.round(discountPercent * 10) / 10,
    worthNotifying: discountPercent >= 10, // Notify if 10%+ discount
  };
}

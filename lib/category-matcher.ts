/**
 * Category Matcher Service
 * Searches for products matching category criteria
 * Example: Find all air fryers under $50 on Amazon
 */

import * as cheerio from 'cheerio';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key',
});

export interface CategoryCriteria {
  keywords: string; // "air fryer, airfryer"
  maxPrice?: number;
  minPrice?: number;
  stores?: string[]; // ["Amazon", "Target"]
}

export interface ProductMatch {
  url: string;
  productName: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  storeName: string;
  matchScore: number; // 0-100, how well it matches
  originalPrice?: number;
  discountPercent?: number;
}

/**
 * Search Amazon for products matching criteria
 */
async function searchAmazon(keywords: string, maxPrice?: number): Promise<ProductMatch[]> {
  try {
    const searchQuery = encodeURIComponent(keywords);
    const url = `https://www.amazon.com/s?k=${searchQuery}`;

    console.log(`Searching Amazon: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      console.error('Amazon search failed:', response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const matches: ProductMatch[] = [];

    console.log(`HTML length: ${html.length} characters`);

    // Amazon search result selectors
    const searchResults = $('[data-component-type="s-search-result"]');
    console.log(`Found ${searchResults.length} search results`);

    searchResults.each((index, element) => {
      try {
        const $item = $(element);

        // Extract product name (try multiple selectors)
        let productName = $item.find('h2 a span').first().text().trim();
        if (!productName) {
          productName = $item.find('h2').text().trim();
        }
        if (!productName) {
          console.log(`Result ${index}: No product name found`);
          return;
        }

        // Extract URL
        const relativeUrl = $item.find('h2 a').attr('href');
        if (!relativeUrl) {
          console.log(`Result ${index}: No URL found for ${productName}`);
          return;
        }
        const productUrl = relativeUrl.startsWith('http')
          ? relativeUrl
          : `https://www.amazon.com${relativeUrl}`;

        // Extract price (try multiple selectors)
        let priceWhole = $item.find('.a-price-whole').first().text();
        let priceFraction = $item.find('.a-price-fraction').first().text();

        if (!priceWhole) {
          // Try alternate price selector
          const priceText = $item.find('.a-price .a-offscreen').first().text();
          if (priceText) {
            const priceMatch = priceText.match(/\$([\d,]+\.?\d*)/);
            if (priceMatch) {
              const fullPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
              if (!isNaN(fullPrice)) {
                matches.push({
                  url: productUrl,
                  productName,
                  price: fullPrice,
                  currency: 'USD',
                  imageUrl: $item.find('img.s-image').attr('src') || null,
                  storeName: 'Amazon',
                  matchScore: 70,
                });
                console.log(`Result ${index}: Found ${productName} at $${fullPrice}`);
              }
            }
          }
          return;
        }

        const price = parseFloat(`${priceWhole.replace(/[,$]/g, '')}.${priceFraction || '00'}`);
        if (isNaN(price)) {
          console.log(`Result ${index}: Invalid price for ${productName}`);
          return;
        }

        // Filter by max price if specified
        if (maxPrice && price > maxPrice) return;

        // Extract image
        const imageUrl = $item.find('img.s-image').attr('src') || null;

        // Extract original price (if on sale)
        const originalPriceText = $item.find('.a-price.a-text-price .a-offscreen').first().text();
        let originalPrice: number | undefined;
        let discountPercent: number | undefined;

        if (originalPriceText) {
          const origPrice = parseFloat(originalPriceText.replace(/[$,]/g, ''));
          if (!isNaN(origPrice) && origPrice > price) {
            originalPrice = origPrice;
            discountPercent = ((origPrice - price) / origPrice) * 100;
          }
        }

        // Calculate match score (simple for now)
        let matchScore = 70; // Base score
        if (discountPercent && discountPercent > 20) matchScore += 20;
        else if (discountPercent && discountPercent > 10) matchScore += 10;
        if (maxPrice && price <= maxPrice * 0.7) matchScore += 10; // Great price

        matches.push({
          url: productUrl,
          productName,
          price,
          currency: 'USD',
          imageUrl,
          storeName: 'Amazon',
          matchScore: Math.min(100, matchScore),
          originalPrice,
          discountPercent,
        });

        console.log(`Result ${index}: Added ${productName} at $${price} (score: ${matchScore})`);
      } catch (error) {
        console.error(`Error parsing result ${index}:`, error);
      }
    });

    console.log(`Total matches found: ${matches.length}`);

    // If no matches found, return mock data for testing
    if (matches.length === 0) {
      console.log('⚠️ No matches found. Amazon may be blocking scraping. Returning mock data for testing...');
      return generateMockMatches(keywords, maxPrice);
    }

    return matches.slice(0, 20); // Return top 20 matches
  } catch (error) {
    console.error('Amazon search error:', error);
    console.log('⚠️ Search failed. Returning mock data for testing...');
    return generateMockMatches(keywords, maxPrice);
  }
}

/**
 * Generate mock product matches for testing
 * TODO: Replace with real product API in production
 */
function generateMockMatches(keywords: string, maxPrice?: number): ProductMatch[] {
  const mockProducts = [
    { name: `Premium ${keywords} - Model A`, price: maxPrice ? maxPrice * 0.6 : 49.99, discount: 25 },
    { name: `Bestseller ${keywords} - Pro Edition`, price: maxPrice ? maxPrice * 0.7 : 69.99, discount: 20 },
    { name: `${keywords} Deluxe`, price: maxPrice ? maxPrice * 0.8 : 79.99, discount: 15 },
    { name: `Compact ${keywords}`, price: maxPrice ? maxPrice * 0.5 : 39.99, discount: 30 },
    { name: `${keywords} - Energy Star Certified`, price: maxPrice ? maxPrice * 0.75 : 74.99, discount: 18 },
  ].filter(p => !maxPrice || p.price <= maxPrice);

  return mockProducts.map((product, index) => ({
    url: `https://www.amazon.com/dp/MOCK${index}`,
    productName: product.name,
    price: product.price,
    currency: 'USD',
    imageUrl: `https://via.placeholder.com/200?text=${encodeURIComponent(keywords)}`,
    storeName: 'Amazon (Mock Data)',
    matchScore: 85 - (index * 5),
    originalPrice: product.price / (1 - product.discount / 100),
    discountPercent: product.discount,
  }));
}

/**
 * Search Target for products matching criteria
 */
async function searchTarget(keywords: string, maxPrice?: number): Promise<ProductMatch[]> {
  // Similar implementation for Target
  // For now, return empty array (can be implemented later)
  return [];
}

/**
 * Search for products matching category criteria across stores
 */
export async function searchProducts(criteria: CategoryCriteria): Promise<ProductMatch[]> {
  const allMatches: ProductMatch[] = [];

  // Determine which stores to search
  const storesToSearch = criteria.stores || ['Amazon'];

  for (const store of storesToSearch) {
    if (store.toLowerCase() === 'amazon') {
      const matches = await searchAmazon(criteria.keywords, criteria.maxPrice);
      allMatches.push(...matches);
    } else if (store.toLowerCase() === 'target') {
      const matches = await searchTarget(criteria.keywords, criteria.maxPrice);
      allMatches.push(...matches);
    }
    // Add more stores as needed
  }

  // Filter by price range
  let filtered = allMatches;
  if (criteria.minPrice) {
    filtered = filtered.filter((m) => m.price >= criteria.minPrice!);
  }
  if (criteria.maxPrice) {
    filtered = filtered.filter((m) => m.price <= criteria.maxPrice!);
  }

  // Sort by match score (highest first)
  filtered.sort((a, b) => b.matchScore - a.matchScore);

  return filtered;
}

/**
 * Use AI to evaluate if a product matches the category intent
 * More accurate but costs API tokens
 */
export async function aiMatchEvaluation(
  productName: string,
  categoryName: string,
  keywords: string
): Promise<{ matches: boolean; score: number; reasoning: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { matches: true, score: 70, reasoning: 'AI evaluation unavailable' };
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Evaluate if this product matches the category intent.

Category: ${categoryName}
Keywords: ${keywords}
Product: ${productName}

Does this product match what the user is looking for? Respond in JSON:
{
  "matches": true/false,
  "score": 0-100,
  "reasoning": "brief explanation"
}

Consider:
- Does the product name contain the keywords?
- Is it the right type of product?
- Is it a genuine match or just keyword spam?`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        matches: result.matches || false,
        score: result.score || 0,
        reasoning: result.reasoning || 'No reasoning provided',
      };
    }
  } catch (error) {
    console.error('AI match evaluation error:', error);
  }

  return { matches: true, score: 70, reasoning: 'AI evaluation failed, assuming match' };
}

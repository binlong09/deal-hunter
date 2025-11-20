/**
 * Wayback Machine Historical Price Fetcher
 * Fetches historical snapshots and uses AI to extract prices
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key',
});

interface WaybackSnapshot {
  timestamp: string; // YYYYMMDDHHMMSS format
  url: string;
  date: Date;
}

interface HistoricalPrice {
  price: number;
  currency: string;
  date: string;
  source: 'wayback' | 'our_database';
}

/**
 * Clean URL for better Wayback matching
 */
function cleanUrlForWayback(url: string): string {
  try {
    const urlObj = new URL(url);

    // For Amazon, remove query parameters - only keep the /dp/{ASIN} part
    if (urlObj.hostname.includes('amazon.com')) {
      const dpMatch = urlObj.pathname.match(/\/dp\/([A-Z0-9]{10})/);
      if (dpMatch) {
        return `https://www.amazon.com/dp/${dpMatch[1]}`;
      }
    }

    // For other sites, keep the pathname but remove query params
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
  } catch {
    return url;
  }
}

/**
 * Get available Wayback Machine snapshots for a URL
 */
async function getWaybackSnapshots(url: string, daysBack: number = 90): Promise<WaybackSnapshot[]> {
  try {
    // Clean the URL for better matching
    const cleanUrl = cleanUrlForWayback(url);
    console.log(`Cleaned URL for Wayback: ${cleanUrl}`);

    // Wayback Machine CDX API
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(cleanUrl)}&output=json&limit=20&filter=statuscode:200`;

    console.log(`Fetching Wayback snapshots...`);

    const response = await fetch(cdxUrl);

    console.log(`Wayback response status: ${response.status}`);
    console.log(`Wayback content-type: ${response.headers.get('content-type')}`);

    if (!response.ok) {
      console.error('Wayback CDX API failed:', response.status);
      return [];
    }

    const contentType = response.headers.get('content-type');
    const responseText = await response.text();

    console.log(`Wayback response (first 500 chars): ${responseText.substring(0, 500)}`);

    if (contentType && contentType.includes('text/html')) {
      console.error('Wayback returned HTML instead of JSON - URL might not be archived');
      return [];
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('Failed to parse Wayback response as JSON:', jsonError);
      console.log('Wayback may not have this URL archived or is rate limiting');
      return [];
    }

    // CDX format: [urlkey, timestamp, original, mimetype, statuscode, digest, length]
    if (!Array.isArray(data) || data.length < 2) {
      console.log('No Wayback snapshots found');
      return [];
    }

    // Skip header row
    const snapshots = data.slice(1).map((row: any[]) => {
      const timestamp = row[1]; // YYYYMMDDHHMMSS
      const year = timestamp.substring(0, 4);
      const month = timestamp.substring(4, 6);
      const day = timestamp.substring(6, 8);
      const date = new Date(`${year}-${month}-${day}`);

      return {
        timestamp,
        url: `https://web.archive.org/web/${timestamp}/${url}`,
        date,
      };
    });

    // Filter by date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const recentSnapshots = snapshots.filter((s: WaybackSnapshot) => s.date >= cutoffDate);

    // Take max 5 snapshots spread across the time range
    const selected = selectSpreadSnapshots(recentSnapshots, 5);

    console.log(`Found ${recentSnapshots.length} recent snapshots, using ${selected.length}`);

    return selected;
  } catch (error) {
    console.error('Error fetching Wayback snapshots:', error);
    return [];
  }
}

/**
 * Select snapshots spread evenly across time range
 */
function selectSpreadSnapshots(snapshots: WaybackSnapshot[], count: number): WaybackSnapshot[] {
  if (snapshots.length <= count) return snapshots;

  const interval = Math.floor(snapshots.length / count);
  const selected: WaybackSnapshot[] = [];

  for (let i = 0; i < count; i++) {
    const index = Math.min(i * interval, snapshots.length - 1);
    selected.push(snapshots[index]);
  }

  return selected;
}

/**
 * Use AI to extract price from historical HTML
 */
async function extractPriceFromHTML(html: string, url: string): Promise<{ price: number | null; currency: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set');
    return { price: null, currency: 'USD' };
  }

  try {
    // Truncate HTML if too long (Claude has token limits)
    const truncatedHtml = html.length > 50000 ? html.substring(0, 50000) : html;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Cheap and fast
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Extract the product price from this HTML. Look for the main product price, not shipping or other prices.

URL: ${url}

HTML snippet:
${truncatedHtml}

Return ONLY a JSON object in this exact format:
{
  "price": 49.99,
  "currency": "USD"
}

If no price found, return:
{
  "price": null,
  "currency": "USD"
}`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);

    if (!jsonMatch) {
      console.log('Could not extract JSON from AI response');
      return { price: null, currency: 'USD' };
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      price: result.price ? parseFloat(result.price) : null,
      currency: result.currency || 'USD',
    };
  } catch (error) {
    console.error('Error extracting price with AI:', error);
    return { price: null, currency: 'USD' };
  }
}

/**
 * Fetch historical prices from Wayback Machine using AI
 */
export async function fetchWaybackPriceHistory(url: string, daysBack: number = 90): Promise<HistoricalPrice[]> {
  try {
    console.log(`\n🕐 Fetching historical prices from Wayback Machine...`);

    // Get snapshots
    const snapshots = await getWaybackSnapshots(url, daysBack);

    if (snapshots.length === 0) {
      console.log('⚠️  No Wayback snapshots available');
      return [];
    }

    const historicalPrices: HistoricalPrice[] = [];

    // Fetch and extract price from each snapshot
    for (const snapshot of snapshots) {
      try {
        console.log(`  Fetching snapshot from ${snapshot.date.toLocaleDateString()}...`);

        const response = await fetch(snapshot.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (!response.ok) {
          console.log(`  ⚠️  Failed to fetch snapshot (${response.status})`);
          continue;
        }

        const html = await response.text();

        // Use AI to extract price
        const { price, currency } = await extractPriceFromHTML(html, url);

        if (price) {
          historicalPrices.push({
            price,
            currency,
            date: snapshot.date.toISOString(),
            source: 'wayback',
          });
          console.log(`  ✅ Found price: $${price} on ${snapshot.date.toLocaleDateString()}`);
        } else {
          console.log(`  ⚠️  Could not extract price from snapshot`);
        }

        // Small delay to be respectful to Wayback Machine
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`  Error processing snapshot:`, error);
      }
    }

    console.log(`\n✅ Found ${historicalPrices.length} historical prices\n`);

    return historicalPrices;
  } catch (error) {
    console.error('Error fetching Wayback price history:', error);
    return [];
  }
}

/**
 * Calculate statistics from historical prices
 */
export function calculatePriceStats(prices: HistoricalPrice[]) {
  if (prices.length === 0) {
    return null;
  }

  const priceValues = prices.map((p) => p.price);
  const lowestPrice = Math.min(...priceValues);
  const highestPrice = Math.max(...priceValues);
  const averagePrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;

  // Sort by date to get recent trend
  const sorted = [...prices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const oldestPrice = sorted[0].price;
  const newestPrice = sorted[sorted.length - 1].price;
  const trend = newestPrice > oldestPrice ? 'increasing' : newestPrice < oldestPrice ? 'decreasing' : 'stable';

  return {
    lowestPrice,
    highestPrice,
    averagePrice: Math.round(averagePrice * 100) / 100,
    trend,
    dataPoints: prices.length,
    dateRange: {
      from: sorted[0].date,
      to: sorted[sorted.length - 1].date,
    },
  };
}

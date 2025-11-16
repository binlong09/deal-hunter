/**
 * Price Extractor Service
 * Extracts price information from product URLs using HTML parsing
 * Falls back to AI when needed
 */

import * as cheerio from 'cheerio';

export interface PriceInfo {
  price: number | null;
  currency: string;
  inStock: boolean;
  productName: string | null;
  imageUrl: string | null;
  saleBadge: string | null;
  extractionMethod: 'html' | 'ai' | 'failed';
}

/**
 * Common price selectors for popular stores
 */
const STORE_SELECTORS: Record<string, {
  price: string[];
  name: string[];
  image: string[];
  stock: string[];
  sale: string[];
}> = {
  'amazon.com': {
    price: ['.a-price-whole', '#priceblock_ourprice', '#priceblock_dealprice', '.a-offscreen'],
    name: ['#productTitle', 'h1.product-title'],
    image: ['#landingImage', '#imgTagWrapperId img'],
    stock: ['.availability', '#availability'],
    sale: ['.savingsPercentage', '.a-color-price'],
  },
  'target.com': {
    price: ['[data-test="product-price"]', '.price', '[data-test="current-price"]'],
    name: ['[data-test="product-title"]', 'h1'],
    image: ['[data-test="product-image"]', 'img[alt*="product"]'],
    stock: ['[data-test="availability"]'],
    sale: ['[data-test="badge"]', '.sale-badge'],
  },
  'walmart.com': {
    price: ['[itemprop="price"]', '.price-main', '[data-automation-id="product-price"]'],
    name: ['[itemprop="name"]', 'h1'],
    image: ['[data-testid="hero-image-container"] img'],
    stock: ['[data-testid="fulfillment-badge"]'],
    sale: ['.badge', '[data-automation-id="badge"]'],
  },
  'costco.com': {
    price: ['.price', '.your-price', '[automation-id="productPriceOutput"]'],
    name: ['h1[automation-id="productName"]', 'h1'],
    image: ['[automation-id="enlargeImage"]', '.product-image img'],
    stock: ['.availability'],
    sale: ['.instant-savings', '.sale-badge'],
  },
  'default': {
    price: [
      '[itemprop="price"]',
      '.price',
      '#price',
      '[class*="price"]',
      '[data-price]',
      'meta[property="og:price:amount"]',
    ],
    name: [
      '[itemprop="name"]',
      'h1',
      'meta[property="og:title"]',
      'title',
    ],
    image: [
      '[itemprop="image"]',
      'meta[property="og:image"]',
      'img.product-image',
      'img[alt*="product"]',
    ],
    stock: [
      '[itemprop="availability"]',
      '.availability',
      '.stock',
      '[class*="stock"]',
    ],
    sale: [
      '.sale',
      '.discount',
      '[class*="sale"]',
      '[class*="discount"]',
    ],
  },
};

/**
 * Extract domain from URL
 */
function getDomain(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch {
    return 'default';
  }
}

/**
 * Get selectors for a given domain
 */
function getSelectors(url: string) {
  const domain = getDomain(url);

  // Check if we have specific selectors for this store
  for (const [store, selectors] of Object.entries(STORE_SELECTORS)) {
    if (domain.includes(store)) {
      return selectors;
    }
  }

  return STORE_SELECTORS.default;
}

/**
 * Parse price from text (handles $19.99, 19.99, $19, etc.)
 */
function parsePrice(text: string): number | null {
  // Remove currency symbols and spaces
  const cleaned = text.replace(/[$€£¥,\s]/g, '');

  // Extract number
  const match = cleaned.match(/(\d+\.?\d*)/);
  if (match) {
    const price = parseFloat(match[1]);
    return isNaN(price) ? null : price;
  }

  return null;
}

/**
 * Extract price information from HTML
 */
export async function extractPriceFromHTML(url: string): Promise<PriceInfo> {
  try {
    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const selectors = getSelectors(url);

    // Extract price
    let price: number | null = null;
    for (const selector of selectors.price) {
      const element = $(selector).first();
      if (element.length) {
        const text = element.attr('content') || element.text();
        price = parsePrice(text);
        if (price) break;
      }
    }

    // Extract product name
    let productName: string | null = null;
    for (const selector of selectors.name) {
      const element = $(selector).first();
      if (element.length) {
        productName = element.attr('content') || element.text().trim();
        if (productName) break;
      }
    }

    // Extract image URL
    let imageUrl: string | null = null;
    for (const selector of selectors.image) {
      const element = $(selector).first();
      if (element.length) {
        imageUrl = element.attr('content') || element.attr('src') || element.attr('href') || null;
        if (imageUrl && imageUrl.startsWith('http')) break;
      }
    }

    // Check stock status
    let inStock = true; // assume in stock unless proven otherwise
    for (const selector of selectors.stock) {
      const element = $(selector).first();
      if (element.length) {
        const text = element.text().toLowerCase();
        if (text.includes('out of stock') || text.includes('unavailable')) {
          inStock = false;
          break;
        }
      }
    }

    // Extract sale badge
    let saleBadge: string | null = null;
    for (const selector of selectors.sale) {
      const element = $(selector).first();
      if (element.length) {
        saleBadge = element.text().trim();
        if (saleBadge) break;
      }
    }

    // Determine currency from URL or price text
    const domain = getDomain(url);
    let currency = 'USD';
    if (domain.endsWith('.ca')) currency = 'CAD';
    else if (domain.endsWith('.uk') || domain.endsWith('.co.uk')) currency = 'GBP';
    else if (domain.endsWith('.eu') || domain.endsWith('.de') || domain.endsWith('.fr')) currency = 'EUR';

    return {
      price,
      currency,
      inStock,
      productName,
      imageUrl,
      saleBadge,
      extractionMethod: price ? 'html' : 'failed',
    };
  } catch (error) {
    console.error('HTML extraction failed:', error);
    return {
      price: null,
      currency: 'USD',
      inStock: true,
      productName: null,
      imageUrl: null,
      saleBadge: null,
      extractionMethod: 'failed',
    };
  }
}

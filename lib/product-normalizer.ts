import Anthropic from '@anthropic-ai/sdk';
import { turso, queryOne } from './turso';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key',
});

export interface NormalizedProduct {
  name: string;
  nameNormalized: string;
  category: string;
  brand: string | null;
}

export interface ProductNameCache {
  raw_name: string;
  normalized_name: string;
  category: string;
  brand: string | null;
  product_id: number | null;
}

const VALID_CATEGORIES = [
  'supplements',
  'skincare',
  'cosmetics',
  'fragrance',
  'baby',
  'food',
  'bags',
  'clothing',
  'shoes',
  'electronics',
  'household',
  'other',
];

/**
 * Normalize a Vietnamese product name to English using Claude API
 * Returns cached result if available
 */
export async function normalizeProductName(
  rawName: string
): Promise<NormalizedProduct> {
  if (!rawName || !rawName.trim()) {
    return {
      name: 'Unknown Product',
      nameNormalized: 'unknown product',
      category: 'other',
      brand: null,
    };
  }

  const trimmedName = rawName.trim();

  // Check cache first
  const cached = await queryOne<ProductNameCache>(
    'SELECT * FROM product_name_cache WHERE raw_name = ?',
    [trimmedName.toLowerCase()]
  );

  if (cached) {
    return {
      name: cached.normalized_name,
      nameNormalized: cached.normalized_name.toLowerCase().trim(),
      category: cached.category,
      brand: cached.brand,
    };
  }

  // Use Claude to normalize
  const normalized = await normalizeWithAI(trimmedName);

  // Cache the result
  await turso.execute({
    sql: `INSERT OR REPLACE INTO product_name_cache (raw_name, normalized_name, category, brand)
          VALUES (?, ?, ?, ?)`,
    args: [
      trimmedName.toLowerCase(),
      normalized.name,
      normalized.category,
      normalized.brand,
    ],
  });

  return normalized;
}

/**
 * Batch normalize multiple product names efficiently
 */
export async function normalizeProductNames(
  rawNames: string[]
): Promise<Map<string, NormalizedProduct>> {
  const results = new Map<string, NormalizedProduct>();
  const uncachedNames: string[] = [];

  // Check cache for all names
  for (const rawName of rawNames) {
    const trimmedName = rawName.trim();
    if (!trimmedName) continue;

    const cached = await queryOne<ProductNameCache>(
      'SELECT * FROM product_name_cache WHERE raw_name = ?',
      [trimmedName.toLowerCase()]
    );

    if (cached) {
      results.set(rawName, {
        name: cached.normalized_name,
        nameNormalized: cached.normalized_name.toLowerCase().trim(),
        category: cached.category,
        brand: cached.brand,
      });
    } else {
      uncachedNames.push(rawName);
    }
  }

  // Batch normalize uncached names
  if (uncachedNames.length > 0) {
    const batchResults = await batchNormalizeWithAI(uncachedNames);

    for (const [rawName, normalized] of batchResults) {
      results.set(rawName, normalized);

      // Cache each result
      await turso.execute({
        sql: `INSERT OR REPLACE INTO product_name_cache (raw_name, normalized_name, category, brand)
              VALUES (?, ?, ?, ?)`,
        args: [
          rawName.toLowerCase(),
          normalized.name,
          normalized.category,
          normalized.brand,
        ],
      });
    }
  }

  return results;
}

async function normalizeWithAI(rawName: string): Promise<NormalizedProduct> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      name: rawName,
      nameNormalized: rawName.toLowerCase().trim(),
      category: 'other',
      brand: null,
    };
  }

  const prompt = `You are a product name normalizer. Given a Vietnamese product name (often mixed with English brand names), extract:
1. Normalized English product name (clean, standardized)
2. Product category
3. Brand name (if identifiable)

Categories (use ONLY these): ${VALID_CATEGORIES.join(', ')}

Examples:
- "sữa rửa mặt kiehl" → name: "Kiehl's Face Wash", category: "skincare", brand: "Kiehl's"
- "túi katespade new york" → name: "Kate Spade Handbag", category: "bags", brand: "Kate Spade"
- "glucosamine kirland costco" → name: "Kirkland Glucosamine", category: "supplements", brand: "Kirkland"
- "nước hoa victoria secret" → name: "Victoria's Secret Perfume", category: "fragrance", brand: "Victoria's Secret"
- "sữa ensure cho người lớn" → name: "Ensure Adult Nutrition", category: "supplements", brand: "Ensure"
- "kem chống nắng neutrogena" → name: "Neutrogena Sunscreen", category: "skincare", brand: "Neutrogena"
- "bỉm huggies size 3" → name: "Huggies Diapers Size 3", category: "baby", brand: "Huggies"

Product name to normalize: "${rawName}"

Respond in JSON format ONLY:
{"name": "...", "category": "...", "brand": "..." or null}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText =
      message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Validate category
      const category = VALID_CATEGORIES.includes(parsed.category)
        ? parsed.category
        : 'other';

      return {
        name: parsed.name || rawName,
        nameNormalized: (parsed.name || rawName).toLowerCase().trim(),
        category,
        brand: parsed.brand || null,
      };
    }
  } catch (error) {
    console.error('Error normalizing product name:', error);
  }

  // Fallback
  return {
    name: rawName,
    nameNormalized: rawName.toLowerCase().trim(),
    category: 'other',
    brand: null,
  };
}

async function batchNormalizeWithAI(
  rawNames: string[]
): Promise<Map<string, NormalizedProduct>> {
  const results = new Map<string, NormalizedProduct>();

  if (!process.env.ANTHROPIC_API_KEY || rawNames.length === 0) {
    for (const name of rawNames) {
      results.set(name, {
        name,
        nameNormalized: name.toLowerCase().trim(),
        category: 'other',
        brand: null,
      });
    }
    return results;
  }

  // Process in batches of 10 for efficiency
  const BATCH_SIZE = 10;
  for (let i = 0; i < rawNames.length; i += BATCH_SIZE) {
    const batch = rawNames.slice(i, i + BATCH_SIZE);

    const prompt = `You are a product name normalizer. Given Vietnamese product names (often mixed with English brand names), extract for EACH:
1. Normalized English product name (clean, standardized)
2. Product category
3. Brand name (if identifiable)

Categories (use ONLY these): ${VALID_CATEGORIES.join(', ')}

Product names to normalize:
${batch.map((name, idx) => `${idx + 1}. "${name}"`).join('\n')}

Respond in JSON array format ONLY:
[{"original": "...", "name": "...", "category": "...", "brand": "..." or null}, ...]`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText =
        message.content[0].type === 'text' ? message.content[0].text : '';

      // Extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        for (const item of parsed) {
          const originalName = batch.find(
            (n) =>
              n.toLowerCase() === item.original?.toLowerCase() ||
              batch.indexOf(item.original) >= 0
          );

          if (originalName || item.original) {
            const key = originalName || item.original;
            const category = VALID_CATEGORIES.includes(item.category)
              ? item.category
              : 'other';

            results.set(key, {
              name: item.name || key,
              nameNormalized: (item.name || key).toLowerCase().trim(),
              category,
              brand: item.brand || null,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error batch normalizing product names:', error);
    }

    // Fill in any missing results with fallback
    for (const name of batch) {
      if (!results.has(name)) {
        results.set(name, {
          name,
          nameNormalized: name.toLowerCase().trim(),
          category: 'other',
          brand: null,
        });
      }
    }
  }

  return results;
}

/**
 * Find or create a normalized product record
 */
export async function findOrCreateNormalizedProduct(
  normalized: NormalizedProduct
): Promise<number> {
  // Try to find existing product
  const existing = await queryOne<{ id: number }>(
    'SELECT id FROM normalized_products WHERE name_normalized = ?',
    [normalized.nameNormalized]
  );

  if (existing) {
    return existing.id;
  }

  // Create new product
  const result = await turso.execute({
    sql: `INSERT INTO normalized_products (name, name_normalized, category, brand)
          VALUES (?, ?, ?, ?)`,
    args: [
      normalized.name,
      normalized.nameNormalized,
      normalized.category,
      normalized.brand,
    ],
  });

  return Number(result.lastInsertRowid);
}

/**
 * Update normalized product stats after a sale
 */
export async function updateProductStats(
  productId: number,
  salePrice: number,
  profit: number
): Promise<void> {
  await turso.execute({
    sql: `UPDATE normalized_products
          SET total_sales = total_sales + 1,
              total_revenue_vnd = total_revenue_vnd + ?,
              total_profit_vnd = total_profit_vnd + ?,
              last_sold_at = datetime('now')
          WHERE id = ?`,
    args: [salePrice || 0, profit || 0, productId],
  });
}

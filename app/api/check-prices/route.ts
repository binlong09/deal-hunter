import { NextRequest, NextResponse } from 'next/server';
import { turso } from '@/lib/turso';
import { extractPriceFromHTML } from '@/lib/price-extractor';
import { scoreDeal, quickEvaluate, type PriceHistoryData } from '@/lib/deal-scorer';

// POST /api/check-prices - Check prices for all active products
export async function POST(request: NextRequest) {
  try {
    // Get all active products that need checking
    const now = new Date();
    const result = await turso.execute(`
      SELECT *
      FROM tracked_products
      WHERE is_active = 1
      AND (
        last_checked_at IS NULL
        OR datetime(last_checked_at, '+' || check_frequency || ' minutes') <= datetime('now')
      )
      ORDER BY priority ASC
      LIMIT 50
    `);

    const products = result.rows;
    const checkResults = [];

    console.log(`Checking prices for ${products.length} products...`);

    for (const product of products) {
      try {
        const productId = Number(product.id);
        const url = product.url as string;
        const currentStoredPrice = product.current_price as number | null;

        console.log(`Checking: ${product.product_name} (${url})`);

        // Extract current price
        const priceInfo = await extractPriceFromHTML(url);

        if (!priceInfo.price) {
          console.log(`  ⚠ Could not extract price for ${product.product_name}`);
          // Update last checked time even if extraction failed
          await turso.execute({
            sql: 'UPDATE tracked_products SET last_checked_at = datetime("now") WHERE id = ?',
            args: [productId],
          });
          checkResults.push({
            id: productId,
            name: product.product_name,
            status: 'failed',
            reason: 'Price extraction failed',
          });
          continue;
        }

        const newPrice = priceInfo.price;
        const priceChanged = currentStoredPrice && newPrice !== currentStoredPrice;

        console.log(`  Current price: $${newPrice}${priceChanged ? ` (was $${currentStoredPrice})` : ''}`);

        // Add to price history
        await turso.execute({
          sql: `INSERT INTO price_history (
                  tracked_product_id, price, currency, in_stock, sale_badge
                ) VALUES (?, ?, ?, ?, ?)`,
          args: [
            productId,
            newPrice,
            priceInfo.currency,
            priceInfo.inStock ? 1 : 0,
            priceInfo.saleBadge,
          ],
        });

        // Update tracked product
        await turso.execute({
          sql: `UPDATE tracked_products
                SET current_price = ?,
                    currency = ?,
                    last_checked_at = datetime('now'),
                    product_name = COALESCE(?, product_name),
                    image_url = COALESCE(?, image_url),
                    ${priceChanged ? "last_price_change_at = datetime('now')," : ''}
                    updated_at = datetime('now')
                WHERE id = ?`,
          args: [
            newPrice,
            priceInfo.currency,
            priceInfo.productName,
            priceInfo.imageUrl,
            productId,
          ],
        });

        // If price changed, evaluate deal
        if (priceChanged) {
          const priceDrop = currentStoredPrice! > newPrice;
          const quickEval = quickEvaluate(newPrice, currentStoredPrice);

          console.log(`  📊 Price ${priceDrop ? 'dropped' : 'increased'} by ${quickEval.discountPercent}%`);

          // Only do AI scoring if price dropped significantly (save API costs)
          if (priceDrop && quickEval.discountPercent >= 5) {
            // Get price history for AI analysis
            const historyResult = await turso.execute({
              sql: `SELECT price, checked_at
                    FROM price_history
                    WHERE tracked_product_id = ?
                    ORDER BY checked_at DESC
                    LIMIT 30`,
              args: [productId],
            });

            const priceHistory: PriceHistoryData = {
              currentPrice: newPrice,
              previousPrice: currentStoredPrice,
              lowestPrice: null,
              highestPrice: null,
              averagePrice: null,
              priceHistory: historyResult.rows.map((row) => ({
                price: Number(row.price),
                date: row.checked_at as string,
              })),
            };

            // Calculate stats
            if (priceHistory.priceHistory.length > 0) {
              const prices = priceHistory.priceHistory.map((p) => p.price);
              priceHistory.lowestPrice = Math.min(...prices);
              priceHistory.highestPrice = Math.max(...prices);
              priceHistory.averagePrice =
                prices.reduce((a, b) => a + b, 0) / prices.length;
            }

            // Score the deal with AI
            console.log(`  🤖 Scoring deal with AI...`);
            const dealScore = await scoreDeal(
              product.product_name as string,
              url,
              priceHistory,
              product.store_name as string,
              priceInfo.saleBadge || undefined
            );

            console.log(`  ✨ Deal score: ${dealScore.score}/100 (${dealScore.quality})`);

            // Create deal alert
            await turso.execute({
              sql: `INSERT INTO deal_alerts (
                      tracked_product_id, alert_type, old_price, new_price,
                      discount_percent, deal_score, deal_quality, message
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                productId,
                'price_drop',
                currentStoredPrice,
                newPrice,
                quickEval.discountPercent,
                dealScore.score,
                dealScore.quality,
                dealScore.reasoning,
              ],
            });

            checkResults.push({
              id: productId,
              name: product.product_name,
              status: 'price_drop',
              old_price: currentStoredPrice,
              new_price: newPrice,
              discount_percent: quickEval.discountPercent,
              deal_score: dealScore.score,
              deal_quality: dealScore.quality,
            });
          } else {
            checkResults.push({
              id: productId,
              name: product.product_name,
              status: priceDrop ? 'minor_drop' : 'price_increase',
              old_price: currentStoredPrice,
              new_price: newPrice,
            });
          }
        } else {
          checkResults.push({
            id: productId,
            name: product.product_name,
            status: 'no_change',
            price: newPrice,
          });
        }

        // Small delay between requests to be respectful
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error checking product ${product.id}:`, error);
        checkResults.push({
          id: Number(product.id),
          name: product.product_name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      checked: products.length,
      results: checkResults,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Price check error:', error);
    return NextResponse.json(
      { error: 'Failed to check prices: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

// GET /api/check-prices - Trigger manual price check
export async function GET(request: NextRequest) {
  return POST(request);
}

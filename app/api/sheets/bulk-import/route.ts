import { NextRequest, NextResponse } from 'next/server';
import { turso, queryOne } from '@/lib/turso';
import {
  parseSheetData,
  shouldSkipSheet,
  isInventorySheet,
  SheetRow,
} from '@/lib/sheets-parser';
import {
  normalizeProductNames,
  findOrCreateNormalizedProduct,
  updateProductStats,
} from '@/lib/product-normalizer';

const WEBHOOK_SECRET = process.env.SHEETS_WEBHOOK_SECRET;

interface SheetData {
  sheetName: string;
  headers: string[];
  rows: unknown[][];
}

interface BulkImportPayload {
  sheets: SheetData[];
  exchangeRate?: number; // USD to VND rate
}

/**
 * POST /api/sheets/bulk-import - One-time historical import of all sheets
 * Called manually or by Google Apps Script syncAllSheets()
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get('authorization');
    if (WEBHOOK_SECRET && authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      console.warn('Invalid webhook secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: BulkImportPayload = await request.json();
    const { sheets, exchangeRate = 25000 } = payload;

    if (!sheets || !Array.isArray(sheets)) {
      return NextResponse.json(
        { error: 'Missing required field: sheets (array)' },
        { status: 400 }
      );
    }

    console.log(`Starting bulk import of ${sheets.length} sheets...`);

    const results = {
      totalSheets: sheets.length,
      processedSheets: 0,
      skippedSheets: 0,
      totalRows: 0,
      totalProducts: 0,
      errors: [] as string[],
      sheetResults: [] as {
        sheetName: string;
        batchId: number;
        rowsProcessed: number;
        status: 'success' | 'skipped' | 'error';
        message?: string;
      }[],
    };

    for (const sheet of sheets) {
      try {
        const { sheetName, headers, rows } = sheet;

        if (!sheetName || !headers || !rows) {
          results.errors.push(`Invalid sheet data: ${sheetName || 'unknown'}`);
          continue;
        }

        // Skip non-sales sheets
        if (shouldSkipSheet(sheetName)) {
          results.skippedSheets++;
          results.sheetResults.push({
            sheetName,
            batchId: 0,
            rowsProcessed: 0,
            status: 'skipped',
            message: 'Non-sales sheet (pricing formula, etc.)',
          });
          continue;
        }

        // Handle inventory sheet separately
        if (isInventorySheet(sheetName)) {
          results.skippedSheets++;
          results.sheetResults.push({
            sheetName,
            batchId: 0,
            rowsProcessed: 0,
            status: 'skipped',
            message: 'Inventory sheet (not implemented yet)',
          });
          continue;
        }

        // Parse the sheet data
        const parsed = parseSheetData(sheetName, headers, rows);

        if (parsed.rows.length === 0) {
          results.skippedSheets++;
          results.sheetResults.push({
            sheetName,
            batchId: 0,
            rowsProcessed: 0,
            status: 'skipped',
            message: 'No valid data rows',
          });
          continue;
        }

        // Import the sheet
        const importResult = await importSheet(parsed, exchangeRate);

        results.processedSheets++;
        results.totalRows += importResult.rowsProcessed;
        results.totalProducts += importResult.productsNormalized;
        results.sheetResults.push({
          sheetName,
          batchId: importResult.batchId,
          rowsProcessed: importResult.rowsProcessed,
          status: 'success',
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Error importing ${sheet.sheetName}: ${errorMsg}`);
        results.sheetResults.push({
          sheetName: sheet.sheetName,
          batchId: 0,
          rowsProcessed: 0,
          status: 'error',
          message: errorMsg,
        });
      }
    }

    console.log(`Bulk import complete: ${results.processedSheets} sheets, ${results.totalRows} rows`);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('Error in bulk import:', error);
    return NextResponse.json(
      { error: 'Failed to bulk import: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

interface ImportResult {
  batchId: number;
  rowsProcessed: number;
  productsNormalized: number;
}

async function importSheet(
  parsed: ReturnType<typeof parseSheetData>,
  exchangeRate: number
): Promise<ImportResult> {
  // Find or create batch
  const existingBatch = await queryOne<{ id: number }>(
    'SELECT id FROM batches WHERE sheet_name = ?',
    [parsed.sheetName]
  );

  let batchId: number;

  if (existingBatch) {
    batchId = existingBatch.id;
    // Clear existing sales for re-import
    await turso.execute({
      sql: 'DELETE FROM sales WHERE batch_id = ?',
      args: [batchId],
    });
    // Update batch
    await turso.execute({
      sql: `UPDATE batches SET
              batch_number = ?,
              batch_date = ?,
              exchange_rate = ?,
              synced_at = datetime('now')
            WHERE id = ?`,
      args: [parsed.batchNumber, parsed.batchDate, exchangeRate, batchId],
    });
  } else {
    // Create new batch
    const result = await turso.execute({
      sql: `INSERT INTO batches (sheet_name, batch_number, batch_date, exchange_rate)
            VALUES (?, ?, ?, ?)`,
      args: [parsed.sheetName, parsed.batchNumber, parsed.batchDate, exchangeRate],
    });
    batchId = Number(result.lastInsertRowid);
  }

  // Collect all product names for batch normalization
  const productNames = parsed.rows
    .map((row) => row.productName)
    .filter((name): name is string => !!name);

  // Batch normalize all products
  const normalizedProducts = await normalizeProductNames(productNames);

  let productsNormalized = 0;

  // Import all rows
  for (const row of parsed.rows) {
    let productId: number | null = null;

    if (row.productName) {
      const normalized = normalizedProducts.get(row.productName);
      if (normalized) {
        productId = await findOrCreateNormalizedProduct(normalized);
        productsNormalized++;
      }
    }

    await turso.execute({
      sql: `INSERT INTO sales (
              batch_id, row_number, customer_name, product_name_raw, product_id,
              cost_usd, cost_vnd, shipping_cost_vnd, weight_kg,
              sale_price_vnd, profit_vnd, payment_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        batchId,
        row.rowNumber,
        row.customerName,
        row.productName,
        productId,
        row.costUsd,
        row.costVnd,
        row.shippingCost,
        row.weight,
        row.salePrice,
        row.profit,
        row.paymentStatus,
      ],
    });

    // Update product stats
    if (productId) {
      await updateProductStats(productId, row.salePrice || 0, row.profit || 0);
    }
  }

  // Update batch totals
  await turso.execute({
    sql: `UPDATE batches SET
            total_items = (SELECT COUNT(*) FROM sales WHERE batch_id = ?),
            total_revenue_vnd = (SELECT COALESCE(SUM(sale_price_vnd), 0) FROM sales WHERE batch_id = ?),
            total_profit_vnd = (SELECT COALESCE(SUM(profit_vnd), 0) FROM sales WHERE batch_id = ?)
          WHERE id = ?`,
    args: [batchId, batchId, batchId, batchId],
  });

  return {
    batchId,
    rowsProcessed: parsed.rows.length,
    productsNormalized,
  };
}

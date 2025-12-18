import { NextRequest, NextResponse } from 'next/server';
import { turso, queryOne } from '@/lib/turso';
import {
  parseSheetData,
  shouldSkipSheet,
  isInventorySheet,
  ParsedSheet,
  SheetRow,
} from '@/lib/sheets-parser';
import {
  normalizeProductName,
  findOrCreateNormalizedProduct,
  updateProductStats,
} from '@/lib/product-normalizer';

const WEBHOOK_SECRET = process.env.SHEETS_WEBHOOK_SECRET;

interface SyncPayload {
  sheetName: string;
  headers: string[];
  rows: unknown[][];
  timestamp?: string;
}

/**
 * POST /api/sheets/sync - Webhook endpoint for Google Sheets sync
 * Called by Google Apps Script on sheet edits
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get('authorization');
    if (WEBHOOK_SECRET && authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      console.warn('Invalid webhook secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: SyncPayload = await request.json();
    const { sheetName, headers, rows } = payload;

    if (!sheetName || !headers || !rows) {
      return NextResponse.json(
        { error: 'Missing required fields: sheetName, headers, rows' },
        { status: 400 }
      );
    }

    // Skip non-sales sheets
    if (shouldSkipSheet(sheetName)) {
      return NextResponse.json({
        success: true,
        message: `Skipped sheet: ${sheetName}`,
        skipped: true,
      });
    }

    // Handle inventory sheet separately (future feature)
    if (isInventorySheet(sheetName)) {
      return NextResponse.json({
        success: true,
        message: `Inventory sheet detected: ${sheetName} (not implemented yet)`,
        skipped: true,
      });
    }

    // Parse the sheet data
    const parsed = parseSheetData(sheetName, headers, rows);

    if (parsed.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No valid rows found in sheet: ${sheetName}`,
        rowsProcessed: 0,
      });
    }

    // Sync the data
    const result = await syncSheetData(parsed);

    return NextResponse.json({
      success: true,
      sheetName,
      batchId: result.batchId,
      rowsProcessed: result.rowsProcessed,
      rowsCreated: result.rowsCreated,
      rowsUpdated: result.rowsUpdated,
      productsNormalized: result.productsNormalized,
    });
  } catch (error) {
    console.error('Error syncing sheet:', error);
    return NextResponse.json(
      { error: 'Failed to sync sheet: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

interface SyncResult {
  batchId: number;
  rowsProcessed: number;
  rowsCreated: number;
  rowsUpdated: number;
  productsNormalized: number;
}

async function syncSheetData(parsed: ParsedSheet): Promise<SyncResult> {
  // Find or create batch
  const existingBatch = await queryOne<{ id: number }>(
    'SELECT id FROM batches WHERE sheet_name = ?',
    [parsed.sheetName]
  );

  let batchId: number;

  if (existingBatch) {
    batchId = existingBatch.id;
    // Update sync timestamp
    await turso.execute({
      sql: 'UPDATE batches SET synced_at = datetime("now") WHERE id = ?',
      args: [batchId],
    });
  } else {
    // Create new batch
    const result = await turso.execute({
      sql: `INSERT INTO batches (sheet_name, batch_number, batch_date)
            VALUES (?, ?, ?)`,
      args: [parsed.sheetName, parsed.batchNumber, parsed.batchDate],
    });
    batchId = Number(result.lastInsertRowid);
  }

  let rowsCreated = 0;
  let rowsUpdated = 0;
  let productsNormalized = 0;

  // Process each row
  for (const row of parsed.rows) {
    const saleResult = await upsertSale(batchId, row);

    if (saleResult.created) {
      rowsCreated++;
    } else if (saleResult.updated) {
      rowsUpdated++;
    }

    if (saleResult.productNormalized) {
      productsNormalized++;
    }
  }

  // Update batch totals
  await updateBatchTotals(batchId);

  return {
    batchId,
    rowsProcessed: parsed.rows.length,
    rowsCreated,
    rowsUpdated,
    productsNormalized,
  };
}

interface UpsertSaleResult {
  saleId: number;
  created: boolean;
  updated: boolean;
  productNormalized: boolean;
}

async function upsertSale(
  batchId: number,
  row: SheetRow
): Promise<UpsertSaleResult> {
  // Check if sale exists
  const existing = await queryOne<{ id: number; product_id: number | null }>(
    'SELECT id, product_id FROM sales WHERE batch_id = ? AND row_number = ?',
    [batchId, row.rowNumber]
  );

  let saleId: number;
  let created = false;
  let updated = false;
  let productNormalized = false;

  // Normalize product name if needed
  let productId: number | null = existing?.product_id ?? null;

  if (!productId && row.productName) {
    try {
      const normalized = await normalizeProductName(row.productName);
      productId = await findOrCreateNormalizedProduct(normalized);
      productNormalized = true;
    } catch (error) {
      console.error('Error normalizing product:', error);
    }
  }

  if (existing) {
    // Update existing sale
    saleId = existing.id;
    await turso.execute({
      sql: `UPDATE sales SET
              customer_name = ?,
              product_name_raw = ?,
              product_id = ?,
              cost_usd = ?,
              cost_vnd = ?,
              shipping_cost_vnd = ?,
              weight_kg = ?,
              sale_price_vnd = ?,
              profit_vnd = ?,
              payment_status = ?,
              synced_at = datetime('now')
            WHERE id = ?`,
      args: [
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
        saleId,
      ],
    });
    updated = true;
  } else {
    // Create new sale
    const result = await turso.execute({
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
    saleId = Number(result.lastInsertRowid);
    created = true;

    // Update product stats for new sales
    if (productId) {
      await updateProductStats(productId, row.salePrice || 0, row.profit || 0);
    }
  }

  return { saleId, created, updated, productNormalized };
}

async function updateBatchTotals(batchId: number): Promise<void> {
  await turso.execute({
    sql: `UPDATE batches SET
            total_items = (SELECT COUNT(*) FROM sales WHERE batch_id = ?),
            total_revenue_vnd = (SELECT COALESCE(SUM(sale_price_vnd), 0) FROM sales WHERE batch_id = ?),
            total_profit_vnd = (SELECT COALESCE(SUM(profit_vnd), 0) FROM sales WHERE batch_id = ?)
          WHERE id = ?`,
    args: [batchId, batchId, batchId, batchId],
  });
}

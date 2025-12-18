/**
 * Column name variations mapping for Vietnamese Google Sheets
 * Maps various Vietnamese column headers to standardized field names
 */

interface ColumnMapping {
  field: string;
  patterns: string[];
}

const COLUMN_MAPPINGS: ColumnMapping[] = [
  {
    field: 'product_name',
    patterns: ['mặt hàng', 'tên mặt hàng', 'tên hàng', 'sản phẩm', 'sp', 'hàng'],
  },
  {
    field: 'customer_name',
    patterns: ['khách hàng', 'khách', 'tên khách', 'customer', 'người mua'],
  },
  {
    field: 'cost_usd',
    patterns: [
      'giá nhập (usd)',
      'giá nhập ($)',
      'đơn giá',
      'giá nhập',
      'giá usd',
      'cost',
      'price usd',
      'giá gốc',
    ],
  },
  {
    field: 'cost_vnd',
    patterns: ['giá nhập (vnd)', 'giá nhập vnd', 'giá vnd'],
  },
  {
    field: 'sale_price',
    patterns: [
      'giá bán (vnd)',
      'giá bán',
      'bán',
      'sale price',
      'selling price',
      'giá bán vnd',
    ],
  },
  {
    field: 'profit',
    patterns: ['lãi (vnd)', 'lãi', 'profit', 'lời', 'lợi nhuận'],
  },
  {
    field: 'weight',
    patterns: ['cân nặng', 'weight', 'kg', 'trọng lượng', 'nặng'],
  },
  {
    field: 'shipping_cost',
    patterns: ['phí ship', 'tiền ship', 'ship', 'shipping', 'phí vận chuyển'],
  },
  {
    field: 'payment_status',
    patterns: [
      'trạng thái thanh toán',
      'tình trạng',
      'status',
      'thanh toán',
      'tt',
      'trạng thái',
    ],
  },
  {
    field: 'quantity',
    patterns: ['số lượng', 'sl', 'qty', 'quantity'],
  },
  {
    field: 'row_number',
    patterns: ['stt', 'no', '#', 'số thứ tự'],
  },
];

/**
 * Normalize a column header to a standard field name
 */
export function normalizeColumnHeader(header: string): string | null {
  const normalized = header.toLowerCase().trim();

  for (const mapping of COLUMN_MAPPINGS) {
    for (const pattern of mapping.patterns) {
      if (normalized.includes(pattern) || pattern.includes(normalized)) {
        return mapping.field;
      }
    }
  }

  return null;
}

/**
 * Parse payment status from Vietnamese text
 */
export function parsePaymentStatus(
  status: string | null | undefined
): 'paid' | 'unpaid' | 'deposit' | 'unknown' {
  if (!status) return 'unknown';

  const normalized = status.toLowerCase().trim();

  if (
    normalized.includes('đã thanh toán') ||
    normalized.includes('paid') ||
    normalized.includes('done') ||
    normalized === 'ok' ||
    normalized === 'x'
  ) {
    return 'paid';
  }

  if (
    normalized.includes('chưa thanh toán') ||
    normalized.includes('unpaid') ||
    normalized.includes('chưa')
  ) {
    return 'unpaid';
  }

  if (
    normalized.includes('đã cọc') ||
    normalized.includes('cọc') ||
    normalized.includes('deposit')
  ) {
    return 'deposit';
  }

  return 'unknown';
}

/**
 * Extract batch number and date from sheet name
 * Examples: "Đợt hàng 11 - 1125" → { batchNumber: 11, batchDate: "1125" }
 *           "Đợt 124" → { batchNumber: 124, batchDate: null }
 */
export function parseSheetName(
  sheetName: string
): { batchNumber: number | null; batchDate: string | null } {
  // Try to extract batch number
  const batchMatch = sheetName.match(/đợt\s*(?:hàng\s*)?(\d+)/i);
  const batchNumber = batchMatch ? parseInt(batchMatch[1], 10) : null;

  // Try to extract date (usually after dash)
  const dateMatch = sheetName.match(/-\s*(\d{3,4})/);
  const batchDate = dateMatch ? dateMatch[1] : null;

  return { batchNumber, batchDate };
}

/**
 * Parse a numeric value from potentially messy input
 */
export function parseNumericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    // Remove common formatting characters
    const cleaned = value
      .replace(/[,\s]/g, '') // Remove commas and spaces
      .replace(/[đ$₫]/gi, '') // Remove currency symbols
      .replace(/vnd|usd/gi, '') // Remove currency text
      .trim();

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

export interface SheetRow {
  rowNumber: number;
  customerName: string | null;
  productName: string | null;
  costUsd: number | null;
  costVnd: number | null;
  salePrice: number | null;
  profit: number | null;
  weight: number | null;
  shippingCost: number | null;
  paymentStatus: 'paid' | 'unpaid' | 'deposit' | 'unknown';
  quantity: number | null;
}

export interface ParsedSheet {
  sheetName: string;
  batchNumber: number | null;
  batchDate: string | null;
  rows: SheetRow[];
  columnMapping: Record<string, number>; // field name → column index
}

/**
 * Parse raw sheet data into structured format
 */
export function parseSheetData(
  sheetName: string,
  headers: string[],
  rows: unknown[][]
): ParsedSheet {
  const { batchNumber, batchDate } = parseSheetName(sheetName);

  // Map headers to field names
  const columnMapping: Record<string, number> = {};
  headers.forEach((header, index) => {
    const field = normalizeColumnHeader(header);
    if (field) {
      columnMapping[field] = index;
    }
  });

  // Parse rows
  const parsedRows: SheetRow[] = [];

  rows.forEach((row, rowIndex) => {
    // Skip empty rows
    const hasData = row.some(
      (cell) => cell !== null && cell !== undefined && cell !== ''
    );
    if (!hasData) return;

    const getValue = (field: string): unknown => {
      const colIndex = columnMapping[field];
      return colIndex !== undefined ? row[colIndex] : null;
    };

    const productName = getValue('product_name');

    // Skip rows without product name (likely headers or empty rows)
    if (!productName) return;

    // Skip summary/footer rows (totals, shipping fees, profit summaries, etc.)
    if (isSummaryRow(String(productName))) return;

    const parsedRow: SheetRow = {
      rowNumber: rowIndex + 2, // +2 because row 1 is header, and we're 0-indexed
      customerName: getValue('customer_name') as string | null,
      productName: String(productName),
      costUsd: parseNumericValue(getValue('cost_usd')),
      costVnd: parseNumericValue(getValue('cost_vnd')),
      salePrice: parseNumericValue(getValue('sale_price')),
      profit: parseNumericValue(getValue('profit')),
      weight: parseNumericValue(getValue('weight')),
      shippingCost: parseNumericValue(getValue('shipping_cost')),
      paymentStatus: parsePaymentStatus(getValue('payment_status') as string),
      quantity: parseNumericValue(getValue('quantity')),
    };

    parsedRows.push(parsedRow);
  });

  return {
    sheetName,
    batchNumber,
    batchDate,
    rows: parsedRows,
    columnMapping,
  };
}

/**
 * Sheets to skip during import
 */
const SKIP_SHEETS = [
  'cách tính giá', // Pricing formula reference
  'hướng dẫn', // Instructions
  'template', // Template sheets
  'mẫu', // Template in Vietnamese
];

/**
 * Check if a sheet should be skipped
 */
export function shouldSkipSheet(sheetName: string): boolean {
  const normalized = sheetName.toLowerCase().trim();
  return SKIP_SHEETS.some((skip) => normalized.includes(skip));
}

/**
 * Check if a sheet is the inventory sheet
 */
export function isInventorySheet(sheetName: string): boolean {
  const normalized = sheetName.toLowerCase().trim();
  return normalized.includes('hàng tồn') || normalized.includes('tồn kho');
}

/**
 * Summary/footer row patterns to skip
 * These are not actual product sales
 */
const SKIP_ROW_PATTERNS = [
  'thùng hàng',
  'tổng cân',
  'tiền ship',
  'phí ship',
  'tiền công',
  'lãi cuối',
  'lãi trước',
  'lãi sau',
  'final profit',
  'tổng lãi',
  'tổng tiền',
  'total',
  'weight fee',
  'đơn điện biên',
  'đã thanh toán',
  'đã cọc',
  'payment confirm',
  'deposit payment',
  'confirmation',
];

/**
 * Check if a row is a summary/footer row that should be skipped
 */
export function isSummaryRow(productName: string): boolean {
  if (!productName) return true;

  const normalized = productName.toLowerCase().trim();

  // Skip if it matches any summary pattern
  return SKIP_ROW_PATTERNS.some(pattern => normalized.includes(pattern));
}

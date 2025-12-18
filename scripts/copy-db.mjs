import { createClient } from '@libsql/client';

// Source (local dev)
const source = createClient({
  url: 'libsql://deal-hunter-binlong09.aws-us-east-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Destination (production)
const dest = createClient({
  url: 'libsql://deal-hunter-prod-binlong09.aws-us-east-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN_PROD,
});

const TABLES_TO_COPY = [
  'trips',
  'products',
  'example_posts',
  'generated_posts',
  'tracked_products',
  'price_history',
  'deal_alerts',
  'tracking_settings',
  'category_trackers',
  'category_matches',
  'category_alerts',
];

async function copyTable(tableName) {
  try {
    // Get all rows from source
    const result = await source.execute(`SELECT * FROM ${tableName}`);

    if (result.rows.length === 0) {
      console.log(`  ${tableName}: 0 rows (empty)`);
      return 0;
    }

    // Get column names
    const columns = result.columns;

    // Insert each row into destination
    let copied = 0;
    for (const row of result.rows) {
      const values = columns.map(col => row[col]);
      const placeholders = columns.map(() => '?').join(', ');
      const columnList = columns.join(', ');

      try {
        await dest.execute({
          sql: `INSERT OR REPLACE INTO ${tableName} (${columnList}) VALUES (${placeholders})`,
          args: values,
        });
        copied++;
      } catch (err) {
        // Skip duplicates or constraint errors
        if (!err.message.includes('UNIQUE constraint')) {
          console.error(`  Error inserting into ${tableName}:`, err.message);
        }
      }
    }

    console.log(`  ${tableName}: ${copied}/${result.rows.length} rows copied`);
    return copied;
  } catch (err) {
    console.error(`  ${tableName}: Error - ${err.message}`);
    return 0;
  }
}

async function main() {
  console.log('Copying data from deal-hunter to deal-hunter-prod...\n');

  let totalCopied = 0;

  for (const table of TABLES_TO_COPY) {
    totalCopied += await copyTable(table);
  }

  console.log(`\nDone! Total rows copied: ${totalCopied}`);
}

main().catch(console.error);

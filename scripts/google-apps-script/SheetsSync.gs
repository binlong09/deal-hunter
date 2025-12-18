/**
 * Deal Hunter PWA - Google Sheets Sync Script
 *
 * This script syncs sales data from Google Sheets to the Deal Hunter PWA.
 *
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Copy this entire script into the editor
 * 4. Update the CONFIG values below with your settings
 * 5. Save the project (give it a name like "Deal Hunter Sync")
 * 6. Run the setup() function once to create triggers
 * 7. Authorize the script when prompted
 *
 * The script will automatically sync changes and you can manually trigger
 * a full sync using syncAllSheets() from the custom menu.
 */

// ============== CONFIGURATION ==============
// Update these values for your setup

const CONFIG = {
  // Your Deal Hunter PWA webhook URL
  WEBHOOK_URL: 'https://your-app.vercel.app/api/sheets/sync',
  BULK_IMPORT_URL: 'https://your-app.vercel.app/api/sheets/bulk-import',

  // Secret key for authentication (must match SHEETS_WEBHOOK_SECRET in your .env)
  WEBHOOK_SECRET: 'your-secret-key-here',

  // Debounce delay in seconds (to prevent too many API calls on rapid edits)
  DEBOUNCE_SECONDS: 30,

  // Exchange rate for USD to VND conversion
  EXCHANGE_RATE: 25000,
};

// ============== SETUP ==============

/**
 * Run this function once to set up the script
 */
function setup() {
  // Create edit trigger
  const triggers = ScriptApp.getProjectTriggers();
  const hasEditTrigger = triggers.some(t => t.getHandlerFunction() === 'onEdit');

  if (!hasEditTrigger) {
    ScriptApp.newTrigger('onEdit')
      .forSpreadsheet(SpreadsheetApp.getActive())
      .onEdit()
      .create();
    Logger.log('Edit trigger created');
  }

  // Create custom menu
  createMenu();

  Logger.log('Setup complete! The script will now sync changes automatically.');
}

/**
 * Creates a custom menu in the spreadsheet
 */
function onOpen() {
  createMenu();
}

function createMenu() {
  SpreadsheetApp.getUi()
    .createMenu('Deal Hunter')
    .addItem('Sync Current Sheet', 'syncCurrentSheet')
    .addItem('Sync All Sheets', 'syncAllSheets')
    .addSeparator()
    .addItem('View Sync Status', 'showSyncStatus')
    .addToUi();
}

// ============== SYNC FUNCTIONS ==============

/**
 * Triggered on any edit in the spreadsheet
 * Uses debouncing to prevent excessive API calls
 */
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();

  // Store the pending sync in script properties
  const props = PropertiesService.getScriptProperties();
  const pendingSyncs = JSON.parse(props.getProperty('pendingSyncs') || '{}');

  pendingSyncs[sheetName] = new Date().getTime();
  props.setProperty('pendingSyncs', JSON.stringify(pendingSyncs));

  // Create a time-based trigger to process the sync after debounce period
  // Delete any existing pending triggers first
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'processPendingSyncs') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Create new trigger
  ScriptApp.newTrigger('processPendingSyncs')
    .timeBased()
    .after(CONFIG.DEBOUNCE_SECONDS * 1000)
    .create();
}

/**
 * Processes pending syncs after debounce period
 */
function processPendingSyncs() {
  const props = PropertiesService.getScriptProperties();
  const pendingSyncs = JSON.parse(props.getProperty('pendingSyncs') || '{}');

  // Clear pending syncs
  props.setProperty('pendingSyncs', '{}');

  // Delete the trigger that called this
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'processPendingSyncs') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Sync each pending sheet
  const sheetNames = Object.keys(pendingSyncs);
  for (const sheetName of sheetNames) {
    try {
      syncSheet(sheetName);
    } catch (error) {
      Logger.log(`Error syncing sheet ${sheetName}: ${error.message}`);
    }
  }
}

/**
 * Syncs the current active sheet
 */
function syncCurrentSheet() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();

  try {
    const result = syncSheet(sheetName);
    SpreadsheetApp.getUi().alert(
      'Sync Complete',
      `Sheet "${sheetName}" synced successfully!\n\nRows processed: ${result.rowsProcessed || 0}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'Sync Error',
      `Failed to sync sheet "${sheetName}":\n\n${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Syncs a single sheet by name
 */
function syncSheet(sheetName) {
  const spreadsheet = SpreadsheetApp.getActive();
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }

  const data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    return { rowsProcessed: 0, skipped: true };
  }

  const headers = data[0].map(h => String(h));
  const rows = data.slice(1);

  const payload = {
    sheetName: sheetName,
    headers: headers,
    rows: rows,
    timestamp: new Date().toISOString(),
  };

  const response = makeRequest(CONFIG.WEBHOOK_URL, payload);

  // Log the sync
  logSync(sheetName, response);

  return response;
}

/**
 * Syncs all sheets (bulk import)
 */
function syncAllSheets() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.alert(
    'Sync All Sheets',
    'This will sync all sheets to Deal Hunter. This may take a few minutes.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );

  if (result !== ui.Button.YES) {
    return;
  }

  const spreadsheet = SpreadsheetApp.getActive();
  const sheets = spreadsheet.getSheets();

  const sheetsData = sheets.map(sheet => {
    const data = sheet.getDataRange().getValues();
    return {
      sheetName: sheet.getName(),
      headers: data.length > 0 ? data[0].map(h => String(h)) : [],
      rows: data.length > 1 ? data.slice(1) : [],
    };
  });

  const payload = {
    sheets: sheetsData,
    exchangeRate: CONFIG.EXCHANGE_RATE,
  };

  try {
    const response = makeRequest(CONFIG.BULK_IMPORT_URL, payload);

    ui.alert(
      'Bulk Import Complete',
      `Successfully imported data:\n\n` +
      `Sheets processed: ${response.processedSheets || 0}\n` +
      `Sheets skipped: ${response.skippedSheets || 0}\n` +
      `Total rows: ${response.totalRows || 0}\n` +
      `Products normalized: ${response.totalProducts || 0}`,
      ui.ButtonSet.OK
    );

    // Log the bulk sync
    logSync('BULK_IMPORT', response);

  } catch (error) {
    ui.alert(
      'Import Error',
      `Failed to import sheets:\n\n${error.message}`,
      ui.ButtonSet.OK
    );
  }
}

// ============== UTILITY FUNCTIONS ==============

/**
 * Makes an authenticated request to the webhook
 */
function makeRequest(url, payload) {
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${CONFIG.WEBHOOK_SECRET}`,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();
  const responseText = response.getContentText();

  if (statusCode !== 200) {
    let errorMessage = `HTTP ${statusCode}`;
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      errorMessage = responseText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return JSON.parse(responseText);
}

/**
 * Logs sync operations for debugging
 */
function logSync(sheetName, response) {
  const props = PropertiesService.getScriptProperties();
  const syncLog = JSON.parse(props.getProperty('syncLog') || '[]');

  syncLog.unshift({
    timestamp: new Date().toISOString(),
    sheetName: sheetName,
    success: response.success || false,
    rowsProcessed: response.rowsProcessed || 0,
    message: response.message || '',
  });

  // Keep only last 50 log entries
  if (syncLog.length > 50) {
    syncLog.length = 50;
  }

  props.setProperty('syncLog', JSON.stringify(syncLog));
}

/**
 * Shows recent sync status
 */
function showSyncStatus() {
  const props = PropertiesService.getScriptProperties();
  const syncLog = JSON.parse(props.getProperty('syncLog') || '[]');

  if (syncLog.length === 0) {
    SpreadsheetApp.getUi().alert('Sync Status', 'No sync history found.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const recent = syncLog.slice(0, 10);
  const statusText = recent.map(entry => {
    const date = new Date(entry.timestamp).toLocaleString();
    const status = entry.success ? '✓' : '✗';
    return `${status} ${date} - ${entry.sheetName} (${entry.rowsProcessed} rows)`;
  }).join('\n');

  SpreadsheetApp.getUi().alert(
    'Recent Sync Status',
    `Last 10 sync operations:\n\n${statusText}`,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Test function to verify the webhook connection
 */
function testConnection() {
  try {
    const response = makeRequest(CONFIG.WEBHOOK_URL, {
      sheetName: '_test_connection',
      headers: ['test'],
      rows: [],
    });

    SpreadsheetApp.getUi().alert(
      'Connection Test',
      'Successfully connected to Deal Hunter webhook!',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'Connection Failed',
      `Could not connect to webhook:\n\n${error.message}\n\nPlease check:\n1. WEBHOOK_URL is correct\n2. WEBHOOK_SECRET matches your .env file\n3. Your app is deployed and running`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

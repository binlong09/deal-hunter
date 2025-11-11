#!/bin/bash

# Script to run database migrations on Turso

set -e

echo "🔧 Database Migration Script"
echo "=============================="
echo ""

# Check if turso CLI is installed
if ! command -v turso &> /dev/null; then
    echo "❌ Turso CLI not found. Install it first:"
    echo "   curl -sSfL https://get.tur.so/install.sh | bash"
    exit 1
fi

# Get database name
read -p "Enter your Turso database name (e.g., deal-hunter): " DB_NAME

if [ -z "$DB_NAME" ]; then
    echo "❌ Database name is required"
    exit 1
fi

echo ""
echo "📋 Available migrations:"
echo "  1. 001-remove-category-constraint.sql - Remove category CHECK constraint"
echo ""

read -p "Which migration to run? (1): " MIGRATION_NUM

MIGRATION_FILE=""
case $MIGRATION_NUM in
    1)
        MIGRATION_FILE="migrations/001-remove-category-constraint.sql"
        ;;
    *)
        echo "❌ Invalid migration number"
        exit 1
        ;;
esac

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo ""
echo "🚀 Running migration: $MIGRATION_FILE"
echo "   Database: $DB_NAME"
echo ""

# Confirm before running
read -p "⚠️  This will modify your database. Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Migration cancelled"
    exit 1
fi

echo ""
echo "📤 Executing migration..."
turso db shell "$DB_NAME" < "$MIGRATION_FILE"

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "🔍 Verify the changes:"
echo "   turso db shell $DB_NAME"
echo "   Then run: SELECT * FROM products LIMIT 5;"
echo ""

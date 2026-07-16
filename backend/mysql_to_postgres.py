"""
MySQL to PostgreSQL SQL Converter for SkyMart
Converts MySQL Workbench export to PostgreSQL-compatible SQL
"""

import re
import os

def convert_mysql_to_postgres(input_file, output_file):
    """
    Convert MySQL SQL to PostgreSQL SQL
    """
    print(f"📖 Reading {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print("🔄 Converting SQL syntax...")
    
    # ============================================================
    # 1. REMOVE MYSQL-SPECIFIC COMMANDS
    # ============================================================
    
    replacements = [
        # Remove USE statements
        (r'USE\s+`[^`]+`;\s*', ''),
        
        # Remove SET SQL_SAFE_UPDATES
        (r'SET\s+SQL_SAFE_UPDATES\s*=\s*[01];\s*', ''),
        
        # Remove ENGINE, CHARSET, COLLATE
        (r'ENGINE\s*=\s*InnoDB\s*', ''),
        (r'CHARSET\s*=\s*[^\s;]+', ''),
        (r'COLLATE\s*=\s*[^\s;]+', ''),
        (r'CHARACTER\s+SET\s*=\s*[^\s;]+', ''),
        
        # Remove backticks (convert to double quotes for PostgreSQL)
        (r'`([^`]+)`', r'"\1"'),
        
        # Convert MySQL data types
        (r'int\(\d+\)', 'INTEGER'),
        (r'INT\s*\(\d+\)', 'INTEGER'),
        (r'tinyint\(\d+\)', 'BOOLEAN'),
        (r'bigint\(\d+\)', 'BIGINT'),
        (r'varchar\(\d+\)', 'VARCHAR'),
        (r'datetime', 'TIMESTAMP'),
        (r'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP'),
        (r'ON UPDATE CURRENT_TIMESTAMP', ''),
        
        # Convert AUTO_INCREMENT to SERIAL
        (r'AUTO_INCREMENT', 'SERIAL'),
        (r'NOT NULL SERIAL', 'SERIAL NOT NULL'),
        (r'SERIAL PRIMARY KEY', 'SERIAL PRIMARY KEY'),
        
        # Remove IF NOT EXISTS for CREATE TABLE (keep it)
        # (r'IF NOT EXISTS', 'IF NOT EXISTS'),  # Keep this
        
        # Convert INSERT IGNORE to INSERT
        (r'INSERT\s+IGNORE\s+INTO', 'INSERT INTO'),
        
        # Remove ON DUPLICATE KEY UPDATE
        (r'ON\s+DUPLICATE\s+KEY\s+UPDATE\s+[^;]+;', ';'),
        
        # Remove single-line MySQL comments
        (r'--[^\n]*\n', '\n'),
        
        # Remove DROP TABLE IF EXISTS (we'll keep this)
        # (r'DROP TABLE IF EXISTS', 'DROP TABLE IF EXISTS'),  # Keep
        
        # Remove double quotes from string values (convert to single quotes)
        (r'([\s\(,=])"([^"]+)"', r"\1'\2'"),
    ]
    
    for pattern, replacement in replacements:
        content = re.sub(pattern, replacement, content, flags=re.IGNORECASE | re.MULTILINE)
    
    # ============================================================
    # 2. FIX POSTGRESQL SPECIFIC ISSUES
    # ============================================================
    
    # Fix SERIAL - remove NOT NULL from SERIAL
    content = re.sub(r'SERIAL NOT NULL', 'SERIAL', content)
    content = re.sub(r'NOT NULL SERIAL', 'SERIAL NOT NULL', content)
    
    # Fix boolean values (tinyint(1) becomes BOOLEAN)
    content = re.sub(r'BOOLEAN DEFAULT 1', 'BOOLEAN DEFAULT true', content)
    content = re.sub(r'BOOLEAN DEFAULT 0', 'BOOLEAN DEFAULT false', content)
    
    # Fix JSON data in INSERT statements - remove outer quotes
    def fix_json_values(match):
        """Remove outer quotes from JSON values in INSERT statements"""
        import json
        try:
            value = match.group(1)
            # Try to parse as JSON
            parsed = json.loads(value)
            return f"'{json.dumps(parsed)}'"
        except:
            return match.group(0)
    
    # Fix PostgreSQL table creation - add IF NOT EXISTS
    content = re.sub(
        r'CREATE TABLE "([^"]+)" \(',
        r'CREATE TABLE IF NOT EXISTS "\1" (',
        content
    )
    
    # Fix FOREIGN KEY constraints (if any)
    content = re.sub(
        r'FOREIGN KEY \("([^"]+)"\) REFERENCES "([^"]+)" \("([^"]+)"\)',
        r'FOREIGN KEY ("\1") REFERENCES "\2" ("\3")',
        content
    )
    
    # Remove trailing commas in CREATE TABLE statements
    content = re.sub(r',\s*\)', '\n)', content)
    
    # Add semicolons after CREATE TABLE if missing
    content = re.sub(r'\)\s*(?!;)', ');', content)
    
    # Fix INSERT INTO with JSON - ensure proper escaping
    def fix_json_in_insert(match):
        """Fix JSON values in INSERT statements"""
        full_match = match.group(0)
        # Find values between parentheses
        values = re.findall(r"'([^']*)'", full_match)
        return full_match
    
    # ============================================================
    # 3. HANDLE SPECIFIC TABLES
    # ============================================================
    
    # Fix product_categories table - ensure correct structure
    content = re.sub(
        r'CREATE TABLE IF NOT EXISTS "product_categories" \(',
        '''CREATE TABLE IF NOT EXISTS "product_categories" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) UNIQUE NOT NULL,
    "parent_id" INTEGER,
    "level" INTEGER DEFAULT 1,
    "display_order" INTEGER DEFAULT 0,
    "icon" VARCHAR(50),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP''',
        content
    )
    
    # Fix store_brands table
    content = re.sub(
        r'CREATE TABLE IF NOT EXISTS "store_brands" \(',
        '''CREATE TABLE IF NOT EXISTS "store_brands" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) UNIQUE NOT NULL,
    "logo" VARCHAR(500),
    "category_id" INTEGER,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP''',
        content
    )
    
    # Fix store_products table
    content = re.sub(
        r'CREATE TABLE IF NOT EXISTS "store_products" \(',
        '''CREATE TABLE IF NOT EXISTS "store_products" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) UNIQUE NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "discount_price" DECIMAL(10,2),
    "img" VARCHAR(500) NOT NULL,
    "images" TEXT,
    "description" TEXT,
    "short_description" VARCHAR(500),
    "sizes" TEXT,
    "colors" TEXT,
    "rating" DECIMAL(3,2) DEFAULT 0.00,
    "reviews_count" INTEGER DEFAULT 0,
    "in_stock" BOOLEAN DEFAULT true,
    "is_featured" BOOLEAN DEFAULT false,
    "is_new" BOOLEAN DEFAULT false,
    "is_best_seller" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP''',
        content
    )
    
    # ============================================================
    # 4. CLEAN UP
    # ============================================================
    
    # Remove multiple empty lines
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    
    # Ensure all statements end with semicolon
    content = re.sub(r'\)\s*$', ');', content, flags=re.MULTILINE)
    
    # Write the converted SQL
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Conversion complete! Saved to {output_file}")
    print(f"📊 File size: {os.path.getsize(output_file) / 1024:.2f} KB")
    
    # Show a preview
    print("\n📝 Preview (first 500 characters):")
    print("-" * 50)
    print(content[:500])
    print("-" * 50)
    
    return content

# ============================================================
# RUN THE CONVERSION
# ============================================================

if __name__ == "__main__":
    input_file = "skymart_export.sql"  # Your MySQL export file
    output_file = "skymart_postgres.sql"  # The PostgreSQL output
    
    if not os.path.exists(input_file):
        print(f"❌ Error: {input_file} not found!")
        print("Please export your MySQL database as SQL first.")
        print("In MySQL Workbench: Server → Data Export → Export to Self-Contained File")
        print("Then save it as 'skymart_export.sql' in this folder.")
    else:
        print("🚀 Starting MySQL to PostgreSQL conversion...")
        print("=" * 60)
        convert_mysql_to_postgres(input_file, output_file)
        print("\n✅ Done! You can now run the converted SQL in Neon.")
        print(f"📁 File: {output_file}")
        print("   → Go to Neon SQL Editor and paste the entire content.")
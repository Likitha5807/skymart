"""
Clean MySQL export for PostgreSQL - Remove problematic tables and syntax
"""

import re
import os

def clean_sql_file():
    input_file = 'skymart_postgres.sql'  # The converted file
    output_file = 'skymart_clean.sql'     # The cleaned file
    
    if not os.path.exists(input_file):
        print(f"❌ Error: {input_file} not found!")
        print("Please run mysql_to_postgres.py first.")
        return
    
    print(f"📖 Reading {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    print(f"📊 Original size: {len(content):,} characters")
    
    # ============================================================
    # 1. Remove LOCK TABLES and UNLOCK TABLES
    # ============================================================
    
    content = re.sub(r'LOCK TABLES.*?;', '', content, flags=re.IGNORECASE | re.DOTALL)
    content = re.sub(r'UNLOCK TABLES;', '', content, flags=re.IGNORECASE)
    
    # ============================================================
    # 2. Remove api_product table completely
    # ============================================================
    
    # Remove CREATE TABLE for api_product
    content = re.sub(
        r'CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+"api_product".*?;',
        '',
        content,
        flags=re.IGNORECASE | re.DOTALL
    )
    
    # Remove DROP TABLE for api_product
    content = re.sub(
        r'DROP\s+TABLE\s+IF\s+EXISTS\s+"api_product".*?;',
        '',
        content,
        flags=re.IGNORECASE | re.DOTALL
    )
    
    # Remove INSERT INTO for api_product
    content = re.sub(
        r'INSERT\s+INTO\s+"api_product".*?;',
        '',
        content,
        flags=re.IGNORECASE | re.DOTALL
    )
    
    # ============================================================
    # 3. Remove problematic tables
    # ============================================================
    
    # Tables to remove (don't need them)
    tables_to_remove = [
        'product',
        'products',
        'product_reviews',
        'purchase_history',
        'store_brand',
        'store_category',
        'store_categories',
        'users',
        'api_product'
    ]
    
    for table in tables_to_remove:
        # Remove CREATE TABLE
        content = re.sub(
            rf'CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+"{table}".*?;',
            '',
            content,
            flags=re.IGNORECASE | re.DOTALL
        )
        # Remove DROP TABLE
        content = re.sub(
            rf'DROP\s+TABLE\s+IF\s+EXISTS\s+"{table}".*?;',
            '',
            content,
            flags=re.IGNORECASE | re.DOTALL
        )
        # Remove INSERT INTO
        content = re.sub(
            rf'INSERT\s+INTO\s+"{table}".*?;',
            '',
            content,
            flags=re.IGNORECASE | re.DOTALL
        )
    
    # ============================================================
    # 4. Remove MySQL comments
    # ============================================================
    
    content = re.sub(r'/\*!.*?\*/', '', content, flags=re.DOTALL)
    content = re.sub(r'^SET.*?;', '', content, flags=re.MULTILINE)
    content = re.sub(r'^--.*?$', '', content, flags=re.MULTILINE)
    
    # ============================================================
    # 5. Fix data types for PostgreSQL
    # ============================================================
    
    # Fix tinyint to boolean (but keep the data)
    content = re.sub(r'tinyint\(\d+\)', 'BOOLEAN', content, flags=re.IGNORECASE)
    
    # Fix double quotes for strings in INSERT
    def fix_string_quotes(match):
        text = match.group(0)
        # Replace double quotes inside VALUES with single quotes
        text = re.sub(r'\\"', "'", text)
        return text
    
    # ============================================================
    # 6. Remove duplicate semicolons and clean up
    # ============================================================
    
    content = re.sub(r';+', ';', content)
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    content = re.sub(r';\s*;', ';', content)
    
    # ============================================================
    # 7. Write the cleaned file
    # ============================================================
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Cleaned file saved to: {output_file}")
    print(f"📊 New size: {len(content):,} characters")

if __name__ == "__main__":
    clean_sql_file()
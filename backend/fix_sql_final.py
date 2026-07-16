"""
Fix MySQL export for PostgreSQL - Skip unwanted tables
"""

import re
import os

def fix_sql_file():
    input_file = 'skymart_export.sql'
    output_file = 'skymart_fixed.sql'
    
    print(f"📖 Reading {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    print(f"📊 File size: {len(content):,} characters")
    
    # ============================================================
    # 1. Remove unwanted tables (api_product, etc.)
    # ============================================================
    
    # Remove api_product table completely
    content = re.sub(
        r'DROP TABLE IF EXISTS `api_product`.*?CREATE TABLE `api_product`.*?;',
        '',
        content,
        flags=re.DOTALL | re.IGNORECASE
    )
    
    # Remove any INSERT INTO api_product
    content = re.sub(
        r'INSERT INTO `api_product`.*?;',
        '',
        content,
        flags=re.DOTALL | re.IGNORECASE
    )
    
    # ============================================================
    # 2. Remove MySQL-specific headers/comments
    # ============================================================
    
    content = re.sub(r'/\*!.*?\*/', '', content, flags=re.DOTALL)
    content = re.sub(r'^SET.*?;\s*$', '', content, flags=re.MULTILINE)
    content = re.sub(r'^--.*?$', '', content, flags=re.MULTILINE)
    
    # ============================================================
    # 3. Replace backticks with double quotes
    # ============================================================
    
    content = re.sub(r'`([^`]+)`', r'"\1"', content)
    
    # ============================================================
    # 4. Convert MySQL data types
    # ============================================================
    
    content = re.sub(r'bigint\s*\(\d+\)', 'BIGINT', content, flags=re.IGNORECASE)
    content = re.sub(r'int\s*\(\d+\)', 'INTEGER', content, flags=re.IGNORECASE)
    content = re.sub(r'tinyint\s*\(\d+\)', 'BOOLEAN', content, flags=re.IGNORECASE)
    content = re.sub(r'varchar\s*\(\d+\)', 'VARCHAR', content, flags=re.IGNORECASE)
    content = re.sub(r'datetime', 'TIMESTAMP', content, flags=re.IGNORECASE)
    content = re.sub(r'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP', content, flags=re.IGNORECASE)
    
    # ============================================================
    # 5. Handle AUTO_INCREMENT -> SERIAL
    # ============================================================
    
    content = re.sub(r'AUTO_INCREMENT', 'SERIAL', content, flags=re.IGNORECASE)
    
    # ============================================================
    # 6. Remove MySQL-specific clauses
    # ============================================================
    
    content = re.sub(r'ENGINE\s*=\s*[^\s;]+', '', content, flags=re.IGNORECASE)
    content = re.sub(r'CHARSET\s*=\s*[^\s;]+', '', content, flags=re.IGNORECASE)
    content = re.sub(r'COLLATE\s*=\s*[^\s;]+', '', content, flags=re.IGNORECASE)
    content = re.sub(r'CHARACTER\s+SET\s*=\s*[^\s;]+', '', content, flags=re.IGNORECASE)
    
    # ============================================================
    # 7. Fix INSERT statements
    # ============================================================
    
    # Remove INSERT IGNORE
    content = re.sub(r'INSERT\s+IGNORE\s+INTO', 'INSERT INTO', content, flags=re.IGNORECASE)
    
    # Remove ON DUPLICATE KEY UPDATE
    content = re.sub(r'ON\s+DUPLICATE\s+KEY\s+UPDATE\s+[^;]+', '', content, flags=re.IGNORECASE)
    
    # ============================================================
    # 8. Fix booleans
    # ============================================================
    
    content = re.sub(r"DEFAULT\s+'1'", 'DEFAULT true', content, flags=re.IGNORECASE)
    content = re.sub(r"DEFAULT\s+'0'", 'DEFAULT false', content, flags=re.IGNORECASE)
    content = re.sub(r"DEFAULT\s+1\b", 'DEFAULT true', content, flags=re.IGNORECASE)
    content = re.sub(r"DEFAULT\s+0\b", 'DEFAULT false', content, flags=re.IGNORECASE)
    
    # ============================================================
    # 9. Fix CREATE TABLE
    # ============================================================
    
    # Add IF NOT EXISTS
    content = re.sub(r'CREATE\s+TABLE\s+"([^"]+)"', r'CREATE TABLE IF NOT EXISTS "\1"', content, flags=re.IGNORECASE)
    
    # Fix SERIAL
    content = re.sub(r'"(\w+)"\s+SERIAL\s+NOT\s+NULL', r'"\1" SERIAL', content, flags=re.IGNORECASE)
    
    # Fix trailing commas
    content = re.sub(r',\s*\)', '\n)', content)
    
    # ============================================================
    # 10. Keep only useful tables
    # ============================================================
    
    # Keep only these tables
    keep_tables = [
        'auth_user',
        'auth_group', 
        'auth_permission',
        'django_admin_log',
        'django_content_type',
        'django_migrations',
        'django_session',
        'product_categories',
        'store_brands',
        'store_products',
        'user_cart',
        'user_wishlist'
    ]
    
    # Remove any CREATE TABLE for tables not in keep_tables
    for table in ['api_product', 'products', 'product_reviews', 'purchase_history']:
        content = re.sub(
            rf'CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+"{table}".*?;',
            '',
            content,
            flags=re.DOTALL | re.IGNORECASE
        )
        content = re.sub(
            rf'INSERT\s+INTO\s+"{table}".*?;',
            '',
            content,
            flags=re.DOTALL | re.IGNORECASE
        )
    
    # ============================================================
    # 11. Clean up
    # ============================================================
    
    # Remove empty lines
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    
    # Remove multiple semicolons
    content = re.sub(r';+', ';', content)
    
    # Write the fixed file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Fixed file saved to: {output_file}")
    print(f"📊 File size: {len(content) / 1024:.2f} KB")
    
    # Count tables
    tables = re.findall(r'CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+"([^"]+)"', content, re.IGNORECASE)
    print(f"📋 Tables in fixed file: {', '.join(tables)}")

if __name__ == "__main__":
    fix_sql_file()
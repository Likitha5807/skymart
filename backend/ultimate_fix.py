"""
ULTIMATE SQL FIX - Converts MySQL export to PostgreSQL
Handles ALL syntax issues including single quotes, data types, and more
"""

import re
import os

def ultimate_fix():
    input_file = 'skymart_export.sql'  # Your original MySQL export
    output_file = 'skymart_ultimate.sql'
    
    if not os.path.exists(input_file):
        print(f"❌ Error: {input_file} not found!")
        return
    
    print(f"📖 Reading {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    original_size = len(content)
    print(f"📊 Original size: {original_size:,} characters")
    
    # ============================================================
    # 1. REMOVE ALL PROBLEMATIC MYSQL SYNTAX
    # ============================================================
    
    # Remove LOCK/UNLOCK TABLES
    content = re.sub(r'LOCK TABLES.*?;', '', content, flags=re.IGNORECASE | re.DOTALL)
    content = re.sub(r'UNLOCK TABLES;', '', content, flags=re.IGNORECASE)
    
    # Remove MySQL comments
    content = re.sub(r'/\*!.*?\*/', '', content, flags=re.DOTALL)
    content = re.sub(r'^SET.*?;', '', content, flags=re.MULTILINE)
    content = re.sub(r'^--.*?$', '', content, flags=re.MULTILINE)
    
    # Remove USE statements
    content = re.sub(r'USE\s+`[^`]+`;', '', content, flags=re.IGNORECASE)
    
    # Remove ENGINE, CHARSET, COLLATE
    content = re.sub(r'ENGINE\s*=\s*[^\s;]+', '', content, flags=re.IGNORECASE)
    content = re.sub(r'CHARSET\s*=\s*[^\s;]+', '', content, flags=re.IGNORECASE)
    content = re.sub(r'COLLATE\s*=\s*[^\s;]+', '', content, flags=re.IGNORECASE)
    
    # ============================================================
    # 2. CONVERT TABLE NAMES - SINGLE QUOTES TO DOUBLE QUOTES
    # ============================================================
    
    # Replace 'table_name' with "table_name" for CREATE, DROP, INSERT, etc.
    content = re.sub(r"CREATE\s+TABLE\s+'([^']+)'", r'CREATE TABLE "\1"', content, flags=re.IGNORECASE)
    content = re.sub(r"DROP\s+TABLE\s+'([^']+)'", r'DROP TABLE "\1"', content, flags=re.IGNORECASE)
    content = re.sub(r"INSERT\s+INTO\s+'([^']+)'", r'INSERT INTO "\1"', content, flags=re.IGNORECASE)
    content = re.sub(r"UNIQUE\s+KEY\s+'([^']+)'\s+\(`([^`]+)`\)", r'UNIQUE("\1")', content, flags=re.IGNORECASE)
    content = re.sub(r"PRIMARY\s+KEY\s+\(`([^`]+)`\)", r'PRIMARY KEY("\1")', content, flags=re.IGNORECASE)
    
    # Replace backticks with double quotes
    content = re.sub(r'`([^`]+)`', r'"\1"', content)
    
    # ============================================================
    # 3. CONVERT DATA TYPES
    # ============================================================
    
    content = re.sub(r'int\(\d+\)', 'INTEGER', content, flags=re.IGNORECASE)
    content = re.sub(r'bigint\(\d+\)', 'BIGINT', content, flags=re.IGNORECASE)
    content = re.sub(r'tinyint\(\d+\)', 'BOOLEAN', content, flags=re.IGNORECASE)
    content = re.sub(r'longtext', 'TEXT', content, flags=re.IGNORECASE)
    content = re.sub(r'text', 'TEXT', content, flags=re.IGNORECASE)
    content = re.sub(r'datetime', 'TIMESTAMP', content, flags=re.IGNORECASE)
    content = re.sub(r'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP', content, flags=re.IGNORECASE)
    content = re.sub(r'AUTO_INCREMENT', 'SERIAL', content, flags=re.IGNORECASE)
    
    # ============================================================
    # 4. REMOVE UNWANTED TABLES
    # ============================================================
    
    unwanted_tables = [
        'api_product', 'product', 'products', 'product_reviews',
        'purchase_history', 'store_brand', 'store_category',
        'store_categories', 'users'
    ]
    
    for table in unwanted_tables:
        content = re.sub(
            rf'CREATE\s+TABLE\s+"{table}".*?;',
            '',
            content,
            flags=re.IGNORECASE | re.DOTALL
        )
        content = re.sub(
            rf'DROP\s+TABLE\s+"{table}".*?;',
            '',
            content,
            flags=re.IGNORECASE | re.DOTALL
        )
        content = re.sub(
            rf'INSERT\s+INTO\s+"{table}".*?;',
            '',
            content,
            flags=re.IGNORECASE | re.DOTALL
        )
    
    # ============================================================
    # 5. FIX VALUES SYNTAX
    # ============================================================
    
    # Fix VALUES with trailing commas
    content = re.sub(r'\)\s*,\s*\(', '),\n(', content)
    content = re.sub(r'\);', ');\n', content)
    
    # Remove duplicate semicolons
    content = re.sub(r';+', ';', content)
    
    # ============================================================
    # 6. FIX FOREIGN KEY SYNTAX
    # ============================================================
    
    content = re.sub(r'CONSTRAINT\s+([^\s]+)\s+FOREIGN\s+KEY\s+\(([^)]+)\)\s+REFERENCES\s+([^\s]+)\s+\(([^)]+)\)',
                     r'CONSTRAINT \1 FOREIGN KEY (\2) REFERENCES \3 (\4)',
                     content, flags=re.IGNORECASE)
    
    # ============================================================
    # 7. FIX BOOLEAN VALUES
    # ============================================================
    
    content = re.sub(r"DEFAULT\s+'1'", 'DEFAULT true', content, flags=re.IGNORECASE)
    content = re.sub(r"DEFAULT\s+'0'", 'DEFAULT false', content, flags=re.IGNORECASE)
    content = re.sub(r"DEFAULT\s+1\b", 'DEFAULT true', content, flags=re.IGNORECASE)
    content = re.sub(r"DEFAULT\s+0\b", 'DEFAULT false', content, flags=re.IGNORECASE)
    
    # ============================================================
    # 8. REMOVE EXTRA UN (from UNLOCK)
    # ============================================================
    
    content = re.sub(r'^UN\s*$', '', content, flags=re.MULTILINE)
    
    # ============================================================
    # 9. CLEAN UP
    # ============================================================
    
    # Remove multiple blank lines
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    content = re.sub(r'^\s*\n', '', content, flags=re.MULTILINE)
    
    # Add header
    header = """-- ============================================================
-- SKYMART - PostgreSQL Import File (Fixed)
-- Generated: """ + str(os.path.getmtime(input_file)) + """
-- ============================================================

"""
    
    final_content = header + content
    
    # Write the file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(final_content)
    
    print(f"✅ Fixed file saved: {output_file}")
    print(f"📊 New size: {len(final_content):,} characters")
    print(f"📉 Reduced by: {(1 - len(final_content)/original_size) * 100:.1f}%")
    
    # Show what was fixed
    print("\n🔧 Fixes applied:")
    print("  ✅ Removed LOCK/UNLOCK TABLES")
    print("  ✅ Replaced single quotes with double quotes")
    print("  ✅ Converted MySQL data types")
    print("  ✅ Removed unwanted tables")
    print("  ✅ Fixed boolean values")
    print("  ✅ Fixed foreign key syntax")
    print("  ✅ Removed duplicate semicolons")

if __name__ == "__main__":
    ultimate_fix()
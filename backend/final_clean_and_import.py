"""
Final SQL Cleaner - Removes ALL problematic syntax and keeps only what's needed
"""

import re
import os

def clean_sql():
    input_file = 'skymart_postgres.sql'
    output_file = 'skymart_final.sql'
    
    print(f"📖 Cleaning {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    original_size = len(content)
    
    # ============================================================
    # REMOVE EVERYTHING PROBLEMATIC
    # ============================================================
    
    # 1. Remove ALL LOCK/UNLOCK TABLES
    content = re.sub(r'LOCK TABLES.*?;', '', content, flags=re.IGNORECASE | re.DOTALL)
    content = re.sub(r'UNLOCK TABLES;', '', content, flags=re.IGNORECASE)
    
    # 2. Remove ALL MySQL comments and SET statements
    content = re.sub(r'/\*!.*?\*/', '', content, flags=re.DOTALL)
    content = re.sub(r'^SET.*?;', '', content, flags=re.MULTILINE)
    content = re.sub(r'^--.*?$', '', content, flags=re.MULTILINE)
    content = re.sub(r'^/\*.*?\*/', '', content, flags=re.MULTILINE)
    
    # 3. Remove DROP TABLE for ALL tables (we'll let CREATE handle it)
    content = re.sub(r'DROP\s+TABLE\s+IF\s+EXISTS\s+"[^"]+"\s*;', '', content, flags=re.IGNORECASE)
    
    # 4. Remove these unwanted tables completely
    unwanted_tables = [
        'api_product', 'product', 'products', 'product_reviews',
        'purchase_history', 'store_brand', 'store_category',
        'store_categories', 'users'
    ]
    
    for table in unwanted_tables:
        # Remove CREATE TABLE
        content = re.sub(
            rf'CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+"{table}".*?;',
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
    
    # 5. Fix tinyint to boolean in CREATE TABLE statements
    def fix_boolean(match):
        table_def = match.group(0)
        table_def = re.sub(r'tinyint\(\d+\)', 'BOOLEAN', table_def, flags=re.IGNORECASE)
        table_def = re.sub(r"DEFAULT '1'", 'DEFAULT true', table_def, flags=re.IGNORECASE)
        table_def = re.sub(r"DEFAULT '0'", 'DEFAULT false', table_def, flags=re.IGNORECASE)
        table_def = re.sub(r"DEFAULT 1", 'DEFAULT true', table_def, flags=re.IGNORECASE)
        table_def = re.sub(r"DEFAULT 0", 'DEFAULT false', table_def, flags=re.IGNORECASE)
        return table_def
    
    content = re.sub(r'CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+"[^"]+"\s*\(.*?\);', fix_boolean, content, flags=re.IGNORECASE | re.DOTALL)
    
    # 6. Remove duplicate semicolons and clean up
    content = re.sub(r';+', ';', content)
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    content = re.sub(r';\s*;', ';', content)
    content = re.sub(r'^\s*\n', '', content, flags=re.MULTILINE)
    
    # 7. Add a header
    header = """-- ============================================================
-- SKYMART - Clean Import File
-- Generated: """ + str(os.path.getmtime(input_file)) + """
-- ============================================================

"""
    
    final_content = header + content
    
    # Write the final file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(final_content)
    
    print(f"✅ Cleaned file saved: {output_file}")
    print(f"📊 Original size: {original_size:,} chars")
    print(f"📊 New size: {len(final_content):,} chars")
    print(f"📉 Reduced by: {(1 - len(final_content)/original_size) * 100:.1f}%")
    
    # Show what's in the file
    tables = re.findall(r'CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+"([^"]+)"', final_content, re.IGNORECASE)
    inserts = re.findall(r'INSERT\s+INTO\s+"([^"]+)"', final_content, re.IGNORECASE)
    
    if tables:
        print(f"\n📋 Tables being created: {', '.join(tables)}")
    if inserts:
        insert_counts = {}
        for table in inserts:
            insert_counts[table] = insert_counts.get(table, 0) + 1
        print(f"\n📝 Data being inserted:")
        for table, count in insert_counts.items():
            print(f"   - {table}: {count} rows")

if __name__ == "__main__":
    clean_sql()
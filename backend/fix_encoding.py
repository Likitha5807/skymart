import codecs

def fix_encoding(input_file, output_file):
    try:
        # Try UTF-8 first
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Fixed {input_file} -> {output_file}")
    except UnicodeDecodeError:
        try:
            # Try UTF-16 (Windows often uses this)
            with open(input_file, 'r', encoding='utf-16') as f:
                content = f.read()
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Fixed {input_file} -> {output_file} (UTF-16)")
        except:
            try:
                # Try Latin-1 as last resort
                with open(input_file, 'r', encoding='latin-1') as f:
                    content = f.read()
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ Fixed {input_file} -> {output_file} (Latin-1)")
            except Exception as e:
                print(f"❌ Error fixing {input_file}: {e}")

# Fix both files
fix_encoding('store_data.json', 'store_data_fixed.json')
fix_encoding('users.json', 'users_fixed.json')

print("✅ All files fixed!")
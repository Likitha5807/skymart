import json
import re

def clean_json_field(value):
    """Clean JSON field by removing extra quotes"""
    if value is None:
        return None
    # If it's a string that looks like JSON, parse it
    if isinstance(value, str):
        try:
            # Try to parse as JSON
            parsed = json.loads(value)
            # If it's a list or dict, convert back to string without outer quotes
            if isinstance(parsed, (list, dict)):
                return json.dumps(parsed)
            return value
        except:
            return value
    return value

def clean_data_file(input_file, output_file):
    """Clean the data file"""
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    cleaned_count = 0
    for item in data:
        if 'fields' in item:
            fields = item['fields']
            # Clean sizes
            if 'sizes' in fields and fields['sizes']:
                fields['sizes'] = clean_json_field(fields['sizes'])
                cleaned_count += 1
            # Clean colors
            if 'colors' in fields and fields['colors']:
                fields['colors'] = clean_json_field(fields['colors'])
                cleaned_count += 1
            # Clean images
            if 'images' in fields and fields['images']:
                fields['images'] = clean_json_field(fields['images'])
                cleaned_count += 1
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    
    print(f"✅ Cleaned {cleaned_count} fields in {output_file}")

# Clean both files
clean_data_file('store_data_fixed.json', 'store_data_clean.json')
clean_data_file('users_fixed.json', 'users_clean.json')

print("✅ Data cleaning complete!")
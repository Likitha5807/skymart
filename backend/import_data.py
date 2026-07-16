import json
import os
import django
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from store.models import Product, Category, Brand
from django.contrib.auth.models import User

def import_products():
    with open('store_data_clean.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    count = 0
    errors = []
    
    for item in data:
        if item.get('model') == 'store.product':
            fields = item['fields']
            try:
                # Handle JSON fields properly
                sizes = fields.get('sizes', '[]')
                if isinstance(sizes, str):
                    try:
                        sizes = json.loads(sizes)
                    except:
                        sizes = []
                else:
                    sizes = sizes if sizes else []
                
                colors = fields.get('colors', '[]')
                if isinstance(colors, str):
                    try:
                        colors = json.loads(colors)
                    except:
                        colors = []
                else:
                    colors = colors if colors else []
                
                images = fields.get('images', '[]')
                if isinstance(images, str):
                    try:
                        images = json.loads(images)
                    except:
                        images = []
                else:
                    images = images if images else []
                
                product = Product(
                    id=item['pk'],
                    name=fields.get('name', ''),
                    slug=fields.get('slug', ''),
                    description=fields.get('description', ''),
                    short_description=fields.get('short_description', ''),
                    price=fields.get('price', 0),
                    discount_price=fields.get('discount_price'),
                    img=fields.get('img', ''),
                    images=json.dumps(images) if images else None,
                    sizes=json.dumps(sizes) if sizes else None,
                    colors=json.dumps(colors) if colors else None,
                    rating=fields.get('rating', 0),
                    reviews_count=fields.get('reviews_count', 0),
                    in_stock=fields.get('in_stock', True),
                    is_featured=fields.get('is_featured', False),
                    is_new=fields.get('is_new', False),
                    is_best_seller=fields.get('is_best_seller', False),
                    category_id=fields.get('category_id'),
                    brand_id=fields.get('brand_id'),
                )
                product.save()
                count += 1
                if count % 20 == 0:
                    print(f"Imported {count} products...")
            except Exception as e:
                errors.append(f"Product {item['pk']}: {str(e)}")
    
    print(f"✅ Imported {count} products!")
    if errors:
        print(f"⚠️ Errors: {len(errors)}")
        for err in errors[:5]:
            print(f"   - {err}")

def import_users():
    with open('users_clean.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    count = 0
    errors = []
    
    print(f"📊 Found {len(data)} items in users_clean.json")
    
    for item in data:
        # Check if it's a user model
        model_name = item.get('model', '')
        if model_name == 'auth.user':
            fields = item.get('fields', {})
            pk = item.get('pk')
            
            if not pk:
                print(f"⚠️ Skipping item without pk: {item}")
                continue
                
            try:
                # Check if user already exists
                if User.objects.filter(id=pk).exists():
                    print(f"⏭️ User {pk} already exists, skipping...")
                    continue
                
                user = User(
                    id=pk,
                    username=fields.get('username', f'user_{pk}'),
                    email=fields.get('email', ''),
                    first_name=fields.get('first_name', ''),
                    last_name=fields.get('last_name', ''),
                    is_active=fields.get('is_active', True),
                    is_staff=fields.get('is_staff', False),
                    is_superuser=fields.get('is_superuser', False),
                )
                # Set password if exists
                password = fields.get('password')
                if password:
                    user.set_password(password)
                else:
                    user.set_password('password123')  # Default password
                
                user.save()
                count += 1
                if count % 5 == 0:
                    print(f"Imported {count} users...")
            except Exception as e:
                errors.append(f"User {pk}: {str(e)}")
        else:
            print(f"⏭️ Skipping non-user item: {model_name}")
    
    print(f"✅ Imported {count} users!")
    if errors:
        print(f"⚠️ Errors: {len(errors)}")
        for err in errors[:5]:
            print(f"   - {err}")

if __name__ == '__main__':
    print("📥 Importing products...")
    import_products()
    print("\n👤 Importing users...")
    import_users()
    print("\n✅ Import complete!")
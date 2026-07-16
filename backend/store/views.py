# store/views.py
from django.contrib.auth import authenticate, login
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
from rest_framework import generics, filters, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.conf import settings
from django.contrib.auth.hashers import check_password
from django.middleware.csrf import get_token
from django.db import models
from django.db.models import Q
from django.utils import timezone
from datetime import datetime, timedelta
import uuid
import json
import jwt
import razorpay
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
import hmac
import hashlib

# Initialize Razorpay client
razorpay_client = razorpay.Client(
    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
)

@csrf_exempt
@require_http_methods(["POST"])
def create_razorpay_order(request):
    """Create a Razorpay order for payment"""
    try:
        data = json.loads(request.body)
        amount = data.get('amount', 0)
        currency = data.get('currency', 'INR')
        receipt = data.get('receipt', f'order_{uuid.uuid4().hex[:8]}')
        
        # Create order in Razorpay
        order_data = {
            'amount': int(amount * 100),  # Amount in paise
            'currency': currency,
            'receipt': receipt,
            'payment_capture': 1,  # Auto capture
        }
        
        order = razorpay_client.order.create(data=order_data)
        
        return JsonResponse({
            'success': True,
            'order_id': order['id'],
            'amount': order['amount'],
            'currency': order['currency'],
            'key': settings.RAZORPAY_KEY_ID,
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def verify_razorpay_payment(request):
    """Verify Razorpay payment signature"""
    try:
        data = json.loads(request.body)
        razorpay_order_id = data.get('razorpay_order_id')
        razorpay_payment_id = data.get('razorpay_payment_id')
        razorpay_signature = data.get('razorpay_signature')
        
        # Verify signature
        params_dict = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }
        
        # Verify using razorpay client
        razorpay_client.utility.verify_payment_signature(params_dict)
        
        # Payment verified - update your database here
        # Mark order as paid, update purchase history, etc.
        
        return JsonResponse({
            'success': True,
            'message': 'Payment verified successfully',
            'payment_id': razorpay_payment_id,
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def razorpay_webhook(request):
    """Handle Razorpay webhook events"""
    try:
        # Verify webhook signature
        razorpay_signature = request.headers.get('X-Razorpay-Signature')
        webhook_secret = 'your_webhook_secret'  # Set this in Razorpay dashboard
        
        # Verify signature
        if razorpay_signature:
            # You can verify webhook signature here
            pass
        
        data = json.loads(request.body)
        event = data.get('event')
        payload = data.get('payload')
        
        if event == 'payment.captured':
            payment_id = payload['payment']['entity']['id']
            order_id = payload['payment']['entity']['order_id']
            # Update your database
            print(f"✅ Payment captured: {payment_id} for order: {order_id}")
        
        return JsonResponse({'status': 'success'})
    except Exception as e:
        return JsonResponse({'status': 'error', 'error': str(e)}, status=500)

# ============================================================
# IMPORT SKYCOINS MODELS - ADD THESE IMPORTS
# ============================================================
from .models import (
    Product, Purchase, Wishlist, Cart, Order, 
    ShippingDestination, Category, Brand,
    UserStreak, PurchaseHistory  # ← ADD THESE
)

from .serializers import (
    ProductSerializer,
    PurchaseSerializer,
    OrderSerializer,
    ShippingDestinationSerializer,
    UserLoginSerializer,
    UserRegisterSerializer,
)
from .utils_delivery import haversine_km, estimate_eta_minutes, update_status_from_elapsed


# ============================================================
# JWT HELPER FUNCTIONS
# ============================================================

def generate_jwt_token(user):
    """Generate JWT token for user"""
    payload = {
        'id': user.id,
        'email': user.email,
        'username': user.username,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def decode_jwt_token(token):
    """Decode JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_user_from_token(request):
    """Helper to get user from JWT token in request"""
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        payload = decode_jwt_token(token)
        if payload:
            try:
                return User.objects.get(id=payload['id'])
            except User.DoesNotExist:
                return None
    return None


# ============================================================
# JWT AUTHENTICATION MIDDLEWARE
# ============================================================

class JWTAuthenticationMiddleware:
    """Middleware to authenticate users using JWT token"""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            payload = decode_jwt_token(token)
            if payload:
                try:
                    user = User.objects.get(id=payload['id'])
                    request.user = user
                    request._jwt_authenticated = True
                except User.DoesNotExist:
                    pass
        return self.get_response(request)


# ============================================================
# AUTH VIEWS - UPDATED WITH JWT
# ============================================================

@csrf_exempt
@require_http_methods(["POST"])
def register_view(request):
    """Register a new user - username = first_name"""
    try:
        data = json.loads(request.body)
        
        email = data.get('email')
        password = data.get('password')
        confirm_password = data.get('confirm_password')
        name = data.get('name', '')
        
        # Split name to get first_name
        name_parts = name.split()
        first_name = name_parts[0] if name_parts else ''
        last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''
        
        # Username = first_name (lowercase)
        username = first_name.lower()
        
        # Check if email exists
        if User.objects.filter(email=email).exists():
            return JsonResponse({'email': ['A user with this email already exists.']}, status=400)
        
        # Check if username exists
        if User.objects.filter(username=username).exists():
            # If username taken, add a number
            count = User.objects.filter(username__startswith=username).count()
            username = f"{username}{count + 1}"
        
        if password != confirm_password:
            return JsonResponse({'non_field_errors': ['Passwords do not match.']}, status=400)
        
        if len(password) < 6:
            return JsonResponse({'password': ['Password must be at least 6 characters.']}, status=400)
        
        # Create user with username = first_name
        user = User.objects.create_user(
            username=username,  # First name as username
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )
        
        # Generate JWT token
        token = generate_jwt_token(user)
        
        return JsonResponse({
            'detail': 'User registered successfully.',
            'token': token,
            'email': user.email,
            'username': user.username,
            'name': user.first_name or user.username,
            'id': user.id,
        }, status=201)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    """Login user - returns JWT token"""
    try:
        # Parse request body
        data = json.loads(request.body)
        
        # Get username and password
        username = data.get('username')
        password = data.get('password')
        
        print(f"🔍 Login attempt: username={username}")
        
        if not username or not password:
            return JsonResponse({
                'detail': 'Username and password are required.'
            }, status=400)
        
        # Try to find user
        user = None
        
        # Try by username first
        try:
            user = User.objects.get(username=username)
            print(f"✅ Found user by username: {user.username}")
        except User.DoesNotExist:
            # Try by email
            try:
                user = User.objects.get(email=username)
                print(f"✅ Found user by email: {user.username}")
            except User.DoesNotExist:
                print(f"❌ User not found: {username}")
                return JsonResponse({
                    'detail': 'Invalid credentials.'
                }, status=401)
        
        # Check password
        if not user.check_password(password):
            print(f"❌ Invalid password for: {user.username}")
            return JsonResponse({
                'detail': 'Invalid credentials.'
            }, status=401)
        
        # Login the user
        login(request, user)
        
        # Generate JWT token
        token = generate_jwt_token(user)
        
        print(f"✅ Login successful: {user.username}")
        
        return JsonResponse({
            'detail': 'Login successful.',
            'token': token,
            'email': user.email,
            'username': user.username,
            'name': user.first_name or user.username,
            'id': user.id,
        }, status=200)
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error: {e}")
        return JsonResponse({
            'error': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'error': str(e)
        }, status=500)
@csrf_exempt
@require_http_methods(["GET"])
def get_csrf_token_view(request):
    """Get CSRF token - for frontend"""
    return JsonResponse({'csrfToken': get_token(request)})
@csrf_exempt
@require_http_methods(["POST"])
def logout_view(request):
    """Logout user"""
    return JsonResponse({'detail': 'Logged out successfully.'}, status=200)


@csrf_exempt
@require_http_methods(["GET"])
def get_current_user_view(request):
    """Get current authenticated user"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'No token provided or invalid'}, status=401)
    
    return JsonResponse({
        'id': user.id,
        'email': user.email,
        'name': user.first_name or user.username,
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
    })


# ============================================================
# PRODUCT VIEWS - UPDATED TO USE CORRECT FIELDS
# ============================================================

class ProductListCreateAPIView(generics.ListCreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "slug", "description"]
    ordering_fields = ["price", "name", "id", "rating"]


class ProductRetrieveAPIView(generics.RetrieveAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer


# ============================================================
# CATEGORY VIEWS
# ============================================================

@csrf_exempt
@require_http_methods(["GET"])
def get_categories_view(request):
    """Get all categories"""
    try:
        # Try to get from database first
        try:
            categories = Category.objects.all().order_by('name')
            data = []
            for cat in categories:
                data.append({
                    'id': cat.id,
                    'name': cat.name,
                    'slug': cat.slug,
                    'parent_id': cat.parent_id,
                    'level': cat.level,
                    'children': [],
                })
            return JsonResponse(data, safe=False)
        except:
            # Fallback to default categories
            default_categories = [
                {'id': 1, 'name': 'Electronics', 'slug': 'electronics', 'parent_id': None, 'level': 1, 'children': []},
                {'id': 2, 'name': 'Fashion', 'slug': 'fashion', 'parent_id': None, 'level': 1, 'children': []},
                {'id': 3, 'name': 'Home & Kitchen', 'slug': 'home-kitchen', 'parent_id': None, 'level': 1, 'children': []},
                {'id': 4, 'name': 'Books', 'slug': 'books', 'parent_id': None, 'level': 1, 'children': []},
                {'id': 5, 'name': 'Accessories', 'slug': 'accessories', 'parent_id': None, 'level': 1, 'children': []},
                {'id': 6, 'name': 'Sports', 'slug': 'sports', 'parent_id': None, 'level': 1, 'children': []},
            ]
            return JsonResponse(default_categories, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def get_category_detail_view(request, slug):
    """Get category by slug"""
    try:
        category = Category.objects.get(slug=slug)
        data = {
            'id': category.id,
            'name': category.name,
            'slug': category.slug,
            'parent_id': category.parent_id,
            'level': category.level,
        }
        return JsonResponse(data)
    except Category.DoesNotExist:
        return JsonResponse({'error': 'Category not found'}, status=404)


# ============================================================
# BRAND VIEWS
# ============================================================

@csrf_exempt
@require_http_methods(["GET"])
def get_brands_view(request):
    """Get all brands"""
    try:
        # Try to get from database first
        try:
            brands = Brand.objects.all().order_by('name')
            data = []
            for brand in brands:
                data.append({
                    'id': brand.id,
                    'name': brand.name,
                    'slug': brand.slug,
                    'logo': brand.logo if hasattr(brand, 'logo') else None,
                })
            return JsonResponse(data, safe=False)
        except:
            # Fallback to default brands
            default_brands = [
                {'id': 1, 'name': 'Nike', 'slug': 'nike'},
                {'id': 2, 'name': 'Adidas', 'slug': 'adidas'},
                {'id': 3, 'name': 'Apple', 'slug': 'apple'},
                {'id': 4, 'name': 'Samsung', 'slug': 'samsung'},
                {'id': 5, 'name': 'Sony', 'slug': 'sony'},
                {'id': 6, 'name': 'Puma', 'slug': 'puma'},
                {'id': 7, 'name': "Levi's", 'slug': 'levis'},
                {'id': 8, 'name': 'Zara', 'slug': 'zara'},
                {'id': 9, 'name': 'H&M', 'slug': 'hm'},
                {'id': 10, 'name': 'Rolex', 'slug': 'rolex'},
            ]
            return JsonResponse(default_brands, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def get_brand_detail_view(request, slug):
    """Get brand by slug"""
    try:
        brand = Brand.objects.get(slug=slug)
        data = {
            'id': brand.id,
            'name': brand.name,
            'slug': brand.slug,
            'logo': brand.logo if hasattr(brand, 'logo') else None,
        }
        return JsonResponse(data)
    except Brand.DoesNotExist:
        return JsonResponse({'error': 'Brand not found'}, status=404)


# ============================================================
# PURCHASE/ORDER VIEWS
# ============================================================

class PurchaseListCreateAPIView(generics.ListCreateAPIView):
    queryset = Purchase.objects.all().order_by("-purchased_at")
    serializer_class = PurchaseSerializer


@csrf_exempt
@require_http_methods(["POST"])
def create_order_view(request):
    """Create a delivery order from frontend-provided coordinates."""
    try:
        data = json.loads(request.body)
        product_id = data.get("product_id") or data.get("product")
        email = data.get("email")
        quantity = int(data.get("quantity") or 1)
        user_id = data.get("user_id")

        delivery_lat = data.get("delivery_lat")
        delivery_lng = data.get("delivery_lng")
        source_lat = data.get("source_lat")
        source_lng = data.get("source_lng")

        if product_id is None or not email:
            return JsonResponse({"detail": "product and email are required"}, status=400)

        # Get product
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return JsonResponse({"detail": "Product not found"}, status=404)

        # Get user if provided
        user = None
        if user_id:
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                pass

        # Compute distance/eta if coords provided
        distance_km = None
        eta_minutes = None
        if delivery_lat is not None and delivery_lng is not None and source_lat is not None and source_lng is not None:
            distance_km = haversine_km(float(source_lat), float(source_lng), float(delivery_lat), float(delivery_lng))
            eta_minutes = estimate_eta_minutes(distance_km)

        purchased_at = timezone.now()
        delivery_status = "Preparing"
        order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"

        # Create purchase
        purchase = Purchase.objects.create(
            product_id=product_id,
            user=user,
            email=email,
            quantity=quantity,
            order_id=order_id,
            customer_name=data.get("customer_name") or data.get("name"),
            phone=data.get("phone"),
            source_address=data.get("source_address"),
            destination_address=data.get("destination_address") or data.get("address"),
            delivery_lat=delivery_lat,
            delivery_lng=delivery_lng,
            source_lat=source_lat,
            source_lng=source_lng,
            distance_km=distance_km,
            eta_minutes=eta_minutes,
            delivery_status=delivery_status,
            status_updated_at=purchased_at,
            payment_method=data.get("payment_method", "razorpay"),
        )

        # Also create an Order record if Order model exists
        try:
            Order.objects.create(
                order_id=order_id,
                user=user,
                product=product,
                product_name=product.name,
                product_price=product.price,
                product_img=product.img,
                product_brand=product.name,
                quantity=quantity,
                total_amount=product.price * quantity,
                status='pending',
                payment_method=data.get("payment_method", "razorpay"),
                shipping_name=data.get("customer_name") or data.get("name", ""),
                shipping_email=email,
                shipping_phone=data.get("phone", ""),
                shipping_address=data.get("destination_address") or data.get("address", ""),
                shipping_zip=data.get("zip") or data.get("zip_code", ""),
                shipping_lat=delivery_lat,
                shipping_lng=delivery_lng,
            )
        except Exception as e:
            pass

        # Clear cart if user is logged in
        if user:
            Cart.objects.filter(user=user).delete()

        serializer = PurchaseSerializer(purchase)
        return JsonResponse({
            **serializer.data,
            'order_id': order_id,
            'message': 'Order created successfully'
        }, status=201)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


class PurchaseByEmailAPIView(generics.ListAPIView):
    serializer_class = PurchaseSerializer

    def get_queryset(self):
        email = self.request.query_params.get("email")
        qs = Purchase.objects.all().order_by("-purchased_at")
        if email:
            qs = qs.filter(email=email)
        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        for item in response.data:
            purchased_at = item.get("purchased_at")
            eta_minutes = item.get("eta_minutes")
            if purchased_at:
                purchased_dt = datetime.fromisoformat(purchased_at.replace("Z", "+00:00"))
                status_val = update_status_from_elapsed(purchased_dt, eta_minutes)
                item["delivery_status"] = status_val
                if status_val == Purchase.STATUS_DELIVERED:
                    item.setdefault("delivered_at", purchased_at)
        return response


# ============================================================
# WISHLIST VIEWS
# ============================================================

@csrf_exempt
@require_http_methods(["GET"])
def get_wishlist_view(request):
    """Get user's wishlist from database"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'User not authenticated'}, status=401)
    
    request.user = user
    wishlist_items = Wishlist.objects.filter(user=user).select_related('product')
    data = []
    for item in wishlist_items:
        data.append({
            'id': item.product.id,
            'name': item.product.name,
            'slug': item.product.slug,
            'brand_id': item.product.brand_id,
            'category_id': item.product.category_id,
            'price': float(item.product.price),
            'img': item.product.img,
            'description': item.product.description,
        })
    return JsonResponse({'wishlist': data})


@csrf_exempt
@require_http_methods(["POST"])
def toggle_wishlist_view(request):
    """Add or remove from wishlist - stored in database"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'User not authenticated. Please login first.'}, status=401)
    
    request.user = user
    
    try:
        data = json.loads(request.body)
        product_id = data.get('product_id')
        
        if not product_id:
            return JsonResponse({'error': 'product_id is required'}, status=400)
        
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return JsonResponse({'error': 'Product not found'}, status=404)
        
        wishlist_item = Wishlist.objects.filter(user=user, product=product)
        
        if wishlist_item.exists():
            wishlist_item.delete()
            return JsonResponse({
                'status': 'removed', 
                'message': 'Removed from wishlist',
                'wishlist': list(Wishlist.objects.filter(user=user).values_list('product_id', flat=True))
            })
        else:
            Wishlist.objects.create(user=user, product=product)
            return JsonResponse({
                'status': 'added', 
                'message': 'Added to wishlist',
                'wishlist': list(Wishlist.objects.filter(user=user).values_list('product_id', flat=True))
            })
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)


# ============================================================
# CART VIEWS
# ============================================================

@csrf_exempt
@require_http_methods(["GET"])
def get_cart_view(request):
    """Get user's cart from database"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'User not authenticated'}, status=401)
    
    request.user = user
    cart_items = Cart.objects.filter(user=user).select_related('product')
    data = []
    for item in cart_items:
        data.append({
            'product_id': item.product.id,
            'name': item.product.name,
            'brand_id': item.product.brand_id,
            'category_id': item.product.category_id,
            'price': float(item.product.price),
            'img': item.product.img,
            'description': item.product.description,
            'quantity': item.quantity,
            'subtotal': float(item.product.price * item.quantity),
        })
    return JsonResponse({'cart': data})


@csrf_exempt
@require_http_methods(["POST"])
def add_to_cart_view(request):
    """Add item to cart - stored in database"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'User not authenticated'}, status=401)
    
    request.user = user
    
    try:
        data = json.loads(request.body)
        product_id = data.get('product_id')
        quantity = data.get('quantity', 1)
        
        if not product_id:
            return JsonResponse({'error': 'product_id is required'}, status=400)
        
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return JsonResponse({'error': 'Product not found'}, status=404)
        
        cart_item, created = Cart.objects.get_or_create(
            user=user,
            product=product,
            defaults={'quantity': quantity}
        )
        if not created:
            cart_item.quantity += quantity
            cart_item.save()
        
        # Get updated cart
        cart_items = Cart.objects.filter(user=user)
        cart_data = []
        for item in cart_items:
            cart_data.append({
                'product_id': item.product.id,
                'quantity': item.quantity,
            })
        
        return JsonResponse({
            'status': 'success', 
            'message': 'Added to cart',
            'cart': cart_data
        })
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def remove_from_cart_view(request):
    """Remove item from cart - stored in database"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'User not authenticated'}, status=401)
    
    request.user = user
    
    try:
        data = json.loads(request.body)
        product_id = data.get('product_id')
        
        if not product_id:
            return JsonResponse({'error': 'product_id is required'}, status=400)
        
        Cart.objects.filter(user=user, product_id=product_id).delete()
        
        # Get updated cart
        cart_items = Cart.objects.filter(user=user)
        cart_data = []
        for item in cart_items:
            cart_data.append({
                'product_id': item.product.id,
                'quantity': item.quantity,
            })
        
        return JsonResponse({
            'status': 'success', 
            'message': 'Removed from cart',
            'cart': cart_data
        })
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)


@csrf_exempt
@require_http_methods(["POST"])
def update_cart_quantity_view(request):
    """Update cart item quantity - stored in database"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'User not authenticated'}, status=401)
    
    request.user = user
    
    try:
        data = json.loads(request.body)
        product_id = data.get('product_id')
        quantity = data.get('quantity', 1)
        
        if not product_id:
            return JsonResponse({'error': 'product_id is required'}, status=400)
        
        try:
            cart_item = Cart.objects.get(user=user, product_id=product_id)
            if quantity <= 0:
                cart_item.delete()
                status_msg = 'removed'
            else:
                cart_item.quantity = quantity
                cart_item.save()
                status_msg = 'updated'
            
            # Get updated cart
            cart_items = Cart.objects.filter(user=user)
            cart_data = []
            for item in cart_items:
                cart_data.append({
                    'product_id': item.product.id,
                    'quantity': item.quantity,
                })
            
            return JsonResponse({
                'status': status_msg, 
                'quantity': quantity,
                'cart': cart_data
            })
        except Cart.DoesNotExist:
            return JsonResponse({'error': 'Item not in cart'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)


# ============================================================
# SHIPPING DESTINATION VIEWS
# ============================================================

@csrf_exempt
@require_http_methods(["GET"])
def get_shipping_destinations_view(request):
    """Get user's saved shipping addresses"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'User not authenticated'}, status=401)
    
    request.user = user
    destinations = ShippingDestination.objects.filter(user=user)
    data = []
    for dest in destinations:
        data.append({
            'id': dest.id,
            'name': dest.name,
            'email': dest.email,
            'phone': dest.phone,
            'address': dest.address,
            'zip_code': dest.zip_code,
            'lat': float(dest.lat) if dest.lat else None,
            'lng': float(dest.lng) if dest.lng else None,
            'is_default': dest.is_default,
            'created_at': dest.created_at,
        })
    return JsonResponse({'destinations': data})


@csrf_exempt
@require_http_methods(["POST"])
def add_shipping_destination_view(request):
    """Add a new shipping address"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'User not authenticated'}, status=401)
    
    request.user = user
    
    try:
        data = json.loads(request.body)
        
        # If this is set as default, unset other defaults
        if data.get('is_default', False):
            ShippingDestination.objects.filter(user=user, is_default=True).update(is_default=False)
        
        destination = ShippingDestination.objects.create(
            user=user,
            name=data.get('name', ''),
            email=data.get('email', ''),
            phone=data.get('phone', ''),
            address=data.get('address', ''),
            zip_code=data.get('zip_code', ''),
            lat=data.get('lat'),
            lng=data.get('lng'),
            is_default=data.get('is_default', False),
        )
        
        return JsonResponse({
            'id': destination.id,
            'name': destination.name,
            'email': destination.email,
            'phone': destination.phone,
            'address': destination.address,
            'zip_code': destination.zip_code,
            'lat': float(destination.lat) if destination.lat else None,
            'lng': float(destination.lng) if destination.lng else None,
            'is_default': destination.is_default,
            'created_at': destination.created_at,
        }, status=201)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def delete_shipping_destination_view(request):
    """Delete a shipping address"""
    user = get_user_from_token(request)
    if not user:
        return JsonResponse({'error': 'User not authenticated'}, status=401)
    
    request.user = user
    
    try:
        data = json.loads(request.body)
        destination_id = data.get('destination_id')
        
        if not destination_id:
            return JsonResponse({'error': 'destination_id is required'}, status=400)
        
        destination = get_object_or_404(ShippingDestination, id=destination_id, user=user)
        destination.delete()
        
        return JsonResponse({'message': 'Destination deleted successfully'})
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ============================================================
# PRODUCT SEARCH WITH FILTERS
# ============================================================

@csrf_exempt
@require_http_methods(["GET"])
def search_products_view(request):
    """Search products with filters"""
    try:
        query = request.GET.get('q', '')
        category = request.GET.get('category')
        brand = request.GET.get('brand')
        min_price = request.GET.get('min_price')
        max_price = request.GET.get('max_price')
        sort = request.GET.get('sort', '-id')
        
        products = Product.objects.all()
        
        if query:
            products = products.filter(
                Q(name__icontains=query) |
                Q(slug__icontains=query) |
                Q(description__icontains=query)
            )
        
        if category:
            try:
                cat = Category.objects.get(slug=category)
                products = products.filter(category_id=cat.id)
            except Category.DoesNotExist:
                pass
        
        if brand:
            try:
                br = Brand.objects.get(slug=brand)
                products = products.filter(brand_id=br.id)
            except Brand.DoesNotExist:
                pass
        
        if min_price:
            products = products.filter(price__gte=float(min_price))
        
        if max_price:
            products = products.filter(price__lte=float(max_price))
        
        # Apply sorting
        if sort == 'price_asc':
            products = products.order_by('price')
        elif sort == 'price_desc':
            products = products.order_by('-price')
        elif sort == 'name':
            products = products.order_by('name')
        elif sort == 'rating':
            products = products.order_by('-rating')
        else:
            products = products.order_by('-id')
        
        serializer = ProductSerializer(products, many=True)
        return JsonResponse({
            'results': serializer.data,
            'count': products.count()
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ============================================================
# SIMPLE PRODUCT VIEW FOR TESTING
# ============================================================

@csrf_exempt
@require_http_methods(["GET"])
def get_products_simple(request):
    """Simple view to test products - bypasses serializer"""
    try:
        products = Product.objects.all()
        data = []
        for p in products:
            data.append({
                'id': p.id,
                'name': p.name,
                'slug': p.slug,
                'brand_id': p.brand_id,
                'category_id': p.category_id,
                'price': float(p.price),
                'discount_price': float(p.discount_price) if p.discount_price else None,
                'img': p.img,
                'images': p.images,
                'description': p.description,
                'short_description': p.short_description,
                'sizes': p.sizes,
                'colors': p.colors,
                'rating': float(p.rating) if p.rating else 0,
                'reviews_count': p.reviews_count,
                'in_stock': p.in_stock,
                'is_featured': p.is_featured,
                'is_new': p.is_new,
                'is_best_seller': p.is_best_seller,
            })
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ============================================================
# SKYCOINS STREAK VIEWS
# ============================================================

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_skycoins_data(request):
    """Get user's SkyCoins and streak data"""
    try:
        print(f"📊 Getting SkyCoins data for user: {request.user.username}")
        streak, created = UserStreak.objects.get_or_create(user=request.user)
        
        # Calculate streak status
        today = timezone.now().date()
        last_purchase = streak.last_purchase_date
        
        # Check if streak should be broken
        if last_purchase:
            days_since_last = (today - last_purchase.date()).days
            if days_since_last > 1 and streak.current_streak > 0:
                streak.current_streak = 0
                streak.streak_start_date = None
                streak.save()
                print(f"🔄 Streak broken after {days_since_last} days")
        
        # Get purchase history (last 30)
        purchases = PurchaseHistory.objects.filter(
            user=request.user
        ).order_by('-purchase_date')[:30]
        
        purchase_data = []
        for p in purchases:
            purchase_data.append({
                'date': p.purchase_date.isoformat(),
                'product_name': p.product_name,
                'product_id': p.product.id if p.product else None,
                'amount': float(p.total_amount),
                'order_id': p.order_id,
            })
        
        response_data = {
            'success': True,
            'data': {
                'current_streak': streak.current_streak,
                'max_streak': streak.max_streak,
                'streak_start_date': streak.streak_start_date.isoformat() if streak.streak_start_date else None,
                'last_purchase_date': streak.last_purchase_date.isoformat() if streak.last_purchase_date else None,
                'skycoins_balance': streak.skycoins_balance,
                'total_skycoins_earned': streak.total_skycoins_earned,
                'coupon_unlocked': streak.coupon_unlocked,
                'coupon_code': streak.coupon_code,
                'coupon_unlock_date': streak.coupon_unlock_date.isoformat() if streak.coupon_unlock_date else None,
                'coupon_used': streak.coupon_used,
                'total_purchases': streak.total_purchases,
                'purchases': purchase_data,
                'required_days': 7,
                'skycoins_reward': 500,
            }
        }
        print(f"✅ SkyCoins data sent: Streak={streak.current_streak}, Balance={streak.skycoins_balance}")
        return JsonResponse(response_data)
    except Exception as e:
        print(f"❌ Error in get_skycoins_data: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_purchase_to_streak(request):
    """Add a purchase and update streak"""
    try:
        data = json.loads(request.body)
        product_id = data.get('product_id')
        product_name = data.get('product_name')
        product_price = data.get('product_price', 0)
        quantity = data.get('quantity', 1)
        
        print(f"🛒 Adding purchase: User={request.user.username}, Product={product_name}, Price={product_price}")
        
        if not product_id or not product_name:
            return JsonResponse({
                'success': False,
                'error': 'Product ID and name are required'
            }, status=400)
        
        # Get product
        try:
            product = Product.objects.get(id=product_id)
            print(f"✅ Product found: {product.name}")
        except Product.DoesNotExist:
            print(f"❌ Product not found: {product_id}")
            return JsonResponse({
                'success': False,
                'error': 'Product not found'
            }, status=404)
        
        # Get or create streak
        streak, created = UserStreak.objects.get_or_create(user=request.user)
        if created:
            print(f"🆕 New streak created for {request.user.username}")
        
        today = timezone.now()
        today_date = today.date()
        last_purchase_date = streak.last_purchase_date
        
        # Calculate streak
        new_streak = streak.current_streak
        streak_start_date = streak.streak_start_date
        streak_incremented = False
        
        if last_purchase_date:
            days_since_last = (today_date - last_purchase_date.date()).days
            print(f"📅 Days since last purchase: {days_since_last}")
            
            if days_since_last == 1:
                # Consecutive day - INCREMENT STREAK
                new_streak = streak.current_streak + 1
                streak_incremented = True
                if not streak_start_date:
                    streak_start_date = today
                print(f"✅ Streak increased to {new_streak} days!")
            elif days_since_last > 1:
                # Streak broken - RESET
                new_streak = 1
                streak_start_date = today
                print(f"🔄 Streak reset to 1 day (was {streak.current_streak})")
            else:
                # Same day purchase - don't change streak
                print(f"⏰ Same day purchase, streak remains {streak.current_streak}")
        else:
            # First purchase ever
            new_streak = 1
            streak_start_date = today
            print(f"🌟 First purchase! Streak started at 1 day")
        
        # Check if streak completed (7 days)
        coupon_unlocked = streak.coupon_unlocked
        coupon_code = streak.coupon_code
        skycoins_earned = 0
        celebration_triggered = False
        
        if new_streak >= 7 and not coupon_unlocked:
            # UNLOCK COUPON AND EARN SKYCOINS!
            coupon_unlocked = True
            skycoins_earned = 500
            coupon_code = f"SKY50-{request.user.username[:4].upper()}-{uuid.uuid4().hex[:4].upper()}"
            celebration_triggered = True
            print(f"🎉 STREAK COMPLETE! Earned 500 SkyCoins! Coupon: {coupon_code}")
        
        # Create purchase history
        order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        purchase = PurchaseHistory.objects.create(
            user=request.user,
            product=product,
            product_name=product_name,
            product_price=product_price,
            quantity=quantity,
            total_amount=product_price * quantity,
            order_id=order_id,
        )
        print(f"✅ Purchase history created: {order_id}")
        
        # Update streak
        streak.current_streak = new_streak
        streak.max_streak = max(streak.max_streak, new_streak)
        streak.streak_start_date = streak_start_date
        streak.last_purchase_date = today
        streak.total_purchases += 1
        
        if skycoins_earned > 0:
            streak.skycoins_balance += skycoins_earned
            streak.total_skycoins_earned += skycoins_earned
            streak.coupon_unlocked = True
            streak.coupon_code = coupon_code
            streak.coupon_unlock_date = today
        
        streak.save()
        print(f"✅ Streak saved: current={streak.current_streak}, balance={streak.skycoins_balance}")
        
        response_data = {
            'success': True,
            'data': {
                'current_streak': streak.current_streak,
                'max_streak': streak.max_streak,
                'skycoins_earned': skycoins_earned,
                'skycoins_balance': streak.skycoins_balance,
                'coupon_unlocked': coupon_unlocked,
                'coupon_code': coupon_code,
                'order_id': order_id,
                'streak_incremented': streak_incremented,
                'celebration_triggered': celebration_triggered,
                'message': f'Streak: {new_streak}/7 days',
            }
        }
        
        print(f"📤 Response: {response_data}")
        return JsonResponse(response_data)
        
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON'
        }, status=400)
    except Exception as e:
        print(f"❌ Error in add_purchase_to_streak: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def use_coupon(request):
    """Mark coupon as used"""
    try:
        streak = UserStreak.objects.get(user=request.user)
        
        if not streak.coupon_unlocked or streak.coupon_used:
            return JsonResponse({
                'success': False,
                'error': 'No valid coupon available'
            }, status=400)
        
        streak.coupon_used = True
        streak.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Coupon applied successfully'
        })
    except UserStreak.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'No streak data found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_streak(request):
    """Reset streak (for testing)"""
    try:
        streak = UserStreak.objects.get(user=request.user)
        streak.current_streak = 0
        streak.streak_start_date = None
        streak.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Streak reset successfully'
        })
    except UserStreak.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'No streak data found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clear_all_data(request):
    """Clear all SkyCoins data (for testing)"""
    try:
        streak = UserStreak.objects.get(user=request.user)
        streak.delete()
        
        # Also delete purchase history
        PurchaseHistory.objects.filter(user=request.user).delete()
        
        return JsonResponse({
            'success': True,
            'message': 'All SkyCoins data cleared'
        })
    except UserStreak.DoesNotExist:
        return JsonResponse({
            'success': True,
            'message': 'No data to clear'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
    # store/views.py - Add this at the end

# store/views.py - Replace the existing get_skycoins_data

# store/views.py - Replace the existing get_skycoins_data with this

@csrf_exempt
@require_http_methods(["GET"])
def get_skycoins_data(request):
    """Get user's SkyCoins and streak data - TEMPORARILY WITHOUT AUTH"""
    try:
        # Try to get user from token
        user = get_user_from_token(request)
        
        # If no user from token, use deekshi@gmail.com for testing
        if not user:
            user = User.objects.get(username='deekshi@gmail.com')
            print(f"⚠️ Using fallback user: {user.username}")
        
        print(f"📊 Getting SkyCoins data for user: {user.username}")
        streak, created = UserStreak.objects.get_or_create(user=user)
        
        # Check if streak should be broken
        today = timezone.now().date()
        last_purchase = streak.last_purchase_date
        
        if last_purchase:
            days_since_last = (today - last_purchase.date()).days
            if days_since_last > 1 and streak.current_streak > 0:
                streak.current_streak = 0
                streak.streak_start_date = None
                streak.save()
                print(f"🔄 Streak broken after {days_since_last} days")
        
        # Get purchase history
        purchases = PurchaseHistory.objects.filter(
            user=user
        ).order_by('-purchase_date')[:30]
        
        purchase_data = []
        for p in purchases:
            purchase_data.append({
                'date': p.purchase_date.isoformat(),
                'product_name': p.product_name,
                'product_id': p.product.id if p.product else None,
                'amount': float(p.total_amount),
                'order_id': p.order_id,
            })
        
        response_data = {
            'success': True,
            'data': {
                'current_streak': streak.current_streak,
                'max_streak': streak.max_streak,
                'streak_start_date': streak.streak_start_date.isoformat() if streak.streak_start_date else None,
                'last_purchase_date': streak.last_purchase_date.isoformat() if streak.last_purchase_date else None,
                'skycoins_balance': streak.skycoins_balance,
                'total_skycoins_earned': streak.total_skycoins_earned,
                'coupon_unlocked': streak.coupon_unlocked,
                'coupon_code': streak.coupon_code,
                'coupon_unlock_date': streak.coupon_unlock_date.isoformat() if streak.coupon_unlock_date else None,
                'coupon_used': streak.coupon_used,
                'total_purchases': streak.total_purchases,
                'purchases': purchase_data,
                'required_days': 7,
                'skycoins_reward': 500,
            }
        }
        print(f"✅ SkyCoins data sent: Streak={streak.current_streak}, Balance={streak.skycoins_balance}")
        return JsonResponse(response_data)
    except User.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'User not found'
        }, status=404)
    except Exception as e:
        print(f"❌ Error in get_skycoins_data: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
    # store/views.py - Add this at the very end

# ============================================================
# TEST SKYCOINS VIEW (NO AUTH REQUIRED)
# ============================================================

@csrf_exempt
@require_http_methods(["GET"])
def test_skycoins_data(request):
    """Test endpoint - no authentication required"""
    try:
        from django.contrib.auth.models import User
        from .models import UserStreak, PurchaseHistory
        
        # Get user by username
        user = User.objects.get(username='deekshi@gmail.com')
        print(f"✅ Test: Found user {user.username}")
        
        streak, created = UserStreak.objects.get_or_create(user=user)
        print(f"✅ Test: Streak data - current: {streak.current_streak}, balance: {streak.skycoins_balance}")
        
        purchases = PurchaseHistory.objects.filter(user=user)
        
        purchase_data = []
        for p in purchases[:7]:
            purchase_data.append({
                'date': p.purchase_date.isoformat(),
                'product_name': p.product_name,
                'amount': float(p.total_amount),
                'order_id': p.order_id,
            })
        
        return JsonResponse({
            'success': True,
            'data': {
                'username': user.username,
                'current_streak': streak.current_streak,
                'max_streak': streak.max_streak,
                'skycoins_balance': streak.skycoins_balance,
                'coupon_unlocked': streak.coupon_unlocked,
                'coupon_code': streak.coupon_code,
                'total_purchases': streak.total_purchases,
                'purchases': purchase_data,
                'purchase_count': purchases.count(),
            }
        })
    except User.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'User deekshi@gmail.com not found'
        }, status=404)
    except Exception as e:
        print(f"❌ Test error: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
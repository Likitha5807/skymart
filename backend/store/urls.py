# store/urls.py
from django.urls import path
from .views import test_skycoins_data  # Add this import
from .views import (
    # Auth Views
    register_view,
    login_view,
    logout_view,
    get_current_user_view,
    get_csrf_token_view,
    
    # Product Views
    ProductListCreateAPIView,
    ProductRetrieveAPIView,
    
    # Category Views
    get_categories_view,
    get_category_detail_view,
    
    # Brand Views
    get_brands_view,
    get_brand_detail_view,
    
    # Purchase/Order Views
    PurchaseListCreateAPIView,
    create_order_view,
    PurchaseByEmailAPIView,
    
    # Wishlist Views
    get_wishlist_view,
    toggle_wishlist_view,
    
    # Cart Views
    get_cart_view,
    add_to_cart_view,
    remove_from_cart_view,
    update_cart_quantity_view,
    
    # Shipping Views
    get_shipping_destinations_view,
    add_shipping_destination_view,
    delete_shipping_destination_view,
    
    # Search
    search_products_view,
    
    # Test View
    get_products_simple,
    
    # ============================================================
    # SKYCOINS STREAK VIEWS - ADD THESE
    # ============================================================
    get_skycoins_data,
    add_purchase_to_streak,
    use_coupon,
    reset_streak,
    clear_all_data,
)
from .views import create_razorpay_order, verify_razorpay_payment, razorpay_webhook

urlpatterns = [
    # ============================================================
    # AUTHENTICATION ENDPOINTS
    # ============================================================
    path("auth/register/", register_view, name="auth-register"),
    path("auth/login/", login_view, name="auth-login"),
    path("auth/logout/", logout_view, name="auth-logout"),
    path("auth/me/", get_current_user_view, name="auth-me"),
    path("auth/csrf/", get_csrf_token_view, name="auth-csrf"),
    # Razorpay Payment URLs
    path("payments/create-order/", create_razorpay_order, name="create-razorpay-order"),
    path("payments/verify/", verify_razorpay_payment, name="verify-razorpay-payment"),
    path("payments/webhook/", razorpay_webhook, name="razorpay-webhook"),

    # ============================================================
    # CATEGORY ENDPOINTS
    # ============================================================
    path("categories/", get_categories_view, name="categories-list"),
    path("categories/<slug:slug>/", get_category_detail_view, name="categories-detail"),
    
    # ============================================================
    # BRAND ENDPOINTS
    # ============================================================
    path("brands/", get_brands_view, name="brands-list"),
    path("brands/<slug:slug>/", get_brand_detail_view, name="brands-detail"),
    
    # ============================================================
    # PRODUCT ENDPOINTS
    # ============================================================
    path("products/", ProductListCreateAPIView.as_view(), name="product-list-create"),
    path("products/<int:pk>/", ProductRetrieveAPIView.as_view(), name="product-detail"),
    path("products/search/", search_products_view, name="product-search"),
    path("products-simple/", get_products_simple, name="products-simple"),
    
    # ============================================================
    # ORDER/PURCHASE ENDPOINTS
    # ============================================================
    path("purchases/", PurchaseListCreateAPIView.as_view(), name="purchase-list-create"),
    path("orders/create/", create_order_view, name="orders-create"),
    path("orders/by-email/", PurchaseByEmailAPIView.as_view(), name="orders-by-email"),
    
    # ============================================================
    # WISHLIST ENDPOINTS
    # ============================================================
    path("wishlist/", get_wishlist_view, name="wishlist"),
    path("wishlist/toggle/", toggle_wishlist_view, name="wishlist-toggle"),
    
    # ============================================================
    # CART ENDPOINTS
    # ============================================================
    path("cart/", get_cart_view, name="cart"),
    path("cart/add/", add_to_cart_view, name="cart-add"),
    path("cart/remove/", remove_from_cart_view, name="cart-remove"),
    path("cart/update/", update_cart_quantity_view, name="cart-update"),
    
    # ============================================================
    # SHIPPING DESTINATION ENDPOINTS
    # ============================================================
    path("shipping/", get_shipping_destinations_view, name="shipping-list"),
    path("shipping/add/", add_shipping_destination_view, name="shipping-add"),
    path("shipping/delete/", delete_shipping_destination_view, name="shipping-delete"),
    
    # ============================================================
    # SKYCOINS STREAK ENDPOINTS - ADD THESE
    # ============================================================
    path("skycoins/data/", get_skycoins_data, name="skycoins-data"),
    path("skycoins/add-purchase/", add_purchase_to_streak, name="skycoins-add-purchase"),
    path("skycoins/use-coupon/", use_coupon, name="skycoins-use-coupon"),
    path("skycoins/reset-streak/", reset_streak, name="skycoins-reset-streak"),
    path("skycoins/clear-data/", clear_all_data, name="skycoins-clear-data"),
    path("test-skycoins/", test_skycoins_data, name="test-skycoins"),
]
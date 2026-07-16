# store/models.py
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid

# ============================================================
# PRODUCT MODEL - MATCHES YOUR store_products TABLE
# ============================================================

class Product(models.Model):
    """Product model - matches your store_products table"""
    id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=255)
    slug = models.CharField(max_length=255, unique=True)
    brand_id = models.IntegerField()
    category_id = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    img = models.CharField(max_length=500)
    images = models.TextField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    short_description = models.CharField(max_length=500, null=True, blank=True)
    sizes = models.TextField(null=True, blank=True)
    colors = models.TextField(null=True, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    reviews_count = models.IntegerField(default=0)
    in_stock = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_new = models.BooleanField(default=False)
    is_best_seller = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        db_table = 'store_products'
        managed = False
    
    def __str__(self):
        return self.name


# ============================================================
# PURCHASE/ORDER MODEL
# ============================================================

class Purchase(models.Model):
    STATUS_PREPARING = "Preparing"
    STATUS_SHIPPED = "Shipped"
    STATUS_OUT_FOR_DELIVERY = "Out for Delivery"
    STATUS_DELIVERED = "Delivered"

    STATUS_CHOICES = [
        (STATUS_PREPARING, STATUS_PREPARING),
        (STATUS_SHIPPED, STATUS_SHIPPED),
        (STATUS_OUT_FOR_DELIVERY, STATUS_OUT_FOR_DELIVERY),
        (STATUS_DELIVERED, STATUS_DELIVERED),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="purchases")
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="purchases")
    email = models.EmailField()
    quantity = models.PositiveIntegerField(default=1)
    customer_name = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    source_address = models.TextField(blank=True, null=True)
    destination_address = models.TextField(blank=True, null=True)
    delivery_lat = models.FloatField(null=True, blank=True)
    delivery_lng = models.FloatField(null=True, blank=True)
    source_lat = models.FloatField(null=True, blank=True)
    source_lng = models.FloatField(null=True, blank=True)
    distance_km = models.FloatField(null=True, blank=True)
    eta_minutes = models.IntegerField(null=True, blank=True)
    delivery_status = models.CharField(max_length=32, choices=STATUS_CHOICES, default=STATUS_PREPARING)
    status_updated_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    purchased_at = models.DateTimeField(auto_now_add=True)
    payment_method = models.CharField(max_length=50, default='razorpay')
    order_id = models.CharField(max_length=50, unique=True, null=True, blank=True)

    class Meta:
        db_table = 'store_purchase'
        managed = False
    
    def __str__(self):
        if self.customer_name:
            return f"{self.customer_name} - {self.product.name}"
        return f"{self.email} - {self.product.name}"


# ============================================================
# WISHLIST MODEL
# ============================================================

class Wishlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'user_wishlist'
        managed = False
        unique_together = ['user', 'product']
        ordering = ['-added_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.product.name}"


# ============================================================
# CART MODEL
# ============================================================

class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_cart'
        managed = False
        unique_together = ['user', 'product']
    
    def __str__(self):
        return f"{self.user.username} - {self.product.name} x{self.quantity}"


# ============================================================
# ORDER MODEL
# ============================================================

class Order(models.Model):
    ORDER_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
    ]
    
    order_id = models.CharField(max_length=50, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    product_name = models.CharField(max_length=255)
    product_price = models.DecimalField(max_digits=10, decimal_places=2)
    product_img = models.URLField(max_length=500)
    product_brand = models.CharField(max_length=255)
    quantity = models.IntegerField(default=1)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    order_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50, default='pending', choices=ORDER_STATUS)
    payment_method = models.CharField(max_length=50, default='razorpay')
    shipping_name = models.CharField(max_length=255)
    shipping_email = models.EmailField(max_length=254)
    shipping_phone = models.CharField(max_length=20)
    shipping_address = models.TextField()
    shipping_zip = models.CharField(max_length=10)
    shipping_lat = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    shipping_lng = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    
    class Meta:
        db_table = 'store_order'
        managed = False
        ordering = ['-order_date']
    
    def __str__(self):
        return f"{self.order_id} - {self.user.username}"


# ============================================================
# SHIPPING DESTINATION MODEL
# ============================================================

class ShippingDestination(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    email = models.EmailField(max_length=254)
    phone = models.CharField(max_length=20)
    address = models.TextField()
    zip_code = models.CharField(max_length=10)
    lat = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    lng = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'store_shipping_destination'
        managed = False
        ordering = ['-is_default', '-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.name}"


# ============================================================
# CATEGORY MODEL - UPDATED
# ============================================================

class Category(models.Model):
    """Category model - matches your product_categories table"""
    id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=100)
    slug = models.CharField(max_length=100, unique=True)
    parent_id = models.IntegerField(null=True, blank=True)
    level = models.IntegerField(default=1)
    display_order = models.IntegerField(default=0)
    icon = models.CharField(max_length=50, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    
    class Meta:
        db_table = 'product_categories'  # Changed from 'store_category'
        
    
    def __str__(self):
        return self.name


# ============================================================
# BRAND MODEL - UPDATED
# ============================================================

class Brand(models.Model):
    """Brand model - matches your store_brands table"""
    id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=100)
    slug = models.CharField(max_length=100, unique=True)
    logo = models.CharField(max_length=500, null=True, blank=True)
    category_id = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    
    class Meta:
        db_table = 'store_brands'  # Changed from 'store_brand'
        managed = False
    
    def __str__(self):
        return self.name

        # store/models.py - Add this new model

class UserStreak(models.Model):
    """Track user streaks and SkyCoins"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='streak')
    
    # Streak tracking
    current_streak = models.IntegerField(default=0)
    max_streak = models.IntegerField(default=0)
    streak_start_date = models.DateTimeField(null=True, blank=True)
    last_purchase_date = models.DateTimeField(null=True, blank=True)
    
    # SkyCoins
    skycoins_balance = models.IntegerField(default=0)
    total_skycoins_earned = models.IntegerField(default=0)
    
    # Coupon tracking
    coupon_unlocked = models.BooleanField(default=False)
    coupon_code = models.CharField(max_length=50, null=True, blank=True)
    coupon_unlock_date = models.DateTimeField(null=True, blank=True)
    coupon_used = models.BooleanField(default=False)
    
    # Stats
    total_purchases = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_streak'
        managed = True  # Set to True so Django manages it
    
    def __str__(self):
        return f"{self.user.username} - Streak: {self.current_streak}"

class PurchaseHistory(models.Model):
    """Track individual purchases for streak verification"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchase_history')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    product_name = models.CharField(max_length=255)
    product_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.IntegerField(default=1)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    purchase_date = models.DateTimeField(auto_now_add=True)
    order_id = models.CharField(max_length=50, unique=True)
    
    class Meta:
        db_table = 'purchase_history'
        managed = True
        ordering = ['-purchase_date']
    
    def __str__(self):
        return f"{self.user.username} - {self.product_name} - {self.purchase_date.date()}"
// src/App.tsx - COMPLETE WITH ALL MODULES (Designer Hub, Shop Together, React Router, SkyCoins, SplashScreen, Razorpay, etc.)

import React, {
  useState,
  useEffect,
  MouseEvent,
  FormEvent,
  useCallback,
  useRef,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DeliveryLocationPicker from "./components/DeliveryLocationPicker";
import {
  Search,
  Heart,
  ShoppingBag,
  ArrowLeft,
  Trash2,
  CheckCircle,
  Sparkles,
  User,
  Lock,
  Mail,
  ShoppingCart,
  ChevronRight,
  ShieldCheck,
  Package,
  Shirt,
  Smartphone,
  Headphones,
  Gem,
  BookOpen,
  ChevronDown,
  Menu,
  X,
  Users,
  Palette,
  Coins,
  Gift,
} from "lucide-react";
import { Page, Product, ShippingDetails, Category, Brand } from "./types";
import { datasetProductsPool } from "./data/products";
import { useSocket } from "./context/SocketContext";
import { ShopTogether } from "./components/ShopTogether";
import { ShopTogetherRouter } from "./pages/ShopTogetherRouter";
import { DesignerHub } from "./pages/DesignerHub";
import { SkyCoinsDashboard } from "./pages/SkyCoinsDashboard";
import { useSkyCoins } from "./hooks/useSkyCoins";
import { SplashScreen } from "./components/SplashScreen";
import { RazorpayPayment } from "./components/RazorpayPayment";

// ============================================================
// API CONFIGURATION
// ============================================================
const API_BASE = "https://skymart-h.onrender.com";

// ============================================================
// MAIN APP COMPONENT
// ============================================================
export default function App() {
  // --- React Router hooks ---
  const navigate = useNavigate();
  const location = useLocation();

  // --- Get socket context ---
  const { currentRoom, viewProduct } = useSocket();

  // ============================================================
  // APPLICATION STATE
  // ============================================================
  const [page, setPage] = useState<Page>(Page.Landing);
  const [showSplash, setShowSplash] = useState(true);
  const [cart, setCart] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("cart");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("wishlist");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem("isLoggedIn") === "true";
    } catch {
      return false;
    }
  });

  const [userEmail, setUserEmail] = useState<string>(() => {
    return localStorage.getItem("userEmail") || "customer@skymart.com";
  });

  const [authToken, setAuthToken] = useState<string>(() => {
    try {
      return localStorage.getItem("authToken") || "";
    } catch {
      return "";
    }
  });

  // ✅ FIX: userData state - properly initialized
  const [userData, setUserData] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Auth inputs
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);

  // Catalog Filters
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(
    null,
  );
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInputVal, setSearchInputVal] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [priceCap, setPriceCap] = useState<number>(Infinity);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Category and Brand data from API
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Expanded categories for dropdown
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(
    new Set(),
  );

  // Shop Together state
  const [showShopTogether, setShowShopTogether] = useState(false);
  const [showShopTogetherPage, setShowShopTogetherPage] = useState(false);

  // SkyCoins state
  const [showSkyCoins, setShowSkyCoins] = useState(false);

  // Ref to prevent multiple API calls
  const hasLoadedRef = useRef(false);

  // Rotation angle for landing page icons
  const [rotationAngle, setRotationAngle] = useState(0);

  // ============================================================
  // SKYCOINS HOOK
  // ============================================================
  const userId = userEmail ? userEmail.split("@")[0] + Date.now() : "guest";
  const {
    skyCoinsData,
    showCelebration,
    celebrationMessage,
    newCouponCode,
    addPurchase,
    resetCelebration,
    getSkyCoinsBalance,
    getStreakStatus,
    isEligibleForCoupon,
    useCoupon,
    REQUIRED_DAYS,
    SKYCOINS_REWARD,
  } = useSkyCoins();

  // Coupon application state
  const [applyCoupon, setApplyCoupon] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);

  // SplashScreen handler
  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // ============================================================
  // ROUTE HANDLING EFFECT
  // ============================================================
  useEffect(() => {
    const routeMap: Record<string, Page> = {
      "/": Page.Landing,
      "/catalog": Page.ProductCatalog,
      "/wishlist": Page.Wishlist,
      "/cart": Page.Cart,
      "/dashboard": Page.Dashboard,
      "/designer-hub": Page.DesignerHub,
      "/login": Page.Login,
      "/register": Page.Register,
      "/forgot": Page.Forgot,
      "/reset-password": Page.ResetPassword,
      "/skycoins": Page.SkyCoins,
    };

    const path = location.pathname;

    if (path === "/") {
      setPage(Page.Landing);
      return;
    }

    if (path.startsWith("/product/")) {
      const id = parseInt(path.split("/")[2]);
      if (!isNaN(id)) {
        setSelectedProductId(id);
        setIsDetailView(true);
        setPage(Page.ProductCatalog);
      }
      return;
    }

    if (routeMap[path]) {
      setPage(routeMap[path]);
    }
  }, [location.pathname]);

  // ============================================================
  // API REQUEST FUNCTION
  // ============================================================
  const apiRequest = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(init.headers || {}),
      };

      const token = localStorage.getItem("authToken");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      try {
        const response = await fetch(`${API_BASE}${normalizedPath}`, {
          headers,
          credentials: "include",
          ...init,
        });

        const data = await response.json().catch(() => ({}));
        return { ok: response.ok, status: response.status, data };
      } catch (error) {
        console.error(`API request failed for ${path}:`, error);
        return { ok: false, status: 0, data: {} };
      }
    },
    [],
  );

  // ============================================================
  // DEFAULT PRODUCTS
  // ============================================================
  const getDefaultProducts = useCallback((): Product[] => {
    return [
      {
        id: 1,
        name: "Classic Cotton T-Shirt",
        brand: "SkyMart",
        category: "Fashion",
        price: 2999,
        discount_price: 2499,
        img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80",
        description: "Premium cotton t-shirt with classic fit",
        short_description: "Soft cotton t-shirt",
        sizes: ["S", "M", "L", "XL"],
        colors: ["White", "Black", "Navy"],
        rating: 4.5,
        reviews_count: 120,
        in_stock: true,
        is_featured: true,
        is_new: true,
        is_best_seller: false,
      },
      {
        id: 2,
        name: "Slim Fit Jeans",
        brand: "SkyMart",
        category: "Fashion",
        price: 5999,
        discount_price: 4499,
        img: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&q=80",
        description: "Classic slim fit jeans with stretch comfort",
        short_description: "Premium denim jeans",
        sizes: ["28", "30", "32", "34", "36"],
        colors: ["Blue", "Black", "Gray"],
        rating: 4.6,
        reviews_count: 200,
        in_stock: true,
        is_featured: true,
        is_new: false,
        is_best_seller: true,
      },
      {
        id: 3,
        name: "Formal Shirt",
        brand: "SkyMart",
        category: "Fashion",
        price: 4999,
        discount_price: 3999,
        img: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80",
        description: "Elegant formal shirt with premium fabric",
        short_description: "Premium formal shirt",
        sizes: ["S", "M", "L", "XL", "XXL"],
        colors: ["White", "Blue", "Pink", "Charcoal"],
        rating: 4.7,
        reviews_count: 85,
        in_stock: true,
        is_featured: true,
        is_new: false,
        is_best_seller: true,
      },
      {
        id: 4,
        name: "Running Shoes",
        brand: "SkyMart",
        category: "Sports",
        price: 8999,
        discount_price: 6999,
        img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
        description: "High-performance running shoes",
        short_description: "Professional running shoes",
        sizes: ["7", "8", "9", "10", "11", "12"],
        colors: ["White/Red", "Black/White", "Blue/White"],
        rating: 4.7,
        reviews_count: 300,
        in_stock: true,
        is_featured: true,
        is_new: true,
        is_best_seller: true,
      },
    ];
  }, []);

  // ============================================================
  // FALLBACK CATEGORIES
  // ============================================================
  const getFallbackCategories = useCallback((): Category[] => {
    return [
      {
        id: 1,
        name: "Fashion",
        slug: "fashion",
        level: 1,
        children: [
          {
            id: 2,
            name: "Men",
            slug: "men",
            parent_id: 1,
            level: 2,
            children: [
              {
                id: 10,
                name: "T-Shirts",
                slug: "men-tshirts",
                parent_id: 2,
                level: 3,
              },
              {
                id: 11,
                name: "Shirts",
                slug: "men-shirts",
                parent_id: 2,
                level: 3,
              },
              {
                id: 12,
                name: "Jeans",
                slug: "men-jeans",
                parent_id: 2,
                level: 3,
              },
              {
                id: 13,
                name: "Footwear",
                slug: "men-footwear",
                parent_id: 2,
                level: 3,
              },
            ],
          },
          {
            id: 3,
            name: "Women",
            slug: "women",
            parent_id: 1,
            level: 2,
            children: [
              {
                id: 14,
                name: "Dresses",
                slug: "women-dresses",
                parent_id: 3,
                level: 3,
              },
              {
                id: 15,
                name: "Kurtis",
                slug: "women-kurtis",
                parent_id: 3,
                level: 3,
              },
              {
                id: 16,
                name: "Sarees",
                slug: "women-sarees",
                parent_id: 3,
                level: 3,
              },
            ],
          },
          {
            id: 4,
            name: "Kids",
            slug: "kids",
            parent_id: 1,
            level: 2,
            children: [
              {
                id: 17,
                name: "Boys Wear",
                slug: "kids-boys",
                parent_id: 4,
                level: 3,
              },
              {
                id: 18,
                name: "Girls Wear",
                slug: "kids-girls",
                parent_id: 4,
                level: 3,
              },
            ],
          },
        ],
      },
      {
        id: 6,
        name: "Sports",
        slug: "sports",
        level: 1,
        children: [
          {
            id: 19,
            name: "Cricket",
            slug: "sports-cricket",
            parent_id: 6,
            level: 2,
          },
          {
            id: 20,
            name: "Football",
            slug: "sports-football",
            parent_id: 6,
            level: 2,
          },
          {
            id: 21,
            name: "Badminton",
            slug: "sports-badminton",
            parent_id: 6,
            level: 2,
          },
        ],
      },
      {
        id: 7,
        name: "Electronics",
        slug: "electronics",
        level: 1,
        children: [
          {
            id: 22,
            name: "Smartphones",
            slug: "electronics-phones",
            parent_id: 7,
            level: 2,
          },
          {
            id: 23,
            name: "Laptops",
            slug: "electronics-laptops",
            parent_id: 7,
            level: 2,
          },
          {
            id: 24,
            name: "Headphones",
            slug: "electronics-headphones",
            parent_id: 7,
            level: 2,
          },
        ],
      },
      {
        id: 8,
        name: "Home & Living",
        slug: "home-living",
        level: 1,
        children: [
          {
            id: 25,
            name: "Furniture",
            slug: "home-furniture",
            parent_id: 8,
            level: 2,
          },
          { id: 26, name: "Decor", slug: "home-decor", parent_id: 8, level: 2 },
        ],
      },
      {
        id: 9,
        name: "Books",
        slug: "books",
        level: 1,
        children: [
          {
            id: 27,
            name: "Fiction",
            slug: "books-fiction",
            parent_id: 9,
            level: 2,
          },
          {
            id: 28,
            name: "Self-Help",
            slug: "books-self-help",
            parent_id: 9,
            level: 2,
          },
        ],
      },
    ];
  }, []);

  // ============================================================
  // LOAD FUNCTIONS
  // ============================================================
  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    setCategoryError(null);
    try {
      console.log("Loading categories from API...");
      const { ok, data } = await apiRequest("/api/categories/", {
        method: "GET",
      });

      if (!ok) {
        console.error("Failed to load categories, using fallback");
        setCategories(getFallbackCategories());
        setIsLoadingCategories(false);
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        const categoryMap = new Map<number, Category>();
        const rootCategories: Category[] = [];

        data.forEach((cat: any) => {
          categoryMap.set(cat.id, {
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            parent_id: cat.parent_id,
            level: cat.level || 1,
            children: [],
          });
        });

        data.forEach((cat: any) => {
          const category = categoryMap.get(cat.id);
          if (!category) return;

          if (cat.parent_id && categoryMap.has(cat.parent_id)) {
            const parent = categoryMap.get(cat.parent_id);
            if (parent) {
              parent.children = parent.children || [];
              parent.children.push(category);
            }
          } else {
            rootCategories.push(category);
          }
        });

        rootCategories.sort((a, b) => {
          const orderA =
            data.find((c: any) => c.id === a.id)?.display_order || 0;
          const orderB =
            data.find((c: any) => c.id === b.id)?.display_order || 0;
          return orderA - orderB;
        });

        setCategories(rootCategories);
      } else {
        setCategories(getFallbackCategories());
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      setCategories(getFallbackCategories());
    } finally {
      setIsLoadingCategories(false);
    }
  }, [apiRequest, getFallbackCategories]);

  const loadBrands = useCallback(async () => {
    try {
      console.log("Loading brands from API...");
      const { ok, data } = await apiRequest("/api/brands/", { method: "GET" });

      if (!ok) {
        console.error("Failed to load brands");
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        setBrands(data);
        console.log("Brands loaded:", data.length);
      }
    } catch (error) {
      console.error("Error loading brands:", error);
    }
  }, [apiRequest]);

  // ============================================================
  // EFFECTS - LOAD DATA ONCE
  // ============================================================
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadCategories();
      loadBrands();
    }
  }, [loadCategories, loadBrands]);

  // ============================================================
  // EFFECTS - ROTATION ANIMATION
  // ============================================================
  useEffect(() => {
    const interval = setInterval(() => {
      setRotationAngle((prev) => (prev + 0.5) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Shipping inputs
  const [shippingDetails, setShippingDetails] = useState<ShippingDetails>(
    () => {
      try {
        const saved = localStorage.getItem("last_shipping_coordinates");
        return saved
          ? JSON.parse(saved)
          : { name: "", email: "", phone: "", address: "", zip: "" };
      } catch {
        return { name: "", email: "", phone: "", address: "", zip: "" };
      }
    },
  );

  // Payment state
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrExpiry, setQrExpiry] = useState(180);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "upi" | "card" | "netbanking" | "wallet" | "cod"
  >("upi");

  // Card form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");

  // Net banking state
  const [selectedBank, setSelectedBank] = useState("");

  // Wallet state
  const [walletBalance, setWalletBalance] = useState(5000);
  const [walletPin, setWalletPin] = useState("");

  // Custom products
  const [newProdName, setNewProdName] = useState("");
  const [newProdBrand, setNewProdBrand] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("Electronics");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdImg, setNewProdImg] = useState("");
  const [newProdDesc, setNewProdDesc] = useState("");

  // UI state
  const [isDetailView, setIsDetailView] = useState(false);
  const [isShippingView, setIsShippingView] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [splashVisible, setSplashVisible] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
    visible: boolean;
  } | null>(null);

  // Data
  const [customProducts, setCustomProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem("customProducts");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [backendProducts, setBackendProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [purchases, setPurchases] = useState<
    {
      id: string;
      productId: number;
      productName: string;
      productPrice: number;
      productImg: string;
      productBrand: string;
      date: string;
      quantity: number;
    }[]
  >(() => {
    try {
      const saved = localStorage.getItem("purchases");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // ============================================================
  // EFFECTS - PERSISTENCE
  // ============================================================
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem("isLoggedIn", String(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem("userEmail", userEmail);
  }, [userEmail]);

  useEffect(() => {
    localStorage.setItem("authToken", authToken);
  }, [authToken]);

  useEffect(() => {
    localStorage.setItem("customProducts", JSON.stringify(customProducts));
  }, [customProducts]);

  useEffect(() => {
    localStorage.setItem("purchases", JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem(
      "last_shipping_coordinates",
      JSON.stringify(shippingDetails),
    );
  }, [shippingDetails]);

  // ============================================================
  // EFFECTS - LOAD BACKEND PRODUCTS
  // ============================================================
  useEffect(() => {
    let cancelled = false;
    const loadBackendProducts = async () => {
      setIsLoading(true);
      try {
        const { ok, data } = await apiRequest("/api/products-simple/", {
          method: "GET",
        });

        if (!ok || cancelled) {
          if (!cancelled) {
            const fallback =
              datasetProductsPool.length > 0
                ? datasetProductsPool
                : getDefaultProducts();
            setBackendProducts(fallback);
          }
          setIsLoading(false);
          return;
        }

        let productsList = [];

        if (data && typeof data === "object") {
          if (data.results && Array.isArray(data.results)) {
            productsList = data.results;
          } else if (Array.isArray(data)) {
            productsList = data;
          } else {
            for (const key in data) {
              if (Array.isArray(data[key]) && data[key].length > 0) {
                productsList = data[key];
                break;
              }
            }
          }
        }

        if (!Array.isArray(productsList) || productsList.length === 0) {
          const fallback =
            datasetProductsPool.length > 0
              ? datasetProductsPool
              : getDefaultProducts();
          setBackendProducts(fallback);
          setIsLoading(false);
          return;
        }

        const mapped: Product[] = productsList
          .map((p: any) => {
            const id = Number(p?.id);
            if (!Number.isFinite(id)) return null;
            const priceNum = Number(p?.price);

            return {
              id,
              name: String(p?.name ?? ""),
              brand: String(p?.brand_name ?? p?.brand ?? "SkyMart"),
              category: String(p?.category_name ?? p?.category ?? "General"),
              price: Number.isFinite(priceNum) ? priceNum : 0,
              img: String(p?.img ?? ""),
              description: String(p?.description ?? ""),
              discount_price: p?.discount_price
                ? Number(p.discount_price)
                : null,
              short_description: String(p?.short_description ?? ""),
              sizes: p?.sizes || [],
              colors: p?.colors || [],
              rating: p?.rating ? Number(p.rating) : 0,
              reviews_count: p?.reviews_count ? Number(p.reviews_count) : 0,
              in_stock: Boolean(p?.in_stock),
              is_featured: Boolean(p?.is_featured),
              is_new: Boolean(p?.is_new),
              is_best_seller: Boolean(p?.is_best_seller),
              brand_id: p?.brand_id ? Number(p.brand_id) : undefined,
              category_id: p?.category_id ? Number(p.category_id) : undefined,
              slug: String(p?.slug ?? ""),
              created_at: String(p?.created_at ?? ""),
              updated_at: String(p?.updated_at ?? ""),
            } as Product;
          })
          .filter(Boolean) as Product[];

        if (mapped.length > 0) {
          setBackendProducts(mapped);
        } else {
          const fallback =
            datasetProductsPool.length > 0
              ? datasetProductsPool
              : getDefaultProducts();
          setBackendProducts(fallback);
        }
      } catch (error) {
        console.error("Error loading products:", error);
        const fallback =
          datasetProductsPool.length > 0
            ? datasetProductsPool
            : getDefaultProducts();
        setBackendProducts(fallback);
      } finally {
        setIsLoading(false);
      }
    };

    loadBackendProducts();
    return () => {
      cancelled = true;
    };
  }, [apiRequest, getDefaultProducts]);

  // QR Countdown
  useEffect(() => {
    if (!showQRModal) return;
    if (qrExpiry <= 0) {
      setShowQRModal(false);
      triggerToast("QR session expired. Please retry.", "error");
      return;
    }
    const intv = setInterval(() => {
      setQrExpiry((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(intv);
  }, [showQRModal, qrExpiry]);

  // Splash screen
  useEffect(() => {
    const timer = setTimeout(() => setSplashVisible(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Carousel
  useEffect(() => {
    if (page === Page.ProductCatalog && !isDetailView && !isShippingView) {
      const interval = setInterval(() => {
        setActiveSlideIndex((prev) => (prev === 0 ? 1 : 0));
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [page, isDetailView, isShippingView]);

  // Body overflow for modal
  useEffect(() => {
    document.body.style.overflow = showQRModal ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showQRModal]);

  // ============================================================
  // ALL PRODUCTS COMPUTED
  // ============================================================
  const allProducts = (() => {
    const merged = [
      ...datasetProductsPool,
      ...customProducts,
      ...backendProducts,
    ];
    const byId = new Map<number, Product>();
    for (const p of merged) {
      const product = { ...p };
      if (!product.brand && product.brand_id) {
        const brand = brands.find((b) => b.id === product.brand_id);
        product.brand = brand?.name || `Brand ${product.brand_id}`;
      }
      if (!product.category && product.category_id) {
        const cat = findCategoryBySlug(`category-${product.category_id}`);
        product.category = cat?.name || `Category ${product.category_id}`;
      }
      if (!product.brand) product.brand = "SkyMart";
      if (!product.category) product.category = "General";
      byId.set(p.id, product);
    }
    return Array.from(byId.values());
  })();

  // ============================================================
  // HELPERS
  // ============================================================
  const findCategoryBySlug = useCallback(
    (slug: string): Category | null => {
      const search = (cats: Category[]): Category | null => {
        for (const cat of cats) {
          if (cat.slug === slug) return cat;
          if (cat.children) {
            const found = search(cat.children);
            if (found) return found;
          }
        }
        return null;
      };
      return search(categories);
    },
    [categories],
  );

  const getProductsByCategory = useCallback(
    (categorySlug: string): Product[] => {
      const category = findCategoryBySlug(categorySlug);
      if (!category) return [];

      const getCategoryIds = (cat: Category): number[] => {
        let ids = [cat.id];
        if (cat.children) {
          for (const child of cat.children) {
            ids = ids.concat(getCategoryIds(child));
          }
        }
        return ids;
      };

      const categoryIds = getCategoryIds(category);
      return allProducts.filter(
        (p) => p.category_id && categoryIds.includes(p.category_id),
      );
    },
    [findCategoryBySlug, allProducts],
  );

  const getProductsByBrand = useCallback(
    (brandSlug: string): Product[] => {
      const brand = brands.find((b) => b.slug === brandSlug);
      if (!brand) return [];
      return allProducts.filter((p) => p.brand_id === brand.id);
    },
    [brands, allProducts],
  );

  const cartItemCounts = cart.reduce(
    (acc, id) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );

  const subtotalPrice = Object.entries(cartItemCounts).reduce(
    (acc, [strId, qty]) => {
      const product = allProducts.find((p) => p.id === Number(strId));
      return acc + (product ? product.price * (qty as number) : 0);
    },
    0,
  );

  const taxPrice = Math.floor(subtotalPrice * 0.18);

  const getTotalPrice = useCallback(() => {
    const baseTotal = subtotalPrice + taxPrice;
    if (applyCoupon && couponDiscount > 0) {
      return Math.max(0, baseTotal - couponDiscount);
    }
    return baseTotal;
  }, [subtotalPrice, taxPrice, applyCoupon, couponDiscount]);

  const totalPrice = getTotalPrice();

  const currentDetailProduct = selectedProductId
    ? allProducts.find((p) => p.id === selectedProductId)
    : null;

  const getFilteredProducts = () => {
    let filtered = allProducts;

    if (selectedCategory) {
      const categoryProducts = getProductsByCategory(selectedCategory);
      filtered = filtered.filter((p) =>
        categoryProducts.some((cp) => cp.id === p.id),
      );
    }

    if (selectedSubcategory) {
      const subcategoryProducts = getProductsByCategory(selectedSubcategory);
      filtered = filtered.filter((p) =>
        subcategoryProducts.some((cp) => cp.id === p.id),
      );
    }

    if (selectedBrand) {
      const brandProducts = getProductsByBrand(selectedBrand);
      filtered = filtered.filter((p) =>
        brandProducts.some((bp) => bp.id === p.id),
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query)),
      );
    }

    if (priceCap !== Infinity) {
      filtered = filtered.filter((p) => p.price <= priceCap);
    }

    return filtered;
  };

  // ============================================================
  // TOAST SYSTEM
  // ============================================================
  const triggerToast = (
    message: string,
    type: "success" | "error" | "info" = "success",
  ) => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast((prev) => (prev ? { ...prev, visible: false } : null));
    }, 3000);
  };

  // ============================================================
  // TOGGLE CATEGORY
  // ============================================================
  const toggleCategory = (categoryId: number, e: MouseEvent) => {
    e.stopPropagation();
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // ============================================================
  // AUTH HANDLERS
  // ============================================================
  const handleLogin = async (e?: FormEvent) => {
    if (e) e.preventDefault();

    if (!loginEmail.trim() || !loginPassword.trim()) {
      triggerToast("Please fill in all required fields.", "error");
      return;
    }
    if (loginPassword.length < 6) {
      triggerToast("Password must be at least 6 characters.", "error");
      return;
    }

    console.log("🔍 Attempting login for:", loginEmail.trim());

    try {
      const response = await fetch(`${API_BASE}/api/auth/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: loginEmail.trim(),
          password: loginPassword,
        }),
      });

      const data = await response.json();
      console.log("📥 Login response:", data);

      if (response.ok && data.token) {
        // ✅ Save token and user data
        setAuthToken(data.token);
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userEmail", data.email || loginEmail.trim());

        // ✅ Save user data
        const userDataToSave = {
          id: data.id,
          username: data.username,
          name: data.name || data.username,
          email: data.email || loginEmail.trim(),
        };
        localStorage.setItem("user", JSON.stringify(userDataToSave));
        setUserData(userDataToSave);

        setIsLoggedIn(true);
        setUserEmail(data.email || loginEmail.trim());
        setLoginEmail("");
        setLoginPassword("");

        triggerToast("Welcome to SkyMart! 🎉", "success");
        console.log("✅ Login successful, token saved");
        navigate("/catalog");
      } else {
        // ❌ Login failed
        const errorMsg =
          data.detail || data.error || "Invalid credentials. Please try again.";
        triggerToast(errorMsg, "error");
        console.error("❌ Login failed:", errorMsg);
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      triggerToast("Network error. Please try again.", "error");
    }
  };

  // ============================================================
  // UPDATED REGISTER HANDLER - Redirects to Login instead of auto-login
  // ============================================================
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();

    // Validation checks
    if (
      !regName.trim() ||
      !regLastName.trim() ||
      !regEmail.trim() ||
      !regPassword.trim() ||
      !regConfirm.trim()
    ) {
      triggerToast("Please complete all required fields.", "error");
      return;
    }

    if (regPassword.length < 6) {
      triggerToast("Password must be at least 6 characters.", "error");
      return;
    }

    if (regPassword !== regConfirm) {
      triggerToast("Passwords do not match.", "error");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `${regName.trim()} ${regLastName.trim()}`,
          email: regEmail.trim(),
          password: regPassword,
          confirm_password: regConfirm,
        }),
      });

      const data = await response.json();
      console.log("📥 Register response:", data);

      if (response.ok) {
        // ✅ Registration successful - Clear form fields
        setRegName("");
        setRegLastName("");
        setRegEmail("");
        setRegPassword("");
        setRegConfirm("");

        // ✅ Pre-fill login email for convenience
        setLoginEmail(data.email || regEmail.trim());

        // ✅ Show success message
        triggerToast(
          "✅ Account created successfully! Please sign in to continue.",
          "success",
        );

        // ✅ Show registration success modal
        setShowRegistrationSuccess(true);
      } else {
        // ❌ Registration failed
        const errorMsg =
          data.detail ||
          data.email?.[0] ||
          data.password?.[0] ||
          data.non_field_errors?.[0] ||
          "Registration failed. Please try again.";
        triggerToast(errorMsg, "error");
      }
    } catch (error) {
      console.error("❌ Register error:", error);
      triggerToast("Network error. Please try again.", "error");
    }
  };

  const handleForgotPassword = (e: FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      triggerToast("Email address is required.", "error");
      return;
    }
    triggerToast("Password reset link sent! 📩", "success");
    navigate("/reset-password");
  };

  const handleResetPassword = (e: FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || !confirmNewPassword.trim()) {
      triggerToast("Passwords cannot be blank.", "error");
      return;
    }
    if (newPassword.length < 6) {
      triggerToast("Password must be at least 6 characters.", "error");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      triggerToast("Passwords do not match.", "error");
      return;
    }

    triggerToast("Password updated successfully!", "success");
    setNewPassword("");
    setConfirmNewPassword("");
    navigate("/login");
  };

  // ============================================================
  // LOGOUT HANDLER
  // ============================================================
  const handleLogout = () => {
    const shouldKeepData = window.confirm(
      "Save your wishlist and cart for next time?\n\n" +
        "• Click 'OK' to keep your items saved\n" +
        "• Click 'Cancel' to clear all data",
    );

    if (shouldKeepData) {
      localStorage.setItem("isLoggedIn", "false");
      setIsLoggedIn(false);
      setUserEmail("");
      setAuthToken("");
      setUserData(null);
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      triggerToast("Logged out. Your wishlist and cart are saved.", "info");
    } else {
      localStorage.removeItem("cart");
      localStorage.removeItem("wishlist");
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      localStorage.removeItem("customProducts");
      localStorage.removeItem("purchases");
      localStorage.removeItem("last_shipping_coordinates");

      setIsLoggedIn(false);
      setCart([]);
      setWishlist([]);
      setUserEmail("");
      setAuthToken("");
      setUserData(null);
      setCustomProducts([]);
      setPurchases([]);
      setShippingDetails({
        name: "",
        email: "",
        phone: "",
        address: "",
        zip: "",
      });

      triggerToast("Logged out. All data cleared.", "info");
    }

    navigate("/");
  };

  // ============================================================
  // CART & WISHLIST HANDLERS
  // ============================================================
  const toggleWishlist = (productId: number, e?: MouseEvent) => {
    if (e) e.stopPropagation();
    setWishlist((prev) => {
      const exist = prev.includes(productId);
      if (exist) {
        triggerToast("Removed from wishlist.", "info");
        return prev.filter((id) => id !== productId);
      } else {
        triggerToast("❤️ Added to wishlist!", "success");
        return [...prev, productId];
      }
    });
  };

  const addToCart = (productId: number, e?: MouseEvent) => {
    if (e) e.stopPropagation();
    setCart((prev) => [...prev, productId]);
    triggerToast("Item added to cart!", "success");
  };

  const removeFromCartLine = (productId: number) => {
    setCart((prev) => prev.filter((id) => id !== productId));
    triggerToast("Item removed from cart.", "info");
  };

  const adjustQty = (productId: number, change: number) => {
    setCart((prev) => {
      const idx = prev.indexOf(productId);
      if (idx === -1 && change > 0) {
        return [...prev, productId];
      } else if (change > 0) {
        return [...prev, productId];
      } else if (change < 0 && idx !== -1) {
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      return prev;
    });
  };

  // ============================================================
  // NAVIGATION HANDLERS
  // ============================================================
  const handleCategoryClick = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setSelectedSubcategory(null);
    setSelectedBrand(null);
    setSearchQuery("");
    setIsDetailView(false);
    setIsShippingView(false);
    navigate("/catalog");
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubcategoryClick = (subcategorySlug: string) => {
    setSelectedSubcategory(subcategorySlug);
    setSelectedBrand(null);
    setSearchQuery("");
    setIsDetailView(false);
    setIsShippingView(false);
    navigate("/catalog");
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBrandClick = (brandSlug: string) => {
    setSelectedBrand(brandSlug);
    setSearchQuery("");
    setIsDetailView(false);
    setIsShippingView(false);
    navigate("/catalog");
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBannerAction = (category: string) => {
    const categoryMap: Record<string, string> = {
      Fashion: "fashion",
      Electronics: "electronics",
      "Home & Kitchen": "home-living",
      Books: "books",
      Sports: "sports",
    };
    const slug = categoryMap[category] || category.toLowerCase();
    handleCategoryClick(slug);
  };

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInputVal);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedBrand(null);
    navigate("/catalog");
    setIsDetailView(false);
    setIsShippingView(false);
  };

  const handleAddCustomProduct = (e: FormEvent) => {
    e.preventDefault();
    if (
      !newProdName.trim() ||
      !newProdBrand.trim() ||
      !newProdPrice.trim() ||
      !newProdDesc.trim()
    ) {
      triggerToast("Please complete all fields.", "error");
      return;
    }

    const priceNum = Number(newProdPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      triggerToast("Please enter a valid price.", "error");
      return;
    }

    const newId = Date.now() % 1000000;
    let finalImage = newProdImg.trim();
    if (!finalImage) {
      if (newProdCategory === "Electronics") {
        finalImage =
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600";
      } else if (newProdCategory === "Fashion") {
        finalImage =
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600";
      } else if (newProdCategory === "Home & Kitchen") {
        finalImage =
          "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=600";
      } else {
        finalImage =
          "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600";
      }
    }

    const createdProduct: Product = {
      id: newId,
      name: newProdName.trim(),
      brand: newProdBrand.trim(),
      category: newProdCategory,
      price: priceNum,
      img: finalImage,
      description: newProdDesc.trim(),
      discount_price: null,
      is_new: true,
      is_best_seller: false,
      rating: 0,
      reviews_count: 0,
      sizes: [],
      colors: [],
    };

    setCustomProducts((prev) => [createdProduct, ...prev]);
    triggerToast(`"${newProdName.trim()}" added to store! 🛍️`, "success");

    setNewProdName("");
    setNewProdBrand("");
    setNewProdPrice("");
    setNewProdImg("");
    setNewProdDesc("");
  };

  // ============================================================
  // LOCATION HANDLERS
  // ============================================================
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return null;
      const data = await response.json();
      return {
        displayName: data.display_name as string | undefined,
        postcode: data.address?.postcode as string | undefined,
      };
    } catch {
      return null;
    }
  };

  const forwardGeocode = async (address: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(address)}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) return null;
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) return null;
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name,
        postcode: data[0].address?.postcode ?? "",
      };
    } catch {
      return null;
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      triggerToast("Geolocation is not supported.", "error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const geo = await reverseGeocode(coords.latitude, coords.longitude);
        setShippingDetails((prev) => ({
          ...prev,
          lat: coords.latitude,
          lng: coords.longitude,
          address: geo?.displayName || prev.address,
          zip: geo?.postcode || prev.zip,
        }));
        triggerToast("Location updated!", "success");
      },
      (err) => {
        let reason = err.message;
        if (err.code === 1) reason = "Location permission denied.";
        if (err.code === 2) reason = "Position unavailable.";
        if (err.code === 3) reason = "Location request timed out.";
        triggerToast(reason, "error");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  // ============================================================
  // PAYMENT HANDLERS
  // ============================================================
  const initiateQRPayment = () => {
    if (!isLoggedIn) {
      triggerToast("Please sign in to complete checkout.", "error");
      navigate("/login");
      return;
    }

    const ship = shippingDetails;
    if (!ship.name.trim()) {
      triggerToast("Please enter recipient name.", "error");
      return;
    }
    if (!ship.email?.trim() || !ship.email.includes("@")) {
      triggerToast("Please enter valid email.", "error");
      return;
    }
    if (!ship.phone.trim() || ship.phone.trim().length < 8) {
      triggerToast("Please enter valid phone number.", "error");
      return;
    }
    if (!ship.address.trim() || ship.address.trim().length < 10) {
      triggerToast("Please enter full address.", "error");
      return;
    }
    if (!ship.zip.trim() || ship.zip.trim().length < 5) {
      triggerToast("Please enter valid PIN code.", "error");
      return;
    }

    const finalShip = { ...ship, email: ship.email.trim() };
    setShippingDetails(finalShip);
    localStorage.setItem(
      "last_shipping_coordinates",
      JSON.stringify(finalShip),
    );

    setQrExpiry(180);
    setPaymentSuccess(false);
    setIsVerifyingPayment(false);
    setShowQRModal(true);
    triggerToast("Payment gateway opened!", "success");
  };

  const completeFinalPayment = () => {
    const newPurchasedItems: typeof purchases = [];

    let productsToProcess: { productId: number; quantity: number }[] = [];

    if (isShippingView && selectedProductId) {
      const qty = cartItemCounts[selectedProductId] || 1;
      productsToProcess.push({ productId: selectedProductId, quantity: qty });
    } else {
      Object.entries(cartItemCounts).forEach(([strId, qty]) => {
        productsToProcess.push({ productId: Number(strId), quantity: qty });
      });
    }

    productsToProcess.forEach(({ productId, qty }) => {
      const prod = allProducts.find((p) => p.id === productId);
      if (prod) {
        newPurchasedItems.push({
          id: "ORD-" + Math.floor(Math.random() * 900000 + 100000),
          productId: prod.id,
          productName: prod.name,
          productPrice: prod.price,
          productImg: prod.img,
          productBrand: prod.brand,
          date: new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          quantity: qty,
        });

        const result = addPurchase(prod.name, prod.id, prod.price);

        if (result.couponUnlocked) {
          triggerToast(
            `🌟 Amazing! You earned ${SKYCOINS_REWARD} SkyCoins and a 50% OFF coupon! Check your SkyCoins dashboard.`,
            "success",
          );
        }
      }
    });

    if (newPurchasedItems.length > 0) {
      setPurchases((prev) => [...newPurchasedItems, ...prev]);
    }

    let finalTotal = totalPrice;
    if (applyCoupon && isEligibleForCoupon()) {
      const coupon = useCoupon();
      if (coupon) {
        triggerToast(`💰 Coupon ${coupon} applied! 50% OFF!`, "success");
      }
    }

    triggerToast(`Payment successful! ₹${finalTotal} cleared. 🎉`, "success");

    if (isShippingView && selectedProductId) {
      setCart((prev) => prev.filter((id) => id !== selectedProductId));
    } else {
      setCart([]);
    }

    setShowQRModal(false);
    setIsShippingView(false);
    setIsDetailView(false);
    setApplyCoupon(false);
    setCouponDiscount(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigate("/dashboard");
  };

  const handleCardPayment = () => {
    if (!cardNumber || !cardExpiry || !cardCvv || !cardName) {
      triggerToast("Please fill all card details.", "error");
      return;
    }
    if (cardNumber.replace(/\s/g, "").length < 16) {
      triggerToast("Invalid card number.", "error");
      return;
    }
    if (cardCvv.length < 3) {
      triggerToast("Invalid CVV.", "error");
      return;
    }
    setIsVerifyingPayment(true);
    triggerToast("Processing card payment...", "info");
    setTimeout(() => {
      completeFinalPayment();
    }, 2000);
  };

  const handleNetBankingPayment = () => {
    if (!selectedBank) {
      triggerToast("Please select a bank.", "error");
      return;
    }
    setIsVerifyingPayment(true);
    triggerToast(`Redirecting to ${selectedBank}...`, "info");
    setTimeout(() => {
      completeFinalPayment();
    }, 2000);
  };

  const handleWalletPayment = () => {
    if (!walletPin) {
      triggerToast("Please enter wallet PIN.", "error");
      return;
    }
    if (walletPin.length < 4) {
      triggerToast("Invalid PIN.", "error");
      return;
    }
    const amountToPay =
      isShippingView && selectedProductId
        ? allProducts.find((p) => p.id === selectedProductId)?.price || 0
        : totalPrice;
    if (walletBalance < amountToPay) {
      triggerToast("Insufficient wallet balance.", "error");
      return;
    }
    setIsVerifyingPayment(true);
    triggerToast("Processing wallet payment...", "info");
    setTimeout(() => {
      const price =
        isShippingView && selectedProductId
          ? allProducts.find((p) => p.id === selectedProductId)?.price || 0
          : totalPrice;
      setWalletBalance(walletBalance - price);
      completeFinalPayment();
    }, 2000);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s/g, "").replace(/\D/g, "");
    const parts = v.match(/.{1,4}/g);
    return parts ? parts.join(" ") : v;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, "");
    if (v.length >= 2) {
      return v.slice(0, 2) + "/" + v.slice(2, 4);
    }
    return v;
  };

  // ============================================================
  // SLIDES
  // ============================================================
  const slides = [
    {
      img: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200",
      title: "The Minimalist Silhouette",
      desc: "Architectural lines meet absolute textile comfort.",
      category: "Fashion",
    },
    {
      img: "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=1200",
      title: "Tactile Precision Instruments",
      desc: "Refining digital workspace environments with precision.",
      category: "Electronics",
    },
  ];

  // ============================================================
  // ROTATING ICONS CONFIGURATION
  // ============================================================
  const iconPositions = [
    {
      angle: 0,
      label: "Fashion",
      icon: Shirt,
      slug: "fashion",
      subtext: "Men • Women • Kids",
    },
    {
      angle: 60,
      label: "Tech",
      icon: Smartphone,
      slug: "electronics",
      subtext: "Phones • Laptops • Audio",
    },
    {
      angle: 120,
      label: "Sports",
      icon: Gem,
      slug: "sports",
      subtext: "Cricket • Football • Fitness",
    },
    {
      angle: 180,
      label: "Home",
      icon: Headphones,
      slug: "home-living",
      subtext: "Furniture • Decor • Kitchen",
    },
    {
      angle: 240,
      label: "Books",
      icon: BookOpen,
      slug: "books",
      subtext: "Fiction • Non-Fiction • Self-Help",
    },
    {
      angle: 300,
      label: "Living",
      icon: Package,
      slug: "home-living",
      subtext: "Bedding • Lighting • Storage",
    },
  ];

  // ============================================================
  // RENDER HELPERS
  // ============================================================
  const renderCategoryTree = (categories: Category[], level: number = 0) => {
    return categories.map((category) => {
      const isExpanded = expandedCategories.has(category.id);
      const hasChildren = category.children && category.children.length > 0;

      return (
        <div key={category.id} className="mb-2">
          <div className="flex items-center">
            <button
              onClick={() => handleCategoryClick(category.slug)}
              className={`flex items-center gap-2 flex-1 text-left px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors ${
                selectedCategory === category.slug
                  ? "bg-stone-100 font-semibold"
                  : ""
              }`}
              style={{ paddingLeft: `${level * 12 + 12}px` }}
            >
              <span className="text-sm">{category.name}</span>
            </button>
            {hasChildren && (
              <button
                onClick={(e) => toggleCategory(category.id, e)}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors ml-1 flex-shrink-0"
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                <ChevronDown
                  className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}
          </div>
          {hasChildren && isExpanded && (
            <div className="ml-2 mt-1">
              {category.children!.map((child) => (
                <button
                  key={child.id}
                  onClick={() => handleSubcategoryClick(child.slug)}
                  className={`block w-full text-left px-3 py-1.5 text-sm rounded-lg hover:bg-stone-50 transition-colors ${
                    selectedSubcategory === child.slug
                      ? "bg-stone-50 font-medium text-amber-600"
                      : "text-stone-600"
                  }`}
                  style={{ paddingLeft: `${(level + 1) * 12 + 12}px` }}
                >
                  {child.name}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  const renderBrands = () => {
    if (brands.length === 0) return null;

    let filteredBrands = brands;
    if (selectedCategory || selectedSubcategory) {
      const categoryProducts = getFilteredProducts();
      const brandIds = new Set(
        categoryProducts
          .map((p) => p.brand_id)
          .filter((id) => id !== undefined),
      );
      filteredBrands = brands.filter((b) => brandIds.has(b.id));
    }

    if (filteredBrands.length === 0) return null;

    return (
      <div className="mb-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">
          Shop by Brand
        </h4>
        <div className="space-y-1">
          {filteredBrands.map((brand) => (
            <button
              key={brand.id}
              onClick={() => handleBrandClick(brand.slug)}
              className={`block w-full text-left px-3 py-1.5 text-sm rounded-lg hover:bg-stone-50 transition-colors ${
                selectedBrand === brand.slug
                  ? "bg-stone-50 font-medium text-amber-600"
                  : "text-stone-600"
              }`}
            >
              {brand.name}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const resetAllFilters = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedBrand(null);
    setSearchQuery("");
    setPriceCap(Infinity);
    setSearchInputVal("");
    setExpandedCategories(new Set());
    setIsDetailView(false);
    setIsShippingView(false);
    navigate("/catalog");
    setIsMobileMenuOpen(false);
  };

  // ============================================================
  // RENDER PAGES - ALL PAGES IN ONE COMPLETE RETURN
  // ============================================================
  return (
    <>
      {/* Splash Screen */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      <div className="min-h-screen bg-[#faf9f5] text-[#1c1917] flex flex-col font-sans">
        {/* Toast Notifications */}
        {toast && toast.visible && (
          <div
            className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 text-white text-sm font-semibold transition-all duration-300 ${
              toast.type === "success"
                ? "bg-emerald-600"
                : toast.type === "error"
                  ? "bg-rose-600"
                  : "bg-sky-700"
            }`}
          >
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{toast.message}</span>
          </div>
        )}

        {/* Registration Success Modal */}
        {showRegistrationSuccess && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full mx-4 p-8 text-center shadow-2xl animate-scale-in">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-stone-800 mb-2">
                Account Created!
              </h2>
              <p className="text-stone-600 mb-6">
                Your account has been created successfully.
                <br />
                Please sign in to continue shopping.
              </p>
              <button
                onClick={() => {
                  setShowRegistrationSuccess(false);
                  navigate("/login");
                }}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all"
              >
                Sign In Now
              </button>
            </div>
          </div>
        )}

        {/* SkyCoins Celebration Overlay */}
        {showCelebration && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="relative max-w-2xl w-full mx-4 p-6 animate-scale-in">
              <div className="absolute -inset-4 bg-gradient-to-r from-amber-400/20 via-purple-400/20 to-amber-400/20 rounded-3xl blur-2xl animate-pulse"></div>
              <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-amber-200">
                <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 p-6 text-center">
                  <div className="flex justify-center mb-2">
                    <div className="relative">
                      <div className="absolute inset-0 bg-white/20 rounded-full blur-xl"></div>
                      <div className="relative w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                        <Coins className="w-12 h-12 text-white" />
                      </div>
                    </div>
                  </div>
                  <h2 className="text-3xl font-bold text-white">
                    🎉 SkyCoins Earned!
                  </h2>
                  <p className="text-amber-50 text-sm mt-1">
                    You maintained a {REQUIRED_DAYS}-day streak!
                  </p>
                </div>
                <div className="p-8 text-center">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                      <Coins className="w-8 h-8 text-amber-500 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-amber-700">
                        +{SKYCOINS_REWARD}
                      </p>
                      <p className="text-xs text-stone-500">SkyCoins</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                      <Gift className="w-8 h-8 text-purple-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-purple-700 font-mono text-sm truncate">
                        {newCouponCode || "SKY50-XXXX"}
                      </p>
                      <p className="text-xs text-stone-500">50% OFF Coupon</p>
                    </div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 mb-6">
                    <p className="text-sm text-stone-600">
                      <strong>🎯 Tip:</strong> Use your SkyCoins and coupon on
                      your next purchase!
                    </p>
                  </div>
                  <button
                    onClick={resetCelebration}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                  >
                    Continue Shopping 🚀
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== LANDING PAGE ===== */}
        {page === Page.Landing && (
          <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-br from-[#0a0a0f] via-[#14141a] to-[#1a1a24] text-stone-100 flex flex-col justify-between py-10 px-6 sm:px-12 selection:bg-amber-500/30 selection:text-amber-100 font-sans">
            {/* Landing page content */}
            <div className="w-full max-w-7xl mx-auto flex justify-between items-center z-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <div
                  onClick={() => navigate("/")}
                  className="text-xl font-serif font-semibold tracking-[6px] text-stone-200 hover:text-amber-400 transition-colors cursor-pointer uppercase flex items-center gap-1.5"
                >
                  <span>SKY</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
                    MART
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  navigate("/catalog");
                  triggerToast("Browsing premium collection catalog.", "info");
                }}
                className="group text-[10px] tracking-[0.2em] uppercase border border-stone-800/50 hover:border-amber-500/50 bg-[#1c1917]/30 hover:bg-[#1c1917]/80 hover:text-amber-400 transition-all rounded-full px-6 py-3 font-medium backdrop-blur-sm shadow-lg shadow-black/20"
              >
                <span className="flex items-center gap-2">
                  Skip to Store
                  <span className="group-hover:translate-x-1 transition-transform">
                    ⚡
                  </span>
                </span>
              </button>
            </div>

            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center justify-center my-auto py-12 z-10">
              <div className="flex flex-col items-start text-left space-y-8">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] tracking-[0.22em] font-semibold uppercase backdrop-blur-sm">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>Haute Collection • 2026</span>
                </div>
                <h1 className="text-5xl sm:text-7xl font-serif font-light tracking-wide leading-[1.1]">
                  <span className="text-stone-100">SKY</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-amber-200 font-normal">
                    MART
                  </span>
                  <span className="block text-sm sm:text-base font-sans font-light tracking-[0.4em] uppercase text-stone-500 mt-3">
                    Haute Couture & Living
                  </span>
                </h1>
                <p className="text-stone-400 text-sm sm:text-base leading-relaxed max-w-lg font-light">
                  An ultra-luxury curated destination for avant-garde fashion,
                  premium technology, and bespoke furniture components.
                </p>
                <div className="grid grid-cols-3 gap-6 sm:gap-10 pt-4">
                  <div className="group cursor-pointer">
                    <h3 className="text-2xl sm:text-3xl font-serif font-semibold text-amber-100/90 mb-1 group-hover:text-amber-400 transition-colors">
                      1M+
                    </h3>
                    <p className="text-[9px] text-stone-500 uppercase tracking-[0.2em] font-mono">
                      Curated Assets
                    </p>
                  </div>
                  <div className="group cursor-pointer">
                    <h3 className="text-2xl sm:text-3xl font-serif font-semibold text-amber-100/90 mb-1 group-hover:text-amber-400 transition-colors">
                      500K+
                    </h3>
                    <p className="text-[9px] text-stone-500 uppercase tracking-[0.2em] font-mono">
                      Global Clients
                    </p>
                  </div>
                  <div className="group cursor-pointer">
                    <h3 className="text-2xl sm:text-3xl font-serif font-semibold text-amber-100/90 mb-1 group-hover:text-amber-400 transition-colors">
                      24/7
                    </h3>
                    <p className="text-[9px] text-stone-500 uppercase tracking-[0.2em] font-mono">
                      Concierge Desk
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-4">
                  <button
                    onClick={() => navigate("/login")}
                    className="group flex-1 sm:flex-initial bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold px-8 py-4 rounded-full shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-[2px] active:translate-y-0 transition-all text-xs uppercase tracking-widest"
                  >
                    <span className="flex items-center justify-center gap-2">
                      Enter Atelier
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>
                  <button
                    onClick={() => navigate("/register")}
                    className="flex-1 sm:flex-initial bg-[#1c1917]/50 hover:bg-[#1c1917]/90 text-stone-300 hover:text-stone-100 backdrop-blur-xl border border-stone-800 hover:border-stone-700 font-semibold px-8 py-4 rounded-full hover:-translate-y-[2px] active:translate-y-0 transition-all text-xs uppercase tracking-widest shadow-lg shadow-black/20"
                  >
                    Create Account
                  </button>
                </div>
              </div>

              <div className="relative flex items-center justify-center min-h-[400px] lg:min-h-[550px]">
                <div className="relative">
                  <div className="absolute inset-[-30px] rounded-full bg-gradient-to-r from-amber-500/10 via-transparent to-purple-500/10 blur-2xl"></div>
                  <div className="relative p-12 border border-stone-800/60 rounded-full aspect-square w-72 sm:w-[420px] flex items-center justify-center shadow-2xl shadow-black/50">
                    <div className="absolute inset-4 border border-stone-800/30 rounded-full border-dashed animate-spin-slow"></div>
                    <div className="absolute inset-[50px] border border-amber-500/10 rounded-full"></div>
                    <div className="absolute inset-[70px] border border-stone-800/20 rounded-full border-dotted animate-spin-slow-reverse"></div>
                    <div
                      onClick={() => {
                        navigate("/catalog");
                        triggerToast("Welcome to SkyMart Store! 🛍️", "success");
                      }}
                      className="relative p-8 bg-gradient-to-br from-[#1a1817] to-[#0f0e0d] border border-stone-800/80 rounded-full flex items-center justify-center shadow-2xl shadow-black/50 group cursor-pointer hover:scale-105 transition-all duration-700"
                    >
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                      <ShoppingCart className="w-16 h-16 sm:w-20 sm:h-20 text-amber-400/70 group-hover:text-amber-400 transition-all duration-500 drop-shadow-[0_4px_24px_rgba(245,158,11,0.3)] group-hover:drop-shadow-[0_4px_40px_rgba(245,158,11,0.5)]" />
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-amber-500/50 animate-pulse">
                        24
                      </div>
                    </div>
                    {iconPositions.map((pos, index) => {
                      const angle = pos.angle + rotationAngle;
                      const radius = 160;
                      const x = Math.cos((angle * Math.PI) / 180) * radius;
                      const y = Math.sin((angle * Math.PI) / 180) * radius;
                      return (
                        <div
                          key={index}
                          className="absolute"
                          style={{
                            transform: `translate(${x}px, ${y}px)`,
                            transition: "transform 0.05s linear",
                            left: "50%",
                            top: "50%",
                            marginLeft: "-32px",
                            marginTop: "-32px",
                          }}
                        >
                          <button
                            onClick={() => handleCategoryClick(pos.slug)}
                            className="flex flex-col items-center gap-1 group"
                          >
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#262524] to-[#1a1817] border border-stone-700/50 flex items-center justify-center shadow-xl shadow-black/40 group-hover:border-amber-500/50 transition-all duration-300 group-hover:scale-110">
                              <pos.icon className="w-7 h-7 sm:w-8 sm:h-8 text-amber-100/60 group-hover:text-amber-400 transition-colors" />
                            </div>
                            <span className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider text-stone-400 group-hover:text-amber-400 transition-colors">
                              {pos.label}
                            </span>
                            <span className="text-[6px] sm:text-[7px] text-stone-500/60 hidden sm:block">
                              {pos.subtext}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full max-w-7xl mx-auto border-t border-stone-900/60 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-stone-500 font-mono uppercase tracking-[0.15em] z-10">
              <span>
                © 2026 SkyMart. Manufactured to premium engineering
                specifications.
              </span>
              <div className="flex gap-6">
                <span className="hover:text-stone-300 transition-colors cursor-pointer">
                  Privacy
                </span>
                <span className="hover:text-stone-300 transition-colors cursor-pointer">
                  Terms
                </span>
                <span className="hover:text-stone-300 transition-colors cursor-pointer">
                  Contact
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ===== LOGIN PAGE ===== */}
        {page === Page.Login && (
          <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-br from-[#0a0a0f] via-[#14141a] to-[#1a1a24] text-stone-100 flex flex-col justify-between py-8 px-4 sm:px-8 selection:bg-amber-500/30 selection:text-amber-100">
            <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-amber-500/8 rounded-full filter blur-[150px] animate-pulse-slow pointer-events-none"></div>
            <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-purple-500/5 rounded-full filter blur-[130px] animate-pulse-slow-delayed pointer-events-none"></div>

            <div className="w-full max-w-7xl mx-auto flex items-center justify-between z-20">
              <button
                onClick={() => navigate("/")}
                className="group text-sm font-semibold text-stone-400 hover:text-amber-400 transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Home</span>
              </button>
              <div className="text-xl font-serif font-bold tracking-[3px] bg-gradient-to-r from-amber-400 to-amber-200 text-transparent bg-clip-text">
                SKYMART
              </div>
            </div>

            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center my-auto py-8 z-10">
              <div className="hidden lg:flex flex-col items-center justify-center">
                <div className="relative w-72 h-72">
                  <div className="absolute inset-0 rounded-full border border-amber-500/20 animate-spin-slow">
                    <div className="absolute top-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-400 rounded-full shadow-lg shadow-amber-500/50"></div>
                  </div>
                  <div className="absolute inset-[30px] rounded-full border border-stone-700/30 border-dashed animate-spin-slow-reverse">
                    <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-purple-400 rounded-full shadow-lg shadow-purple-500/50"></div>
                  </div>
                  <div className="absolute inset-[60px] rounded-full bg-gradient-to-br from-[#1a1817] to-[#0f0e0d] border border-stone-800/80 flex items-center justify-center shadow-2xl shadow-amber-500/10">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500/10 via-transparent to-purple-500/10 opacity-50"></div>
                    <ShoppingCart className="w-16 h-16 text-amber-400/80 drop-shadow-[0_4px_40px_rgba(245,158,11,0.3)]" />
                  </div>
                  <div className="absolute top-[-10px] left-1/2 -translate-x-1/2">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center hover:scale-110 transition-transform duration-300 cursor-pointer shadow-lg shadow-black/30">
                        <Shirt className="w-5 h-5 text-amber-400" />
                      </div>
                      <span className="text-[8px] text-stone-400 mt-1 font-medium uppercase tracking-wider">
                        Fashion
                      </span>
                    </div>
                  </div>
                  <div className="absolute top-[15%] right-[-10px]">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 flex items-center justify-center hover:scale-110 transition-transform duration-300 cursor-pointer shadow-lg shadow-black/30">
                        <Smartphone className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="text-[8px] text-stone-400 mt-1 font-medium uppercase tracking-wider">
                        Tech
                      </span>
                    </div>
                  </div>
                  <div className="absolute bottom-[15%] right-[-10px]">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center hover:scale-110 transition-transform duration-300 cursor-pointer shadow-lg shadow-black/30">
                        <Gem className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="text-[8px] text-stone-400 mt-1 font-medium uppercase tracking-wider">
                        Sports
                      </span>
                    </div>
                  </div>
                  <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-rose-500/30 flex items-center justify-center hover:scale-110 transition-transform duration-300 cursor-pointer shadow-lg shadow-black/30">
                        <Headphones className="w-5 h-5 text-rose-400" />
                      </div>
                      <span className="text-[8px] text-stone-400 mt-1 font-medium uppercase tracking-wider">
                        Home
                      </span>
                    </div>
                  </div>
                  <div className="absolute bottom-[15%] left-[-10px]">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center hover:scale-110 transition-transform duration-300 cursor-pointer shadow-lg shadow-black/30">
                        <BookOpen className="w-5 h-5 text-cyan-400" />
                      </div>
                      <span className="text-[8px] text-stone-400 mt-1 font-medium uppercase tracking-wider">
                        Books
                      </span>
                    </div>
                  </div>
                  <div className="absolute top-[15%] left-[-10px]">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500/20 to-teal-600/10 border border-teal-500/30 flex items-center justify-center hover:scale-110 transition-transform duration-300 cursor-pointer shadow-lg shadow-black/30">
                        <Package className="w-5 h-5 text-teal-400" />
                      </div>
                      <span className="text-[8px] text-stone-400 mt-1 font-medium uppercase tracking-wider">
                        Living
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-10 text-center">
                  <h3 className="text-xl font-serif font-light text-stone-200">
                    Welcome Back
                  </h3>
                  <p className="text-stone-500 text-xs mt-1">
                    Sign in to access your premium collection
                  </p>
                </div>
              </div>

              <div className="w-full max-w-md mx-auto lg:mx-0">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/40">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-amber-400 to-amber-200 text-transparent bg-clip-text">
                      Sign In
                    </h2>
                    <p className="text-stone-400 text-sm mt-2">
                      Access your curated collection
                    </p>
                  </div>
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.15em] font-bold text-stone-400">
                        Email Address
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="w-5 h-5 text-stone-500 group-focus-within:text-amber-400 transition-colors" />
                        </div>
                        <input
                          type="text"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="example@gmail.com"
                          className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-stone-700/50 rounded-xl focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 outline-none text-stone-100 placeholder-stone-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs uppercase tracking-[0.15em] font-bold text-stone-400">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => navigate("/forgot")}
                          className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-semibold"
                        >
                          Forgot?
                        </button>
                      </div>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="w-5 h-5 text-stone-500 group-focus-within:text-amber-400 transition-colors" />
                        </div>
                        <input
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Enter password"
                          className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-stone-700/50 rounded-xl focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 outline-none text-stone-100 placeholder-stone-500 transition-all"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all hover:-translate-y-0.5 active:translate-y-0 text-sm uppercase tracking-wider"
                    >
                      Sign In
                    </button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-stone-700/30"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase tracking-[0.15em]">
                        <span className="px-4 bg-[#1a1a24] text-stone-500">
                          New to SkyMart?
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/register")}
                      className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-stone-700/50 text-stone-300 hover:text-white font-semibold rounded-xl transition-all text-sm uppercase tracking-wider"
                    >
                      Create Account
                    </button>
                  </form>
                  <div className="mt-8 flex justify-center gap-6 text-[10px] text-stone-500">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-400/50" />{" "}
                      Secure Login
                    </span>
                    <span className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400/50" /> Encrypted
                    </span>
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-amber-400/50" /> 24/7
                      Support
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full max-w-7xl mx-auto border-t border-stone-900/60 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-stone-500 font-mono uppercase tracking-[0.15em] z-10">
              <span>© 2026 SkyMart. Premium Access Portal.</span>
              <div className="flex gap-6">
                <span className="hover:text-stone-300 transition-colors cursor-pointer">
                  Privacy
                </span>
                <span className="hover:text-stone-300 transition-colors cursor-pointer">
                  Terms
                </span>
                <span className="hover:text-stone-300 transition-colors cursor-pointer">
                  Support
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ===== REGISTER PAGE ===== */}
        {page === Page.Register && (
          <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-br from-[#0a0a0f] via-[#14141a] to-[#1a1a24] text-stone-100 flex flex-col justify-between py-8 px-4 sm:px-8 selection:bg-purple-500/30 selection:text-purple-100">
            <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-purple-500/8 rounded-full filter blur-[150px] animate-pulse-slow pointer-events-none"></div>
            <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-amber-500/5 rounded-full filter blur-[130px] animate-pulse-slow-delayed pointer-events-none"></div>

            <div className="w-full max-w-7xl mx-auto flex items-center justify-between z-20">
              <button
                onClick={() => navigate("/login")}
                className="group text-sm font-semibold text-stone-400 hover:text-purple-400 transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Back to Sign In</span>
              </button>
              <div className="text-xl font-serif font-bold tracking-[3px] bg-gradient-to-r from-purple-400 to-amber-200 text-transparent bg-clip-text">
                SKYMART
              </div>
            </div>

            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center my-auto py-8 z-10">
              <div className="hidden lg:flex flex-col items-center justify-center">
                <div className="relative w-72 h-72">
                  <div className="absolute inset-0 rounded-full border border-purple-500/20 animate-spin-slow">
                    <div className="absolute top-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-purple-400 rounded-full shadow-lg shadow-purple-500/50"></div>
                  </div>
                  <div className="absolute inset-[30px] rounded-full border border-stone-700/30 border-dashed animate-spin-slow-reverse">
                    <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-amber-400 rounded-full shadow-lg shadow-amber-500/50"></div>
                  </div>
                  <div className="absolute inset-[60px] rounded-full bg-gradient-to-br from-[#1a1817] to-[#0f0e0d] border border-stone-800/80 flex items-center justify-center shadow-2xl shadow-purple-500/10">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/10 via-transparent to-amber-500/10 opacity-50"></div>
                    <User className="w-16 h-16 text-purple-400/80 drop-shadow-[0_4px_40px_rgba(168,85,247,0.3)]" />
                  </div>
                  <div className="absolute top-[-10px] left-1/2 -translate-x-1/2">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 flex items-center justify-center hover:scale-110 transition-transform duration-300 cursor-pointer shadow-lg shadow-black/30">
                        <Shirt className="w-5 h-5 text-purple-400" />
                      </div>
                      <span className="text-[8px] text-stone-400 mt-1 font-medium uppercase tracking-wider">
                        Fashion
                      </span>
                    </div>
                  </div>
                  <div className="absolute top-[15%] right-[-10px]">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 flex items-center justify-center hover:scale-110 transition-transform duration-300 cursor-pointer shadow-lg shadow-black/30">
                        <Smartphone className="w-5 h-5 text-blue-400" />
                      </div>
                      <span className="text-[8px] text-stone-400 mt-1 font-medium uppercase tracking-wider">
                        Tech
                      </span>
                    </div>
                  </div>
                  <div className="absolute bottom-[15%] right-[-10px]">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center hover:scale-110 transition-transform duration-300 cursor-pointer shadow-lg shadow-black/30">
                        <Gem className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="text-[8px] text-stone-400 mt-1 font-medium uppercase tracking-wider">
                        Sports
                      </span>
                    </div>
                  </div>
                  <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-rose-500/30 flex items-center justify-center hover:scale-110 transition-transform duration-300 cursor-pointer shadow-lg shadow-black/30">
                        <Headphones className="w-5 h-5 text-rose-400" />
                      </div>
                      <span className="text-[8px] text-stone-400 mt-1 font-medium uppercase tracking-wider">
                        Home
                      </span>
                    </div>
                  </div>
                  <div className="absolute bottom-[15%] left-[-10px]">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 flex items-center justify-center hover:scale-110 transition-transform duration-300 cursor-pointer shadow-lg shadow-black/30">
                        <BookOpen className="w-5 h-5 text-cyan-400" />
                      </div>
                      <span className="text-[8px] text-stone-400 mt-1 font-medium uppercase tracking-wider">
                        Books
                      </span>
                    </div>
                  </div>
                  <div className="absolute top-[15%] left-[-10px]">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500/20 to-teal-600/10 border border-teal-500/30 flex items-center justify-center hover:scale-110 transition-transform duration-300 cursor-pointer shadow-lg shadow-black/30">
                        <Package className="w-5 h-5 text-teal-400" />
                      </div>
                      <span className="text-[8px] text-stone-400 mt-1 font-medium uppercase tracking-wider">
                        Living
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-10 text-center">
                  <h3 className="text-xl font-serif font-light text-stone-200">
                    Join the Elite
                  </h3>
                  <p className="text-stone-500 text-xs mt-1">
                    Create your account and start your journey
                  </p>
                </div>
              </div>

              <div className="w-full max-w-md mx-auto lg:mx-0">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/40">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 to-amber-200 text-transparent bg-clip-text">
                      Create Account
                    </h2>
                    <p className="text-stone-400 text-sm mt-2">
                      Join the SkyMart elite community
                    </p>
                  </div>
                  <form onSubmit={handleRegister} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-[0.15em] font-bold text-stone-400">
                          First Name
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="w-4 h-4 text-stone-500 group-focus-within:text-purple-400 transition-colors" />
                          </div>
                          <input
                            type="text"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            placeholder="John"
                            className="w-full pl-9 pr-3 py-3 bg-white/5 border border-stone-700/50 rounded-xl focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 outline-none text-stone-100 placeholder-stone-500 transition-all text-sm"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs uppercase tracking-[0.15em] font-bold text-stone-400">
                          Last Name
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="w-4 h-4 text-stone-500 group-focus-within:text-purple-400 transition-colors" />
                          </div>
                          <input
                            type="text"
                            value={regLastName}
                            onChange={(e) => setRegLastName(e.target.value)}
                            placeholder="Doe"
                            className="w-full pl-9 pr-3 py-3 bg-white/5 border border-stone-700/50 rounded-xl focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 outline-none text-stone-100 placeholder-stone-500 transition-all text-sm"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.15em] font-bold text-stone-400">
                        Email Address
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="w-5 h-5 text-stone-500 group-focus-within:text-purple-400 transition-colors" />
                        </div>
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="john@example.com"
                          className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-stone-700/50 rounded-xl focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 outline-none text-stone-100 placeholder-stone-500 transition-all"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.15em] font-bold text-stone-400">
                        Password
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="w-5 h-5 text-stone-500 group-focus-within:text-purple-400 transition-colors" />
                        </div>
                        <input
                          type="password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-stone-700/50 rounded-xl focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 outline-none text-stone-100 placeholder-stone-500 transition-all"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-[0.15em] font-bold text-stone-400">
                        Confirm Password
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="w-5 h-5 text-stone-500 group-focus-within:text-purple-400 transition-colors" />
                        </div>
                        <input
                          type="password"
                          value={regConfirm}
                          onChange={(e) => setRegConfirm(e.target.value)}
                          placeholder="Confirm password"
                          className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-stone-700/50 rounded-xl focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 outline-none text-stone-100 placeholder-stone-500 transition-all"
                          required
                        />
                      </div>
                    </div>

                    {/* ✅ Added helpful text about redirect */}
                    <div className="mt-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                      <p className="text-xs text-purple-400 text-center">
                        ✅ After creating your account, you'll be redirected to
                        the login page.
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all hover:-translate-y-0.5 active:translate-y-0 text-sm uppercase tracking-wider"
                    >
                      Create Account
                    </button>
                  </form>
                  <div className="mt-8 flex justify-center gap-6 text-[10px] text-stone-500">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-purple-400/50" />{" "}
                      Secure Registration
                    </span>
                    <span className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-purple-400/50" /> Encrypted
                      Data
                    </span>
                    <span className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-purple-400/50" />{" "}
                      Free Membership
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full max-w-7xl mx-auto border-t border-stone-900/60 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-stone-500 font-mono uppercase tracking-[0.15em] z-10">
              <span>© 2026 SkyMart. Join the Elite Community.</span>
              <div className="flex gap-6">
                <span className="hover:text-stone-300 transition-colors cursor-pointer">
                  Privacy
                </span>
                <span className="hover:text-stone-300 transition-colors cursor-pointer">
                  Terms
                </span>
                <span className="hover:text-stone-300 transition-colors cursor-pointer">
                  Support
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ===== FORGOT PASSWORD ===== */}
        {page === Page.Forgot && (
          <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-stone-950 text-white flex flex-col justify-between py-10 px-6">
            <div className="w-full max-w-7xl mx-auto flex items-center justify-between mb-8 z-10">
              <button
                onClick={() => navigate("/login")}
                className="group text-sm font-semibold text-stone-400 hover:text-white flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Back</span>
              </button>
              <div
                onClick={() => navigate("/")}
                className="text-xl font-serif font-bold tracking-[2px] text-white/80 uppercase cursor-pointer hover:text-white transition-colors"
              >
                SKYMART
              </div>
            </div>
            <div className="w-full max-w-md mx-auto my-auto z-10">
              <form
                onSubmit={handleForgotPassword}
                className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/40 text-center text-white"
              >
                <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                  Forgot Password?
                </h2>
                <p className="text-sm text-[#cbd5e1] mb-8">
                  Enter your email to receive a reset link.
                </p>
                <div className="text-left mb-6">
                  <label className="block text-xs uppercase tracking-wider font-bold text-stone-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-stone-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="example@gmail.com"
                      className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/20 rounded-xl focus:border-indigo-400 focus:outline-none text-white font-medium text-sm placeholder-stone-400"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:brightness-110 text-white font-bold py-4 rounded-xl border border-white/10 hover:-translate-y-0.5 shadow-lg text-sm uppercase tracking-wider"
                >
                  Send Reset Link
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ===== RESET PASSWORD ===== */}
        {page === Page.ResetPassword && (
          <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-stone-950 text-white flex flex-col justify-between py-10 px-6">
            <div className="w-full max-w-7xl mx-auto flex items-center justify-between mb-8 z-10">
              <button
                onClick={() => navigate("/forgot")}
                className="group text-sm font-semibold text-stone-400 hover:text-white flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Back</span>
              </button>
              <div
                onClick={() => navigate("/")}
                className="text-xl font-serif font-bold tracking-[2px] uppercase cursor-pointer hover:text-white transition-colors"
              >
                SKYMART
              </div>
            </div>
            <div className="w-full max-w-md mx-auto my-auto z-10">
              <form
                onSubmit={handleResetPassword}
                className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/40 text-left text-white"
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6">
                  Reset Password
                </h2>
                <div className="space-y-5 mb-8">
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-bold text-stone-300 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-stone-400">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password"
                        className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/20 rounded-xl focus:border-indigo-400 focus:outline-none text-white font-medium text-sm placeholder-stone-400"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-bold text-stone-300 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-stone-400">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/20 rounded-xl focus:border-indigo-400 focus:outline-none text-white font-medium text-sm placeholder-stone-400"
                        required
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-white font-bold py-4 rounded-xl border border-white/10 hover:-translate-y-0.5 shadow-lg text-sm uppercase tracking-wider"
                >
                  Update Password
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ===== MAIN STORE (Catalog, Wishlist, Dashboard) ===== */}
        {(page === Page.ProductCatalog ||
          page === Page.Wishlist ||
          page === Page.Dashboard) && (
          <div className="flex-1 flex flex-col bg-[#faf9f5]">
            {/* Navigation Bar */}
            <nav className="bg-[#faf9f5]/85 backdrop-blur-xl sticky top-0 z-40 border-b border-[#e7e5e4] px-4 sm:px-12 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div
                onClick={() => {
                  navigate("/catalog");
                  setSelectedCategory(null);
                  setSelectedSubcategory(null);
                  setSelectedBrand(null);
                  setSearchQuery("");
                  setPriceCap(Infinity);
                  setIsDetailView(false);
                  setIsShippingView(false);
                  setIsMobileMenuOpen(false);
                }}
                className="text-2xl font-serif font-black tracking-[3px] text-[#1c1917] hover:opacity-85 cursor-pointer uppercase select-none"
              >
                SkyMart
              </div>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden text-[#1c1917] p-2"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>

              <div className="hidden md:flex flex-wrap gap-4 sm:gap-6 text-xs font-semibold tracking-wider text-stone-500 uppercase">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.slug)}
                    className={`hover:text-[#1c1917] transition-colors ${
                      selectedCategory === cat.slug
                        ? "text-[#1c1917] border-b-2 border-[#1c1917] pb-1"
                        : ""
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}

                <button
                  onClick={() => {
                    navigate("/designer-hub");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`hover:text-[#1c1917] transition-colors flex items-center gap-1.5 ${
                    page === Page.DesignerHub
                      ? "text-[#1c1917] border-b-2 border-[#1c1917] pb-1"
                      : ""
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  Designer Hub
                </button>
              </div>

              <form
                onSubmit={handleGlobalSearch}
                className="relative w-full max-w-xs"
              >
                <input
                  type="text"
                  placeholder="Search catalog..."
                  value={searchInputVal}
                  onChange={(e) => setSearchInputVal(e.target.value)}
                  className="w-full bg-stone-100 border border-stone-250 text-[#1c1917] rounded-none py-2 pl-4 pr-10 outline-none focus:border-[#1c1917] text-xs"
                />
                <button
                  type="submit"
                  className="absolute right-0 top-0 bottom-0 px-3 text-[#1c1917] hover:scale-110 transition-transform"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="flex items-center gap-3 sm:gap-5">
                {/* SkyCoins Button */}
                <div
                  onClick={() => {
                    navigate("/skycoins");
                    setIsDetailView(false);
                    setIsShippingView(false);
                  }}
                  className="flex items-center gap-1.5 py-1.5 px-3 text-sm font-semibold text-[#1c1917] hover:bg-stone-200/50 cursor-pointer transition-colors relative group"
                >
                  <Coins className="w-[18px] h-[18px] text-amber-500" />
                  <span className="font-mono text-xs font-bold text-amber-600">
                    {getSkyCoinsBalance()}
                  </span>
                  {isEligibleForCoupon() && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse"></span>
                  )}
                </div>

                {isLoggedIn && (
                  <div
                    onClick={() => {
                      navigate("/dashboard");
                      setIsDetailView(false);
                      setIsShippingView(false);
                    }}
                    className={`flex items-center gap-1.5 py-1.5 px-3 text-sm font-semibold cursor-pointer transition-colors ${
                      page === Page.Dashboard
                        ? "bg-stone-200 text-[#1c1917]"
                        : "text-[#1c1917] hover:bg-stone-200/50"
                    }`}
                  >
                    <User className="w-[18px] h-[18px] text-[#1c1917]" />
                    <span className="hidden lg:inline text-xs uppercase tracking-wider font-bold">
                      Dashboard
                    </span>
                  </div>
                )}
                <div
                  onClick={() => {
                    navigate("/wishlist");
                    setIsDetailView(false);
                    setIsShippingView(false);
                  }}
                  className="flex items-center gap-1.5 py-1.5 px-3 text-sm font-semibold text-[#1c1917] hover:bg-stone-200/50 cursor-pointer transition-colors"
                >
                  <Heart
                    className={`w-[18px] h-[18px] ${wishlist.length > 0 ? "fill-rose-500 text-rose-500" : "text-[#1c1917]"}`}
                  />
                  <span className="font-mono text-xs text-[#1c1917]">
                    {wishlist.length}
                  </span>
                </div>
                <div
                  onClick={() => navigate("/cart")}
                  className="flex items-center gap-1.5 py-1.5 px-3 text-sm font-semibold text-[#1c1917] hover:bg-stone-200/50 cursor-pointer transition-colors"
                >
                  <ShoppingBag className="w-[18px] h-[18px] text-[#1c1917]" />
                  <span className="font-mono text-xs text-[#1c1917] bg-white border border-[#1c1917] px-1.5 rounded-full">
                    {cart.length}
                  </span>
                </div>
                {isLoggedIn ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-amber-600" />
                      </div>
                      <span className="text-base font-bold text-amber-700 select-none max-w-[100px] sm:max-w-[150px] truncate hover:text-amber-800 transition-colors">
                        {userEmail.split("@")[0]}
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="bg-[#1c1917] hover:opacity-90 text-white text-xs font-semibold uppercase tracking-widest px-4 py-2.5 transition-all"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate("/login")}
                    className="bg-[#1c1917] hover:opacity-90 text-white text-xs font-semibold uppercase tracking-widest px-4 py-2.5 transition-all"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </nav>

            {/* Mobile Category Menu */}
            {isMobileMenuOpen && (
              <div className="md:hidden bg-white border-b border-[#e7e5e4] p-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  {categories.map((cat) => {
                    const isExpanded = expandedCategories.has(cat.id);
                    const hasChildren = cat.children && cat.children.length > 0;
                    return (
                      <div key={cat.id}>
                        <div className="flex items-center">
                          <button
                            onClick={() => handleCategoryClick(cat.slug)}
                            className={`flex items-center gap-2 flex-1 text-left px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors ${
                              selectedCategory === cat.slug
                                ? "bg-stone-100 font-semibold"
                                : ""
                            }`}
                          >
                            <span className="text-sm">{cat.name}</span>
                          </button>
                          {hasChildren && (
                            <button
                              onClick={(e) => toggleCategory(cat.id, e)}
                              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                            >
                              <ChevronDown
                                className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                          )}
                        </div>
                        {hasChildren && isExpanded && (
                          <div className="ml-4 mt-1 space-y-1">
                            {cat.children!.map((child) => (
                              <button
                                key={child.id}
                                onClick={() =>
                                  handleSubcategoryClick(child.slug)
                                }
                                className={`block w-full text-left px-3 py-1.5 text-sm rounded-lg hover:bg-stone-50 transition-colors ${
                                  selectedSubcategory === child.slug
                                    ? "bg-stone-50 font-medium text-amber-600"
                                    : "text-stone-600"
                                }`}
                              >
                                {child.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button
                    onClick={() => {
                      navigate("/designer-hub");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-stone-100 transition-colors ${
                      page === Page.DesignerHub
                        ? "bg-stone-100 font-semibold"
                        : ""
                    }`}
                  >
                    <Palette className="w-4 h-4" />
                    <span className="text-sm">Designer Hub</span>
                  </button>
                </div>
              </div>
            )}

            {/* TICKER */}
            <div className="bg-[#1c1917] text-[#faf9f5] border-b border-white/10 overflow-hidden py-3 whitespace-nowrap">
              <div className="inline-block animate-ticker uppercase tracking-[2px] text-[10px] font-semibold">
                <span className="px-10">
                  ✦ Seasonal Event: Up to 30% Discount
                </span>
                <span className="px-10">
                  ✦ Free Delivery on Orders Over ₹5,000
                </span>
                <span className="px-10">✦ Premium Membership Perks</span>
                <span className="px-10">✦ New Arrivals Added Weekly</span>
                <span className="px-10">
                  ✦ Shop by Brand: Nike, Adidas, Apple & More
                </span>
              </div>
            </div>

            {/* ===== DETAIL VIEW ===== */}
            {isDetailView && currentDetailProduct ? (
              <main className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-10 flex-1">
                <button
                  onClick={() => {
                    navigate(-1);
                    setIsDetailView(false);
                    setIsShippingView(false);
                  }}
                  className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold border border-stone-300 hover:border-[#1c1917] px-4 py-2 bg-white text-[#1c1917] transition-all mb-8"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Catalog</span>
                </button>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-white border border-[#e7e5e4] p-6 sm:p-12 shadow-sm">
                  <div className="bg-stone-50 border border-stone-100 p-8 flex items-center justify-center relative aspect-square group overflow-hidden">
                    <img
                      src={currentDetailProduct.img}
                      alt={currentDetailProduct.name}
                      className="max-h-[460px] object-contain group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      onClick={(e) =>
                        toggleWishlist(currentDetailProduct.id, e)
                      }
                      className="absolute top-6 right-6 w-11 h-11 bg-white border border-stone-200 hover:border-[#1c1917] rounded-none shadow-sm flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      <Heart
                        className={`w-5 h-5 ${wishlist.includes(currentDetailProduct.id) ? "fill-rose-500 text-rose-500" : "text-[#1c1917]"}`}
                      />
                    </button>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-stone-400 text-xs tracking-[2px] font-bold uppercase mb-3">
                      {currentDetailProduct.brand}
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-serif font-medium text-[#1c1917] uppercase mb-4 leading-tight">
                      {currentDetailProduct.name}
                    </h1>
                    <div className="text-2xl font-bold text-[#1c1917] mb-6">
                      ₹{currentDetailProduct.price}
                    </div>
                    <p className="text-stone-600 text-sm leading-relaxed mb-8">
                      {currentDetailProduct.description}
                    </p>
                    <div className="border-t border-[#e7e5e4] pt-6 mb-8 grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="w-5 h-5 text-stone-500" />
                        <span className="text-xs font-semibold text-stone-700">
                          Studio Guarantee
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Package className="w-5 h-5 text-stone-500" />
                        <span className="text-xs font-semibold text-stone-700">
                          Secured Shipping
                        </span>
                      </div>
                    </div>

                    {/* SkyCoins Coupon Section */}
                    {isEligibleForCoupon() && (
                      <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border-2 border-amber-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Coins className="w-6 h-6 text-amber-500 animate-bounce" />
                            <div>
                              <p className="font-bold text-amber-700">
                                🎉 50% OFF Coupon Available!
                              </p>
                              <p className="text-xs text-stone-600 font-mono">
                                {skyCoinsData.couponCode}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setApplyCoupon(!applyCoupon);
                              if (!applyCoupon) {
                                const discount =
                                  currentDetailProduct.price * 0.5;
                                setCouponDiscount(discount);
                                triggerToast(
                                  `🎉 50% OFF applied! You save ₹${discount}`,
                                  "success",
                                );
                              } else {
                                setCouponDiscount(0);
                                triggerToast("Coupon removed.", "info");
                              }
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                              applyCoupon
                                ? "bg-emerald-500 text-white"
                                : "bg-amber-500 text-white hover:bg-amber-600"
                            }`}
                          >
                            {applyCoupon ? "✅ Applied" : "Apply Now"}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 mt-2">
                      <button
                        onClick={() => addToCart(currentDetailProduct.id)}
                        className="flex-1 border border-[#e7e5e4] hover:bg-stone-50 text-[#1c1917] py-4 text-xs tracking-wider uppercase font-bold transition-all bg-white"
                      >
                        Add to Cart
                      </button>
                      <button
                        onClick={() => {
                          if (!isLoggedIn) {
                            triggerToast(
                              "Please sign in to checkout.",
                              "error",
                            );
                            navigate("/login");
                            return;
                          }
                          if (!shippingDetails.address.trim()) {
                            const userPrefix = userEmail.split("@")[0];
                            const formattedName =
                              userPrefix.charAt(0).toUpperCase() +
                              userPrefix.slice(1);
                            setShippingDetails({
                              name: formattedName || "Customer",
                              email: shippingDetails.email || userEmail,
                              phone: "+91 98765 43210",
                              address:
                                "Villa 42, Luxe-Crest Boulevard, HSR Layout, Sector 3, Bengaluru",
                              zip: "560102",
                              lat: 12.9279,
                              lng: 77.6271,
                            });
                            triggerToast("Address auto-loaded!", "info");
                          }
                          setIsDetailView(false);
                          setIsShippingView(true);
                        }}
                        className="flex-1 bg-[#1c1917] hover:opacity-90 text-white py-4 text-xs tracking-wider uppercase font-bold transition-all shadow-sm"
                      >
                        Buy Instantly
                      </button>
                      <button
                        onClick={() => {
                          if (!isLoggedIn) {
                            triggerToast(
                              "Please sign in to use Shop Together.",
                              "error",
                            );
                            navigate("/login");
                            return;
                          }
                          setShowShopTogetherPage(true);
                          setShowShopTogether(false);
                          if (currentDetailProduct && currentRoom) {
                            viewProduct(
                              currentDetailProduct.id,
                              currentDetailProduct,
                            );
                          }
                        }}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white py-4 text-xs tracking-wider uppercase font-bold transition-all shadow-sm flex items-center justify-center gap-2 rounded-lg"
                      >
                        <Users className="w-4 h-4" />
                        Shop Together
                      </button>
                    </div>
                  </div>
                </div>

                {/* ✅ UPDATED: Shop Together with userData */}
                {showShopTogetherPage && currentDetailProduct && (
                  <ShopTogetherRouter
                    currentProduct={currentDetailProduct}
                    userId={
                      userData?.id || userEmail.split("@")[0] + Date.now()
                    }
                    username={
                      userData?.name ||
                      userData?.username ||
                      userEmail.split("@")[0]
                    }
                    onProductSelect={(product) => {
                      setSelectedProductId(product.id);
                      setIsDetailView(true);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onClose={() => {
                      setShowShopTogetherPage(false);
                    }}
                  />
                )}

                {/* ✅ UPDATED: Inline Shop Together with userData */}
                {!showShopTogetherPage &&
                  showShopTogether &&
                  currentDetailProduct && (
                    <div className="mt-12">
                      <ShopTogether
                        currentProduct={currentDetailProduct}
                        userId={
                          userData?.id || userEmail.split("@")[0] + Date.now()
                        }
                        username={
                          userData?.name ||
                          userData?.username ||
                          userEmail.split("@")[0]
                        }
                        onProductSelect={(product) => {
                          setSelectedProductId(product.id);
                          setIsDetailView(true);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      />
                    </div>
                  )}

                <div className="mt-16">
                  <h3 className="font-serif text-lg tracking-widest uppercase mb-8 border-b border-[#e7e5e4] pb-4">
                    Related Products
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {allProducts
                      .filter(
                        (p) =>
                          p.category === currentDetailProduct.category &&
                          p.id !== currentDetailProduct.id,
                      )
                      .slice(0, 4)
                      .map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            navigate(`/product/${item.id}`);
                            setSelectedProductId(item.id);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="bg-white border border-[#e7e5e4] flex flex-col group cursor-pointer hover:border-[#1c1917] hover:shadow-lg transition-all"
                        >
                          <div className="aspect-square bg-stone-50 p-4 relative overflow-hidden flex items-center justify-center border-b border-[#e7e5e4]">
                            <img
                              src={item.img}
                              alt={item.name}
                              className="max-h-[180px] object-contain group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              onClick={(e) => toggleWishlist(item.id, e)}
                              className="absolute top-3 right-3 w-8 h-8 bg-white border border-stone-200 flex items-center justify-center hover:scale-110 transition-transform"
                            >
                              <Heart
                                className={`w-3.5 h-3.5 ${wishlist.includes(item.id) ? "fill-rose-500 text-rose-500" : "text-[#1c1917]"}`}
                              />
                            </button>
                          </div>
                          <div className="p-4 flex-1 flex flex-col justify-between">
                            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-1 block">
                              {item.brand}
                            </span>
                            <h4 className="text-xs font-semibold text-stone-900 group-hover:text-stone-700 truncate">
                              {item.name}
                            </h4>
                            <div className="text-sm font-bold text-stone-900 mt-2">
                              ₹{item.price}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </main>
            ) : isShippingView && isLoggedIn ? (
              <main className="w-full max-w-7xl mx-auto px-6 py-12 flex-1">
                <div className="bg-white border border-[#e7e5e4] shadow-sm overflow-hidden">
                  <div className="p-6 sm:p-8 border-b border-[#e7e5e4] bg-stone-50/50">
                    <h2 className="font-serif text-2xl tracking-widest text-[#1c1917] uppercase">
                      Shipping Details
                    </h2>
                    <p className="text-xs text-stone-500 mt-1">
                      Enter your delivery information and select location on map
                    </p>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 sm:p-8">
                    <div className="space-y-5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-[#1c1917] mb-2.5">
                          Full Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. John Doe"
                          value={shippingDetails.name}
                          onChange={(e) =>
                            setShippingDetails({
                              ...shippingDetails,
                              name: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-stone-300 outline-none focus:border-[#1c1917] text-sm text-stone-900 bg-stone-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-[#1c1917] mb-2.5">
                          Email
                        </label>
                        <input
                          type="email"
                          placeholder="john@example.com"
                          value={shippingDetails.email || ""}
                          onChange={(e) =>
                            setShippingDetails({
                              ...shippingDetails,
                              email: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-stone-300 outline-none focus:border-[#1c1917] text-sm text-stone-900 bg-stone-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-[#1c1917] mb-2.5">
                          Phone
                        </label>
                        <input
                          type="tel"
                          placeholder="+91 9876543210"
                          value={shippingDetails.phone}
                          onChange={(e) =>
                            setShippingDetails({
                              ...shippingDetails,
                              phone: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-stone-300 outline-none focus:border-[#1c1917] text-sm text-stone-900 bg-stone-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-[#1c1917] mb-2.5">
                          Address
                        </label>
                        <textarea
                          placeholder="Enter full delivery address"
                          value={shippingDetails.address}
                          onChange={(e) =>
                            setShippingDetails({
                              ...shippingDetails,
                              address: e.target.value,
                            })
                          }
                          onBlur={async () => {
                            const geo = await forwardGeocode(
                              shippingDetails.address + ", India",
                            );
                            if (!geo) return;
                            setShippingDetails((prev) => ({
                              ...prev,
                              address: geo.displayName,
                              lat: geo.lat,
                              lng: geo.lng,
                              zip: geo.postcode || prev.zip,
                            }));
                          }}
                          className="w-full px-4 py-3 border border-stone-300 outline-none focus:border-[#1c1917] text-sm text-stone-900 bg-stone-50 min-h-[100px] resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-[#1c1917] mb-2.5">
                          PIN Code
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 560001"
                          value={shippingDetails.zip}
                          onChange={(e) =>
                            setShippingDetails({
                              ...shippingDetails,
                              zip: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 border border-stone-300 outline-none focus:border-[#1c1917] text-sm text-stone-900 bg-stone-50"
                        />
                      </div>
                      <button
                        onClick={useMyLocation}
                        className="mt-2 rounded-full border border-stone-300 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-stone-700 bg-white hover:bg-stone-100 transition-colors w-full sm:w-auto"
                      >
                        📍 Use My Location
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-semibold">
                              Delivery location (click on map)
                            </p>
                            <p className="text-xs text-stone-600 mt-1">
                              {shippingDetails.lat && shippingDetails.lng
                                ? `Selected: ${shippingDetails.lat.toFixed(4)}, ${shippingDetails.lng.toFixed(4)}`
                                : "Select your point by clicking the map."}
                            </p>
                            <p className="text-[10px] text-stone-400 mt-1">
                              🖱️ Drag the map to explore nearby areas
                            </p>
                          </div>
                          <div className="text-[10px] uppercase tracking-widest font-mono text-stone-400">
                            Active
                          </div>
                        </div>
                        <div
                          className="w-full rounded-2xl overflow-hidden border border-stone-100 relative"
                          style={{ height: "400px", minHeight: "350px" }}
                        >
                          <DeliveryLocationPicker
                            selected={
                              shippingDetails.lat != null &&
                              shippingDetails.lng != null
                                ? {
                                    lat: shippingDetails.lat,
                                    lng: shippingDetails.lng,
                                  }
                                : null
                            }
                            reverseGeocode={reverseGeocode}
                            onSelect={async ({ lat, lng }) => {
                              const geo = await reverseGeocode(lat, lng);
                              setShippingDetails((prev) => ({
                                ...prev,
                                lat,
                                lng,
                                address: geo?.displayName || prev.address,
                                zip: geo?.postcode || prev.zip,
                              }));
                              triggerToast(
                                "Location selected on map.",
                                "success",
                              );
                            }}
                            disabled={false}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 sm:p-8 border-t border-[#e7e5e4] bg-stone-50/50">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={() => {
                          setIsShippingView(false);
                          setIsDetailView(true);
                        }}
                        className="flex-1 py-4 text-xs font-bold tracking-widest text-stone-600 bg-stone-100 hover:bg-stone-200 uppercase transition-colors"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={initiateQRPayment}
                        className="flex-[2] py-4 text-xs font-bold tracking-widest text-white bg-[#1c1917] hover:opacity-90 uppercase shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Proceed to Payment</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </main>
            ) : (
              <div className="flex-1 flex flex-col">
                {/* Hero Section */}
                {!selectedCategory &&
                  !selectedSubcategory &&
                  !selectedBrand &&
                  !searchQuery &&
                  page === Page.ProductCatalog && (
                    <div>
                      <div className="text-center px-6 py-16 sm:py-20 bg-stone-50/50">
                        <h1 className="text-4xl sm:text-6xl font-serif font-light text-[#1c1917] uppercase mb-6 tracking-wide">
                          The Art of Selection
                        </h1>
                        <p className="text-stone-500 text-sm sm:text-base leading-relaxed max-w-xl mx-auto mb-8">
                          A meticulous assembly of modern architecture, timeless
                          wardrobe staples, and premium operational goods
                          curated exclusively for discerning designers.
                        </p>
                        <button
                          onClick={() => handleBannerAction("Electronics")}
                          className="border border-[#1c1917] hover:bg-[#1c1917] hover:text-[#faf9f5] text-xs font-bold uppercase tracking-[2px] py-3.5 px-8 transition-all"
                        >
                          Explore Collection
                        </button>
                      </div>
                      <div className="relative w-full h-[400px] overflow-hidden border-y border-[#e7e5e4] bg-stone-900">
                        {slides.map((slide, idx) => (
                          <div
                            key={slide.title}
                            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                              idx === activeSlideIndex
                                ? "opacity-100"
                                : "opacity-0 pointer-events-none"
                            }`}
                          >
                            <img
                              src={slide.img}
                              alt={slide.title}
                              className="w-full h-full object-cover brightness-[0.45] grayscale-[20%]"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#faf9f5] via-[#faf9f5]/85 to-transparent flex flex-col justify-center items-start p-6 sm:p-20 text-[#1c1917]">
                              <span className="text-[10px] tracking-[4px] uppercase font-bold text-stone-500 mb-2">
                                Featured
                              </span>
                              <h2 className="font-serif text-3xl sm:text-4xl font-medium uppercase mb-4 tracking-wider max-w-md">
                                {slide.title}
                              </h2>
                              <p className="text-stone-600 text-xs sm:text-sm leading-relaxed max-w-sm sm:max-w-md mb-8">
                                {slide.desc}
                              </p>
                              <button
                                onClick={() =>
                                  handleBannerAction(slide.category)
                                }
                                className="bg-[#1c1917] text-[#faf9f5] px-6 py-3 text-[10px] sm:text-xs font-bold tracking-widest uppercase transition-all hover:scale-105"
                              >
                                Explore
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className="absolute bottom-6 left-6 sm:left-20 flex gap-2 z-10">
                          {slides.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setActiveSlideIndex(idx)}
                              className={`w-3.5 h-1.5 transition-all rounded-full ${
                                idx === activeSlideIndex
                                  ? "bg-[#1c1917] w-6"
                                  : "bg-stone-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                {/* Main Content - Sidebar and Product Grid */}
                <main className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-10 flex-grow flex flex-col md:flex-row gap-10">
                  {(selectedCategory ||
                    selectedSubcategory ||
                    selectedBrand ||
                    page === Page.Wishlist) && (
                    <div className="w-full md:w-64 flex-shrink-0">
                      <div className="bg-white border border-[#e7e5e4] p-6 sticky top-28 max-h-[calc(100vh-120px)] overflow-y-auto">
                        <div className="mb-6 border-b border-stone-100 pb-4">
                          <h4 className="text-[10px] tracking-wider uppercase font-extrabold text-stone-400 mb-2">
                            {page === Page.Wishlist ? "Saved Items" : "Browse"}
                          </h4>
                          <div className="text-sm font-semibold text-stone-900">
                            {selectedBrand
                              ? brands.find((b) => b.slug === selectedBrand)
                                  ?.name || selectedBrand
                              : selectedSubcategory
                                ? findCategoryBySlug(selectedSubcategory)
                                    ?.name || selectedSubcategory
                                : selectedCategory
                                  ? findCategoryBySlug(selectedCategory)
                                      ?.name || selectedCategory
                                  : "All Products"}
                          </div>
                        </div>

                        {page === Page.ProductCatalog &&
                          !isLoadingCategories && (
                            <div className="mb-4">
                              <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">
                                Categories
                              </h4>
                              {renderCategoryTree(categories)}
                            </div>
                          )}

                        {page === Page.ProductCatalog &&
                          isLoadingCategories && (
                            <div className="mb-4">
                              <div className="flex items-center gap-2 text-stone-400 text-sm">
                                <div className="w-4 h-4 border-2 border-stone-300 border-t-[#1c1917] rounded-full animate-spin"></div>
                                Loading categories...
                              </div>
                            </div>
                          )}

                        {page === Page.ProductCatalog &&
                          !isLoadingCategories &&
                          renderBrands()}

                        {page === Page.ProductCatalog && (
                          <div className="mb-6">
                            <h4 className="text-[10px] tracking-wider uppercase font-extrabold text-stone-400 mb-3">
                              Price Range
                            </h4>
                            <div className="space-y-2.5">
                              <label className="flex items-center gap-2.5 text-xs text-stone-700 font-medium cursor-pointer">
                                <input
                                  type="radio"
                                  name="price-filter"
                                  checked={priceCap === Infinity}
                                  onChange={() => setPriceCap(Infinity)}
                                  className="accent-[#1c1917]"
                                />
                                <span>All</span>
                              </label>
                              <label className="flex items-center gap-2.5 text-xs text-stone-700 font-medium cursor-pointer">
                                <input
                                  type="radio"
                                  name="price-filter"
                                  checked={priceCap === 999}
                                  onChange={() => setPriceCap(999)}
                                  className="accent-[#1c1917]"
                                />
                                <span>Under ₹999</span>
                              </label>
                              <label className="flex items-center gap-2.5 text-xs text-stone-700 font-medium cursor-pointer">
                                <input
                                  type="radio"
                                  name="price-filter"
                                  checked={priceCap === 1999}
                                  onChange={() => setPriceCap(1999)}
                                  className="accent-[#1c1917]"
                                />
                                <span>Under ₹1,999</span>
                              </label>
                              <label className="flex items-center gap-2.5 text-xs text-stone-700 font-medium cursor-pointer">
                                <input
                                  type="radio"
                                  name="price-filter"
                                  checked={priceCap === 4999}
                                  onChange={() => setPriceCap(4999)}
                                  className="accent-[#1c1917]"
                                />
                                <span>Under ₹4,999</span>
                              </label>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={resetAllFilters}
                          className="w-full mt-6 bg-[#1c1917] text-white py-3 text-xs uppercase font-extrabold tracking-wider hover:opacity-85"
                        >
                          Reset All Filters
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Product Grid */}
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-8 border-b border-[#e7e5e4] pb-4">
                      <div>
                        <span className="text-[10px] tracking-[2px] uppercase font-bold text-stone-400 mb-1 block">
                          {page === Page.Dashboard
                            ? "Dashboard"
                            : page === Page.Wishlist
                              ? "Wishlist"
                              : "Catalog"}
                        </span>
                        <h2 className="font-serif text-xl sm:text-2xl font-normal text-[#1c1917] uppercase tracking-widest">
                          {page === Page.Dashboard
                            ? "Collector's Dashboard"
                            : page === Page.Wishlist
                              ? "Saved Items"
                              : searchQuery
                                ? `Results: "${searchQuery}"`
                                : selectedBrand
                                  ? brands.find((b) => b.slug === selectedBrand)
                                      ?.name || selectedBrand
                                  : selectedSubcategory
                                    ? findCategoryBySlug(selectedSubcategory)
                                        ?.name || selectedSubcategory
                                    : selectedCategory
                                      ? findCategoryBySlug(selectedCategory)
                                          ?.name || selectedCategory
                                      : "All Products"}
                        </h2>
                      </div>
                      <div className="text-xs text-stone-400">
                        {getFilteredProducts().length} items
                      </div>
                    </div>

                    {page === Page.Dashboard ? (
                      <div className="space-y-12">
                        {/* Dashboard Content */}
                        <div className="bg-[#1c1917] text-stone-100 p-8 sm:p-10 relative overflow-hidden">
                          <div className="absolute right-0 bottom-0 opacity-15 text-[120px] font-black tracking-tighter text-[#faf9f5] pointer-events-none select-none font-mono">
                            HAUTE
                          </div>
                          <span className="text-[10px] tracking-[3px] uppercase font-mono font-bold text-stone-400 block mb-2">
                            Dashboard
                          </span>
                          <h3 className="text-2xl sm:text-3xl font-serif font-light mb-4 text-white">
                            Welcome,{" "}
                            <span className="font-bold font-sans">
                              {userEmail.split("@")[0]}
                            </span>
                          </h3>
                          <p className="text-stone-300 text-xs sm:text-sm max-w-xl leading-relaxed">
                            Track your purchases, manage wishlist, and create
                            custom products.
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-8 mt-8 border-t border-stone-700/50">
                            <div>
                              <span className="block text-[10px] uppercase tracking-widest text-stone-400 font-mono mb-1">
                                Purchases
                              </span>
                              <span className="text-lg sm:text-xl font-bold font-mono">
                                {purchases.length}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase tracking-widest text-stone-400 font-mono mb-1">
                                Wishlist
                              </span>
                              <span className="text-lg sm:text-xl font-bold font-mono">
                                {wishlist.length}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase tracking-widest text-stone-400 font-mono mb-1">
                                Custom Items
                              </span>
                              <span className="text-lg sm:text-xl font-bold font-mono">
                                {customProducts.length}
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Coins className="w-6 h-6 text-amber-400" />
                                <div>
                                  <p className="text-xs font-semibold text-amber-400">
                                    SkyCoins Balance
                                  </p>
                                  <p className="text-2xl font-bold text-white">
                                    {getSkyCoinsBalance()}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => setShowSkyCoins(true)}
                                className="px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition-colors"
                              >
                                View Rewards
                              </button>
                            </div>
                            {getStreakStatus().isComplete && (
                              <div className="mt-2 text-xs text-amber-400">
                                🎉 Streak Complete! You earned {SKYCOINS_REWARD}{" "}
                                SkyCoins!
                              </div>
                            )}
                          </div>
                        </div>
                        <section className="bg-white border border-[#e7e5e4] p-6 sm:p-8">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-[#1c1917] mb-4 border-b border-[#e7e5e4] pb-4">
                            Purchase History
                          </h4>
                          {purchases.length === 0 ? (
                            <div className="text-center py-12 bg-stone-50 border border-stone-200">
                              <p className="text-stone-500 text-xs font-semibold uppercase tracking-widest mb-3">
                                No purchases yet
                              </p>
                              <button
                                onClick={() => navigate("/catalog")}
                                className="bg-[#1c1917] text-[#faf9f5] text-[10px] font-bold uppercase tracking-widest py-2.5 px-6 hover:opacity-90"
                              >
                                Start Shopping
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {purchases.map((ord) => (
                                <div
                                  key={ord.id}
                                  className="border border-stone-200 hover:border-stone-400 transition-colors p-4 flex flex-col sm:flex-row items-center justify-between gap-5 bg-white"
                                >
                                  <div className="flex items-center gap-4 w-full sm:w-auto">
                                    <div className="w-14 h-14 bg-stone-50 border border-stone-100 p-1 flex items-center justify-center flex-shrink-0">
                                      <img
                                        src={ord.productImg}
                                        alt={ord.productName}
                                        className="max-h-full max-w-full object-contain"
                                        referrerPolicy="no-referrer"
                                      />
                                    </div>
                                    <div>
                                      <span className="text-[9px] uppercase tracking-wider text-stone-400 font-bold block mb-0.5">
                                        {ord.productBrand}
                                      </span>
                                      <h5 className="text-xs font-bold text-[#1c1917] truncate max-w-[200px] sm:max-w-[250px]">
                                        {ord.productName}
                                      </h5>
                                      <span className="text-[10px] font-mono text-stone-500 block mt-0.5">
                                        Qty: {ord.quantity} • ₹
                                        {ord.productPrice}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col sm:flex-end gap-2 w-full sm:w-auto font-mono text-[10px]">
                                    <span className="text-stone-700 bg-stone-100 py-1 px-2 font-semibold">
                                      Ref: {ord.id}
                                    </span>
                                    <span className="text-emerald-600 font-bold uppercase tracking-widest text-[9px]">
                                      ✅ Completed
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>
                        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                          <div className="lg:col-span-5 bg-white border border-[#e7e5e4] p-6 sm:p-8">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-[#1c1917] mb-4 border-b border-[#e7e5e4] pb-4">
                              Add Custom Product
                            </h4>
                            <form
                              onSubmit={handleAddCustomProduct}
                              className="space-y-4"
                            >
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#1c1917] mb-1.5">
                                  Product Name
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Minimalist Vase"
                                  value={newProdName}
                                  onChange={(e) =>
                                    setNewProdName(e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-stone-300 outline-none focus:border-[#1c1917] text-xs bg-stone-50"
                                  required
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#1c1917] mb-1.5">
                                    Brand
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Studio KBH"
                                    value={newProdBrand}
                                    onChange={(e) =>
                                      setNewProdBrand(e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-stone-300 outline-none focus:border-[#1c1917] text-xs bg-stone-50"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#1c1917] mb-1.5">
                                    Price (₹)
                                  </label>
                                  <input
                                    type="number"
                                    placeholder="e.g. 3400"
                                    value={newProdPrice}
                                    onChange={(e) =>
                                      setNewProdPrice(e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-stone-300 outline-none focus:border-[#1c1917] text-xs bg-stone-50"
                                    required
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#1c1917] mb-1.5">
                                  Category
                                </label>
                                <select
                                  value={newProdCategory}
                                  onChange={(e) =>
                                    setNewProdCategory(e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-stone-300 outline-none focus:border-[#1c1917] text-xs bg-stone-50"
                                >
                                  <option value="Electronics">
                                    Electronics
                                  </option>
                                  <option value="Fashion">Fashion</option>
                                  <option value="Home & Kitchen">
                                    Home & Kitchen
                                  </option>
                                  <option value="Books">Books</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#1c1917] mb-1.5">
                                  Image URL
                                </label>
                                <input
                                  type="text"
                                  placeholder="https://example.com/image.jpg"
                                  value={newProdImg}
                                  onChange={(e) =>
                                    setNewProdImg(e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-stone-300 outline-none focus:border-[#1c1917] text-xs bg-stone-50"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#1c1917] mb-1.5">
                                  Description
                                </label>
                                <textarea
                                  placeholder="Enter product description..."
                                  value={newProdDesc}
                                  onChange={(e) =>
                                    setNewProdDesc(e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-stone-300 outline-none focus:border-[#1c1917] text-xs bg-stone-50 h-20 resize-none"
                                  required
                                />
                              </div>
                              <button
                                type="submit"
                                className="w-full py-3 bg-[#1c1917] text-[#faf9f5] text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all"
                              >
                                Add to Store
                              </button>
                            </form>
                          </div>
                          <div className="lg:col-span-7 bg-white border border-[#e7e5e4] p-6 sm:p-8">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-[#1c1917] mb-4 border-b border-[#e7e5e4] pb-4">
                              Your Custom Products
                            </h4>
                            {customProducts.length === 0 ? (
                              <div className="text-center py-12 bg-stone-50/50 border border-stone-100 border-dashed">
                                <p className="text-xs text-stone-500 uppercase tracking-widest font-semibold">
                                  No custom products yet
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {customProducts.map((p) => (
                                  <div
                                    key={p.id}
                                    onClick={() => {
                                      navigate(`/product/${p.id}`);
                                      setSelectedProductId(p.id);
                                      setIsDetailView(true);
                                    }}
                                    className="border border-stone-200 hover:border-[#1c1917] p-3 transition-all flex flex-col cursor-pointer bg-white group"
                                  >
                                    <div className="aspect-square bg-stone-50 border border-stone-100 p-2 flex items-center justify-center mb-3 relative overflow-hidden">
                                      <img
                                        src={p.img}
                                        alt={p.name}
                                        className="max-h-24 object-contain group-hover:scale-105 transition-transform"
                                        referrerPolicy="no-referrer"
                                      />
                                      <span className="absolute bottom-1 right-1 bg-[#1c1917] text-white text-[8px] font-mono px-1.5 uppercase font-bold">
                                        Custom
                                      </span>
                                    </div>
                                    <span className="text-[8px] text-stone-400 font-bold uppercase font-mono">
                                      {p.brand}
                                    </span>
                                    <h5 className="text-xs font-bold text-stone-900 truncate mb-1">
                                      {p.name}
                                    </h5>
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-stone-100">
                                      <span className="text-xs font-bold text-stone-750">
                                        ₹{p.price}
                                      </span>
                                      <span className="text-[9px] text-stone-400 uppercase font-bold tracking-wider font-mono">
                                        {p.category}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </section>
                      </div>
                    ) : page === Page.Wishlist ? (
                      <div>
                        {wishlist.length === 0 ? (
                          <div className="text-center py-20 bg-stone-50 border border-[#e7e5e4]">
                            <Heart className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                            <p className="text-sm font-semibold text-stone-500 uppercase tracking-widest mb-2">
                              Wishlist Empty
                            </p>
                            <button
                              onClick={() => navigate("/catalog")}
                              className="bg-[#1c1917] text-white text-xs font-semibold px-6 py-3 uppercase tracking-widest"
                            >
                              Browse Products
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {allProducts
                              .filter((p) => wishlist.includes(p.id))
                              .map((item) => (
                                <ProductCard
                                  key={item.id}
                                  product={item}
                                  wishlist={wishlist}
                                  toggleWishlist={toggleWishlist}
                                  addToCart={addToCart}
                                  onInspect={() => {
                                    navigate(`/product/${item.id}`);
                                    setSelectedProductId(item.id);
                                    setIsDetailView(true);
                                  }}
                                />
                              ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        {isLoading ? (
                          <div className="text-center py-20">
                            <div className="w-12 h-12 border-4 border-stone-200 border-t-[#1c1917] rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-stone-500">
                              Loading products...
                            </p>
                          </div>
                        ) : getFilteredProducts().length === 0 ? (
                          <div className="text-center py-20 bg-stone-50 border border-[#e7e5e4]">
                            <p className="text-sm text-stone-500 uppercase tracking-widest font-semibold mb-2">
                              No Products Found
                            </p>
                            <p className="text-xs text-stone-400 mb-4">
                              Try adjusting your filters or search terms.
                            </p>
                            <button
                              onClick={resetAllFilters}
                              className="bg-[#1c1917] text-white text-xs font-semibold px-6 py-3 uppercase tracking-widest"
                            >
                              Clear All Filters
                            </button>
                          </div>
                        ) : (
                          <div>
                            {!selectedCategory &&
                            !selectedSubcategory &&
                            !selectedBrand &&
                            !searchQuery ? (
                              <div className="space-y-16">
                                {(() => {
                                  const categories = [
                                    ...new Set(
                                      getFilteredProducts().map(
                                        (p) => p.category,
                                      ),
                                    ),
                                  ];
                                  return categories.map((cat) => (
                                    <div key={cat}>
                                      <h3 className="font-serif text-sm tracking-widest text-stone-400 uppercase mb-6 flex items-center gap-3">
                                        <span>{cat}</span>
                                        <span className="h-[1px] bg-[#e7e5e4] flex-1"></span>
                                      </h3>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {getFilteredProducts()
                                          .filter((p) => p.category === cat)
                                          .slice(0, 4)
                                          .map((p) => (
                                            <ProductCard
                                              key={p.id}
                                              product={p}
                                              wishlist={wishlist}
                                              toggleWishlist={toggleWishlist}
                                              addToCart={addToCart}
                                              onInspect={() => {
                                                navigate(`/product/${p.id}`);
                                                setSelectedProductId(p.id);
                                                setIsDetailView(true);
                                              }}
                                            />
                                          ))}
                                      </div>
                                    </div>
                                  ));
                                })()}
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {getFilteredProducts().map((p) => (
                                  <ProductCard
                                    key={p.id}
                                    product={p}
                                    wishlist={wishlist}
                                    toggleWishlist={toggleWishlist}
                                    addToCart={addToCart}
                                    onInspect={() => {
                                      navigate(`/product/${p.id}`);
                                      setSelectedProductId(p.id);
                                      setIsDetailView(true);
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </main>
              </div>
            )}
            <footer className="bg-stone-50 border-t border-[#e7e5e4] py-8 text-center text-xs text-stone-400">
              © 2026 SkyMart. All rights reserved.
            </footer>
          </div>
        )}

        {/* ===== CART PAGE ===== */}
        {page === Page.Cart && (
          <div className="min-h-screen bg-[#0b0f19] text-[#f3f4f6] flex flex-col">
            <header className="bg-[#111827]/75 backdrop-blur-xl sticky top-0 z-40 border-b border-white/10 px-6 sm:px-12 py-5 flex items-center justify-between">
              <div
                onClick={() => {
                  navigate("/catalog");
                  setIsDetailView(false);
                  setIsShippingView(false);
                }}
                className="text-2xl font-serif font-black tracking-widest text-[#ff3f6c] hover:opacity-85 cursor-pointer uppercase select-none"
              >
                SKYMART
              </div>
              <button
                onClick={() => navigate("/catalog")}
                className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-[#f3f4f6] hover:bg-white hover:text-black hover:scale-105 transition-all text-xs font-semibold uppercase tracking-wider flex items-center gap-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Continue Shopping</span>
              </button>
            </header>
            <main className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-12 flex-1 flex flex-col lg:flex-row gap-12 items-start">
              <section className="flex-grow w-full">
                <h1 className="text-3xl font-extrabold tracking-tight mb-8 flex items-center gap-3">
                  <ShoppingCart className="w-7 h-7 text-[#ff3f6c]" />
                  <span>Shopping Cart</span>
                </h1>
                <div className="space-y-4">
                  {Object.keys(cartItemCounts).length === 0 ? (
                    <div className="text-center py-20 bg-white/2 border border-white/5 rounded-2xl">
                      <p className="text-lg text-stone-400 mb-6 font-medium">
                        Your cart is empty.
                      </p>
                      <button
                        onClick={() => navigate("/catalog")}
                        className="bg-gradient-to-r from-[#ff3f6c] to-[#ff7e5f] text-white px-8 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-[#ff3f6c]/20 hover:-translate-y-0.5 transition-all"
                      >
                        Browse Products
                      </button>
                    </div>
                  ) : (
                    Object.entries(cartItemCounts).map(([strId, qty]) => {
                      const product = allProducts.find(
                        (p) => p.id === Number(strId),
                      );
                      if (!product) return null;
                      return (
                        <div
                          key={product.id}
                          className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/2 border border-white/5 p-5 rounded-2xl hover:border-white/10 transition-all"
                        >
                          <div className="flex items-center gap-5 w-full sm:w-auto">
                            <div className="w-20 h-20 bg-[#111827] border border-white/5 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center p-2">
                              <img
                                src={product.img}
                                alt={product.name}
                                className="max-h-full max-w-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div>
                              <span className="text-[#ff3f6c] text-[10px] font-bold uppercase tracking-wider block mb-0.5">
                                {product.brand}
                              </span>
                              <h3 className="text-sm font-semibold text-stone-150 leading-snug">
                                {product.name}
                              </h3>
                              <div className="text-emerald-400 text-sm font-bold tracking-tight mt-1.5">
                                ₹{product.price}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-start">
                            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                              <button
                                onClick={() => adjustQty(product.id, -1)}
                                className="text-stone-300 hover:text-[#ff3f6c] w-6 h-6 flex items-center justify-center text-lg font-bold"
                              >
                                −
                              </button>
                              <span className="text-stone-100 font-mono text-sm w-6 text-center select-none font-bold">
                                {qty}
                              </span>
                              <button
                                onClick={() => adjustQty(product.id, 1)}
                                className="text-stone-300 hover:text-[#ff3f6c] w-6 h-6 flex items-center justify-center text-lg font-bold"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => removeFromCartLine(product.id)}
                              className="p-3 hover:text-rose-500 text-stone-400 transition-colors border border-transparent hover:border-white/10 hover:bg-white/3 rounded-xl"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
              {Object.keys(cartItemCounts).length > 0 && (
                <aside className="w-full lg:w-96 bg-white/2 border border-white/5 p-6 rounded-2xl sticky top-28">
                  <h2 className="text-xl font-bold border-b border-white/5 pb-4 mb-6">
                    Order Summary
                  </h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm text-stone-400">
                      <span>Subtotal</span>
                      <span className="font-mono text-stone-100 font-semibold">
                        ₹{subtotalPrice}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-stone-400">
                      <span>Shipping</span>
                      <span className="text-[#10b981] font-semibold text-xs py-1 px-2.5 rounded bg-emerald-500/10">
                        FREE
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-stone-400">
                      <span>Tax (GST 18%)</span>
                      <span className="font-mono text-stone-100 font-semibold">
                        ₹{taxPrice}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-white/5 pt-5 text-lg font-bold">
                      <span>Total</span>
                      <span className="font-mono text-[#ff3f6c]">
                        ₹{totalPrice}
                      </span>
                    </div>
                  </div>
                  <div className="mt-8 border-t border-white/5 pt-6">
                    <button
                      onClick={() => {
                        if (!isLoggedIn) {
                          triggerToast("Please sign in to checkout.", "error");
                          navigate("/login");
                          return;
                        }
                        if (!shippingDetails.address.trim()) {
                          const userPrefix = userEmail.split("@")[0];
                          const formattedName =
                            userPrefix.charAt(0).toUpperCase() +
                            userPrefix.slice(1);
                          setShippingDetails({
                            name: formattedName || "Customer",
                            email: shippingDetails.email || userEmail,
                            phone: "+91 98765 43210",
                            address:
                              "Villa 42, Luxe-Crest Boulevard, HSR Layout, Sector 3, Bengaluru",
                            zip: "560102",
                            lat: 12.9279,
                            lng: 77.6271,
                          });
                          triggerToast("Address auto-loaded!", "info");
                        }
                        setIsShippingView(true);
                        navigate("/catalog");
                      }}
                      className="w-full bg-[#ff3f6c] hover:bg-[#e02e54] text-white font-bold py-4 rounded-xl text-sm uppercase tracking-wider transition-all hover:-translate-y-0.5"
                    >
                      Proceed to Checkout
                    </button>
                  </div>
                </aside>
              )}
            </main>
            <footer className="bg-[#0b0f19] border-t border-white/5 py-8 text-center text-xs text-stone-500">
              © 2026 SkyMart. All rights reserved.
            </footer>
          </div>
        )}

        {/* ===== DESIGNER HUB PAGE ===== */}
        {page === Page.DesignerHub && <DesignerHub />}

        {/* ===== SKYCOINS PAGE ===== */}
        {page === Page.SkyCoins && (
          <div className="min-h-screen bg-[#faf9f5]">
            <SkyCoinsDashboard
              userId={userId}
              onClose={() => {
                navigate(-1);
              }}
            />
          </div>
        )}

        {/* ===== SKYCOINS DASHBOARD ===== */}
        {showSkyCoins && (
          <SkyCoinsDashboard
            userId={userId}
            onClose={() => setShowSkyCoins(false)}
          />
        )}

        {/* ===== PAYMENT MODAL ===== */}
        {showQRModal && (
          <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md">
            <div className="relative bg-white w-full max-w-4xl p-6 sm:p-8 border border-stone-200 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#002f6c] text-white flex items-center justify-center font-black text-xs rounded">
                    R
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#002f6c]">
                      Razorpay Secure Payment
                    </h4>
                    <span className="text-[8px] font-bold text-[#4c84ff] uppercase tracking-widest block font-mono">
                      Multiple Payment Options
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowQRModal(false);
                    triggerToast("Payment cancelled.", "info");
                  }}
                  className="text-stone-400 hover:text-stone-600 text-xl"
                  disabled={isVerifyingPayment}
                >
                  ✕
                </button>
              </div>

              <div className="text-center mb-6">
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                  Amount to Pay
                </span>
                <span className="text-4xl font-bold text-stone-900 font-mono tracking-tight">
                  ₹
                  {isShippingView && selectedProductId
                    ? allProducts.find((p) => p.id === selectedProductId)
                        ?.price || 0
                    : totalPrice}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-6">
                {[
                  { id: "upi", label: "📱 UPI", color: "bg-[#5f259f]" },
                  { id: "card", label: "💳 Card", color: "bg-blue-600" },
                  {
                    id: "netbanking",
                    label: "🏦 Net Banking",
                    color: "bg-orange-500",
                  },
                  { id: "wallet", label: "👛 Wallet", color: "bg-emerald-600" },
                  { id: "cod", label: "🚚 COD", color: "bg-green-600" },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={`rounded-xl p-2.5 text-xs font-bold transition-all duration-300 ${
                      paymentMethod === method.id
                        ? `${method.color} text-white shadow-lg scale-105`
                        : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>

              {!isVerifyingPayment ? (
                <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200">
                  {paymentMethod === "upi" && (
                    <div className="flex flex-col items-center py-4">
                      <div className="text-center mb-4">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-3xl">📱</span>
                        </div>
                        <h3 className="text-lg font-bold text-stone-900">
                          Pay with UPI
                        </h3>
                        <p className="text-sm text-stone-500">
                          Google Pay • PhonePe • Paytm • BHIM
                        </p>
                      </div>
                      <RazorpayPayment
                        amount={
                          isShippingView && selectedProductId
                            ? allProducts.find(
                                (p) => p.id === selectedProductId,
                              )?.price || 0
                            : totalPrice
                        }
                        orderId={`ORD-${Date.now()}`}
                        onSuccess={(paymentId) => {
                          triggerToast(
                            `✅ Payment successful! ID: ${paymentId}`,
                            "success",
                          );
                          completeFinalPayment();
                        }}
                        onFailure={(error) => {
                          triggerToast(`❌ Payment failed: ${error}`, "error");
                          setIsVerifyingPayment(false);
                        }}
                      />
                      <div className="mt-4 text-[10px] text-stone-400 flex items-center gap-4">
                        <span>UPI</span>
                        <span>•</span>
                        <span>Credit/Debit Card</span>
                        <span>•</span>
                        <span>Net Banking</span>
                      </div>
                    </div>
                  )}

                  {paymentMethod === "card" && (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 rounded-xl mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold uppercase tracking-wider">
                            Credit/Debit Card
                          </span>
                          <div className="flex gap-1">
                            <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold">
                              VISA
                            </span>
                            <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold">
                              MC
                            </span>
                            <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold">
                              RUP
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-700 mb-1.5">
                          Card Number
                        </label>
                        <input
                          type="text"
                          placeholder="1234 5678 9012 3456"
                          value={cardNumber}
                          onChange={(e) =>
                            setCardNumber(formatCardNumber(e.target.value))
                          }
                          maxLength={19}
                          className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-700 mb-1.5">
                            Expiry Date
                          </label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={(e) =>
                              setCardExpiry(formatExpiry(e.target.value))
                            }
                            maxLength={5}
                            className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-700 mb-1.5">
                            CVV
                          </label>
                          <input
                            type="password"
                            placeholder="•••"
                            value={cardCvv}
                            onChange={(e) =>
                              setCardCvv(
                                e.target.value.replace(/\D/g, "").slice(0, 4),
                              )
                            }
                            maxLength={4}
                            className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-700 mb-1.5">
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          placeholder="John Doe"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-white"
                        />
                      </div>
                      <button
                        onClick={handleCardPayment}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-widest uppercase transition-colors rounded-xl"
                      >
                        Pay ₹
                        {isShippingView && selectedProductId
                          ? allProducts.find((p) => p.id === selectedProductId)
                              ?.price || 0
                          : totalPrice}{" "}
                        with Card
                      </button>
                    </div>
                  )}

                  {paymentMethod === "netbanking" && (
                    <div className="space-y-4">
                      <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl mb-4">
                        <p className="text-xs text-orange-800 font-medium">
                          🔒 Secure net banking redirect. You'll be redirected
                          to your bank's secure page.
                        </p>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-700 mb-1.5">
                          Select Your Bank
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            {
                              id: "sbi",
                              name: "State Bank of India",
                              logo: "🏦",
                            },
                            { id: "hdfc", name: "HDFC Bank", logo: "🏦" },
                            { id: "icici", name: "ICICI Bank", logo: "🏦" },
                            { id: "axis", name: "Axis Bank", logo: "🏦" },
                            {
                              id: "kotak",
                              name: "Kotak Mahindra Bank",
                              logo: "🏦",
                            },
                            { id: "yes", name: "Yes Bank", logo: "🏦" },
                            {
                              id: "pnb",
                              name: "Punjab National Bank",
                              logo: "🏦",
                            },
                            { id: "canara", name: "Canara Bank", logo: "🏦" },
                          ].map((bank) => (
                            <button
                              key={bank.id}
                              onClick={() => setSelectedBank(bank.id)}
                              className={`p-3 border rounded-xl text-left transition-all ${
                                selectedBank === bank.id
                                  ? "border-orange-500 bg-orange-50 ring-2 ring-orange-200"
                                  : "border-stone-200 hover:border-orange-300 bg-white"
                              }`}
                            >
                              <span className="text-lg mr-2">{bank.logo}</span>
                              <span className="text-sm font-medium text-stone-700">
                                {bank.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={handleNetBankingPayment}
                        disabled={!selectedBank}
                        className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold tracking-widest uppercase transition-colors rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Pay ₹
                        {isShippingView && selectedProductId
                          ? allProducts.find((p) => p.id === selectedProductId)
                              ?.price || 0
                          : totalPrice}{" "}
                        with Net Banking
                      </button>
                    </div>
                  )}

                  {paymentMethod === "wallet" && (
                    <div className="space-y-4">
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                            Wallet Balance
                          </span>
                          <span className="text-xl font-bold text-emerald-700">
                            ₹{walletBalance}
                          </span>
                        </div>
                      </div>
                      {walletBalance <
                      (isShippingView && selectedProductId
                        ? allProducts.find((p) => p.id === selectedProductId)
                            ?.price || 0
                        : totalPrice) ? (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center">
                          <p className="text-sm text-amber-800 font-medium">
                            ⚠️ Insufficient balance! Add funds to continue.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-700 mb-1.5">
                              Wallet PIN
                            </label>
                            <input
                              type="password"
                              placeholder="Enter 4-digit PIN"
                              value={walletPin}
                              onChange={(e) =>
                                setWalletPin(
                                  e.target.value.replace(/\D/g, "").slice(0, 4),
                                )
                              }
                              maxLength={4}
                              className="w-full px-4 py-3 border border-stone-300 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none text-sm bg-white"
                            />
                          </div>
                          <button
                            onClick={handleWalletPayment}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold tracking-widest uppercase transition-colors rounded-xl"
                          >
                            Pay ₹
                            {isShippingView && selectedProductId
                              ? allProducts.find(
                                  (p) => p.id === selectedProductId,
                                )?.price || 0
                              : totalPrice}{" "}
                            from Wallet
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {paymentMethod === "cod" && (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">🚚</div>
                      <h3 className="text-lg font-bold text-stone-900 mb-2">
                        Cash on Delivery
                      </h3>
                      <p className="text-sm text-stone-500 max-w-md mx-auto mb-6">
                        Pay when your order arrives. No additional charges for
                        COD.
                      </p>
                      <div className="bg-green-50 border border-green-200 p-4 rounded-xl mb-6">
                        <div className="flex justify-between text-sm">
                          <span className="text-stone-600">Order Total</span>
                          <span className="font-bold text-green-700">
                            ₹
                            {isShippingView && selectedProductId
                              ? allProducts.find(
                                  (p) => p.id === selectedProductId,
                                )?.price || 0
                              : totalPrice}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-stone-600">
                            Delivery Charge
                          </span>
                          <span className="font-bold text-green-700">FREE</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setIsVerifyingPayment(true);
                          triggerToast("Placing COD order...", "info");
                          setTimeout(() => {
                            completeFinalPayment();
                          }, 1500);
                        }}
                        className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold tracking-widest uppercase transition-colors rounded-xl"
                      >
                        Place COD Order
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 bg-stone-50 rounded-2xl border border-stone-200">
                  <div className="w-16 h-16 border-4 border-stone-200 border-t-[#002f6c] rounded-full animate-spin mb-4"></div>
                  <p className="text-sm font-bold text-stone-800 uppercase tracking-widest animate-pulse">
                    Processing Payment...
                  </p>
                  <p className="text-xs text-stone-400 mt-2">
                    Please wait while we secure your transaction
                  </p>
                </div>
              )}

              {!isVerifyingPayment && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-[10px] font-mono text-stone-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    <span>
                      Session:{" "}
                      <span className="font-bold text-rose-600">
                        {Math.floor(qrExpiry / 60)}:
                        {String(qrExpiry % 60).padStart(2, "0")}
                      </span>
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowQRModal(false);
                      triggerToast("Payment cancelled.", "info");
                    }}
                    className="text-xs text-stone-400 hover:text-stone-600 underline"
                  >
                    Cancel Payment
                  </button>
                </div>
              )}

              <p className="text-[9px] text-stone-400 text-center mt-4 border-t border-stone-100 pt-4">
                🔒 Secured payment gateway. Your transaction is encrypted and
                protected.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================
// PRODUCT CARD COMPONENT - MUST BE AT THE VERY BOTTOM
// ============================================================
interface CardProps {
  product: Product;
  wishlist: number[];
  toggleWishlist: (id: number, e: MouseEvent) => void;
  addToCart: (id: number, e: MouseEvent) => void;
  onInspect: () => void;
}

function ProductCard({
  product,
  wishlist,
  toggleWishlist,
  addToCart,
  onInspect,
}: CardProps) {
  const isWished = wishlist.includes(product.id);

  return (
    <div
      onClick={onInspect}
      className="bg-white border border-[#e7e5e4] flex flex-col group relative cursor-pointer hover:border-[#1c1917] hover:shadow-xl transition-all"
    >
      <button
        onClick={(e) => toggleWishlist(product.id, e)}
        className={`absolute top-4 right-4 z-10 w-9 h-9 bg-white border border-stone-200 flex items-center justify-center rounded-none shadow-sm transition-transform hover:scale-110 active:scale-95 ${
          isWished ? "shadow-rose-100" : ""
        }`}
      >
        <Heart
          className={`w-[15px] h-[15px] transition-colors ${
            isWished ? "fill-rose-500 text-rose-500" : "text-[#1c1917]"
          }`}
        />
      </button>
      <div className="aspect-[4/5] sm:aspect-square bg-stone-50 p-6 flex items-center justify-center overflow-hidden border-b border-[#e7e5e4] relative">
        <img
          src={product.img}
          alt={product.name}
          className="max-h-full max-w-full object-contain group-hover:scale-[1.04] transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-1.5 block">
            {product.brand}
          </span>
          <h3 className="text-xs sm:text-sm font-semibold text-[#1c1917] hover:text-stone-700 h-10 overflow-hidden leading-snug">
            {product.name}
          </h3>
        </div>
        <div className="text-sm font-bold text-[#1c1917] mt-3">
          ₹{product.price}
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-[#e7e5e4] border-t border-[#e7e5e4] bg-[#faf9f5]">
        <button
          onClick={(e) => addToCart(product.id, e)}
          className="py-3 text-[10px] font-bold text-center uppercase tracking-widest text-stone-700 hover:bg-[#1c1917] hover:text-[#faf9f5] transition-colors"
        >
          Add to Cart
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onInspect();
          }}
          className="py-3 text-[10px] font-bold text-center uppercase tracking-widest text-[#1c1917] hover:bg-[#1c1917] hover:text-[#faf9f5] transition-colors"
        >
          View Details
        </button>
      </div>
    </div>
  );
}

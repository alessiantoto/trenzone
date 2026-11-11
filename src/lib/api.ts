import { supabase } from './supabase';

export interface Product {
  id: string;
  slug: string;
  name: string | Record<string, string>;
  price: number | Record<string, number>;
  originalPrice?: number | Record<string, number>;
  description: string | Record<string, string>;
  image: string;
  images: string[];
  badge?: string;
  stock_quantity: number;
  weight: number;
  length_mm: number;
  width_mm: number;
  height_mm: number;
  is_active: boolean;
  long_description?: string | Record<string, string>;
  meta_title?: string | Record<string, string>;
  meta_description?: string | Record<string, string>;
  specs?: Record<string, string>;
  advantages?: Record<string, string[]>;
  usage_signs?: Record<string, string[]>;
  specs_summary?: Record<string, any>;
  variants?: {
    type?: string;
    label?: string | Record<string, string>;
    options: { 
      name: string | Record<string, string>; 
      imageIndex?: number;
      image?: string;
      color?: string;
      badge?: string;
      stock_status?: "in_stock" | "sold_out" | "preorder";
      price?: number;
      originalPrice?: number;
    }[];
  };
  bundleVariants?: {
    size?: { label: string | Record<string, string>; options: string[] };
    flavor?: { 
      label: string | Record<string, string>; 
      options: { 
        name: string | Record<string, string>; 
        imageIndex?: number;
        image?: string;
        color?: string;
        badge?: string;
        stock_status?: "in_stock" | "sold_out" | "preorder";
        price?: number;
        originalPrice?: number;
      }[] 
    };
  };
  // SEO fields
  canonical_url?: string;
  brand?: string;
  sku?: string;
  gtin?: string;
  price_numeric?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
}

// Helper mock specs for better UI demo until DB is updated
export interface InfluencerVideo {
  id: string;
  video_url: string;
  poster_url?: string | null;
  influencer_name: string;
  influencer_handle?: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
}

const MOCK_VARIANTS: Record<string, any> = {};

// Helper to parse JSONB if it comes as a string (happens in some environments)
const parseJSONB = (val: any) => {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch (e) { return val; }
  }
  return val;
};

// Helper to map DB fields to Frontend fields
const mapProduct = (p: any): Product => {
  const advantages = parseJSONB(p.advantages);
  const usage_signs = parseJSONB(p.usage_signs);
  const specs_summary = parseJSONB(p.specs_summary);
  
  // Helper to extract translated string from JSONB or fallback to string
  const getVal = (val: any) => {
    const parsed = parseJSONB(val);
    if (parsed && typeof parsed === 'object') {
      // Here we could ideally check a global locale, but for now we provide the RO as primary
      // and let the frontend handle the specific language if needed.
      return parsed; 
    }
    return val;
  };

  const DEFAULT_IMAGE = '/images/products/x10_elbow_wraps_purple_1.webp';
  const mainImage = (p.main_image && typeof p.main_image === 'string' && !p.main_image.includes('cdn.shopify.com')) ? p.main_image : DEFAULT_IMAGE;
  const allImages = p.images && p.images.length > 0 
    ? p.images.filter((img: string) => typeof img === 'string' && !img.includes('cdn.shopify.com')) 
    : [mainImage];

  return {
    ...p,
    name: getVal(p.name),
    description: getVal(p.description),
    meta_title: getVal(p.meta_title),
    meta_description: getVal(p.meta_description),
    long_description: getVal(p.long_description),
    price: parseJSONB(p.price),
    originalPrice: parseJSONB(p.original_price) || undefined,
    badge: p.badge || undefined,
    specs: getVal(p.specs_summary) || undefined,
    advantages: getVal(p.advantages) || undefined,
    usage_signs: getVal(p.usage_signs) || undefined,
    specs_summary: getVal(p.specs_summary) || undefined,
    variants: MOCK_VARIANTS[p.slug] || p.variants || undefined,
    bundleVariants: p.bundleVariants || undefined,
    weight: p.weight || 0.2, // Realistic default for small items
    length_mm: p.length_mm || 150,
    width_mm: p.width_mm || 100,
    height_mm: p.height_mm || 50,
    image: mainImage,
    images: allImages
  };
};

import { getProductsServer, getProductBySlugServer } from '@/app/actions/products';

// Get all active products with categories
export async function getProducts(): Promise<Product[]> {
  return getProductsServer();
}

// Get single product by slug
export async function getProductBySlug(slug: string): Promise<Product | null> {
  return getProductBySlugServer(slug);
}

// Get all categories
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data as Category[];
}

export interface Review {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  title?: string;
  comment: string;
  image_url?: string;
  images?: string[];
  email?: string;
  locale?: string;
  item_type?: string;
  fit?: string;
  helpful_count?: number;
  status: 'pending' | 'approved' | 'rejected';
  is_verified_buyer?: boolean;
  created_at: string;
}

// Obține recenziile pentru un produs anume
export async function getReviewsByProductId(productId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Warning fetching reviews:', error);
    return [];
  }
  return data as Review[];
}

// Obține recenzii "featured" pentru prima pagină
export async function getFeaturedReviews(limit: number = 6): Promise<(Review & { product: { name: string, slug: string, image: string } })[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, product:products(name, slug, main_image)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('Warning fetching featured reviews:', error);
    return [];
  }

  return (data as any[]).map(r => ({
    ...r,
    product: {
      name: r.product?.name || 'Produs TrenZone',
      slug: r.product?.slug || '#',
      image: r.product?.main_image || ''
    }
  }));
}

// Obține TOATE recenziile aprobate
export async function getAllReviews(): Promise<(Review & { product: { name: string, slug: string, image: string } })[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, product:products(name, slug, main_image)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all reviews:', error);
    return [];
  }

  return (data as any[]).map(r => ({
    ...r,
    product: {
      name: r.product?.name || 'Produs TrenZone',
      slug: r.product?.slug || '#',
      image: r.product?.main_image || ''
    }
  }));
}


// Obține statisticile globale ale recenziilor (Count & Average)
export async function getReviewsStats(): Promise<{ count: number; average: number }> {
  try {
    const { count, error } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    const { data: ratings, error: rError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('status', 'approved');

    if (error || rError) throw error || rError;

    const total = ratings?.reduce((acc, r) => acc + (r.rating || 0), 0) || 0;
    const avg = ratings?.length ? (total / ratings.length).toFixed(1) : "4.9";

    return {
      count: count || 0,
      average: parseFloat(avg)
    };
  } catch (error: any) {
    // Silenced console error to avoid spam on network failure
    return { count: 0, average: 5.0 }; // Fallback la date reale/0
  }
}

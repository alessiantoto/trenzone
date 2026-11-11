export interface Product {
  id: string;
  slug: string;
  name: string | Record<string, string>;
  price: number;
  originalPrice?: number;
  description: string | Record<string, string>;
  image: string;
  images: string[];
  category: string;
  badge?: string;
  stock_quantity: number;
  is_active: boolean;
  long_description?: string;
  meta_title?: string | Record<string, string>;
  meta_description?: string | Record<string, string>;
  specs?: Record<string, string>;
  advantages?: Record<string, string[]>;
  usage_signs?: Record<string, string[]>;
  specs_summary?: Record<string, string>;
  variants?: {
    label: string | Record<string, string>;
    options: { id?: string; name: string | Record<string, string>; image?: string; imageIndex?: number }[];
  };
}

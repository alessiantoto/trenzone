import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product } from "@/lib/api";
import { Coupon } from "@/types/coupon";
import { getProductPrice } from "@/utils/pricing";
import toast from "react-hot-toast";

export interface CartItem extends Product {
  quantity: number;
  selectedVariant?: {
    name: string;
    image?: string;
    imageIndex?: number;
  };
}

export interface PreorderConflictData {
  isOpen: boolean;
  incomingIsPreorder: boolean;
  incomingProduct: any;
  incomingVariant?: any;
  currentHasPreorder?: boolean;
}

interface CartState {
  items: CartItem[];
  appliedCoupon: Coupon | null;
  preorderConflict: PreorderConflictData | null;
  addItem: (product: Product, variant?: { name: string; image?: string; imageIndex?: number }) => boolean;
  removeItem: (productId: string, variantName?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantName?: string) => void;
  clearCart: () => void;
  setCoupon: (coupon: Coupon | null) => void;
  isCartOpen: boolean;
  setCartOpen: (isOpen: boolean) => void;
  closePreorderConflict: () => void;
  resolvePreorderConflictWithReplace: () => void;
  getTotals: (currency?: string, shippingCost?: number) => { 
    subtotal: number; 
    discount: number; 
    couponDiscount: number; 
    shippingDiscount: boolean; 
    total: number; 
    hasBundle: boolean; 
  };
}
const areVariantNamesEqual = (name1: any, name2: any) => {
  if (name1 === name2) return true;
  if (!name1 || !name2) return false;
  const getRo = (n: any) => typeof n === 'object' ? n.ro : n;
  const getEn = (n: any) => typeof n === 'object' ? n.en : n;
  return getRo(name1) === getRo(name2) || getEn(name1) === getEn(name2);
};

export const isPreorder = (product: any, variant?: any): boolean => {
  if (!product) return false;
  if (product.stock_status === 'preorder' || product.is_preorder === true) return true;
  if (product.selectedVariant?.stock_status === 'preorder') return true;

  const v = variant || product.selectedVariant || product.variant;
  if (v) {
    const vName = typeof v === 'object' ? (v.name?.ro || v.name?.en || v.name || '') : String(v);
    const vLower = String(vName).toLowerCase();

    if (product.variants?.options) {
      const selectedOpt = product.variants.options.find((opt: any) => {
        const optRo = typeof opt.name === 'object' ? opt.name.ro : opt.name;
        const optEn = typeof opt.name === 'object' ? opt.name.en : opt.name;
        return (
          optRo === vName ||
          optEn === vName ||
          String(optRo).toLowerCase() === vLower ||
          String(optEn).toLowerCase() === vLower ||
          (opt.id && v.id && opt.id === v.id)
        );
      });
      if (selectedOpt?.stock_status === 'preorder') return true;
    }

    if (product.bundleVariants?.flavor?.options) {
      const hasPreorder = product.bundleVariants.flavor.options.some((opt: any) => {
        const optRo = typeof opt.name === 'object' ? opt.name.ro : opt.name;
        const optEn = typeof opt.name === 'object' ? opt.name.en : opt.name;
        const isIncluded = (optRo && vName.includes(optRo)) || (optEn && vName.includes(optEn));
        return opt.stock_status === 'preorder' && isIncluded;
      });
      if (hasPreorder) return true;
    }
  }

  return false;
};

const isMixedBundle = (product: any, variant: any): boolean => {
  if (!variant) return false;
  if (product.bundleVariants?.flavor?.options) {
    let hasPreorder = false;
    let hasNormal = false;
    
    product.bundleVariants.flavor.options.forEach((opt: any) => {
      const optNameRo = typeof opt.name === 'object' ? opt.name.ro : opt.name;
      const optNameEn = typeof opt.name === 'object' ? opt.name.en : opt.name;
      const selNameRo = typeof variant.name === 'object' ? variant.name.ro : variant.name;
      const selNameEn = typeof variant.name === 'object' ? variant.name.en : variant.name;
      
      const isIncluded = (selNameRo && typeof selNameRo === 'string' && optNameRo && selNameRo.includes(optNameRo)) ||
                         (selNameEn && typeof selNameEn === 'string' && optNameEn && selNameEn.includes(optNameEn));
                         
      if (isIncluded) {
        if (opt.stock_status === 'preorder') hasPreorder = true;
        else hasNormal = true;
      }
    });
    
    return hasPreorder && hasNormal;
  }
  return false;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      appliedCoupon: null,
      isCartOpen: false,
      preorderConflict: null,
      setCartOpen: (isOpen) => set({ isCartOpen: isOpen }),
      closePreorderConflict: () => set({ preorderConflict: null }),
      resolvePreorderConflictWithReplace: () => {
        const conflict = get().preorderConflict;
        if (!conflict || !conflict.incomingProduct) {
          set({ preorderConflict: null });
          return;
        }

        const { incomingProduct, incomingVariant, incomingIsPreorder } = conflict;
        set({
          items: [{ ...incomingProduct, quantity: 1, selectedVariant: incomingVariant }],
          preorderConflict: null,
          isCartOpen: true
        });

        toast.success(
          incomingIsPreorder 
            ? "Coșul a fost actualizat exclusiv pentru precomandă!" 
            : "Coșul a fost actualizat cu produsele în stoc!",
          { icon: '📦' }
        );
      },
      addItem: (product, variant) => {
        const state = get();
        
        // Prevent mixing preorder and normal inside the same bundle item
        if (isMixedBundle(product, variant)) {
          toast.error("Nu poți amesteca variante aflate pe precomandă cu variante normale în același pachet.", {
            duration: 5000,
            style: { border: '1px solid #ef4444', padding: '16px', color: '#7f1d1d', fontWeight: 'bold' }
          });
          return false;
        }

        // Strict Separation: Pre-orders and in-stock items cannot be ordered together
        const incomingIsPreorder = isPreorder(product, variant);
        const currentHasPreorder = state.items.some(item => isPreorder(item, item.selectedVariant));
        const currentHasInStock = state.items.some(item => !isPreorder(item, item.selectedVariant));

        if (state.items.length > 0) {
          if ((incomingIsPreorder && currentHasInStock) || (!incomingIsPreorder && currentHasPreorder)) {
            set({
              preorderConflict: {
                isOpen: true,
                currentHasPreorder,
                incomingIsPreorder,
                incomingProduct: product,
                incomingVariant: variant
              },
              isCartOpen: true
            });
            return false;
          }
        }

        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('tz:cart_add', { detail: { productId: product.id } }));
          } catch (e) {}
        }
        set((state) => {
          const existing = state.items.find(
            (item) => item.id === product.id && areVariantNamesEqual(item.selectedVariant?.name, variant?.name)
          );
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.id === product.id && areVariantNamesEqual(item.selectedVariant?.name, variant?.name)
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
              isCartOpen: true,
            };
          }
          return { 
            items: [...state.items, { ...product, quantity: 1, selectedVariant: variant }], 
            isCartOpen: true 
          };
        });
        return true;
      },
      removeItem: (productId, variantName) => {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.id === productId && areVariantNamesEqual(item.selectedVariant?.name, variantName))
          ),
        }));
      },
      updateQuantity: (productId, quantity, variantName) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === productId && areVariantNamesEqual(item.selectedVariant?.name, variantName)
              ? { ...item, quantity: Math.max(1, quantity) } 
              : item
          ),
        }));
      },
      applyCoupon: (coupon: Coupon | null) => set({ appliedCoupon: coupon }),
      setCoupon: (coupon: Coupon | null) => set({ appliedCoupon: coupon }),
      clearCart: () => set({ items: [], appliedCoupon: null }),
      getTotals: (currency: string = 'RON', shippingCost: number = 0) => {
        const state = get();
        const subtotal = state.items.reduce(
          (acc, item) => acc + getProductPrice(item.price, currency) * item.quantity,
          0
        );
        
        // 1. Bundle Discount (10% for 2+ DIFFERENT products, e.g. X5 + X10)
        const uniqueProductIds = new Set(
          state.items.map(item => String(item.id || '').replace(/^(.+)-bundle-\d+$/, '$1'))
        );
        const hasBundle = uniqueProductIds.size >= 2;
        const discount = hasBundle ? Number((subtotal * 0.10).toFixed(2)) : 0;

        // 2. Coupon logic
        let couponDiscount = 0;
        let shippingDiscount = false;
        const coupon = state.appliedCoupon;

        const effectiveSubtotal = Math.max(0, subtotal - discount);

        if (coupon) {
          if (coupon.type === 'percentage') {
            // Apply only to products (effective subtotal)
            couponDiscount = effectiveSubtotal * (coupon.value / 100);
            
            if (coupon.max_discount && coupon.max_discount > 0) {
              const maxDisc = (currency === 'RON') ? coupon.max_discount : getProductPrice(coupon.max_discount, currency);
              if (couponDiscount > maxDisc) {
                couponDiscount = maxDisc;
              }
            }
          } else if (coupon.type === 'fixed_amount') {
            couponDiscount = (currency === 'RON') ? coupon.value : getProductPrice(coupon.value, currency);
          } else if (coupon.type === 'free_shipping') {
            shippingDiscount = true;
          }
          couponDiscount = Math.min(effectiveSubtotal, couponDiscount);
        }

        return {
          subtotal: Number(subtotal.toFixed(2)),
          discount: Number(discount.toFixed(2)),
          couponDiscount: Number(couponDiscount.toFixed(2)),
          shippingDiscount: shippingDiscount,
          total: Number(Math.max(0, subtotal - discount - couponDiscount + shippingCost).toFixed(2)),
          hasBundle: hasBundle
        };
      },
    }),
    {
      name: "campion-cart",
      partialize: (state) => ({ items: state.items, appliedCoupon: state.appliedCoupon }),
    }
  )
);


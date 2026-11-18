import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product } from "@/lib/api";
import { Coupon } from "@/types/coupon";
import { getProductPrice } from "@/utils/pricing";
import { computeCartDiscountBreakdown, computeCouponDiscountBreakdown } from "@/lib/cart-calculations";
import {
  isDigitalProgramItem,
} from "@/lib/programs";
import toast from "react-hot-toast";

export interface CartItem extends Product {
  quantity: number;
  stock_status?: string;
  selectedVariant?: {
    name: string;
    image?: string;
    imageIndex?: number;
    stock_status?: string;
  };
}

export interface PreorderConflictData {
  isOpen: boolean;
  incomingIsPreorder: boolean;
  incomingProduct: any;
  incomingVariant?: any;
  incomingQuantity?: number;
  incomingItems?: Array<{ product: any; variant?: any; quantity?: number }>;
  currentHasPreorder?: boolean;
}

interface CartState {
  items: CartItem[];
  appliedCoupon: Coupon | null;
  preorderConflict: PreorderConflictData | null;
  addItem: (product: Product, variant?: { name: string; image?: string; imageIndex?: number; stock_status?: string }, quantity?: number, options?: { openCart?: boolean }) => boolean;
  addItemsBatch: (entries: Array<{ product: Product; variant?: { name: string; image?: string; imageIndex?: number; stock_status?: string }; quantity?: number }>, options?: { openCart?: boolean }) => boolean;
  removeItem: (productId: string, variantName?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantName?: string) => void;
  syncCartWithCatalog: (catalog: Product[]) => void;
  clearCart: () => void;
  setCoupon: (coupon: Coupon | null) => void;
  isCartOpen: boolean;
  setCartOpen: (isOpen: boolean) => void;
  closePreorderConflict: () => void;
  resolvePreorderConflictWithReplace: () => void;
  getTotals: (currency?: string, shippingCost?: number) => { 
    subtotal: number; 
    discount: number; 
    comboDiscount: number;
    tieredDiscount: number;
    bundlePercent: 0 | 5 | 10;
    itemCount: number;
    couponDiscount: number; 
    shippingDiscount: boolean; 
    total: number; 
    hasBundle: boolean; 
  };
}
const getStoreLocale = (): "ro" | "en" => {
  if (typeof window !== "undefined") {
    if (document.documentElement.lang?.toLowerCase().startsWith("en") || window.location.pathname.startsWith("/en")) {
      return "en";
    }
  }
  return "ro";
};

const normalizeLanguageVariantToken = (val: string): string => {
  const clean = val.trim().toLowerCase();
  if (clean === "română" || clean === "romana" || clean === "romanian" || clean === "ro") {
    return "__lang_ro__";
  }
  if (clean === "english" || clean === "engleză" || clean === "engleza" || clean === "en") {
    return "__lang_en__";
  }
  return clean;
};

const areVariantNamesEqual = (name1: any, name2: any) => {
  if (name1 === name2) return true;
  if (!name1 || !name2) return false;
  const getRo = (n: any) => (typeof n === 'object' ? n.ro : n);
  const getEn = (n: any) => (typeof n === 'object' ? n.en : n);
  const ro1 = getRo(name1);
  const ro2 = getRo(name2);
  if (ro1 && ro2 && normalizeLanguageVariantToken(String(ro1)) === normalizeLanguageVariantToken(String(ro2))) return true;
  const en1 = getEn(name1);
  const en2 = getEn(name2);
  if (en1 && en2 && normalizeLanguageVariantToken(String(en1)) === normalizeLanguageVariantToken(String(en2))) return true;
  const s1 = String(ro1 || en1 || '').trim();
  const s2 = String(ro2 || en2 || '').trim();
  return Boolean(s1 && s2 && normalizeLanguageVariantToken(s1) === normalizeLanguageVariantToken(s2));
};

export const isPreorder = (product: any, variant?: any): boolean => {
  if (!product) return false;
  if (product.stock_status === 'preorder' || product.is_preorder === true) return true;
  if (product.selectedVariant?.stock_status === 'preorder') return true;

  const v = variant || product.selectedVariant || product.variant;
  if (v) {
    const vName = typeof v === 'object' ? (v.name?.ro || v.name?.en || v.name || '') : String(v);
    const baseName = String(vName).split(' · ')[0].trim();
    const vLower = String(vName).toLowerCase();
    const baseLower = baseName.toLowerCase();

    if (vLower.includes('precomand') || vLower.includes('pre-order') || vLower.includes('preorder')) {
      return true;
    }

    if (product.variants?.options) {
      const selectedOpt = product.variants.options.find((opt: any) => {
        const optRo = typeof opt.name === 'object' ? opt.name.ro : opt.name;
        const optEn = typeof opt.name === 'object' ? opt.name.en : opt.name;
        const optRoLow = String(optRo || '').trim().toLowerCase();
        const optEnLow = String(optEn || '').trim().toLowerCase();
        return (
          optRo === vName ||
          optEn === vName ||
          optRo === baseName ||
          optEn === baseName ||
          (optRoLow && (optRoLow === vLower || optRoLow === baseLower)) ||
          (optEnLow && (optEnLow === vLower || optEnLow === baseLower)) ||
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
        if (!conflict || (!conflict.incomingProduct && !conflict.incomingItems?.length)) {
          set({ preorderConflict: null });
          return;
        }

        const { incomingProduct, incomingVariant, incomingQuantity, incomingItems, incomingIsPreorder } = conflict;
        const nextItems: CartItem[] = incomingItems?.length
          ? incomingItems.map((entry) => ({
              ...entry.product,
              quantity: Math.max(1, Math.floor(entry.quantity || 1)),
              selectedVariant: entry.variant,
            }))
          : [{ ...incomingProduct, quantity: Math.max(1, Math.floor(incomingQuantity || 1)), selectedVariant: incomingVariant }];

        set({
          items: nextItems,
          preorderConflict: null,
          isCartOpen: true
        });

        const isRo = getStoreLocale() === 'ro';
        toast.success(
          incomingIsPreorder 
            ? (isRo ? "Coșul a fost actualizat exclusiv pentru precomandă!" : "Your cart has been updated for pre-order items!")
            : (isRo ? "Coșul a fost actualizat cu produsele în stoc!" : "Your cart has been updated with in-stock items!"),
          { icon: '📦' }
        );
      },
      addItemsBatch: (entries, options) => {
        const state = get();
        if (!entries || entries.length === 0) return false;
        const shouldOpenCart = options?.openCart !== false;
        const isRo = getStoreLocale() === 'ro';

        for (const entry of entries) {
          if (isMixedBundle(entry.product, entry.variant)) {
            toast.error(
              isRo
                ? "Nu poți amesteca variante aflate pe precomandă cu variante normale în același pachet."
                : "You cannot mix pre-order variants with in-stock variants in the same bundle.",
              {
                duration: 5000,
                style: { border: '1px solid #ef4444', padding: '16px', color: '#7f1d1d', fontWeight: 'bold' }
              }
            );
            return false;
          }
        }

        const anyIncomingPreorder = entries.some(
          (e) => !isDigitalProgramItem(e.product) && isPreorder(e.product, e.variant || (e.product as any)?.selectedVariant)
        );
        const anyIncomingInStock = entries.some(
          (e) => !isDigitalProgramItem(e.product) && !isPreorder(e.product, e.variant || (e.product as any)?.selectedVariant)
        );
        if (anyIncomingPreorder && anyIncomingInStock) {
          toast.error(
            isRo
              ? "Nu poți combina produse aflate pe precomandă cu produse din stoc în același pachet."
              : "You cannot combine pre-order items with in-stock items in the same bundle.",
            { duration: 5000 }
          );
          return false;
        }

        const currentHasPreorder = state.items.some(
          (item) => !isDigitalProgramItem(item) && isPreorder(item, item.selectedVariant)
        );
        const currentHasInStock = state.items.some(
          (item) => !isDigitalProgramItem(item) && !isPreorder(item, item.selectedVariant)
        );

        const incomingHasPhysical = entries.some((e) => !isDigitalProgramItem(e.product));

        if (
          incomingHasPhysical &&
          state.items.length > 0 &&
          ((anyIncomingPreorder && currentHasInStock) || (!anyIncomingPreorder && currentHasPreorder))
        ) {
          set({
            preorderConflict: {
              isOpen: true,
              currentHasPreorder,
              incomingIsPreorder: anyIncomingPreorder,
              incomingProduct: entries[0].product,
              incomingVariant: entries[0].variant || (entries[0].product as any)?.selectedVariant,
              incomingQuantity: Math.max(1, Math.floor(entries[0].quantity || 1)),
              incomingItems: entries,
            },
            isCartOpen: true,
          });
          return false;
        }

        set((prev) => {
          let updated = [...prev.items];
          for (const entry of entries) {
            const resolvedVariant = entry.variant || (entry.product as any)?.selectedVariant;
            const qty = Math.max(1, Math.floor(entry.quantity || 1));
            const idx = updated.findIndex(
              (item) => item.id === entry.product.id && areVariantNamesEqual(item.selectedVariant?.name, resolvedVariant?.name)
            );
            if (idx >= 0) {
              updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + qty };
            } else {
              updated.push({ ...entry.product, quantity: qty, selectedVariant: resolvedVariant });
            }
          }
          return { items: updated, isCartOpen: shouldOpenCart ? true : prev.isCartOpen };
        });

        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('tz:cart_add', { detail: { productId: entries[0].product.id } }));
          } catch (e) {}
        }
        return true;
      },
      addItem: (product, variant, quantity = 1, options) => {
        return get().addItemsBatch([{ product, variant, quantity }], options);
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
      syncCartWithCatalog: (catalog) => {
        if (!Array.isArray(catalog) || catalog.length === 0) return;
        set((state) => {
          let changed = false;
          const nextItems = state.items.map((item) => {
            if (/-bundle-\d+$/.test(String(item.id || ""))) return item;
            const match = catalog.find(
              (p) => p.id === item.id || (item.slug && p.slug === item.slug)
            );
            if (!match) return item;
            const nextPrice = Number(match.price);
            const nextOrig = match.originalPrice !== undefined ? Number(match.originalPrice) : undefined;
            if (
              Number.isFinite(nextPrice) &&
              nextPrice > 0 &&
              (Math.abs(Number(item.price) - nextPrice) > 0.001 || item.originalPrice !== nextOrig)
            ) {
              changed = true;
              return { ...item, price: nextPrice, originalPrice: nextOrig };
            }
            return item;
          });
          return changed ? { items: nextItems } : state;
        });
      },
      applyCoupon: (coupon: Coupon | null) => set({ appliedCoupon: coupon }),
      setCoupon: (coupon: Coupon | null) => set({ appliedCoupon: coupon }),
      clearCart: () => set({ items: [], appliedCoupon: null }),
      getTotals: (currency: string = 'RON', shippingCost: number = 0) => {
        const state = get();
        const {
          subtotalSubunits,
          bundleDiscountSubunits,
          comboDiscountSubunits,
          tieredDiscountSubunits,
          bundlePercent,
          itemCount,
          hasBundle,
        } = computeCartDiscountBreakdown(state.items, currency, 100);
        const subtotal = subtotalSubunits / 100;
        const discount = bundleDiscountSubunits / 100;
        const comboDiscount = comboDiscountSubunits / 100;
        const tieredDiscount = tieredDiscountSubunits / 100;

        // 2. Coupon logic — shared parity helper with backend calculateOrderTotal
        const {
          couponDiscountSubunits,
          shippingDiscount,
        } = computeCouponDiscountBreakdown(
          subtotalSubunits,
          bundleDiscountSubunits,
          state.appliedCoupon,
          currency,
          100
        );

        const couponDiscount = couponDiscountSubunits / 100;

        return {
          subtotal: Number(subtotal.toFixed(2)),
          discount: Number(discount.toFixed(2)),
          comboDiscount: Number(comboDiscount.toFixed(2)),
          tieredDiscount: Number(tieredDiscount.toFixed(2)),
          bundlePercent,
          itemCount,
          couponDiscount: Number(couponDiscount.toFixed(2)),
          shippingDiscount,
          total: Number(Math.max(0, subtotal - discount - couponDiscount + shippingCost).toFixed(2)),
          hasBundle
        };
      },
    }),
    {
      name: "campion-cart",
      partialize: (state) => ({ items: state.items, appliedCoupon: state.appliedCoupon }),
    }
  )
);

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "campion-cart") {
      useCartStore.persist.rehydrate();
    }
  });
}


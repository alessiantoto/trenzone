import { supabaseAdmin } from "@/lib/supabase-admin";
import { getProducts } from "@/lib/api";
import { calculateOrderTotal, CartItem } from "@/lib/cart-calculations";
import { ALLOWED_SHIPPING_COUNTRIES, COUNTRY_SERVICES } from "@/lib/shipping-config";
import { validateCoupon } from "@/app/actions/coupons";
import { isDigitalProgramItem } from "@/lib/programs";

export const BUNDLE_REGEX = /^(.+)-bundle-(\d+)$/;
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ParsedCartItem {
  raw: any;
  _realId: string;
  _bundleQty: number;
  _isBundle: boolean;
}

export interface DbCheckoutProduct {
  id: string;
  slug: string;
  name: any;
  price: number;
  weight: number;
  stock_quantity: number | null;
  is_active: boolean | null;
  is_digital?: boolean;
  specs_summary?: any;
  variants: any;
  bundlevariants: any;
  metadata?: Record<string, any> | null;
}

export function extractRawVariantName(item: any, locale: "ro" | "en" = "ro"): string {
  const raw = item?.selectedVariant?.name ?? item?.variant ?? "";
  if (raw && typeof raw === "object") {
    return String(
      locale === "en"
        ? raw.en || raw.ro || Object.values(raw)[0] || ""
        : raw.ro || raw.en || Object.values(raw)[0] || ""
    ).trim();
  }
  return String(raw || "").trim();
}

export function findMatchingVariantOption(dbProduct: DbCheckoutProduct, item: any): any | null {
  const options: any[] = dbProduct?.variants?.options;
  if (!Array.isArray(options) || options.length === 0) return null;

  const candidates: string[] = [];
  const raw = item?.selectedVariant?.name ?? item?.variant;
  if (raw && typeof raw === "object") {
    if (raw.ro) candidates.push(String(raw.ro));
    if (raw.en) candidates.push(String(raw.en));
  } else if (raw) {
    candidates.push(String(raw));
  }

  const normalizedTargets = new Set<string>();
  for (const cand of candidates) {
    const full = cand.trim().toLowerCase();
    if (full) normalizedTargets.add(full);
    // Multi-attribute variant names are formatted as "<optionName> · <size>"
    const base = cand.split(" · ")[0].trim().toLowerCase();
    if (base) normalizedTargets.add(base);
  }

  if (normalizedTargets.size === 0) return null;

  return (
    options.find((opt) => {
      const optRo =
        typeof opt?.name === "object"
          ? String(opt.name.ro || "").trim().toLowerCase()
          : String(opt?.name || "").trim().toLowerCase();
      const optEn =
        typeof opt?.name === "object"
          ? String(opt.name.en || "").trim().toLowerCase()
          : optRo;
      return (
        (optRo && normalizedTargets.has(optRo)) ||
        (optEn && normalizedTargets.has(optEn))
      );
    }) || null
  );
}

export function isItemPreorder(item: any, dbProduct?: DbCheckoutProduct | null): boolean {
  const matchedOption = dbProduct ? findMatchingVariantOption(dbProduct, item) : null;
  if (matchedOption?.stock_status === "preorder") {
    return true;
  }

  const vName =
    typeof item?.selectedVariant?.name === "object"
      ? `${item.selectedVariant.name.ro || ""} ${item.selectedVariant.name.en || ""}`
      : String(item?.selectedVariant?.name || item?.variant || "");
  const baseLower = vName.split(" · ")[0].trim().toLowerCase();
  const fullLower = vName.toLowerCase();

  return (
    item?.stock_status === "preorder" ||
    item?.is_preorder === true ||
    item?.selectedVariant?.stock_status === "preorder" ||
    baseLower.includes("precomand") ||
    baseLower.includes("pre-order") ||
    baseLower.includes("preorder") ||
    fullLower.includes("precomand") ||
    fullLower.includes("pre-order") ||
    fullLower.includes("preorder")
  );
}

export function isItemUnavailableOrSoldOut(
  item: any,
  dbProduct: DbCheckoutProduct,
  isPreorder: boolean
): { blocked: boolean; reasonRo: string; reasonEn: string } {
  const productLabel =
    typeof dbProduct.name === "object"
      ? dbProduct.name.ro || dbProduct.name.en || dbProduct.slug
      : String(dbProduct.name || dbProduct.slug || "Produs");

  if (dbProduct.is_active === false) {
    return {
      blocked: true,
      reasonRo: `Produsul „${productLabel}” nu mai este disponibil.`,
      reasonEn: `The product "${productLabel}" is no longer available.`,
    };
  }

  const matchedOption = findMatchingVariantOption(dbProduct, item);
  const optStatus = String(
    matchedOption?.stock_status || item?.selectedVariant?.stock_status || ""
  ).toLowerCase();

  if (optStatus === "sold_out" || optStatus === "out_of_stock") {
    const vName = extractRawVariantName(item, "ro");
    return {
      blocked: true,
      reasonRo: `Varianta selectată (${vName || productLabel}) este epuizată (Stoc epuizat).`,
      reasonEn: `Selected variant (${vName || productLabel}) is currently sold out.`,
    };
  }

  const isSoftStock = Boolean(dbProduct?.metadata?.soft_stock_tracking);
  if (
    !isSoftStock &&
    !isPreorder &&
    typeof dbProduct.stock_quantity === "number" &&
    dbProduct.stock_quantity <= 0
  ) {
    return {
      blocked: true,
      reasonRo: `Produsul „${productLabel}” are stoc epuizat.`,
      reasonEn: `The product "${productLabel}" is out of stock.`,
    };
  }

  return { blocked: false, reasonRo: "", reasonEn: "" };
}

export function parseAndStripBundleIds(items: any[]): ParsedCartItem[] {
  return items.map((item: any) => {
    const match = String(item?.id || "").match(BUNDLE_REGEX);
    if (match) {
      return {
        raw: item,
        _realId: match[1],
        _bundleQty: parseInt(match[2], 10),
        _isBundle: true,
      };
    }
    return {
      raw: item,
      _realId: String(item?.id || ""),
      _bundleQty: 1,
      _isBundle: false,
    };
  });
}

export async function fetchServerProductsForItems(
  parsedItems: ParsedCartItem[]
): Promise<DbCheckoutProduct[]> {
  const productIds = Array.from(new Set(parsedItems.map((i) => i._realId).filter(Boolean)));
  const uuids = productIds.filter((id) => UUID_REGEX.test(id));
  const slugs = productIds.filter((id) => !UUID_REGEX.test(id));

  let dbProducts: DbCheckoutProduct[] = [];
  const selectCols =
    "id, price_numeric, weight, slug, name, stock_quantity, is_active, variants, bundlevariants, specs_summary, metadata";

  if (uuids.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select(selectCols)
      .in("id", uuids);
    if (error) console.error("[CHECKOUT HELPERS] Supabase UUID query error:", error);
    if (data) {
      dbProducts = [
        ...dbProducts,
        ...data.map((d: any) => ({
          id: d.id,
          slug: d.slug,
          name: d.name,
          price: Number(d.price_numeric),
          weight: d.weight !== null && d.weight !== undefined && Number(d.weight) >= 0 ? Number(d.weight) : 0.2,
          stock_quantity: d.stock_quantity ?? null,
          is_active: d.is_active ?? true,
          specs_summary: d.specs_summary || undefined,
          is_digital: isDigitalProgramItem(d),
          variants: d.variants || null,
          bundlevariants: d.bundlevariants || null,
          metadata: d.metadata || null,
        })),
      ];
    }
  }

  if (slugs.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select(selectCols)
      .in("slug", slugs);
    if (error) console.error("[CHECKOUT HELPERS] Supabase Slug query error:", error);
    if (data) {
      dbProducts = [
        ...dbProducts,
        ...data.map((d: any) => ({
          id: d.id,
          slug: d.slug,
          name: d.name,
          price: Number(d.price_numeric),
          weight: d.weight !== null && d.weight !== undefined && Number(d.weight) >= 0 ? Number(d.weight) : 0.2,
          stock_quantity: d.stock_quantity ?? null,
          is_active: d.is_active ?? true,
          specs_summary: d.specs_summary || undefined,
          is_digital: isDigitalProgramItem(d),
          variants: d.variants || null,
          bundlevariants: d.bundlevariants || null,
          metadata: d.metadata || null,
        })),
      ];
    }
  }

  // Fallback to static server catalog if any product isn't present in DB
  const allLocalProducts = await getProducts();
  allLocalProducts
    .filter((p) => productIds.includes(p.id) || productIds.includes(p.slug))
    .forEach((lp) => {
      if (!dbProducts.some((dbp) => dbp.id === lp.id || dbp.slug === lp.slug)) {
        const rawPrice =
          typeof lp.price === "object"
            ? (lp.price as any).ro || Object.values(lp.price)[0]
            : lp.price;
        dbProducts.push({
          id: lp.id,
          slug: lp.slug,
          name: lp.name,
          price: Number(rawPrice) || 0,
          weight: lp.weight !== undefined && Number(lp.weight) >= 0 ? Number(lp.weight) : 0.2,
          stock_quantity: lp.stock_quantity ?? 100,
          is_active: lp.is_active ?? true,
          specs_summary: lp.specs_summary,
          is_digital: isDigitalProgramItem(lp),
          variants: lp.variants || null,
          bundlevariants: lp.bundleVariants || null,
          metadata: (lp as any).metadata || null,
        });
      }
    });

  return dbProducts;
}

export function buildServerCalculationItems(
  parsedItems: ParsedCartItem[],
  dbProducts: DbCheckoutProduct[],
  locale: "ro" | "en" = "ro"
): {
  ok: true;
  calculationItems: CartItem[];
  resolvedPerItem: Array<{
    parsed: ParsedCartItem;
    dbProduct: DbCheckoutProduct;
    isPreorder: boolean;
    price: number;
  }>;
  hasPreorder: boolean;
  hasInStock: boolean;
} | {
  ok: false;
  status: number;
  error: string;
} {
  if (dbProducts.length === 0) {
    return {
      ok: false,
      status: 400,
      error:
        locale === "en"
          ? "Invalid products (stale cart data). Please clear your cart."
          : "Produse invalide în coș. Te rugăm să golești coșul și să încerci din nou.",
    };
  }

  const calculationItems: CartItem[] = [];
  const resolvedPerItem: Array<{
    parsed: ParsedCartItem;
    dbProduct: DbCheckoutProduct;
    isPreorder: boolean;
    price: number;
  }> = [];

  for (const parsed of parsedItems) {
    const dbProduct = dbProducts.find(
      (p) => p.id === parsed._realId || p.slug === parsed._realId
    );
    if (!dbProduct) {
      return {
        ok: false,
        status: 400,
        error:
          locale === "en"
            ? `Product not found (${parsed._realId}). Please clear your cart.`
            : `Produs inexistent (${parsed._realId}). Te rugăm să golești coșul.`,
      };
    }

    const isPre = isItemPreorder(parsed.raw, dbProduct);
    const stockCheck = isItemUnavailableOrSoldOut(parsed.raw, dbProduct, isPre);
    if (stockCheck.blocked) {
      return {
        ok: false,
        status: 400,
        error: locale === "en" ? stockCheck.reasonEn : stockCheck.reasonRo,
      };
    }

    let unitOrBundlePrice = Number(dbProduct.price);
    if (parsed._isBundle && parsed._bundleQty > 1) {
      const qty = Math.min(Math.max(1, Number(parsed._bundleQty) || 1), 10);
      const bundleDiscountRon = Math.max(0, (Math.min(qty, 4) - 1) * 15);
      unitOrBundlePrice = Math.max(
        unitOrBundlePrice,
        unitOrBundlePrice * qty - bundleDiscountRon
      );
    }

    const itemQty = Math.max(1, Math.floor(Number(parsed.raw?.quantity) || 1));
    const itemIsDigital = isDigitalProgramItem(dbProduct);
    calculationItems.push({
      id: parsed.raw?.id || dbProduct.id,
      slug: dbProduct.slug,
      name: dbProduct.name,
      quantity: itemQty,
      weight: itemIsDigital ? 0 : (Number(dbProduct.weight) > 0 ? Number(dbProduct.weight) : 0.2),
      price: unitOrBundlePrice,
      is_digital: itemIsDigital,
      specs_summary: dbProduct.specs_summary,
    });

    resolvedPerItem.push({
      parsed,
      dbProduct,
      isPreorder: isPre,
      price: unitOrBundlePrice,
    });
  }

  const hasPreorder = resolvedPerItem.some((r) => r.isPreorder);
  const hasInStock = resolvedPerItem.some(
    (r) => !r.isPreorder && !isDigitalProgramItem(r.dbProduct)
  );

  return {
    ok: true,
    calculationItems,
    resolvedPerItem,
    hasPreorder,
    hasInStock,
  };
}

export async function resolveServerCoupon(
  couponCode: string | null | undefined,
  calculationItems: CartItem[],
  currency: string,
  multiplier: number,
  locale: "ro" | "en",
  strict = false
): Promise<{
  ok: true;
  couponData: any | null;
} | {
  ok: false;
  error: string;
}> {
  const clean = typeof couponCode === "string" ? couponCode.trim() : "";
  if (!clean) return { ok: true, couponData: null };

  const preResult = calculateOrderTotal(calculationItems, currency);
  const subtotalMajor = preResult.subtotal / multiplier;

  try {
    const couponResult = await validateCoupon(clean, subtotalMajor, currency, locale);
    if (couponResult?.isValid && couponResult?.coupon) {
      return { ok: true, couponData: couponResult.coupon };
    }
    if (strict) {
      return {
        ok: false,
        error:
          couponResult?.message ||
          (locale === "en"
            ? "The applied coupon code is no longer valid."
            : "Codul de reducere aplicat nu mai este valid."),
      };
    }
  } catch (err) {
    console.warn("[CHECKOUT HELPERS] Coupon validation warning:", err);
    if (strict) {
      return {
        ok: false,
        error:
          locale === "en"
            ? "Failed to validate coupon code."
            : "Nu s-a putut valida codul de reducere.",
      };
    }
  }

  return { ok: true, couponData: null };
}

export function validateShippingSelection(params: {
  country?: string;
  shippingType?: string;
  carrierId?: string;
  branchId?: string;
  locale?: "ro" | "en";
  lockersEnabled?: boolean;
}): { ok: true; country: string; shippingType: "hd" | "pudo"; carrierId: string } | { ok: false; error: string } {
  const isEn = params.locale === "en";
  const country = String(params.country || "").trim().toUpperCase();
  if (!country || !ALLOWED_SHIPPING_COUNTRIES.includes(country)) {
    return {
      ok: false,
      error: isEn
        ? "Shipping is not available to the selected country."
        : "Livrarea nu este disponibilă în țara selectată.",
    };
  }

  const shippingType: "hd" | "pudo" = params.shippingType === "pudo" ? "pudo" : "hd";
  if (shippingType === "pudo" && (!params.lockersEnabled || country !== "RO")) {
    return {
      ok: false,
      error: isEn
        ? "Parcel locker delivery is disabled. Please choose home delivery."
        : "Livrarea în lockere / Easybox este dezactivată. Te rugăm să alegi livrarea la domiciliu.",
    };
  }

  const services = COUNTRY_SERVICES[country] || COUNTRY_SERVICES.DEFAULT;
  const availableList = services[shippingType] || [];

  if (availableList.length === 0) {
    return {
      ok: false,
      error: isEn
        ? "The selected delivery method is not available in your country."
        : "Metoda de livrare selectată nu este disponibilă pentru această țară.",
    };
  }

  if (shippingType === "pudo" && (!params.branchId || !String(params.branchId).trim())) {
    return {
      ok: false,
      error: isEn
        ? "Please select a parcel locker / pickup point."
        : "Te rugăm să selectezi un Easybox / locker pentru livrare.",
    };
  }

  const requestedCarrier = params.carrierId ? String(params.carrierId).trim() : "";
  const validCarrier =
    availableList.find((s) => s.id === requestedCarrier)?.id || availableList[0].id;

  return {
    ok: true,
    country,
    shippingType,
    carrierId: validCarrier,
  };
}

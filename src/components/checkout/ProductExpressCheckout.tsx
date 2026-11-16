"use client";

import React, { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, ExpressCheckoutElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useLocale } from "next-intl";
import { COUNTRY_SERVICES, ALLOWED_SHIPPING_COUNTRIES, EXPRESS_ALLOWED_COUNTRIES } from "@/lib/shipping-config";
import { useRegionStore } from "@/store/useRegionStore";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { useCartStore } from "@/store/useCartStore";
import { calculateOrderTotal, CartItem } from "@/lib/cart-calculations";
import { useShippingConfig } from "@/lib/use-shipping-config";
import { isDigitalProgramItem } from "@/lib/programs";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

interface ProductExpressCheckoutProps {
  orderItems: any[]; // The exact items array to send to /api/checkout
  basePrice: number; // The pre-calculated total price in RON (before shipping)
  disabled?: boolean;
  onWalletsReady?: (hasWallets: boolean) => void;
}

interface ExpressCheckoutInnerProps extends ProductExpressCheckoutProps {
  csrfToken: string;
  locale: string;
  appliedCoupon: any;
}

const ExpressCheckoutInner = ({
  orderItems,
  basePrice,
  disabled,
  csrfToken,
  locale,
  appliedCoupon,
  onWalletsReady
}: ExpressCheckoutInnerProps) => {
  const stripe = useStripe();
  const stripeElements = useElements();
  const { currency, countryCode: regionCountryCode } = useRegionStore();
  const checkoutCountry = useCheckoutStore((s) => s.country);
  const initialCountry = (checkoutCountry && ALLOWED_SHIPPING_COUNTRIES.includes(checkoutCountry)
    ? checkoutCountry
    : regionCountryCode && ALLOWED_SHIPPING_COUNTRIES.includes(regionCountryCode)
      ? regionCountryCode
      : 'RO').toUpperCase();
  const shippingConfig = useShippingConfig();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExpressReady, setIsExpressReady] = useState(false);
  const [hasWallets, setHasWallets] = useState(false);
  const selectedCountryRef = useRef<string>(initialCountry);
  const isConfirmingRef = useRef<boolean>(false);

  const calculationItems: CartItem[] = (orderItems || []).map(item => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    quantity: Math.max(1, Number(item.quantity) || 1),
    price: item.price,
    is_digital: Boolean(item.is_digital || item?.specs_summary?.is_digital),
    specs_summary: item.specs_summary,
    weight: isDigitalProgramItem(item) ? 0 : (Number(item.weight) > 0 ? Number(item.weight) : 0.2),
  }));

  const buildExpressDetails = (rawCountry: string) => {
    const country = (rawCountry || 'RO').toUpperCase();
    const calc = calculateOrderTotal(
      calculationItems,
      currency,
      country,
      'hd',
      appliedCoupon,
      undefined,
      {
        payment_method: 'online',
        free_shipping_ro_ron: shippingConfig.free_shipping_ro_ron,
        free_shipping_intl_eur: shippingConfig.free_shipping_intl_eur,
      }
    );

    const firstRawName = orderItems[0]?.name;
    const firstItemName =
      typeof firstRawName === 'object' && firstRawName !== null
        ? firstRawName[locale === 'en' ? 'en' : 'ro'] || firstRawName.ro || firstRawName.en || 'TrenZone'
        : firstRawName || (locale === 'ro' ? 'Pachet TrenZone' : 'TrenZone Bundle');

    const lineLabel =
      orderItems.length > 1
        ? (locale === 'ro' ? `Produse (${orderItems.length})` : `Items (${orderItems.length})`)
        : firstItemName;

    const lineItems: any[] = [{ name: lineLabel, amount: calc.subtotal }];

    if (calc.bundleDiscount > 0) {
      lineItems.push({
        name: locale === 'ro' ? `Reducere pachet (${calc.bundlePercent}%)` : `Bundle discount (${calc.bundlePercent}%)`,
        amount: -calc.bundleDiscount
      });
    }

    if (calc.couponDiscount > 0) {
      lineItems.push({
        name: `${locale === 'ro' ? 'Cupon' : 'Coupon'} (${appliedCoupon?.code || ''})`,
        amount: -calc.couponDiscount
      });
    }

    if (calc.cardDiscount > 0) {
      lineItems.push({
        name: locale === 'ro' ? 'Reducere card' : 'Card discount',
        amount: -calc.cardDiscount
      });
    }

    const shippingLabel = calc.shippingCost === 0
      ? (locale === 'ro' ? 'Livrare gratuită' : 'Free shipping')
      : (country === 'RO'
        ? (locale === 'ro' ? 'Sameday Standard (1-3 Zile)' : 'Sameday Standard (1-3 Days)')
        : (locale === 'ro' ? 'Livrare Standard / Internațională' : 'Standard International Shipping'));

    const shippingRates = [
      {
        id: 'standard-shipping',
        displayName: shippingLabel,
        amount: calc.shippingCost,
        deliveryEstimate: {
          minimum: { unit: 'day' as const, value: 1 },
          maximum: { unit: 'day' as const, value: 3 },
        },
      }
    ];

    return { calc, lineItems, shippingRates };
  };

  const handleShippingAddressChange = (event: any) => {
    try {
      const addr = event.address || event.shippingAddress || {};
      const country = (addr.country || 'RO').toUpperCase();
      selectedCountryRef.current = country;

      const { calc, lineItems, shippingRates } = buildExpressDetails(country);

      if (stripeElements && typeof stripeElements.update === 'function') {
        stripeElements.update({ amount: Math.max(1, calc.total) });
      }

      event.resolve({
        shippingRates,
        lineItems
      });
    } catch (err) {
      console.error("Shipping address change error:", err);
      const fallbackDetails = buildExpressDetails(selectedCountryRef.current || 'RO');
      if (stripeElements && typeof stripeElements.update === 'function') {
        stripeElements.update({ amount: Math.max(1, fallbackDetails.calc.total) });
      }
      event.resolve({
        shippingRates: fallbackDetails.shippingRates,
        lineItems: fallbackDetails.lineItems
      });
    }
  };

  const handleShippingRateChange = (event: any) => {
    try {
      const { calc, lineItems } = buildExpressDetails(selectedCountryRef.current || 'RO');
      if (stripeElements && typeof stripeElements.update === 'function') {
        stripeElements.update({ amount: Math.max(1, calc.total) });
      }
      event.resolve({ lineItems });
    } catch (err) {
      console.error("Shipping rate change error:", err);
      const fallbackDetails = buildExpressDetails(selectedCountryRef.current || 'RO');
      event.resolve({ lineItems: fallbackDetails.lineItems });
    }
  };

  const handleConfirm = async (event: any) => {
    if (isConfirmingRef.current) return;
    isConfirmingRef.current = true;
    try {
      const elements = stripeElements;
      if (!stripe || !elements) {
        event.paymentFailed?.({ message: locale === 'ro' ? 'Stripe nu s-a inițializat încă.' : 'Stripe is not ready yet.' });
        return;
      }

      const walletShipping = event.shippingAddress;
      const walletBilling = event.billingDetails;
      const walletEmail = walletBilling?.email || event.payerEmail || '';
      const walletPhone = walletShipping?.phone || walletBilling?.phone || event.payerPhone || event.phone || '';
      const countryCode = (walletShipping?.address?.country || walletShipping?.country || selectedCountryRef.current || 'RO').toUpperCase();
      selectedCountryRef.current = countryCode;

      // Ensure deferred Elements session amount matches the final selected country & shipping before submit()
      const confirmDetails = buildExpressDetails(countryCode);
      if (typeof elements.update === 'function') {
        elements.update({ amount: Math.max(1, confirmDetails.calc.total) });
      }

      // 1. Submit elements first (Stripe requirement for deferred intent)
      const { error: submitError } = await elements.submit();
      if (submitError) {
        event.paymentFailed({ message: submitError.message });
        setErrorMsg(submitError.message || (locale === 'ro' ? "Eroare procesare plată" : "Payment processing error"));
        return;
      }

      // 2. Create PaymentIntent on server with exact items, coupon, online discount, and shipping
      const effectiveCouponCode =
        confirmDetails.calc.couponApplied && appliedCoupon?.code
          ? appliedCoupon.code.trim().toUpperCase()
          : null;

      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify({
          items: orderItems,
          currency: currency,
          country: countryCode,
          shippingType: 'hd',
          couponCode: effectiveCouponCode,
          payment_method: 'online',
          priority_processing: false,
          gift_packaging: false,
          locale: locale === 'en' ? 'en' : 'ro'
        })
      });

      if (!checkoutRes.ok) {
        const err = await checkoutRes.json().catch(() => ({}));
        event.paymentFailed({ message: err.error || "Payment failed" });
        setErrorMsg(err.error || (locale === 'ro' ? "Eroare la inițierea plății" : "Payment initiation error"));
        return;
      }

      const { clientSecret } = await checkoutRes.json();
      if (!clientSecret) {
        event.paymentFailed({ message: locale === 'en' ? "No payment identifier received." : "Nu s-a primit identificator de plată." });
        return;
      }

      const nameParts = (walletShipping?.name || walletBilling?.name || '').trim().split(/\s+/).filter(Boolean);
      const fName = nameParts[0] || 'Client';
      const lName = nameParts.slice(1).join(' ') || '-';
      const defaultCarrierId = COUNTRY_SERVICES[countryCode]?.hd?.[0]?.id || COUNTRY_SERVICES['DEFAULT']?.hd?.[0]?.id || (countryCode === 'RO' ? '7' : '106');

      const piId = clientSecret.split('_secret')[0];
      const normalizedOrderItems = (orderItems || []).map((item: any) => ({
        id: item.id,
        slug: item.slug || undefined,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
        is_digital: Boolean(item.is_digital || item?.specs_summary?.is_digital),
        specs_summary: item.specs_summary,
        selectedVariant: item.selectedVariant || (item.variant ? { name: item.variant } : null),
        stock_status: item.stock_status || item.selectedVariant?.stock_status,
        is_preorder: item.is_preorder,
      }));

      // 3. Update intent with full customer address, contact details & explicit selectedVariant (mandatory final sync)
      const updateRes = await fetch("/api/checkout/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify({
          paymentIntentId: piId,
          clientSecret,
          firstName: fName,
          lastName: lName,
          email: walletEmail,
          phone: walletPhone,
          line1: walletShipping?.address?.line1 || '',
          line2: walletShipping?.address?.line2 || '',
          city: walletShipping?.address?.city || '',
          state: walletShipping?.address?.state || '',
          postal_code: walletShipping?.address?.postal_code || '',
          country: walletShipping?.address?.country || countryCode,
          shipping_type: 'hd',
          carrier_id: defaultCarrierId,
          currency: currency,
          couponCode: effectiveCouponCode,
          payment_method: 'online',
          items: normalizedOrderItems,
          locale: locale || 'ro',
          agreedToTerms: true,
          agreedToMarketing: false,
          saveInfo: false,
          isFinalSync: true
        })
      });

      if (!updateRes.ok) {
        const syncErrBody = await updateRes.json().catch(() => null);
        const syncErrMsg = syncErrBody?.error || (locale === 'ro'
          ? 'Sincronizarea datelor comenzii a eșuat înainte de plată. Încearcă din nou.'
          : 'Failed to synchronize order details before payment. Please try again.');
        event.paymentFailed({ message: syncErrMsg });
        setErrorMsg(syncErrMsg);
        return;
      }

      // 4. Confirm payment with Stripe
      const confirmResult = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/${locale}/checkout/success?express=1`,
          ...(walletEmail ? { receipt_email: walletEmail } : {}),
        },
        redirect: 'if_required',
      });

      if (confirmResult.error) {
        event.paymentFailed({ message: confirmResult.error.message });
        setErrorMsg(confirmResult.error.message || (locale === 'ro' ? "Eroare la confirmarea plății" : "Payment confirmation error"));
      } else {
        const resolvedPiId = confirmResult.paymentIntent?.id || piId;
        window.location.href = `${window.location.origin}/${locale}/checkout/success?payment_intent=${resolvedPiId}&payment_intent_client_secret=${encodeURIComponent(clientSecret)}&redirect_status=${confirmResult.paymentIntent?.status || 'succeeded'}&express=1`;
      }
    } catch (err: any) {
      console.error("ProductExpressCheckout error:", err);
      event.paymentFailed?.({ message: err.message || "System error" });
      setErrorMsg(err.message || (locale === 'ro' ? "Eroare de sistem" : "System error"));
    } finally {
      isConfirmingRef.current = false;
    }
  };

  return (
    <div className="w-full relative mt-2">
      {!isExpressReady && (
        <div className="h-12 w-full bg-zinc-100 animate-pulse rounded-xl flex items-center justify-center">
          <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
            {locale === 'ro' ? 'Se încarcă plata rapidă...' : 'Loading express checkout...'}
          </span>
        </div>
      )}
      <div className={isExpressReady && hasWallets ? "block" : isExpressReady ? "hidden" : "invisible h-0 overflow-hidden"}>
        <ExpressCheckoutElement
          onReady={({ availablePaymentMethods }: any) => {
            setIsExpressReady(true);
            const walletsAvailable = !!(availablePaymentMethods && (availablePaymentMethods.applePay || availablePaymentMethods.googlePay || availablePaymentMethods.link));
            setHasWallets(walletsAvailable);
            onWalletsReady?.(walletsAvailable);
          }}
          onLoadError={(_err: any) => {
            setIsExpressReady(true);
            setHasWallets(false);
            onWalletsReady?.(false);
          }}
          onClick={(e: any) => {
            if (disabled) {
              setErrorMsg(locale === 'ro' ? "Incomplet sau stoc epuizat" : "Incomplete or sold out");
              e?.reject?.();
              return;
            }
            const initialDetails = buildExpressDetails(selectedCountryRef.current || 'RO');
            if (stripeElements && typeof stripeElements.update === 'function') {
              stripeElements.update({ amount: Math.max(1, initialDetails.calc.total) });
            }
            e.resolve({
              lineItems: initialDetails.lineItems,
              shippingRates: initialDetails.shippingRates,
            });
            setErrorMsg(null);
          }}
          onConfirm={handleConfirm}
          onShippingAddressChange={handleShippingAddressChange}
          onShippingRateChange={handleShippingRateChange}
          options={{
            buttonHeight: 48,
            buttonTheme: {
              applePay: 'black',
              googlePay: 'white',
            },
            layout: { maxColumns: 2, maxRows: 1 },
            shippingAddressRequired: true,
            emailRequired: true,
            phoneNumberRequired: true,
            allowedShippingCountries: EXPRESS_ALLOWED_COUNTRIES,
          }}
        />
      </div>
      {errorMsg && <p className="text-red-500 text-[10px] font-bold mt-2 text-center uppercase tracking-widest">{errorMsg}</p>}
    </div>
  );
};

export const ProductExpressCheckout = (props: ProductExpressCheckoutProps) => {
  const [csrfToken, setCsrfToken] = useState<string>("");
  const { currency, countryCode: regionCountryCode } = useRegionStore();
  const checkoutCountry = useCheckoutStore((s) => s.country);
  const initialCountry = (checkoutCountry && ALLOWED_SHIPPING_COUNTRIES.includes(checkoutCountry)
    ? checkoutCountry
    : regionCountryCode && ALLOWED_SHIPPING_COUNTRIES.includes(regionCountryCode)
      ? regionCountryCode
      : 'RO').toUpperCase();
  const shippingConfig = useShippingConfig();
  const { appliedCoupon } = useCartStore();
  const locale = useLocale();

  useEffect(() => {
    fetch("/api/csrf-token")
      .then(res => res.json())
      .then(data => {
        const token = data?.csrfToken || data?.token || "";
        setCsrfToken(token);
      })
      .catch(err => {
        console.error("CSRF token fetch error in ProductExpressCheckout:", err);
      });
  }, []);

  if (!csrfToken) {
    return (
      <div className="h-12 w-full bg-zinc-900/60 border border-white/5 animate-pulse rounded-xl mt-2 flex items-center justify-center">
        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
          {locale === 'ro' ? 'Se încarcă plata rapidă...' : 'Loading express checkout...'}
        </span>
      </div>
    );
  }

  const calculationItems: CartItem[] = (props.orderItems || []).map(item => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    quantity: Math.max(1, Number(item.quantity) || 1),
    price: item.price,
    is_digital: Boolean(item.is_digital || item?.specs_summary?.is_digital),
    specs_summary: item.specs_summary,
    weight: isDigitalProgramItem(item) ? 0 : (Number(item.weight) > 0 ? Number(item.weight) : 0.2),
  }));

  const initialCalc = calculateOrderTotal(
    calculationItems,
    currency,
    initialCountry,
    'hd',
    appliedCoupon,
    undefined,
    {
      payment_method: 'online',
      free_shipping_ro_ron: shippingConfig.free_shipping_ro_ron,
      free_shipping_intl_eur: shippingConfig.free_shipping_intl_eur,
    }
  );

  if (!stripePromise) {
    return null;
  }

  return (
    <Elements
      key={`${currency}-${props.basePrice}-${appliedCoupon?.code || 'nocoupon'}`}
      stripe={stripePromise}
      options={{
        mode: 'payment',
        amount: Math.max(1, initialCalc.total),
        currency: currency.toLowerCase(),
      }}
    >
      <ExpressCheckoutInner
        {...props}
        csrfToken={csrfToken}
        locale={locale}
        appliedCoupon={appliedCoupon}
      />
    </Elements>
  );
};

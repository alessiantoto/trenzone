"use client";

import React, { useState, useEffect, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, ExpressCheckoutElement } from "@stripe/react-stripe-js";
import { useLocale } from "next-intl";
import { COUNTRY_SERVICES, ALLOWED_SHIPPING_COUNTRIES } from "@/lib/shipping-config";
import { useRegionStore } from "@/store/useRegionStore";
import { useCartStore } from "@/store/useCartStore";
import { calculateOrderTotal, CartItem } from "@/lib/cart-calculations";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder");

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
  const { currency } = useRegionStore();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExpressReady, setIsExpressReady] = useState(false);
  const [hasWallets, setHasWallets] = useState(false);
  const selectedCountryRef = useRef<string>('RO');

  const calculationItems: CartItem[] = (orderItems || []).map(item => {
    const bundleMatch = String(item.id || '').match(/^(.+)-bundle-(\d+)$/);
    const bundleQty = bundleMatch ? parseInt(bundleMatch[2], 10) : 1;
    let w = Number(item.weight) || 0;
    if (w <= 0) {
      w = 0.2 * bundleQty;
    } else if (bundleQty > 1 && w <= 0.25) {
      w = w * bundleQty;
    }
    return {
      id: item.id,
      quantity: Math.max(1, Number(item.quantity) || 1),
      price: item.price,
      weight: w
    };
  });

  const handleShippingAddressChange = (event: any) => {
    try {
      const addr = event.address || event.shippingAddress || {};
      const country = (addr.country || 'RO').toUpperCase();
      selectedCountryRef.current = country;

      const calc = calculateOrderTotal(
        calculationItems,
        currency,
        country,
        'hd',
        appliedCoupon,
        undefined,
        { payment_method: 'online' }
      );

      const itemName = orderItems[0]?.name || (locale === 'ro' ? 'Pachet TrenZone' : 'TrenZone Bundle');
      const lineItems: any[] = [
        { name: itemName, amount: calc.subtotal }
      ];

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
        : (country === 'RO' ? 'Sameday Standard (1-3 Zile)' : (locale === 'ro' ? 'Livrare Standard / Internațională' : 'Standard International Shipping'));

      // Stripe ExpressCheckout requires `shippingRates` with `displayName` (not `shippingOptions` with `label`)
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

      event.resolve({
        shippingRates,
        lineItems
      });
    } catch (err) {
      console.error("Shipping address change error:", err);
      const fallbackCalc = calculateOrderTotal(
        calculationItems,
        currency,
        selectedCountryRef.current || 'RO',
        'hd',
        appliedCoupon,
        undefined,
        { payment_method: 'online' }
      );
      const itemName = orderItems[0]?.name || (locale === 'ro' ? 'Pachet TrenZone' : 'TrenZone Bundle');
      event.resolve({
        shippingRates: [
          {
            id: 'standard-shipping',
            displayName: locale === 'ro' ? 'Livrare Standard' : 'Standard Shipping',
            amount: fallbackCalc.shippingCost || 1499,
            deliveryEstimate: {
              minimum: { unit: 'day' as const, value: 1 },
              maximum: { unit: 'day' as const, value: 3 },
            },
          }
        ],
        lineItems: [
          { name: itemName, amount: fallbackCalc.subtotal }
        ]
      });
    }
  };

  const handleShippingRateChange = (event: any) => {
    try {
      const country = selectedCountryRef.current || 'RO';

      const calc = calculateOrderTotal(
        calculationItems,
        currency,
        country,
        'hd',
        appliedCoupon,
        undefined,
        { payment_method: 'online' }
      );

      const itemName = orderItems[0]?.name || (locale === 'ro' ? 'Pachet TrenZone' : 'TrenZone Bundle');
      const lineItems: any[] = [
        { name: itemName, amount: calc.subtotal }
      ];

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

      event.resolve({
        lineItems
      });
    } catch (err) {
      console.error("Shipping rate change error:", err);
      const fallbackCalc = calculateOrderTotal(
        calculationItems,
        currency,
        selectedCountryRef.current || 'RO',
        'hd',
        appliedCoupon,
        undefined,
        { payment_method: 'online' }
      );
      const itemName = orderItems[0]?.name || (locale === 'ro' ? 'Pachet TrenZone' : 'TrenZone Bundle');
      event.resolve({
        lineItems: [
          { name: itemName, amount: fallbackCalc.subtotal }
        ]
      });
    }
  };

  const handleConfirm = async (event: any) => {
    try {
      const { stripe, elements } = event;
      if (!stripe || !elements) return;

      // 1. Submit elements first (Stripe requirement for deferred intent)
      const { error: submitError } = await elements.submit();
      if (submitError) {
        event.paymentFailed({ message: submitError.message });
        setErrorMsg(submitError.message || (locale === 'ro' ? "Eroare procesare plată" : "Payment processing error"));
        return;
      }

      const walletShipping = event.shippingAddress;
      const walletBilling = event.billingDetails;
      const walletEmail = walletBilling?.email || event.payerEmail || '';
      const countryCode = (walletShipping?.address?.country || walletShipping?.country || selectedCountryRef.current || 'RO').toUpperCase();

      // 2. Create PaymentIntent on server with exact items, coupon, online discount, and shipping
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
          couponCode: appliedCoupon?.code?.trim()?.toUpperCase() || null,
          payment_method: 'online',
          priority_processing: false,
          gift_packaging: false
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
        event.paymentFailed({ message: "Nu s-a primit identificator de plată." });
        return;
      }

      const nameParts = (walletShipping?.name || walletBilling?.name || '').trim().split(/\s+/);
      const fName = nameParts[0] || 'Client';
      const lName = nameParts.slice(1).join(' ') || fName;
      const defaultCarrierId = COUNTRY_SERVICES[countryCode]?.hd?.[0]?.id || COUNTRY_SERVICES['DEFAULT']?.hd?.[0]?.id || (countryCode === 'RO' ? '7' : '106');

      // 3. Update intent with full customer address and contact details
      await fetch("/api/checkout/update", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify({
          paymentIntentId: clientSecret.split('_secret')[0],
          firstName: fName,
          lastName: lName,
          email: walletEmail,
          phone: walletShipping?.phone || walletBilling?.phone || '',
          line1: walletShipping?.address?.line1 || '',
          line2: walletShipping?.address?.line2 || '',
          city: walletShipping?.address?.city || '',
          state: walletShipping?.address?.state || '',
          postal_code: walletShipping?.address?.postal_code || '',
          country: walletShipping?.address?.country || countryCode,
          shipping_type: 'hd',
          carrier_id: defaultCarrierId,
          currency: currency,
          couponCode: appliedCoupon?.code?.trim()?.toUpperCase() || null,
          payment_method: 'online',
          items: orderItems,
          locale: locale || 'ro',
          agreedToTerms: true,
          agreedToMarketing: false,
          saveInfo: false,
          isFinalSync: true
        })
      });

      // 4. Confirm payment with Stripe
      const confirmResult = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/${locale}/checkout/success`,
          receipt_email: walletEmail,
        },
      });

      if (confirmResult.error) {
        event.paymentFailed({ message: confirmResult.error.message });
        setErrorMsg(confirmResult.error.message || (locale === 'ro' ? "Eroare la confirmarea plății" : "Payment confirmation error"));
      } else {
        window.location.href = `${window.location.origin}/${locale}/checkout/success?payment_intent=${clientSecret.split('_secret')[0]}&payment_intent_client_secret=${encodeURIComponent(clientSecret)}&redirect_status=succeeded`;
      }
    } catch (err: any) {
      console.error("ProductExpressCheckout error:", err);
      event.paymentFailed({ message: err.message || "System error" });
      setErrorMsg(err.message || (locale === 'ro' ? "Eroare de sistem" : "System error"));
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
          onClick={(e) => {
            if (disabled) {
              setErrorMsg(locale === 'ro' ? "Incomplet sau stoc epuizat" : "Incomplete or sold out");
            } else {
              e.resolve();
              setErrorMsg(null);
            }
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
            allowedShippingCountries: ALLOWED_SHIPPING_COUNTRIES,
          }}
        />
      </div>
      {errorMsg && <p className="text-red-500 text-[10px] font-bold mt-2 text-center uppercase tracking-widest">{errorMsg}</p>}
    </div>
  );
};

export const ProductExpressCheckout = (props: ProductExpressCheckoutProps) => {
  const [csrfToken, setCsrfToken] = useState<string>("");
  const { currency } = useRegionStore();
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

  const calculationItems: CartItem[] = (props.orderItems || []).map(item => {
    const bundleMatch = String(item.id || '').match(/^(.+)-bundle-(\d+)$/);
    const bundleQty = bundleMatch ? parseInt(bundleMatch[2], 10) : 1;
    let w = Number(item.weight) || 0;
    if (w <= 0) {
      w = 0.2 * bundleQty;
    } else if (bundleQty > 1 && w <= 0.25) {
      w = w * bundleQty;
    }
    return {
      id: item.id,
      quantity: Math.max(1, Number(item.quantity) || 1),
      price: item.price,
      weight: w
    };
  });

  const initialCalc = calculateOrderTotal(
    calculationItems,
    currency,
    'RO',
    'hd',
    appliedCoupon,
    undefined,
    { payment_method: 'online' }
  );

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

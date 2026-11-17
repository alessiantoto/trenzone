"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { motion } from "framer-motion";
import { CheckCircle2, ShoppingBag, ArrowRight, Home, AlertCircle, BookOpen, Download, Loader2, Truck, Banknote, CreditCard } from "lucide-react";
import { useEffect, useState, Suspense } from "react";
import { useCartStore } from "@/store/useCartStore";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { useSearchParams } from "next/navigation";
import { getProductPrice } from "@/utils/pricing";

interface CheckoutOrderDetails {
  orderNumber: string;
  paymentIntentId?: string | null;
  status: string;
  paymentMethod: string;
  currency: string;
  subtotal: number;
  discount: number;
  cardDiscount?: number;
  shipping: number;
  total: number;
  priorityProcessing?: boolean;
  giftPackaging?: boolean;
  shippingType: "hd" | "pudo";
  branchName?: string | null;
  items: Array<{
    id: string;
    name: string;
    variant?: string | null;
    quantity: number;
    price: number;
    image?: string;
  }>;
  customer?: {
    firstName?: string;
    emailMasked?: string | null;
    city?: string;
    county?: string;
    country?: string;
  };
}

function OrderSuccessContent() {
  const t = useTranslations("Checkout");
  const locale = useLocale();
  const isEn = locale === 'en';
  const clearCart = useCartStore((state) => state.clearCart);
  const resetOrderAddons = useCheckoutStore((state) => state.resetOrderAddons);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'processing' | 'success' | 'error'>('loading');
  const [errorReason, setErrorReason] = useState<'payment_failed' | 'not_found'>('payment_failed');
  const [isCheckingAgain, setIsCheckingAgain] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [isCodOrder, setIsCodOrder] = useState(false);
  const [orderDetails, setOrderDetails] = useState<CheckoutOrderDetails | null>(null);
  const [digitalDownloads, setDigitalDownloads] = useState<
    Array<{ programKey: string; lang: string; title: string; downloadUrl: string }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    const isExpressCheckout = searchParams.get('express') === '1';

    const finishSuccess = (resolvedId?: string) => {
      if (cancelled) return;
      if (resolvedId) setPaymentIntentId(resolvedId);
      setStatus('success');
      if (!isExpressCheckout) {
        clearCart();
        resetOrderAddons();
      }
    };

    const fetchOrderDetails = async (id: string): Promise<{ status: number; data: CheckoutOrderDetails | null }> => {
      try {
        const res = await fetch(
          `/api/checkout/details?order_id=${encodeURIComponent(id)}&locale=${encodeURIComponent(locale)}`,
          { cache: 'no-store' }
        );
        if (!res.ok) {
          return { status: res.status, data: null };
        }
        const data = (await res.json()) as CheckoutOrderDetails;
        return { status: res.status, data };
      } catch {
        return { status: 0, data: null };
      }
    };

    // --- COD (Cash on Delivery) Payment Handler ---
    const type = searchParams.get('type');
    const orderId = (searchParams.get('order_id') || '').trim();

    if (type === 'cod') {
      if (!orderId) {
        router.replace('/checkout');
        return;
      }

      setIsCodOrder(true);
      setPaymentIntentId(orderId);

      const loadCodOrder = async () => {
        let lookup = await fetchOrderDetails(orderId);
        if (lookup.status === 404) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          if (cancelled) return;
          lookup = await fetchOrderDetails(orderId);
        }

        if (cancelled) return;

        if (lookup.data) {
          setOrderDetails(lookup.data);
          finishSuccess(lookup.data.orderNumber || orderId);
          return;
        }

        if (lookup.status === 404 || lookup.status === 400) {
          setErrorReason('not_found');
          setStatus('error');
          return;
        }

        // Transient server/network error after redirect from /api/checkout/cod: still show COD confirmation
        finishSuccess(orderId);
      };

      loadCodOrder();
      return () => {
        cancelled = true;
      };
    }
    // -----------------------------------------------

    const verifyPayment = async () => {
      try {
        const rawClientSecret = searchParams.get('payment_intent_client_secret') || '';
        const paymentIntentParam = searchParams.get('payment_intent') || '';

        const secretPi = rawClientSecret.includes('_secret_')
          ? rawClientSecret.split('_secret_')[0]
          : '';
        const effectivePiId = paymentIntentParam.startsWith('pi_')
          ? paymentIntentParam
          : secretPi.startsWith('pi_')
            ? secretPi
            : '';

        if (!effectivePiId) {
          console.warn('No valid payment_intent found on success page, redirecting to checkout');
          router.replace('/checkout');
          return;
        }

        setPaymentIntentId(effectivePiId);

        let attempts = 0;
        const maxAttempts = 15; // Up to ~30 seconds polling /api/checkout/verify
        let consecutiveFailures = 0;
        const maxConsecutiveFailures = 4;

        while (attempts < maxAttempts && !cancelled) {
          try {
            const res = await fetch('/api/checkout/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentIntentId: effectivePiId,
                ...(rawClientSecret ? { clientSecret: rawClientSecret } : {}),
              }),
            });

            if (res.ok) {
              const data = await res.json();
              const piStatus = data.paymentIntent?.status;

              if (piStatus === 'succeeded') {
                if (Array.isArray(data.paymentIntent?.digitalDownloads)) {
                  setDigitalDownloads(data.paymentIntent.digitalDownloads);
                }
                const resolvedOrderId = data.paymentIntent?.orderId || data.paymentIntent?.id || effectivePiId;
                const detailsLookup = await fetchOrderDetails(resolvedOrderId);
                if (!cancelled && detailsLookup.data) {
                  setOrderDetails(detailsLookup.data);
                }
                finishSuccess(resolvedOrderId);
                return;
              }

              if (piStatus === 'processing' || piStatus === 'requires_capture') {
                consecutiveFailures = 0;
                attempts++;
                if (attempts < maxAttempts) {
                  await new Promise((resolve) => setTimeout(resolve, 2000));
                  continue;
                }
                if (!cancelled) {
                  setPaymentIntentId(effectivePiId);
                  setStatus('processing');
                }
                return;
              }

              // Payment returned a non-succeeded status (e.g. requires_payment_method / canceled)
              consecutiveFailures++;
              if (piStatus === 'requires_payment_method' || piStatus === 'canceled') {
                if (consecutiveFailures >= 2) {
                  if (!cancelled) {
                    setErrorReason('payment_failed');
                    setStatus('error');
                  }
                  return;
                }
              } else if (consecutiveFailures >= maxConsecutiveFailures) {
                if (!cancelled) {
                  setErrorReason('payment_failed');
                  setStatus('error');
                }
                return;
              }
            } else {
              // HTTP error (e.g. 500 during temporary DB sync retry) — do not mark failed immediately
              consecutiveFailures++;
              if (consecutiveFailures >= maxConsecutiveFailures) {
                if (!cancelled) {
                  setErrorReason('payment_failed');
                  setStatus('error');
                }
                return;
              }
            }
          } catch (err) {
            console.warn('Verification request failed, retrying...', err);
          }

          attempts++;
          if (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        // Timed out without any confirmed status — do NOT clear cart or show false success
        if (!cancelled) {
          setErrorReason('payment_failed');
          setStatus('error');
        }
      } catch (err) {
        console.error('Payment verification error:', err);
        if (!cancelled) {
          setErrorReason('payment_failed');
          setStatus('error');
        }
      }
    };

    verifyPayment();
    return () => {
      cancelled = true;
    };
  }, [searchParams, clearCart, resetOrderAddons, router, locale]);

  const isCodEffective = isCodOrder || orderDetails?.paymentMethod === 'cod';
  const orderCurrency = orderDetails?.currency || 'RON';

  return (
    <div className="min-h-screen bg-[#fafafc] flex items-center justify-center p-6">
      <div className="max-w-xl w-full">
        {status === 'loading' && (
          <OrderSuccessCardSkeleton label={t('verifying_payment')} sublabel={t('processing_order')} />
        )}

        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-zinc-100 text-center relative overflow-hidden"
          >
            {/* Decorative background elements */}
            <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

            {/* Success Icon Animation */}
            <div className="relative mb-10 inline-block">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.1 
                }}
                className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center relative z-10"
              >
                <CheckCircle2 className="w-12 h-12 text-primary" />
              </motion.div>
              
              {/* Pulsing rings */}
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-primary/20 rounded-full z-0"
              />
            </div>

            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-black mb-6 italic"
            >
              {t('success_title')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-zinc-500 font-bold text-sm md:text-base leading-relaxed mb-2"
            >
              {isCodEffective
                ? (isEn
                    ? 'Your Cash on Delivery order has been confirmed! You will pay upon delivery of your parcel. A confirmation email has been sent.'
                    : 'Comanda ta cu plată ramburs a fost înregistrată! Vei achita suma la livrarea coletului. Confirmarea a fost trimisă pe email.')
                : t('success_message')}
            </motion.p>

            {paymentIntentId && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-zinc-400 text-xs font-mono mb-6"
              >
                ID: {paymentIntentId}
              </motion.p>
            )}

            {orderDetails && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.52 }}
                className="mb-8 p-5 rounded-3xl bg-zinc-50 border border-zinc-200/80 text-left space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-200/70">
                  <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-zinc-800">
                    {isCodEffective ? (
                      <Banknote className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <CreditCard className="w-4 h-4 text-primary shrink-0" />
                    )}
                    <span>
                      {isCodEffective
                        ? (isEn ? 'Cash on Delivery (COD)' : 'Plată Ramburs la Livrare')
                        : (isEn ? 'Paid Online by Card' : 'Plătit Online cu Cardul')}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-500">
                    <Truck className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {orderDetails.shippingType === 'pudo'
                        ? (orderDetails.branchName || 'Easybox / Locker')
                        : (isEn ? 'Home Delivery' : 'Livrare la domiciliu')}
                      {orderDetails.customer?.city ? ` · ${orderDetails.customer.city}` : ''}
                    </span>
                  </div>
                </div>

                {orderDetails.items.length > 0 && (
                  <div className="space-y-2">
                    {orderDetails.items.map((item, idx) => {
                      const showVariant =
                        item.variant &&
                        !item.name.toLowerCase().includes(item.variant.toLowerCase());
                      return (
                        <div key={`${item.id}-${idx}`} className="flex items-start justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <span className="font-bold text-zinc-900">
                              {item.name}
                              {showVariant ? ` (${item.variant})` : ''}
                            </span>
                            <span className="text-zinc-500 font-semibold ml-1.5">×{item.quantity}</span>
                          </div>
                          <span className="font-mono font-bold text-zinc-800 shrink-0">
                            {(item.price * item.quantity).toFixed(2)} {orderCurrency}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-3 border-t border-zinc-200/70 space-y-1.5 text-xs">
                  <div className="flex justify-between text-zinc-500 font-semibold">
                    <span>{t('subtotal')}</span>
                    <span className="font-mono">{orderDetails.subtotal.toFixed(2)} {orderCurrency}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500 font-semibold">
                    <span>{isEn ? 'Shipping' : 'Transport'}</span>
                    <span className="font-mono">
                      {orderDetails.shipping > 0
                        ? `${orderDetails.shipping.toFixed(2)} ${orderCurrency}`
                        : (isEn ? 'Free' : 'Gratuit')}
                    </span>
                  </div>
                  {orderDetails.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>{isEn ? 'Discount' : 'Reducere'}</span>
                      <span className="font-mono">-{orderDetails.discount.toFixed(2)} {orderCurrency}</span>
                    </div>
                  )}
                  {(orderDetails.cardDiscount ?? 0) > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>{isEn ? 'Card Discount' : 'Reducere Card'}</span>
                      <span className="font-mono">-{(orderDetails.cardDiscount || 0).toFixed(2)} {orderCurrency}</span>
                    </div>
                  )}
                  {orderDetails.priorityProcessing && (
                    <div className="flex justify-between text-zinc-500 font-semibold">
                      <span>{isEn ? 'Priority Processing' : 'Procesare Prioritară'}</span>
                      <span className="font-mono">+{getProductPrice(6.90, orderCurrency).toFixed(2)} {orderCurrency}</span>
                    </div>
                  )}
                  {orderDetails.giftPackaging && (
                    <div className="flex justify-between text-zinc-500 font-semibold">
                      <span>{isEn ? 'Gift Packaging' : 'Ambalaj Cadou'}</span>
                      <span className="font-mono">+{getProductPrice(14.90, orderCurrency).toFixed(2)} {orderCurrency}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-200 text-sm font-black text-black">
                    <span>
                      {isCodEffective
                        ? (isEn ? 'Total Due on Delivery' : 'Total de plată ramburs')
                        : t('total')}
                    </span>
                    <span className="font-mono">{orderDetails.total.toFixed(2)} {orderCurrency}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {digitalDownloads.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="mb-8 p-5 rounded-3xl bg-purple-50 border-2 border-purple-200 text-left space-y-3"
              >
                <div className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 shrink-0 text-purple-700" />
                  <span>
                    {isEn
                      ? "Your Digital Programs (Also sent to your email):"
                      : "Programele Tale Digitale (Trimise și pe email):"}
                  </span>
                </div>
                <div className="space-y-2">
                  {digitalDownloads.map((dl, idx) => (
                    <a
                      key={idx}
                      href={dl.downloadUrl}
                      className="w-full py-3 px-4 rounded-2xl bg-[#111111] hover:bg-[#e32f8c] text-white font-black text-xs uppercase tracking-wider flex items-center justify-between transition-all active:scale-[0.98]"
                    >
                      <span className="inline-flex items-center gap-2 min-w-0 truncate">
                        <Download className="w-4 h-4 shrink-0" />
                        <span className="truncate">{dl.title}</span>
                      </span>
                      <span className="text-[10px] underline shrink-0 ml-2">
                        {isEn ? "Download PDF" : "Descarcă PDF"}
                      </span>
                    </a>
                  ))}
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link 
                href="/shop" 
                className="flex items-center justify-center gap-3 bg-black text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-primary hover:text-black transition-all group"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{t('continue_shopping')}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link 
                href="/" 
                className="flex items-center justify-center gap-3 bg-zinc-50 text-zinc-400 px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-100 hover:text-black transition-all"
              >
                <Home className="w-4 h-4" />
                <span>{t('go_home')}</span>
              </Link>
            </motion.div>
            
            {/* Status verification */}
          </motion.div>
        )}

        {status === 'processing' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-amber-200 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-amber-400" />
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-black mb-4">
              {isEn ? 'Payment Confirmation Pending' : 'Plata este în curs de confirmare'}
            </h1>
            <p className="text-zinc-600 font-medium text-sm md:text-base leading-relaxed mb-6">
              {isEn
                ? 'Your bank is still finalizing the authorization. Once confirmed (usually within 1–2 minutes), your order confirmation and any digital programs will be sent automatically to your email.'
                : 'Banca finalizează autorizarea plății. Imediat ce confirmarea ajunge (de obicei în 1–2 minute), vei primi automat confirmarea comenzii și programele digitale pe email.'}
            </p>
            {paymentIntentId && (
              <div className="bg-zinc-50 rounded-2xl p-4 mb-6 inline-block border border-zinc-200">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">
                  {isEn ? 'Reference ID' : 'Referință Plată'}
                </span>
                <span className="text-xs font-mono font-bold text-zinc-800">{paymentIntentId}</span>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="button"
                disabled={isCheckingAgain}
                onClick={() => {
                  if (isCheckingAgain) return;
                  setIsCheckingAgain(true);
                  window.location.reload();
                }}
                className="flex items-center justify-center gap-2.5 bg-primary text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-primary/80 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isCheckingAgain && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                <span>
                  {isCheckingAgain
                    ? (isEn ? 'Checking...' : 'Se verifică...')
                    : (isEn ? 'Check Status Again' : 'Verifică din nou statusul')}
                </span>
              </button>
              <Link
                href="/"
                className="flex items-center justify-center gap-3 bg-zinc-50 text-zinc-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-100 hover:text-black transition-all active:scale-[0.98]"
              >
                <Home className="w-4 h-4" />
                <span>{t('go_home')}</span>
              </Link>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-red-200 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />

            <div className="relative mb-10 inline-block">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.1 
                }}
                className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center"
              >
                <AlertCircle className="w-12 h-12 text-red-500" />
              </motion.div>
            </div>

            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-black mb-6"
            >
              {errorReason === 'not_found'
                ? (isEn ? 'Order Not Found' : 'Comanda nu a fost găsită')
                : (isEn ? 'Payment Unconfirmed' : 'Plată Neconfirmată')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-zinc-500 font-bold text-sm md:text-base leading-relaxed mb-8"
            >
              {errorReason === 'not_found'
                ? (isEn
                    ? 'We could not find an order matching this reference. Please verify the link or return to checkout.'
                    : 'Nu am găsit nicio comandă cu acest identificator. Te rugăm să verifici linkul sau să revii la checkout.')
                : (isEn
                    ? 'Payment was not completed. If you closed the payment dialog, no order was created.'
                    : 'Plata nu a fost completată. Dacă ai închis dialogul de plată, nicio comandă nu a fost creată.')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link 
                href="/checkout" 
                className="flex items-center justify-center gap-3 bg-primary text-black px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-primary/80 transition-all"
              >
                {errorReason === 'not_found'
                  ? (isEn ? 'Return to Checkout' : 'Înapoi la Checkout')
                  : t('retry_payment')}
              </Link>

              <Link 
                href="/" 
                className="flex items-center justify-center gap-3 bg-zinc-50 text-zinc-400 px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-100 hover:text-black transition-all"
              >
                <Home className="w-4 h-4" />
                <span>{t('go_home')}</span>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function OrderSuccessCardSkeleton({ label, sublabel }: { label?: string; sublabel?: string }) {
  return (
    <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-zinc-100 text-center relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-2 bg-primary/30 animate-pulse" />
      <div className="w-24 h-24 rounded-full bg-primary/10 mx-auto mb-8 flex items-center justify-center animate-pulse">
        <div className="w-12 h-12 rounded-full bg-primary/20" />
      </div>
      {label ? (
        <>
          <h1 className="text-2xl font-black uppercase text-zinc-700 mb-2">{label}</h1>
          {sublabel && <p className="text-sm text-zinc-400 mb-8">{sublabel}</p>}
        </>
      ) : (
        <div className="space-y-3 mb-8">
          <div className="h-10 w-64 mx-auto rounded-2xl bg-zinc-200 animate-pulse" />
          <div className="h-4 w-72 max-w-full mx-auto rounded bg-zinc-100 animate-pulse" />
        </div>
      )}
      <div className="h-5 w-44 mx-auto rounded-lg bg-zinc-100 animate-pulse mb-8" />
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <div className="h-14 w-full sm:w-48 rounded-2xl bg-zinc-900/15 animate-pulse" />
        <div className="h-14 w-full sm:w-40 rounded-2xl bg-zinc-100 animate-pulse" />
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafafc] flex items-center justify-center p-6">
        <div className="max-w-xl w-full">
          <OrderSuccessCardSkeleton />
        </div>
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}

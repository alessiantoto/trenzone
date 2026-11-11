"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { motion } from "framer-motion";
import { CheckCircle2, ShoppingBag, ArrowRight, Home, AlertCircle } from "lucide-react";
import { useEffect, useState, Suspense } from "react";
import { useCartStore } from "@/store/useCartStore";
import { useSearchParams } from "next/navigation";

function OrderSuccessContent() {
  const t = useTranslations("Checkout");
  const locale = useLocale();
  const isEn = locale === 'en';
  const clearCart = useCartStore((state) => state.clearCart);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');

  useEffect(() => {
    // --- COD (Cash on Delivery) Payment Handler ---
    const type = searchParams.get('type');
    const orderId = searchParams.get('order_id');
    
    if (type === 'cod' && orderId) {
      setStatus('success');
      clearCart();
      return;
    }
    // -----------------------------------------------

    const verifyPayment = async () => {
      try {
        // Check for multiple redirect parameters (Apple Pay, Google Pay, etc.)
        let clientSecret = searchParams.get('payment_intent_client_secret');
        const redirectStatus = searchParams.get('redirect_status');
        const paymentIntentParam = searchParams.get('payment_intent');
        
        // Handle redirect_status=succeeded from wallet payments (Apple Pay, Google Pay, etc.)
        if ((redirectStatus === 'succeeded' || !clientSecret) && paymentIntentParam) {
          setPaymentIntentId(paymentIntentParam);
          
          // For wallet payments, retry verification multiple times
          let isConfirmed = false;
          let paymentSucceeded = false;
          let attempts = 0;
          const maxAttempts = 20; // 20 * 2 seconds = 40 seconds max
          let failureCount = 0;
          const maxFailuresBeforeGiveUp = 3; // Need 3 consecutive failures to show error
          
          while (attempts < maxAttempts && !isConfirmed) {
            try {
              const res = await fetch('/api/checkout/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientSecret: clientSecret || `${paymentIntentParam}_secret_` })
              });

              const data = await res.json();
              
              if (data.paymentIntent?.status === 'succeeded') {
                setStatus('success');
                if (data.paymentIntent?.id && !data.paymentIntent.id.startsWith('pi_')) {
                   setPaymentIntentId(data.paymentIntent.id);
                }
                clearCart();
                paymentSucceeded = true;
                isConfirmed = true;
                return;
              } else if (data.paymentIntent?.status === 'processing') {
                // Still processing, keep trying
                failureCount = 0; // Reset failure count, as it's still processing (not failed)
                attempts++;
                if (attempts < maxAttempts) {
                  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                } else {
                  // Timeout reached but payment is processing, assume webhook will handle it
                  setStatus('success');
                  clearCart();
                  paymentSucceeded = true;
                  isConfirmed = true;
                }
              } else {
                // Payment failed or invalid status
                failureCount++;
                if (failureCount >= maxFailuresBeforeGiveUp) {
                  setStatus('error');
                  isConfirmed = true;
                } else {
                  // Retry even if failed, maybe next check will succeed
                  attempts++;
                  if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                  } else {
                    setStatus('error');
                    isConfirmed = true;
                  }
                }
              }
            } catch (err) {
              // Network error, don't count as failure yet
              console.warn('Verification request failed, retrying...', err);
              attempts++;
              if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds and retry
              } else {
                // Timeout on retries, assume webhook will process it
                setStatus('success');
                clearCart();
                paymentSucceeded = true;
                isConfirmed = true;
              }
            }
          }
          return;
        }
        
        // Handle normal redirect with client_secret
        if (!clientSecret) {
          // No payment params at all — redirect back to checkout silently
          console.warn('No payment params found on success page, redirecting to checkout');
          router.replace('/checkout');
          return;
        }

        // Extract payment intent ID
        const intentId = clientSecret.split('_secret_')[0];
        setPaymentIntentId(intentId);

        // Verify payment status with backend - retry 3 times for stability
        let lastError: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await fetch('/api/checkout/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientSecret })
            });

            if (!res.ok) {
              lastError = `HTTP ${res.status}`;
              if (attempt < 2) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
              }
              continue;
            }

            const data = await res.json();
            
            // Only consider payment successful if Stripe confirms it
            if (data.paymentIntent?.status === 'succeeded') {
              setStatus('success');
              if (data.paymentIntent?.id && !data.paymentIntent.id.startsWith('pi_')) {
                 setPaymentIntentId(data.paymentIntent.id);
              }
              clearCart();
              return;
            } else if (data.paymentIntent?.status === 'processing') {
              // Payment is processing, assume webhook will handle confirmation
              setStatus('success');
              clearCart();
              return;
            } else {
              lastError = `Payment status: ${data.paymentIntent?.status}`;
              if (attempt < 2) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
              }
            }
          } catch (err) {
            lastError = err;
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retry
            }
          }
        }

        // Only show error after 3 failed attempts
        console.error('Payment verification failed after 3 attempts:', lastError);
        setStatus('error');
      } catch (err) {
        console.error('Payment verification error:', err);
        setStatus('error');
      }
    };

    verifyPayment();
  }, [searchParams, clearCart]);

  return (
    <div className="min-h-screen bg-[#fafafc] flex items-center justify-center p-6">
      <div className="max-w-xl w-full">
        {status === 'loading' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-zinc-100 text-center"
          >
            <div className="relative mb-10 inline-block">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-24 h-24 border-4 border-zinc-200 border-t-primary rounded-full"
              />
            </div>
            <h1 className="text-2xl font-black uppercase text-zinc-600 mb-2">
              {t('verifying_payment')}
            </h1>
            <p className="text-sm text-zinc-400">
              {t('processing_order')}
            </p>
          </motion.div>
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
              {t('success_message')}
            </motion.p>

            {paymentIntentId && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-zinc-400 text-xs font-mono mb-10"
              >
                ID: {paymentIntentId}
              </motion.p>
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
              {isEn ? 'Payment Unconfirmed' : 'Plată Neconfirmată'}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-zinc-500 font-bold text-sm md:text-base leading-relaxed mb-8"
            >
              {isEn
                ? 'Payment was not completed. If you closed the payment dialog, no order was created.'
                : 'Plata nu a fost completată. Dacă ai închis dialogul de plată, nicio comandă nu a fost creată.'}
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
                {t('retry_payment')}
              </Link>

              <Link 
                href="/shop" 
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

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}

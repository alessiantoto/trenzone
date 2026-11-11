'use client';

import { getOptimizedImageUrl } from '@/lib/utils/imageProxy';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { X, ArrowLeft, Star, Image as ImageIcon, Video, CheckCircle2, ChevronDown, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { localizeBadge } from '@/lib/utils';

const DEFAULT_PRODUCTS = [
  {
    id: "2fd4ee73-6800-4f76-a74d-208fffea0fb6",
    name: { ro: "TRENZONE X10 Elbow Wraps — Purple", en: "TRENZONE X10 Elbow Wraps — Purple" },
    image: "/images/products/x10_elbow_wraps_purple_1.webp",
    badge: "SUPORT MAXIM · PR-URI"
  },
  {
    id: "2fd4ee73-6800-4f76-a74d-208fffea0fb6",
    name: { ro: "TRENZONE X10 Elbow Wraps — White (Precomandă)", en: "TRENZONE X10 Elbow Wraps — White (Pre-Order)" },
    image: "/images/products/x10_elbow_wraps_white_3.webp",
    badge: "PRECOMANDĂ OFICIALĂ"
  },
  {
    id: "997b3e3c-511b-4e02-8a58-7d59bbf5a154",
    name: { ro: "TRENZONE X5 Elbow Wraps — Purple", en: "TRENZONE X5 Elbow Wraps — Purple" },
    image: "/images/products/x5_elbow_wraps_purple_1.webp",
    badge: "CONFORT & VOLUM"
  },
  {
    id: "997b3e3c-511b-4e02-8a58-7d59bbf5a154",
    name: { ro: "TRENZONE X5 Elbow Wraps — White", en: "TRENZONE X5 Elbow Wraps — White" },
    image: "/images/products/x5_elbow_wraps_white_1.webp",
    badge: "CONFORT & VOLUM"
  },
  {
    id: "997b3e3c-511b-4e02-8a58-7d59bbf5a154",
    name: { ro: "TRENZONE X5 Elbow Wraps — Red", en: "TRENZONE X5 Elbow Wraps — Red" },
    image: "/images/products/x5_elbow_wraps_red_1.webp"
  }
];

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: string;
  product?: any;
}

export function WriteReviewModal({ isOpen, onClose, locale, product }: WriteReviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<any>(product || DEFAULT_PRODUCTS[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [productList, setProductList] = useState<any[]>(DEFAULT_PRODUCTS);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (product) {
      setSelectedProduct(product);
    }
  }, [product]);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (data.success && data.products?.length > 0) {
          const wraps = data.products.filter((p: any) => 
            p.slug?.includes('wrap') || p.slug?.includes('x10') || p.slug?.includes('x5')
          );
          if (wraps.length > 0) {
            setProductList(wraps);
            if (!product) {
              setSelectedProduct((prev: any) => {
                const found = wraps.find((w: any) => w.id === prev?.id);
                return found || wraps[0];
              });
            }
          }
        }
      } catch (err) {
        // Fallback to DEFAULT_PRODUCTS
      }
    }
    loadProducts();
  }, [product]);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<{ id: string; url: string; file: File }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      photos.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [photos]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substring(7),
        url: URL.createObjectURL(file),
        file
      }));
      setPhotos(prev => [...prev, ...newPhotos]);
    }
    // reset input so the same files can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const toRemove = prev.find(p => p.id === id);
      if (toRemove) URL.revokeObjectURL(toRemove.url);
      return prev.filter(p => p.id !== id);
    });
  };

  const TOTAL_STEPS = 4; // 0, 1, 2, 3

  const handleClose = () => {
    // Reset state on close
    setTimeout(() => {
      setStep(0);
      setRating(0);
      setReviewText("");
      setName("");
      setEmail("");
      setPhotos([]);
      setIsSubmitting(false);
    }, 300);
    onClose();
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const uploadedImageUrls: string[] = [];
      
      // Upload photos to Supabase Storage via server endpoint
      for (const photo of photos) {
        const formData = new FormData();
        formData.append('file', photo.file);

        const uploadRes = await fetch('/api/reviews/upload', {
          method: 'POST',
          body: formData
        });

        if (uploadRes.ok) {
          const json = await uploadRes.json();
          if (json.success && json.url) {
            uploadedImageUrls.push(json.url);
          }
        } else {
          console.error("Error uploading review photo");
        }
      }

      // Submit the review to our new API endpoint
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          text: reviewText,
          rating,
          images: uploadedImageUrls,
          product_id: (selectedProduct?.id || product?.id) || null,
          locale
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }
      
      setStep(4); // Success step
    } catch (err) {
      console.error(err);
      setSubmitError(locale === 'ro' ? 'Eroare la trimiterea recenziei. Te rugăm să încerci din nou.' : 'Error submitting review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const t = {
    step0_title: locale === 'ro' ? "Cum ai evalua acest produs?" : "How would you rate this item?",
    dislike: locale === 'ro' ? "Slab" : "Dislike it",
    love: locale === 'ro' ? "Excelent" : "Love it!",
    step1_title: locale === 'ro' ? "Spune-ne mai multe!" : "Tell us more!",
    placeholder: locale === 'ro' ? "Împărtășește experiența ta..." : "Share your experience...",
    next: locale === 'ro' ? "Următorul" : "Next",
    skip: locale === 'ro' ? "Treci peste" : "Skip",
    step2_title: locale === 'ro' ? "Să te vedem" : "Let's see you",
    step2_sub: locale === 'ro' ? "Ne-ar plăcea să te vedem în acțiune!" : "We'd love to see you in action!",
    discount_text: locale === 'ro' ? "Primești 10% reducere la următoarea comandă" : "Get 10% off your next purchase",
    add_photos: locale === 'ro' ? "Adaugă poze" : "Add photos",
    add_video: locale === 'ro' ? "Adaugă video" : "Add video",
    step3_title: locale === 'ro' ? "Aproape gata!" : "Almost there!",
    step3_sub: locale === 'ro' ? "Unde îți trimitem codul de reducere?" : "Where should we send your discount code?",
    name_label: locale === 'ro' ? "Numele tău" : "Your name",
    email_label: locale === 'ro' ? "Adresa de email" : "Email address",
    submit: locale === 'ro' ? "Trimite Recenzia" : "Submit Review",
    submitting: locale === 'ro' ? "Se trimite..." : "Submitting...",
    success_title: locale === 'ro' ? "Mulțumim!" : "Thank you!",
    success_sub: locale === 'ro' ? "Recenzia ta a fost trimisă. Verifică email-ul pentru codul de reducere." : "Your review has been submitted. Check your email for the discount code.",
    close: locale === 'ro' ? "Închide" : "Close",
  };

  const slideVariants = {
    hidden: { opacity: 0, x: 40 },
    visible: { 
      opacity: 1, 
      x: 0, 
      transition: { type: "spring" as const, stiffness: 300, damping: 25 }
    },
    exit: { 
      opacity: 0, 
      x: -40,
      transition: { type: "spring" as const, stiffness: 300, damping: 25 }
    }
  };

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-0"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="w-full max-w-[450px] bg-zinc-950 border border-white/10 text-white md:rounded-3xl rounded-2xl shadow-2xl flex flex-col relative h-[90vh] md:h-[650px] overflow-hidden"
          >
            {/* Header controls */}
            {step < 4 && (
              <div className="flex items-center justify-between p-4 absolute top-0 left-0 w-full z-10 bg-zinc-950/90 backdrop-blur-md border-b border-white/10">
                {step > 0 ? (
                  <button onClick={handlePrev} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </button>
                ) : (
                  <div className="w-9" /> // Spacer
                )}

                <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white text-sm font-bold">
                  {step === 1 ? t.skip : <X className="w-5 h-5" />}
                </button>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 mt-12 mb-16 overflow-y-auto">
              <AnimatePresence mode="wait">
                
                {/* STEP 0: RATING */}
                {step === 0 && (
                  <motion.div
                    key="step0"
                    variants={slideVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex flex-col items-center w-full"
                  >
                    {/* PRODUCT SELECTOR DROPDOWN (Shown on Home or when product is not fixed) */}
                    {!product ? (
                      <div className="w-full max-w-[340px] mb-6 relative">
                        <label className="block text-[10px] md:text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-2 text-center font-[family-name:var(--font-oswald)]">
                          {locale === 'ro' ? 'Alege produsul pe care îl evaluezi:' : 'Choose the product you are reviewing:'}
                        </label>
                        
                        <button
                          type="button"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="w-full flex items-center justify-between gap-3 p-2.5 bg-zinc-900/90 hover:bg-zinc-800/90 border border-white/10 hover:border-[#e32f8c]/50 rounded-2xl transition-all shadow-xl text-left group cursor-pointer"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-12 h-12 relative rounded-xl overflow-hidden bg-black/60 border border-white/10 shrink-0">
                              <Image
                                src={getOptimizedImageUrl(selectedProduct?.image) || '/placeholder.png'}
                                alt="Product"
                                fill
                                sizes="48px"
                                className="object-contain p-1"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-white truncate leading-tight group-hover:text-[#e32f8c] transition-colors">
                                {typeof selectedProduct?.name === 'object' 
                                  ? (selectedProduct.name[locale] || selectedProduct.name.ro) 
                                  : (selectedProduct?.name || (locale === 'ro' ? 'Alege produs' : 'Choose product'))}
                              </p>
                              <span className="text-[10px] text-[#e32f8c] font-black uppercase tracking-wider block mt-0.5 truncate">
                                {selectedProduct?.badge ? localizeBadge(selectedProduct.badge, locale) : (locale === 'ro' ? 'Apasă pentru a schimba' : 'Tap to change')}
                              </span>
                            </div>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-zinc-400 group-hover:text-white transition-transform duration-200 shrink-0 mr-1 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Floating Glassmorphic Dropdown List */}
                        <AnimatePresence>
                          {isDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -6, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -6, scale: 0.98 }}
                              transition={{ duration: 0.15 }}
                              className="absolute top-full left-0 right-0 mt-2 z-50 bg-zinc-950/98 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-1.5 max-h-56 overflow-y-auto custom-scrollbar"
                            >
                              {productList.map((p) => {
                                const isSelected = selectedProduct?.id === p.id;
                                const pName = typeof p.name === 'object' ? (p.name[locale] || p.name.ro) : p.name;
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedProduct(p);
                                      setIsDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between gap-3 p-2 rounded-xl transition-all cursor-pointer text-left ${
                                      isSelected ? 'bg-[#e32f8c]/15 border border-[#e32f8c]/30 text-white' : 'hover:bg-white/5 text-zinc-300'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 overflow-hidden">
                                      <div className="w-9 h-9 relative rounded-lg overflow-hidden bg-black/60 border border-white/10 shrink-0">
                                        <Image
                                          src={getOptimizedImageUrl(p.image) || '/placeholder.png'}
                                          alt=""
                                          fill
                                          sizes="36px"
                                          className="object-contain p-0.5"
                                        />
                                      </div>
                                      <div className="min-w-0">
                                        <p className={`text-xs truncate font-bold ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                                          {pName}
                                        </p>
                                        {p.badge && (
                                          <span className="text-[9px] text-[#e32f8c] font-black uppercase tracking-wider block">
                                            {localizeBadge(p.badge, locale)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 text-[#e32f8c] shrink-0 mr-1" />}
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center mb-6 text-center">
                        <div className="w-20 h-20 relative rounded-2xl overflow-hidden mb-3 bg-zinc-900 border border-white/10">
                          <Image src={getOptimizedImageUrl(product.image) || '/placeholder.png'} alt="Product" fill sizes="80px" className="object-contain p-2" />
                        </div>
                        <h3 className="text-xs font-black text-[#e32f8c] uppercase tracking-widest mb-1">{t.step0_title}</h3>
                        <h2 className="text-lg md:text-xl font-black text-white leading-tight max-w-[280px]">
                          {typeof product.name === 'object' ? (product.name[locale] || product.name.ro) : product.name}
                        </h2>
                      </div>
                    )}

                    <div className="flex gap-2 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <motion.button
                          key={star}
                          whileHover={{ scale: 1.15, rotate: 5 }}
                          whileTap={{ scale: 0.8 }}
                          transition={{ type: "spring" as const, stiffness: 400, damping: 15 }}
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(0)}
                          onClick={() => {
                            setRating(star);
                            setTimeout(handleNext, 400);
                          }}
                          className="p-1 cursor-pointer"
                        >
                          <Star 
                            className={`w-10 h-10 md:w-12 md:h-12 transition-colors ${
                              (hoveredRating || rating) >= star 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'fill-zinc-800 text-zinc-800 hover:fill-zinc-700'
                            }`} 
                            strokeWidth={0}
                          />
                        </motion.button>
                      ))}
                    </div>
                    <div className="flex w-full justify-between px-6 text-xs font-bold text-zinc-500 mt-2 uppercase tracking-wider">
                      <span>{t.dislike}</span>
                      <span>{t.love}</span>
                    </div>
                  </motion.div>
                )}

                {/* STEP 1: MEDIA (DISCOUNT) */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    variants={slideVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex flex-col items-center w-full"
                  >
                    <h2 className="text-2xl font-black text-white mb-2 text-center">{t.step2_title}</h2>
                    <p className="text-zinc-400 font-medium mb-8 text-center">{t.step2_sub}</p>

                    <div className="w-full bg-zinc-900/60 border border-white/10 rounded-2xl p-6 flex flex-col items-center">
                      <h3 className="text-lg font-black text-[#e32f8c] mb-6 text-center">{t.discount_text}</h3>
                      
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                      />

                      <div className="w-full space-y-4">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-3.5 bg-white text-black font-black uppercase text-xs md:text-sm tracking-wider rounded-xl flex items-center justify-center gap-2 hover:bg-[#e32f8c] hover:text-black transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          <ImageIcon className="w-5 h-5" />
                          {t.add_photos}
                        </button>

                        {photos.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }} 
                            className="w-full flex flex-col gap-4 overflow-hidden"
                          >
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">
                              {locale === 'ro' ? 'Trage de poze pentru a le reordona' : 'Drag photos to reorder'}
                            </p>
                            <Reorder.Group 
                              axis="x" 
                              values={photos} 
                              onReorder={setPhotos} 
                              className="flex gap-3 overflow-x-auto pb-4 px-1 custom-scrollbar"
                            >
                              {photos.map((photo) => (
                                <Reorder.Item 
                                  key={photo.id} 
                                  value={photo}
                                  whileDrag={{ scale: 1.05, zIndex: 10, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.4)' }}
                                  className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing border border-white/10 bg-zinc-900"
                                >
                                  <Image src={getOptimizedImageUrl(photo.url) || '/placeholder.png'} alt="preview" fill sizes="96px" className="object-cover pointer-events-none" />
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/80 hover:bg-black rounded-full flex items-center justify-center transition-colors z-10 backdrop-blur-sm"
                                  >
                                    <X className="w-3.5 h-3.5 text-white" />
                                  </button>
                                </Reorder.Item>
                              ))}
                            </Reorder.Group>

                            <button
                              onClick={handleNext}
                              className="w-full py-4 mt-2 bg-white text-black font-black uppercase text-xs md:text-sm tracking-wider rounded-xl hover:bg-[#e32f8c] transition-all shadow-md cursor-pointer"
                            >
                              {t.next}
                            </button>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: TEXT */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    variants={slideVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex flex-col items-center w-full h-full"
                  >
                    <h2 className="text-2xl font-black text-white mb-6">{t.step1_title}</h2>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder={t.placeholder}
                      className="w-full flex-1 min-h-[200px] p-4 bg-zinc-900 border border-white/10 rounded-xl resize-none outline-none focus:border-[#e32f8c] text-white placeholder:text-zinc-500 transition-all font-medium"
                    />
                    <button
                      onClick={handleNext}
                      disabled={reviewText.trim().length < 5}
                      className="w-full py-4 mt-6 bg-white text-black font-black uppercase text-xs md:text-sm tracking-wider rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#e32f8c] hover:text-black transition-all cursor-pointer"
                    >
                      {t.next}
                    </button>
                  </motion.div>
                )}

                {/* STEP 3: CONTACT INFO */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    variants={slideVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex flex-col items-center w-full"
                  >
                    <h2 className="text-2xl font-black text-white mb-2 text-center">{t.step3_title}</h2>
                    <p className="text-zinc-400 font-medium mb-8 text-center">{t.step3_sub}</p>

                    <div className="w-full space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">{t.name_label}</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full p-3.5 bg-zinc-900 border border-white/10 rounded-xl outline-none focus:border-[#e32f8c] text-white transition-all font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">{t.email_label}</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full p-3.5 bg-zinc-900 border border-white/10 rounded-xl outline-none focus:border-[#e32f8c] text-white transition-all font-medium"
                        />
                      </div>
                    </div>

                    {submitError && (
                      <div className="w-full mt-4 p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-xs font-bold text-red-400 text-center">
                        {submitError}
                      </div>
                    )}

                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !name || !email.includes('@')}
                      className="w-full py-4 mt-6 bg-white text-black font-black uppercase text-xs md:text-sm tracking-wider rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#e32f8c] hover:text-black transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : null}
                      {isSubmitting ? t.submitting : t.submit}
                    </button>
                  </motion.div>
                )}

                {/* STEP 4: SUCCESS */}
                {step === 4 && (
                  <motion.div
                    key="step4"
                    variants={slideVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="flex flex-col items-center justify-center w-full h-full text-center"
                  >
                    <div className="w-16 h-16 bg-[#e32f8c]/10 border border-[#e32f8c]/30 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 className="w-8 h-8 text-[#e32f8c]" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-3">{t.success_title}</h2>
                    <p className="text-zinc-400 font-medium mb-8 max-w-[80%]">
                      {t.success_sub}
                    </p>
                    <button
                      onClick={handleClose}
                      className="w-full py-4 bg-white text-black font-black uppercase text-xs md:text-sm tracking-wider rounded-xl hover:bg-[#e32f8c] transition-all cursor-pointer"
                    >
                      {t.close}
                    </button>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* Progress Bar (Footer) */}
            {step < 4 && (
              <div className="absolute bottom-0 left-0 w-full p-6 bg-zinc-950/90 backdrop-blur-md border-t border-white/10">
                <div className="flex gap-2 w-full max-w-[200px] mx-auto">
                  {[0, 1, 2, 3].map((i) => (
                    <div 
                      key={i} 
                      className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                        i <= step ? 'bg-[#e32f8c]' : 'bg-zinc-800'
                      }`} 
                    />
                  ))}
                </div>
              </div>
            )}
            
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

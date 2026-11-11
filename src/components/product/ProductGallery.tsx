"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ProductGallery({ 
  images, 
  activeImage: controlledActiveImage,
  onActiveImageChange
}: { 
  images: string[];
  activeImage?: string;
  onActiveImageChange?: (img: string) => void;
}) {
  const [internalActiveImage, setInternalActiveImage] = useState(images[0]);
  const activeImage = controlledActiveImage || internalActiveImage;
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleImageChange = (img: string) => {
    if (onActiveImageChange) {
      onActiveImageChange(img);
    } else {
      setInternalActiveImage(img);
    }
  };

  const nextImage = () => {
    const currentIndex = images.indexOf(activeImage);
    const nextIndex = (currentIndex + 1) % images.length;
    handleImageChange(images[nextIndex]);
  };

  const prevImage = () => {
    const currentIndex = images.indexOf(activeImage);
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    handleImageChange(images[prevIndex]);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Main Image Container — Expanded for "Elite" edge-to-edge feel */}
      <div className="relative aspect-square w-full overflow-hidden bg-white touch-pan-y">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeImage}
            initial={images.indexOf(activeImage) === 0 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              const threshold = 50;
              if (info.offset.x < -threshold) nextImage();
              else if (info.offset.x > threshold) prevImage();
            }}
            className="relative w-full h-full cursor-grab active:cursor-grabbing"
          >
            <Image
              src={activeImage}
              alt="Imagine produs"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-contain"
              priority
              fetchPriority="high"
              loading="eager"
              draggable={false}
            />
          </motion.div>
        </AnimatePresence>

        {/* Swipe Hint (visual cue) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 md:hidden">
          {images.map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-300",
                images.indexOf(activeImage) === i ? "bg-primary w-4" : "bg-zinc-200"
              )}
            />
          ))}
        </div>
      </div>
      
      {/* Thumbnails Container — The "Competitor Crushing" Horizontal Scroll */}
      {images.length > 1 && (
        <div className="relative group/gallery">
          <div 
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto pb-2 px-1 scroll-smooth snap-x snap-mandatory no-scrollbar"
          >
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => handleImageChange(img)}
                className={cn(
                  "h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl overflow-hidden border transition-all duration-300 snap-start bg-white",
                  activeImage === img 
                    ? "border-primary shadow-md scale-[1.02]" 
                    : "border-zinc-100 opacity-60 hover:opacity-100"
                )}
              >
                <div className="relative w-full h-full">
                  <Image
                    src={img}
                    alt={`Miniatură produs ${idx + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
              </button>
            ))}
          </div>

          {/* Desktop Navigation Arrows (Hidden on Mobile) */}
          <button 
            onClick={() => scroll('left')}
            aria-label="Imaginea anterioară"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-8 h-8 rounded-full bg-white shadow-lg border border-zinc-100 hidden md:flex items-center justify-center opacity-0 group-hover/gallery:opacity-100 transition-opacity hover:bg-zinc-50"
          >
            <ChevronLeft className="w-4 h-4 text-zinc-600" />
          </button>
          <button 
            onClick={() => scroll('right')}
            aria-label="Imaginea următoare"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-8 h-8 rounded-full bg-white shadow-lg border border-zinc-100 hidden md:flex items-center justify-center opacity-0 group-hover/gallery:opacity-100 transition-opacity hover:bg-zinc-50"
          >
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          </button>
        </div>
      )}
    </div>
  );
}

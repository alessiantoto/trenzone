"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  className?: string;
  starClassName?: string;
  size?: "sm" | "md" | "lg";
}

export function StarRating({ 
  rating, 
  maxStars = 5, 
  className, 
  starClassName,
  size = "sm" 
}: StarRatingProps) {
  const sizeClasses = {
    sm: "w-3 h-3 md:w-3.5 md:h-3.5",
    md: "w-4 h-4 md:w-5 md:h-5",
    lg: "w-5 h-5 md:w-7 md:h-7"
  };

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[...Array(maxStars)].map((_, i) => {
        const starNumber = i + 1;
        const isFull = rating >= starNumber;
        const isPartial = rating > i && rating < starNumber;
        const partialPercent = isPartial ? (rating - i) * 100 : 0;

        return (
          <div key={i} className="relative">
            {/* Base Gray Star */}
            <Star 
              className={cn(
                sizeClasses[size], 
                "text-zinc-200 fill-zinc-200", 
                starClassName
              )} 
            />
            
            {/* Filled Gold Star (ONLY if needed) */}
            {(isFull || isPartial) && (
              <div 
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${isFull ? 100 : partialPercent}%` }}
              >
                <Star 
                  className={cn(
                    sizeClasses[size], 
                    "text-primary fill-primary", 
                    starClassName
                  )} 
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

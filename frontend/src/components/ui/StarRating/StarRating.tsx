import { useState, useRef } from "react";
import { Star, StarHalf } from "lucide-react";
import styles from "./StarRating.module.css";

interface StarRatingProps {
   value: number;
   onChange?: (rating: number) => void; 
   max?: number;
   readOnly?: boolean;
}

export function StarRating({ value, onChange, max = 10, readOnly = false }: StarRatingProps) {
   const [hover, setHover] = useState<number | null>(null);
   const wrapperRef = useRef<HTMLDivElement>(null);

   const calculateRating = (clientX: number) => {
      if (!wrapperRef.current) return null;
      const { left, width } = wrapperRef.current.getBoundingClientRect();
      const percent = (clientX - left) / width;
      if (percent <= 0) return 0.5;
      if (percent >= 1) return max;
      return Math.ceil((percent * max) * 2) / 2; 
   };

   const handleMove = (clientX: number) => {
      if (readOnly) return;
      const rating = calculateRating(clientX);
      if (rating) setHover(rating);
   };

   const handleConfirm = (clientX: number) => {
      if (readOnly || !onChange) return;
      const rating = calculateRating(clientX);
      if (rating) {
         onChange(rating);
         setHover(null);
      }
   };

   const displayValue = hover !== null ? hover : value;

   return (
      <div className={styles.starContainer}>
         <div 
            className={styles.starsWrapper}
            ref={wrapperRef}
            style={{ cursor: readOnly ? "default" : "pointer", touchAction: readOnly ? "auto" : "none" }}
            onMouseLeave={() => !readOnly && setHover(null)}
            onMouseMove={(e) => handleMove(e.clientX)}
            onClick={(e) => handleConfirm(e.clientX)}
            onTouchMove={(e) => handleMove(e.touches[0].clientX)}
            onTouchEnd={(e) => handleConfirm(e.changedTouches[0].clientX)}
         >
            {[...Array(max)].map((_, index) => {
               const starNumber = index + 1;
               const isFull = displayValue >= starNumber;
               const isHalf = displayValue >= starNumber - 0.5 && displayValue < starNumber;

               return (
                  <button
                     type="button"
                     key={index}
                     className={`${styles.starBtn} ${displayValue >= starNumber - 0.5 ? styles.active : ""}`}
                     title={readOnly ? `Nota: ${value}` : `Dar nota ${displayValue}`}
                     style={{ pointerEvents: "none" }}
                  >
                     {isHalf ? (
                        <StarHalf size={22} fill="currentColor" strokeWidth={1.5} />
                     ) : (
                        <Star size={22} fill={isFull ? "currentColor" : "none"} strokeWidth={1.5} />
                     )}
                  </button>
               );
            })}
         </div>
         <div className={styles.ratingNumber}>
            {displayValue.toFixed(1)} <span className={styles.ratingMax}>/ {max}</span>
         </div>
      </div>
   );
}
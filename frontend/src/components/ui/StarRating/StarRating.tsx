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
   const [lastTap, setLastTap] = useState<{ rating: number, time: number } | null>(null);
   const wrapperRef = useRef<HTMLDivElement>(null);

   const calculateRating = (clientX: number) => {
      if (!wrapperRef.current) return null;
      
      const rect = wrapperRef.current.getBoundingClientRect();
      
      // Zonas de folga para mobile (Se sair ligeiramente, crava os limites)
      if (clientX >= rect.right - 10) return max;
      if (clientX <= rect.left + 10) return 0.5;

      const percent = (clientX - rect.left) / rect.width;
      return Math.max(0.5, Math.min(max, Math.ceil(percent * max * 2) / 2));
   };

   // Eventos de Pointer (Unifica Mobile + PC nativamente)
   const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (readOnly) return;
      const rating = calculateRating(e.clientX);
      if (rating) setHover(rating);
   };

   const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (readOnly || !onChange) return;
      // Captura o "arrasto" do dedo para ele não escapar do componente
      e.currentTarget.setPointerCapture(e.pointerId); 
      const rating = calculateRating(e.clientX);
      if (rating) setHover(rating);
   };

   const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
      if (readOnly || !onChange) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      
      const rating = calculateRating(e.clientX);
      if (rating) {
         const now = e.timeStamp; 
         
         if (lastTap && lastTap.rating === rating && now - lastTap.time < 300) {
            onChange(rating - 0.5);
            setLastTap(null); 
         } else {
            onChange(rating);
            setLastTap({ rating, time: now });
         }
      }
      setHover(null);
   };

   const displayValue = hover !== null ? hover : value;

   return (
      <div className={styles.starContainer}>
         <div 
            className={styles.starsWrapper}
            ref={wrapperRef}
            style={{ 
               display: "inline-flex", 
               width: "max-content", 
               
               cursor: readOnly ? "default" : "pointer", 
               touchAction: readOnly ? "auto" : "none" 
            }}
            onPointerLeave={() => !readOnly && setHover(null)}
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
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
                     style={{ pointerEvents: "none", padding: 0, background: "transparent", border: "none" }}
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
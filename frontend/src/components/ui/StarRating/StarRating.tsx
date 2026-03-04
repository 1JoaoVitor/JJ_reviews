import { useState, useRef } from "react";
import { Star, StarHalf } from "lucide-react";
import styles from "./StarRating.module.css";

interface StarRatingProps {
   value: number;
   onChange: (rating: number) => void;
   max?: number;
}

export function StarRating({ value, onChange, max = 10 }: StarRatingProps) {
   const [hover, setHover] = useState<number | null>(null);
   const wrapperRef = useRef<HTMLDivElement>(null);

   // Calcula a nota (0.5 a max) baseado na posição exata do ponteiro/dedo na tela
   const calculateRating = (clientX: number) => {
      if (!wrapperRef.current) return null;
      
      const { left, width } = wrapperRef.current.getBoundingClientRect();
      const percent = (clientX - left) / width;
      
      if (percent <= 0) return 0.5; // Mínimo
      if (percent >= 1) return max; // Máximo
      
      // Multiplica a % pelo máximo (ex: 85% de 10 = 8.5) e arredonda para os 0.5 mais próximos
      const rawRating = percent * max;
      return Math.ceil(rawRating * 2) / 2; 
   };

   // Quando arrasta o mouse ou o dedo
   const handleMove = (clientX: number) => {
      const rating = calculateRating(clientX);
      if (rating) setHover(rating);
   };

   // Quando clica ou solta o dedo da tela
   const handleConfirm = (clientX: number) => {
      const rating = calculateRating(clientX);
      if (rating) {
         onChange(rating);
         setHover(null); // Limpa o estado visual de hover
      }
   };

   const displayValue = hover !== null ? hover : value;

   return (
      <div className={styles.starContainer}>
         <div 
            className={styles.starsWrapper}
            ref={wrapperRef}
            // Eventos de Computador (Mouse)
            onMouseLeave={() => setHover(null)}
            onMouseMove={(e) => handleMove(e.clientX)}
            onClick={(e) => handleConfirm(e.clientX)}
            // Eventos de Celular (Touch)
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
                     title={`Dar nota ${displayValue}`}
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
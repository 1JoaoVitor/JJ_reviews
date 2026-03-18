import styles from "./MovieCardSkeleton.module.css";

export function MovieCardSkeleton() {
   return (
      <div className={styles.cardSkeleton}>
         {/* O espaço do poster */}
         <div className={`${styles.skeletonPulse} ${styles.posterSkeleton}`}></div>
         
         {/* O corpo do card com os textos falsos */}
         <div className={styles.bodySkeleton}>
            <div className={`${styles.skeletonPulse} ${styles.titleSkeleton}`}></div>
            <div className={`${styles.skeletonPulse} ${styles.metaSkeleton}`}></div>
            
            <div className={styles.tagsSkeleton}>
               <div className={`${styles.skeletonPulse} ${styles.tagSkeleton}`}></div>
               <div className={`${styles.skeletonPulse} ${styles.tagSkeleton} ${styles.tagSkeletonSmall}`}></div>
            </div>
            
            <div className={styles.dividerSkeleton}></div>
            
            <div className={`${styles.skeletonPulse} ${styles.buttonSkeleton}`}></div>
         </div>
      </div>
   );
}
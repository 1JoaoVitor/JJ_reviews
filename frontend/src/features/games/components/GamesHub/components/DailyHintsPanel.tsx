import type { FC } from "react";
import styles from "../GamesHub.module.css";

interface DailyHintsPanelProps {
   revealedHintFields: string[];
   hintValuesByLabel: Record<string, string>;
}

export const DailyHintsPanel: FC<DailyHintsPanelProps> = ({ revealedHintFields, hintValuesByLabel }) => {
   if (revealedHintFields.length === 0) return null;

   return (
      <div className={styles.summaryCard}>
         <h4 className={styles.summaryTitle}>Dicas reveladas</h4>
         <div className={styles.summaryGrid}>
            {revealedHintFields.map((label) => (
               <div key={`hint-${label}`} className={`${styles.summaryItem} ${styles.statusClose}`}>
                  <span className={styles.fieldLabel}>{label}</span>
                  <span className={styles.fieldValue}>{hintValuesByLabel[label]}</span>
               </div>
            ))}
         </div>
      </div>
   );
};

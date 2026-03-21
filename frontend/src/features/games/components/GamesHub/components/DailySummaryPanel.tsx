import type { FC } from "react";
import styles from "../GamesHub.module.css";

interface DailySummaryField {
   label: string;
   guessed: string;
   status: string;
}

interface DailySummary {
   attempts: number;
   livesLeft: number;
   fields: DailySummaryField[];
}

interface DailySummaryPanelProps {
   summary: DailySummary;
}

export const DailySummaryPanel: FC<DailySummaryPanelProps> = ({ summary }) => {
   if (summary.attempts <= 0) return null;

   return (
      <div className={styles.summaryCard}>
         <h4 className={styles.summaryTitle}>Resumo das informacoes obtidas</h4>
         <div className={styles.summaryMeta}>
            <span>Tentativas: {summary.attempts}</span>
            <span>Vidas restantes: {summary.livesLeft}</span>
         </div>
         <div className={styles.summaryGrid}>
            {summary.fields.map((field) => (
               <div
                  key={`summary-${field.label}`}
                  className={`${styles.summaryItem} ${styles[`status${field.status.charAt(0).toUpperCase()}${field.status.slice(1)}`]}`}
               >
                  <span className={styles.fieldLabel}>{field.label}</span>
                  <span className={styles.fieldValue}>{field.guessed}</span>
               </div>
            ))}
         </div>
      </div>
   );
};

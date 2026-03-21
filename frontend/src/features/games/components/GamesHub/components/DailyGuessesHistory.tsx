import type { FC } from "react";
import type { GuessResult } from "@/features/games/logic/dailyGameLogic";
import styles from "../GamesHub.module.css";

interface DailyGuessesHistoryProps {
   guesses: GuessResult[];
}

export const DailyGuessesHistory: FC<DailyGuessesHistoryProps> = ({ guesses }) => {
   return (
      <div className={styles.resultsList}>
         {guesses.map((guess, idx) => (
            <div key={`${guess.guessTitle}-${idx}`} className={styles.resultCard}>
               <strong className={styles.resultTitle}>{guess.guessTitle}</strong>
               <div className={styles.resultFields}>
                  {guess.fields.map((field) => (
                     <div
                        key={`${guess.guessTitle}-${field.label}`}
                        className={`${styles.resultField} ${styles[`status${field.status.charAt(0).toUpperCase()}${field.status.slice(1)}`]}`}
                     >
                        <span className={styles.fieldLabel}>{field.label}</span>
                        <span className={styles.fieldValue}>{field.guessed}</span>
                     </div>
                  ))}
               </div>
            </div>
         ))}
      </div>
   );
};

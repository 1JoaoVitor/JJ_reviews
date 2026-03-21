import type { FC } from "react";
import styles from "../GamesHub.module.css";

interface DailyRoundControlsProps {
   maxLives: number;
   lives: number;
   canUseHint: boolean;
   onNewGame: () => void;
   onUseHint: () => void;
}

export const DailyRoundControls: FC<DailyRoundControlsProps> = ({
   maxLives,
   lives,
   canUseHint,
   onNewGame,
   onUseHint,
}) => {
   return (
      <div className={styles.livesRow}>
         <span>Vidas:</span>
         {[...Array(maxLives)].map((_, idx) => (
            <span key={idx} className={`${styles.lifeDot} ${idx < lives ? styles.lifeDotOn : styles.lifeDotOff}`} />
         ))}

         <div className={styles.roundActionGroup}>
            <button type="button" className={styles.newRoundBtn} onClick={onNewGame}>
               Novo jogo
            </button>
            <button type="button" className={styles.newRoundBtn} onClick={onUseHint} disabled={!canUseHint}>
               Usar dica
            </button>
         </div>
      </div>
   );
};

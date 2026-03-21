import type { FC } from "react";
import type { DailySourceMode } from "@/features/games/logic/dailyGameLogic";
import styles from "../GamesHub.module.css";

interface DailySourceConfigProps {
   dailySourceMode: DailySourceMode;
   setDailySourceMode: (value: DailySourceMode) => void;
   dailyScopeError: string | null;
}

export const DailySourceConfig: FC<DailySourceConfigProps> = ({
   dailySourceMode,
   setDailySourceMode,
   dailyScopeError,
}) => {
   const dailySourceLabel =
      dailySourceMode === "global_daily"
         ? "Filme do dia"
         : dailySourceMode === "my_watched"
            ? "Meus assistidos"
            : "Lista selecionada";

   return (
      <div className={styles.modeCard}>
         <strong className={styles.modeTitle}>Fonte do desafio</strong>
         <div className={styles.modeOptions}>
            <button
               type="button"
               className={`${styles.modeBtn} ${dailySourceMode === "global_daily" ? styles.modeBtnActive : ""}`}
               onClick={() => setDailySourceMode("global_daily")}
            >
               Filme do dia
            </button>
            <button
               type="button"
               className={`${styles.modeBtn} ${dailySourceMode === "my_watched" ? styles.modeBtnActive : ""}`}
               onClick={() => setDailySourceMode("my_watched")}
            >
               Meus assistidos
            </button>
            <button
               type="button"
               className={`${styles.modeBtn} ${dailySourceMode === "list_scope" ? styles.modeBtnActive : ""}`}
               onClick={() => setDailySourceMode("list_scope")}
            >
               Lista selecionada
            </button>
         </div>
         <small className={styles.scopeHint}>Escopo atual: {dailySourceLabel}</small>
         {dailyScopeError && <p className={styles.errorMsg}>{dailyScopeError}</p>}
      </div>
   );
};

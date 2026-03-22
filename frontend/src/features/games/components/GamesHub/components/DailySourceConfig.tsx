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


   return (
      <div className={styles.modeCard}>
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
         {dailyScopeError && <p className={styles.errorMsg}>{dailyScopeError}</p>}
      </div>
   );
};

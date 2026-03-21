import type { FC } from "react";
import { Form } from "react-bootstrap";
import type { CustomList, MovieData } from "@/types";
import type { BattleSourceMode } from "../hooks/useGamesHubScopes";
import { getTodayKey } from "../logic/dailyMovieGameLogic";
import styles from "../GamesHub.module.css";

interface BattleModeConfigProps {
   battleSourceMode: BattleSourceMode;
   setBattleSourceMode: (value: BattleSourceMode) => void;
   battleListId: string;
   setBattleListId: (value: string) => void;
   lists: CustomList[];
   battlePlayableMovies: MovieData[];
   battleDailyLoading: boolean;
   battleScopeError: string | null;
}

export const BattleModeConfig: FC<BattleModeConfigProps> = ({
   battleSourceMode,
   setBattleSourceMode,
   battleListId,
   setBattleListId,
   lists,
   battlePlayableMovies,
   battleDailyLoading,
   battleScopeError,
}) => {
   return (
      <div className={styles.modeCard}>
         <strong className={styles.modeTitle}>Configuracao da batalha</strong>
         <div className={styles.modeOptions}>
            <button
               type="button"
               className={`${styles.modeBtn} ${battleSourceMode === "my_watched" ? styles.modeBtnActive : ""}`}
               onClick={() => setBattleSourceMode("my_watched")}
            >
               Meus assistidos
            </button>
            <button
               type="button"
               className={`${styles.modeBtn} ${battleSourceMode === "list_scope" ? styles.modeBtnActive : ""}`}
               onClick={() => setBattleSourceMode("list_scope")}
            >
               Lista selecionada
            </button>
            <button
               type="button"
               className={`${styles.modeBtn} ${battleSourceMode === "daily_16" ? styles.modeBtnActive : ""}`}
               onClick={() => setBattleSourceMode("daily_16")}
            >
               Rodada diaria de 16
            </button>
         </div>

         {battleSourceMode === "list_scope" && (
            <div className={styles.inlineFilter}>
               <label htmlFor="battle-list-scope">Lista da batalha</label>
               <Form.Select
                  id="battle-list-scope"
                  className={styles.inlineSelect}
                  value={battleListId}
                  disabled={lists.length === 0}
                  onChange={(event) => setBattleListId(event.target.value)}
               >
                  {lists.length === 0 ? (
                     <option value="">Nenhuma lista</option>
                  ) : (
                     lists.map((list) => (
                        <option key={list.id} value={list.id}>{list.name}</option>
                     ))
                  )}
               </Form.Select>
            </div>
         )}

         <small className={styles.scopeHint}>Filmes disponiveis: <strong>{battlePlayableMovies.length}</strong></small>
         {battleSourceMode === "daily_16" && <small className={styles.scopeHint}>Fonte diaria: TMDB ({getTodayKey()})</small>}
         {battleDailyLoading && battleSourceMode === "daily_16" && <p className={styles.emptyMsg}>Montando rodada diaria...</p>}
         {battleScopeError && <p className={styles.errorMsg}>{battleScopeError}</p>}
      </div>
   );
};

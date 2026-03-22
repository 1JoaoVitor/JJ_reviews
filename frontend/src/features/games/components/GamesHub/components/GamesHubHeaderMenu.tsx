import type { FC } from "react";
import { Clapperboard, Gamepad2 } from "lucide-react";
import type { GameId } from "../logic/gameHelpContent";
import { GameModeCard } from "./GameModeCard";
import styles from "../GamesHub.module.css";

interface GamesHubHeaderMenuProps {
   activeGame: GameId;
   onBackHome: () => void;
   onBackToMenu: () => void;
   onSelectGame: (gameId: Exclude<GameId, "menu">) => void;
}

export const GamesHubHeaderMenu: FC<GamesHubHeaderMenuProps> = ({
   activeGame,
   onBackHome,
   onBackToMenu,
   onSelectGame,
}) => {
   return (
      <>
         <div className={styles.headerRow}>
            <div>
               <h1 className={styles.title}>Central de Jogos</h1>
            </div>
            <div className={styles.headerActions}>
               <button type="button" className={styles.backBtn} onClick={onBackHome}>Voltar para inicio</button>
               {activeGame !== "menu" && (
                  <button type="button" className={styles.backBtn} onClick={onBackToMenu}>
                     Voltar para jogos
                  </button>
               )}
            </div>
         </div>

         {activeGame === "menu" && (
            <div className={styles.menuGrid}>
               <GameModeCard
                  icon={<Gamepad2 size={24} />}
                  title="Modo Batalha"
                  description="Coloque seus filmes frente a frente num torneio mata-mata para definir o seu favorito de verdade."
                  onClick={() => onSelectGame("battle")}
               />

               <GameModeCard
                  icon={<Clapperboard size={24} />}
                  title="Filme do Dia: Capa"
                  description="Tente adivinhar o filme com base na capa."
                  onClick={() => onSelectGame("daily_cover")}
               />

               <GameModeCard
                  icon={<Clapperboard size={24} />}
                  title="Filme do Dia: Enigma"
                  description="Tente adivinhar o filme com base em dicas."
                  onClick={() => onSelectGame("daily_riddle")}
               />
            </div>
         )}

      </>
   );
};

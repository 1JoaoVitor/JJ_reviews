import type { FC, ReactNode } from "react";
import styles from "../GamesHub.module.css";

interface GameModeCardProps {
   icon: ReactNode;
   title: string;
   description: string;
   onClick: () => void;
}

export const GameModeCard: FC<GameModeCardProps> = ({ icon, title, description, onClick }) => {
   return (
      <button type="button" className={styles.menuCard} onClick={onClick}>
         <div className={styles.menuCardIcon}>{icon}</div>
         <h3>{title}</h3>
         <p>{description}</p>
      </button>
   );
};

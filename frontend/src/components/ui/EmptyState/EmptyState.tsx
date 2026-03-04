import { Film, Plus } from "lucide-react";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
   title: string;
   message: string;
   actionText: string;
   onAction: () => void;
}

export function EmptyState({ title, message, actionText, onAction }: EmptyStateProps) {
   return (
      <div className={styles.emptyContainer}>
         <div className={styles.iconWrapper}>
            <Film size={48} strokeWidth={1.5} />
         </div>
         <h3 className={styles.title}>{title}</h3>
         <p className={styles.message}>{message}</p>
         <button className={styles.actionBtn} onClick={onAction}>
            <Plus size={20} strokeWidth={2.5} />
            {actionText}
         </button>
      </div>
   );
}
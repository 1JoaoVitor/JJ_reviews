import { Heart, Share2, Copy } from "lucide-react";
import styles from "./ListActionButtons.module.css";

interface ListActionButtonsProps {
  isLiked: boolean;
  likesCount: number;
  isActionLoading: boolean;
  onLike: () => Promise<void>;
  onShowLikes: () => void;
  onShare: () => Promise<void>;
  onDuplicate: () => void;
}

export function ListActionButtons({ 
  isLiked, 
  likesCount, 
  isActionLoading, 
  onLike, 
  onShowLikes,
  onShare, 
  onDuplicate 
}: ListActionButtonsProps) {
  return (
    <div className={styles.container}>
      <button 
        className={`${styles.actionButton} ${isLiked ? styles.liked : ""}`}
        onClick={onLike}
        disabled={isActionLoading}
        title="Curtir lista"
      >
        <Heart size={20} />
        <span className={styles.count}>{likesCount}</span>
      </button>

      <button
        className={styles.secondaryActionButton}
        onClick={onShowLikes}
        disabled={likesCount === 0}
        title="Ver quem curtiu"
      >
        Ver curtidas
      </button>

      <button 
        className={styles.actionButton} 
        onClick={onShare}
        title="Copiar link de compartilhamento"
      >
        <Share2 size={20} />
        <span>Compartilhar</span>
      </button>

      <button 
        className={styles.actionButton} 
        onClick={onDuplicate}
        disabled={isActionLoading}
        title="Duplicar esta lista"
      >
        <Copy size={20} />
        <span>Duplicar</span>
      </button>
    </div>
  );
}
import { useMemo, useState } from "react";
import { Modal, Spinner } from "react-bootstrap";
import styles from "./ListLikesModal.module.css";
import type { DerivedFriendshipStatus } from "@/features/friends/logic/mapFriendshipStatus";

export interface ListLikerItem {
  id: string;
  username: string;
  avatar_url: string | null;
  liked_at: string;
}

interface ListLikesModalProps {
  show: boolean;
  onHide: () => void;
  likers: ListLikerItem[];
  isLoading: boolean;
  onProfileClick: (username: string) => void;
  currentUserId?: string;
  friendshipStatusByUserId?: Record<string, DerivedFriendshipStatus>;
  friendActionLoadingByUserId?: Record<string, boolean>;
  onFriendAction?: (userId: string, action: "send" | "accept" | "reject" | "remove") => void | Promise<void>;
}

function formatLikeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Agora";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

const PAGE_SIZE = 10;

export function ListLikesModal({
  show,
  onHide,
  likers,
  isLoading,
  onProfileClick,
  currentUserId,
  friendshipStatusByUserId = {},
  friendActionLoadingByUserId = {},
  onFriendAction,
}: ListLikesModalProps) {
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredLikers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return likers;
    return likers.filter((liker) => liker.username.toLowerCase().includes(normalized));
  }, [likers, search]);

  const visibleLikers = filteredLikers.slice(0, visibleCount);
  const hasMore = visibleLikers.length < filteredLikers.length;

  const renderFriendActions = (liker: ListLikerItem) => {
    if (!currentUserId || liker.id === currentUserId || !onFriendAction) return null;

    const status = friendshipStatusByUserId[liker.id] || "none";
    const isLoadingAction = Boolean(friendActionLoadingByUserId[liker.id]);

    if (status === "friends") {
      return <span className={styles.friendBadge}>Amigos</span>;
    }

    if (status === "request_sent") {
      return (
        <button
          type="button"
          className={styles.secondaryActionBtn}
          disabled={isLoadingAction}
          onClick={(event) => {
            event.stopPropagation();
            onFriendAction(liker.id, "remove");
          }}
        >
          {isLoadingAction ? "..." : "Cancelar"}
        </button>
      );
    }

    if (status === "request_received") {
      return (
        <div className={styles.actionsRow}>
          <button
            type="button"
            className={styles.primaryActionBtn}
            disabled={isLoadingAction}
            onClick={(event) => {
              event.stopPropagation();
              onFriendAction(liker.id, "accept");
            }}
          >
            {isLoadingAction ? "..." : "Aceitar"}
          </button>
          <button
            type="button"
            className={styles.secondaryActionBtn}
            disabled={isLoadingAction}
            onClick={(event) => {
              event.stopPropagation();
              onFriendAction(liker.id, "reject");
            }}
          >
            Recusar
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        className={styles.primaryActionBtn}
        disabled={isLoadingAction}
        onClick={(event) => {
          event.stopPropagation();
          onFriendAction(liker.id, "send");
        }}
      >
        {isLoadingAction ? "..." : "Adicionar"}
      </button>
    );
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      contentClassName={styles.modalContent}
      onEntering={() => {
        setSearch("");
        setVisibleCount(PAGE_SIZE);
      }}
    >
      <Modal.Header closeButton closeVariant="white" className={styles.header}>
        <Modal.Title className={styles.title}>Quem curtiu esta lista</Modal.Title>
      </Modal.Header>

      <Modal.Body className={styles.body}>
        {!isLoading && likers.length > 0 && (
          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className={styles.searchInput}
            placeholder="Buscar por @username"
          />
        )}

        {isLoading ? (
          <div className={styles.loadingState}>
            <Spinner animation="border" variant="light" size="sm" />
            <span>Carregando curtidas...</span>
          </div>
        ) : filteredLikers.length === 0 ? (
          <div className={styles.emptyState}>
            {likers.length === 0 ? "Ninguem curtiu esta lista ainda." : "Nenhum usuario encontrado."}
          </div>
        ) : (
          <>
            <div className={styles.list}>
            {visibleLikers.map((liker) => (
              <div
                key={liker.id}
                className={styles.userRow}
                role="button"
                tabIndex={0}
                onClick={() => onProfileClick(liker.username)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onProfileClick(liker.username);
                  }
                }}
              >
                {liker.avatar_url ? (
                  <img src={liker.avatar_url} alt={liker.username} className={styles.avatar} />
                ) : (
                  <div className={styles.avatarPlaceholder}>{liker.username.charAt(0).toUpperCase()}</div>
                )}

                <div className={styles.userInfo}>
                  <strong>@{liker.username}</strong>
                  <span>Curtiu em {formatLikeDate(liker.liked_at)}</span>
                </div>

                <div className={styles.rightActions}>{renderFriendActions(liker)}</div>
              </div>
            ))}
            </div>

            {hasMore && (
              <div className={styles.paginationFooter}>
                <button
                  type="button"
                  className={styles.loadMoreBtn}
                  onClick={() => setVisibleCount((previous) => previous + PAGE_SIZE)}
                >
                  Ver mais
                </button>
              </div>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}

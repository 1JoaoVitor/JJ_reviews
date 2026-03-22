import { useMemo } from "react";
import { CalendarDays, Users2, BellRing, BellOff, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { MovieData } from "@/types";
import { useDiary } from "../../hooks/useDiary";
import { useFriendDiaryActivities } from "../../hooks/useFriendDiaryActivities";
import styles from "./DiaryPage.module.css";

interface DiaryPageProps {
  userId?: string;
  movies: MovieData[];
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function resolveMovieLabel(tmdbId: number, moviesByTmdbId: Map<number, MovieData>) {
  const movie = moviesByTmdbId.get(tmdbId);
  return {
    title: movie?.title || `Filme #${tmdbId}`,
    posterPath: movie?.poster_path || null,
    rating: movie?.rating ?? null,
  };
}

export function DiaryPage({ userId, movies }: DiaryPageProps) {
  const navigate = useNavigate();
  const {
    entries,
    loading,
    error,
    refresh,
    removeEntry,
    notifyFriendActivity,
    setNotifyFriendActivity,
  } = useDiary(userId);

  const {
    activities,
    loading: loadingActivities,
    error: activityError,
    refresh: refreshActivities,
  } = useFriendDiaryActivities(userId, true);

  const moviesByTmdbId = useMemo(() => {
    const map = new Map<number, MovieData>();
    for (const movie of movies) {
      map.set(movie.tmdb_id, movie);
    }
    return map;
  }, [movies]);

  if (!userId) {
    return (
      <section className={styles.page}>
        <div className={styles.headerRow}>
          <h2 className={styles.title}>Diary</h2>
          <p className={styles.subtitle}>Faça login para usar seu diário de filmes.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Diary</h2>
          <p className={styles.subtitle}>Seu histórico de filmes assistidos + atividade recente dos amigos.</p>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.refreshBtn} type="button" onClick={() => { refresh(); refreshActivities(); }}>
            Atualizar
          </button>
          <button
            className={styles.notifyBtn}
            type="button"
            onClick={() => setNotifyFriendActivity(!notifyFriendActivity)}
            title={notifyFriendActivity ? "Notificações de amigos ativadas" : "Notificações de amigos desativadas"}
          >
            {notifyFriendActivity ? <BellRing size={16} /> : <BellOff size={16} />}
            {notifyFriendActivity ? "Notificações ON" : "Notificações OFF"}
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>
              <CalendarDays size={16} /> Sua atividade
            </h3>
          </div>

          {loading && <p className={styles.muted}>Carregando diary...</p>}
          {error && <p className={styles.error}>{error}</p>}

          {!loading && entries.length === 0 && (
            <p className={styles.muted}>Nenhum filme no diary ainda. Ao marcar filme como assistido, ele aparece aqui.</p>
          )}

          <div className={styles.timelineList}>
            {entries.map((entry) => {
              const movie = resolveMovieLabel(entry.tmdb_id, moviesByTmdbId);
              return (
                <article key={entry.id} className={styles.item}>
                  <button
                    className={styles.posterButton}
                    type="button"
                    onClick={() => navigate(`/`)}
                    title="Abrir filme na tela principal"
                  >
                    {movie.posterPath ? (
                      <img src={`https://image.tmdb.org/t/p/w154${movie.posterPath}`} alt={movie.title} className={styles.poster} />
                    ) : (
                      <div className={styles.posterFallback}>Sem poster</div>
                    )}
                  </button>

                  <div className={styles.itemBody}>
                    <strong className={styles.itemTitle}>{movie.title}</strong>
                    <span className={styles.meta}>Assistido em {formatDate(entry.watched_date)}</span>
                    {movie.rating !== null && movie.rating !== undefined && (
                      <span className={styles.meta}>Sua nota: {movie.rating.toFixed(1)}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => removeEntry(entry.id)}
                    title="Remover entrada"
                  >
                    <Trash2 size={14} />
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>
              <Users2 size={16} /> Amigos
            </h3>
          </div>

          {loadingActivities && <p className={styles.muted}>Carregando atividades dos amigos...</p>}
          {activityError && <p className={styles.error}>{activityError}</p>}

          {!loadingActivities && activities.length === 0 && (
            <p className={styles.muted}>Sem atividades recentes dos amigos por enquanto.</p>
          )}

          <div className={styles.timelineList}>
            {activities.map((activity) => {
              const movie = resolveMovieLabel(activity.tmdb_id, moviesByTmdbId);
              return (
                <article key={activity.id} className={styles.item}>
                  {movie.posterPath ? (
                    <img src={`https://image.tmdb.org/t/p/w154${movie.posterPath}`} alt={movie.title} className={styles.poster} />
                  ) : (
                    <div className={styles.posterFallback}>Sem poster</div>
                  )}

                  <div className={styles.itemBody}>
                    <strong className={styles.itemTitle}>{movie.title}</strong>
                    <span className={styles.meta}>
                      @{activity.friend_username} assistiu em {formatDate(activity.watched_date)}
                    </span>
                    {activity.rating !== null && activity.rating !== undefined && (
                      <span className={styles.meta}>Nota dele(a): {activity.rating.toFixed(1)}</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}

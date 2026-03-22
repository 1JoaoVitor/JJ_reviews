import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Users2, BellRing, BellOff, Trash2, Search, UserPlus, UserCheck, Clock4, XCircle, ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { MovieData } from "@/types";
import { getMovieDetails } from "@/features/movies/services/tmdbService";
import { mapFriendshipStatus } from "@/features/friends/logic/mapFriendshipStatus";
import {
  acceptFriendRequest,
  createFriendRequest,
  deleteFriendshipBetween,
  deleteIncomingFriendRequest,
  fetchFriendshipsForTargets,
  notifyFriendAccepted,
  notifyFriendRequest,
} from "@/features/friends/services/friendshipService";
import { supabase } from "@/lib/supabase";
import { useDiary } from "../../hooks/useDiary";
import { useFriendDiaryActivities } from "../../hooks/useFriendDiaryActivities";
import styles from "./DiaryPage.module.css";

interface DiaryPageProps {
  userId?: string;
  movies: MovieData[];
  onOpenMovie?: (movie: MovieData) => void;
}

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface FriendEntry extends UserProfile {
  status: string | undefined;
  isRequester: boolean;
}

type SocialTab = "diary" | "friends";

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function resolveMovieLabel(tmdbId: number, moviesByTmdbId: Map<number, MovieData>) {
  const movie = moviesByTmdbId.get(tmdbId);
  return {
    title: movie?.title || `Filme #${tmdbId}`,
    posterPath: movie?.poster_path || null,
    rating: movie?.rating ?? null,
  };
}

export function DiaryPage({ userId, movies, onOpenMovie }: DiaryPageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<SocialTab>("diary");
  const [friendActivityMovieMeta, setFriendActivityMovieMeta] = useState<
    Record<number, { title: string; posterPath: string | null }>
  >({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [friendsList, setFriendsList] = useState<FriendEntry[]>([]);
  const [friendshipStatusByUserId, setFriendshipStatusByUserId] = useState<Record<string, string>>({});
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

  const tabParam = searchParams.get("tab");

  useEffect(() => {
    if (tabParam === "friends" || tabParam === "diary") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (tabParam === activeTab) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", activeTab);
    setSearchParams(nextParams, { replace: true });
  }, [activeTab, tabParam, searchParams, setSearchParams]);

  useEffect(() => {
    const activityTmdbIds = Array.from(new Set(activities.map((activity) => activity.tmdb_id)));
    const missingDetailsIds = activityTmdbIds.filter((tmdbId) => !friendActivityMovieMeta[tmdbId]);

    if (missingDetailsIds.length === 0) {
      return;
    }

    let cancelled = false;

    const fetchMovieDetails = async () => {
      const resolved = await Promise.all(
        missingDetailsIds.map(async (tmdbId) => {
          try {
            const details = await getMovieDetails(tmdbId);
            if (!details) {
              return [tmdbId, null] as const;
            }

            return [
              tmdbId,
              {
                title: details.title || `Filme #${tmdbId}`,
                posterPath: details.poster_path || null,
              },
            ] as const;
          } catch {
            return [tmdbId, null] as const;
          }
        })
      );

      if (cancelled) {
        return;
      }

      setFriendActivityMovieMeta((previous) => {
        const next = { ...previous };
        for (const [tmdbId, meta] of resolved) {
          if (meta) {
            next[tmdbId] = meta;
          }
        }
        return next;
      });
    };

    void fetchMovieDetails();

    return () => {
      cancelled = true;
    };
  }, [activities, friendActivityMovieMeta]);

  const fetchFriends = useCallback(async () => {
    if (!userId) {
      setFriendsList([]);
      return;
    }

    setIsLoadingFriends(true);
    try {
      const { data: connections, error: connectionError } = await supabase
        .from("friendships")
        .select("requester_id, receiver_id, status")
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

      if (connectionError) throw connectionError;

      const friendshipRows = (connections as Array<{ requester_id: string; receiver_id: string; status: string }>) || [];

      if (friendshipRows.length === 0) {
        setFriendsList([]);
        return;
      }

      const otherUserIds = friendshipRows.map((row) =>
        row.requester_id === userId ? row.receiver_id : row.requester_id
      );

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", otherUserIds);

      if (profileError) throw profileError;

      const merged = ((profiles as UserProfile[]) || []).map((profile) => {
        const conn = friendshipRows.find(
          (row) => row.requester_id === profile.id || row.receiver_id === profile.id
        );

        return {
          ...profile,
          status: conn?.status,
          isRequester: conn?.requester_id === userId,
        };
      });

      setFriendsList(merged);
    } catch (error) {
      console.error("Erro ao carregar amigos:", error);
    } finally {
      setIsLoadingFriends(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchFriends();
  }, [fetchFriends]);

  const updateSearchStatuses = useCallback(
    async (users: UserProfile[]) => {
      if (!userId || users.length === 0) {
        setFriendshipStatusByUserId({});
        return;
      }

      try {
        const friendships = await fetchFriendshipsForTargets(
          userId,
          users.map((user) => user.id)
        );

        const statusMap: Record<string, string> = {};
        for (const user of users) {
          const friendship = friendships.find(
            (row) =>
              (row.requester_id === userId && row.receiver_id === user.id) ||
              (row.receiver_id === userId && row.requester_id === user.id)
          );

          statusMap[user.id] = mapFriendshipStatus(userId, user.id, friendship || null);
        }

        setFriendshipStatusByUserId(statusMap);
      } catch (error) {
        console.error("Erro ao mapear status de amizade:", error);
      }
    },
    [userId]
  );

  const handleSearchUsers = async () => {
    if (!searchQuery.trim() || !userId) return;

    setSearchingUsers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `%${searchQuery.trim()}%`)
        .neq("id", userId)
        .limit(10);

      if (error) throw error;

      const users = (data as UserProfile[]) || [];
      setSearchResults(users);
      await updateSearchStatuses(users);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleFriendAction = async (targetUserId: string, action: "send" | "accept" | "reject" | "remove") => {
    if (!userId) return;

    try {
      if (action === "send") {
        await createFriendRequest(userId, targetUserId);
        await notifyFriendRequest(targetUserId, userId);
        setFriendshipStatusByUserId((previous) => ({ ...previous, [targetUserId]: "request_sent" }));
      } else if (action === "accept") {
        await acceptFriendRequest(targetUserId, userId);
        await notifyFriendAccepted(targetUserId, userId);
        setFriendshipStatusByUserId((previous) => ({ ...previous, [targetUserId]: "friends" }));
      } else if (action === "reject") {
        await deleteIncomingFriendRequest(targetUserId, userId);
        setFriendshipStatusByUserId((previous) => ({ ...previous, [targetUserId]: "none" }));
      } else {
        await deleteFriendshipBetween(userId, targetUserId);
        setFriendshipStatusByUserId((previous) => ({ ...previous, [targetUserId]: "none" }));
      }

      await fetchFriends();
    } catch (error) {
      console.error("Erro ao processar ação de amizade:", error);
    }
  };

  const handleOpenMovie = async (tmdbId: number) => {
    const movie = moviesByTmdbId.get(tmdbId);
    if (movie && onOpenMovie) {
      onOpenMovie(movie);
      return;
    }

    if (onOpenMovie) {
      try {
        const details = await getMovieDetails(tmdbId);
        if (details) {
          const fallbackMovie: MovieData = {
            id: details.id,
            tmdb_id: details.id,
            title: details.title || `Filme #${tmdbId}`,
            poster_path: details.poster_path || undefined,
            release_date: details.release_date || undefined,
            overview: details.overview || undefined,
            director:
              details.credits?.crew?.find((member: { job?: string; name?: string }) => member.job === "Director")?.name ||
              "Não informado",
            cast: (details.credits?.cast || []).slice(0, 8).map((member: { name?: string }) => member.name || ""),
            countries: (details.production_countries || []).map((country: { name?: string }) => country.name || "").filter(Boolean),
            genres: (details.genres || []).map((genre: { name?: string }) => genre.name || "").filter(Boolean),
            providers: [],
            rating: null,
            review: "",
            recommended: "",
            status: "watched",
            created_at: new Date().toISOString(),
            runtime: details.runtime || 0,
          };

          onOpenMovie(fallbackMovie);
          return;
        }
      } catch (error) {
        console.error("Erro ao carregar detalhes do filme para modal:", error);
      }
    }

    navigate("/");
  };

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

  const handleRefresh = () => {
    if (activeTab === "friends") {
      void fetchFriends();
      return;
    }

    refresh();
    refreshActivities();
  };

  return (
    <section className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
            Voltar
          </button>
          <h2 className={styles.title}>Social</h2>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.refreshBtn} type="button" onClick={handleRefresh}>
            <span className={styles.desktopText}>Atualizar</span>
            <span className={styles.mobileText}>Sync</span>
          </button>
          {activeTab === "diary" && (
            <button
              className={styles.notifyBtn}
              type="button"
              onClick={() => setNotifyFriendActivity(!notifyFriendActivity)}
              title={notifyFriendActivity ? "Notificações de amigos ativadas" : "Notificações de amigos desativadas"}
            >
              {notifyFriendActivity ? <BellRing size={16} /> : <BellOff size={16} />}
              <span className={styles.desktopText}>{notifyFriendActivity ? "Notificações ON" : "Notificações OFF"}</span>
              <span className={styles.mobileText}>{notifyFriendActivity ? "ON" : "OFF"}</span>
            </button>
          )}
        </div>
      </div>

      <div className={styles.hubTabs} role="tablist" aria-label="Navegação do hub social">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "diary"}
          className={`${styles.hubTabBtn} ${activeTab === "diary" ? styles.hubTabBtnActive : ""}`}
          onClick={() => setActiveTab("diary")}
        >
          Diary
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "friends"}
          className={`${styles.hubTabBtn} ${activeTab === "friends" ? styles.hubTabBtnActive : ""}`}
          onClick={() => setActiveTab("friends")}
        >
          Amigos
        </button>
      </div>

      {activeTab === "diary" && (
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
                    onClick={() => {
                      void handleOpenMovie(entry.tmdb_id);
                    }}
                    title="Abrir filme"
                    aria-label={`Abrir filme ${movie.title}`}
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
              <Users2 size={16} /> Atividade dos amigos
            </h3>
          </div>

          {loadingActivities && <p className={styles.muted}>Carregando atividades dos amigos...</p>}
          {activityError && <p className={styles.error}>{activityError}</p>}

          {!loadingActivities && activities.length === 0 && (
            <p className={styles.muted}>Sem atividades recentes dos amigos por enquanto.</p>
          )}

          <div className={styles.timelineList}>
            {activities.map((activity) => {
              const movieFromActivity = friendActivityMovieMeta[activity.tmdb_id];
              const movie = movieFromActivity
                ? {
                    title: movieFromActivity.title,
                    posterPath: movieFromActivity.posterPath,
                    rating: null,
                  }
                : resolveMovieLabel(activity.tmdb_id, moviesByTmdbId);
              return (
                <article key={activity.id} className={styles.item}>
                  <button
                    className={styles.posterButton}
                    type="button"
                    onClick={() => {
                      void handleOpenMovie(activity.tmdb_id);
                    }}
                    title="Abrir filme"
                    aria-label={`Abrir filme ${movie.title}`}
                  >
                    {movie.posterPath ? (
                      <img src={`https://image.tmdb.org/t/p/w154${movie.posterPath}`} alt={movie.title} className={styles.poster} />
                    ) : (
                      <div className={styles.posterFallback}>Sem poster</div>
                    )}
                  </button>

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
      )}

      {activeTab === "friends" && (
        <div className={styles.grid}>
          <section className={`${styles.panel} ${styles.panelWide}`}>
          <div className={styles.panelHeader}>
            <h3>
              <Users2 size={16} /> Gerenciar amigos
            </h3>
          </div>

          <div className={styles.friendSearchRow}>
            <div className={styles.friendSearchInputWrap}>
              <Search size={15} className={styles.friendSearchIcon} />
              <input
                type="text"
                value={searchQuery}
                placeholder="Buscar por @username"
                onChange={(event) => setSearchQuery(event.target.value)}
                className={styles.friendSearchInput}
              />
            </div>
            <button
              type="button"
              className={styles.friendSearchButton}
              onClick={handleSearchUsers}
              disabled={searchingUsers || !searchQuery.trim()}
            >
              {searchingUsers ? "Buscando..." : "Buscar"}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className={styles.friendSection}>
              <strong className={styles.friendSectionTitle}>Resultados da busca</strong>
              <div className={styles.friendList}>
                {searchResults.map((user) => {
                  const status = friendshipStatusByUserId[user.id] || "none";

                  return (
                    <article key={user.id} className={styles.friendItem}>
                      <button
                        type="button"
                        className={styles.friendProfileBtn}
                        onClick={() => navigate(`/perfil/${user.username}`)}
                      >
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.username} className={styles.friendAvatar} />
                        ) : (
                          <div className={styles.friendAvatarFallback}>{user.username.charAt(0).toUpperCase()}</div>
                        )}
                        <span className={styles.friendName}>@{user.username}</span>
                      </button>

                      <div className={styles.friendActionGroup}>
                        {status === "none" && (
                          <button type="button" className={styles.friendActionBtn} onClick={() => handleFriendAction(user.id, "send")}>
                            <UserPlus size={14} /> Adicionar
                          </button>
                        )}
                        {status === "request_sent" && (
                          <button type="button" className={styles.friendActionBtnMuted} onClick={() => handleFriendAction(user.id, "remove")}>
                            <Clock4 size={14} /> Cancelar
                          </button>
                        )}
                        {status === "request_received" && (
                          <>
                            <button type="button" className={styles.friendActionBtn} onClick={() => handleFriendAction(user.id, "accept")}>
                              <UserCheck size={14} /> Aceitar
                            </button>
                            <button type="button" className={styles.friendActionBtnMuted} onClick={() => handleFriendAction(user.id, "reject")}>
                              <XCircle size={14} /> Recusar
                            </button>
                          </>
                        )}
                        {status === "friends" && (
                          <button type="button" className={styles.friendActionBtnMuted} onClick={() => handleFriendAction(user.id, "remove")}>
                            Remover
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          <div className={styles.friendSection}>
            <strong className={styles.friendSectionTitle}>Sua rede</strong>
            {isLoadingFriends ? (
              <p className={styles.muted}>Carregando amigos...</p>
            ) : friendsList.length === 0 ? (
              <p className={styles.muted}>Você ainda não tem conexões. Use a busca para adicionar amigos.</p>
            ) : (
              <div className={styles.friendList}>
                {friendsList.map((friend) => (
                  <article key={friend.id} className={styles.friendItem}>
                    <button
                      type="button"
                      className={styles.friendProfileBtn}
                      onClick={() => navigate(`/perfil/${friend.username}`)}
                    >
                      {friend.avatar_url ? (
                        <img src={friend.avatar_url} alt={friend.username} className={styles.friendAvatar} />
                      ) : (
                        <div className={styles.friendAvatarFallback}>{friend.username.charAt(0).toUpperCase()}</div>
                      )}
                      <span className={styles.friendName}>@{friend.username}</span>
                    </button>

                    <div className={styles.friendActionGroup}>
                      {friend.status === "accepted" && <span className={styles.friendBadge}>Amigos</span>}
                      {friend.status === "pending" && friend.isRequester && <span className={styles.friendBadgeMuted}>Pedido enviado</span>}
                      {friend.status === "pending" && !friend.isRequester && (
                        <>
                          <button type="button" className={styles.friendActionBtn} onClick={() => handleFriendAction(friend.id, "accept")}>
                            Aceitar
                          </button>
                          <button type="button" className={styles.friendActionBtnMuted} onClick={() => handleFriendAction(friend.id, "reject")}>
                            Recusar
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
          </section>
        </div>
      )}
    </section>
  );
}

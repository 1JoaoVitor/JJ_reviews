import { useState, useEffect, useCallback } from "react";
import { enrichMovieWithTmdb } from "@/features/movies/services/tmdbService";
import { Spinner } from "react-bootstrap";
import { ArrowLeft, Pencil, Trash2, Plus, X, Check, LogOut } from "lucide-react";
import { MovieCard } from "@/features/movies";
import { ConfirmModal } from "@/components/ui/ConfirmModal/ConfirmModal";
import { EditListModal } from "../EditListModal/EditListModal";
import { ListActionButtons } from "../ListActionButtons/ListActionButtons"; 
import { DuplicateListModal } from "../DuplicateListModal/DuplicateListModal"; 
import { ListLikesModal } from "../ListLikesModal/ListLikesModal";
import { useListSocial } from "../../hooks/useListSocial"; 
import type { ListType } from "../../logic/listSocial"; 
import { fetchListLikers, type ListLiker } from "../../services/listSocialService";
import { mapFriendshipStatus, type DerivedFriendshipStatus } from "@/features/friends/logic/mapFriendshipStatus";
import {
   acceptFriendRequest,
   createFriendRequest,
   deleteFriendshipBetween,
   deleteIncomingFriendRequest,
   fetchFriendshipsForTargets,
   notifyFriendAccepted,
   notifyFriendRequest,
} from "@/features/friends/services/friendshipService";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import type { CustomList, MovieData } from "@/types";
import styles from "./ListDetails.module.css";
import { calculateAverageBadge } from "@/utils/badges";
import type { BaseMovieRow } from "@/features/movies";
import {
   acceptListInvite,
   deleteListRecord,
   deleteUserListReviews,
   fetchListCollaborators,
   fetchListMovieIds,
   fetchListOwnerProfile,
   fetchPrivateListReviews,
   fetchSharedListReviews,
   rejectListInvite,
   removeUserFromListCollaborators,
   subscribeListDetailsChanges,
} from "../../services/listsService";

const listCache: Record<string, number[]> = {};

interface ListDetailsProps {
   list: CustomList;
   allMovies: MovieData[];
   currentUserId?: string;
   onBack: () => void;
   onListDeleted: () => void;
   onListUpdated: (updatedList: CustomList) => void;
   onListDuplicated?: (duplicatedList: CustomList) => void;
   onUpdateList: (id: string, name: string, description: string, has_rating: boolean, rating_type: "manual" | "average" | null, manual_rating: number | null, auto_sync: boolean) => Promise<{ success: boolean; error: string | null }>;
   onRemoveMovie: (listId: string, tmdbId: number) => Promise<{ success: boolean; error: string | null }>;
   onAddMovieClick: () => void;
   onMovieClick: (movie: MovieData) => void;
}

export function ListDetails({ 
   list, 
   allMovies,
   currentUserId,
   onBack, 
   onListDeleted,
   onListUpdated,
   onListDuplicated,
   onUpdateList,
   onRemoveMovie,
   onAddMovieClick,
   onMovieClick,
}: ListDetailsProps) {
   const navigate = useNavigate();
   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
   const [showEditModal, setShowEditModal] = useState(false);
   const [showDuplicateModal, setShowDuplicateModal] = useState(false);
   const [isDeleting, setIsDeleting] = useState(false);
   const [movieToRemove, setMovieToRemove] = useState<number | null>(null);
   const [isRemovingMovie, setIsRemovingMovie] = useState(false);

   const [memberToRemove, setMemberToRemove] = useState<{id: string, username: string} | null>(null);
   const [isRemovingMember, setIsRemovingMember] = useState(false);
   const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
   const [isLeaving, setIsLeaving] = useState(false);
   const [currentUserStatus, setCurrentUserStatus] = useState<'owner' | 'accepted' | 'pending' | 'none'>('none');
   const [listOwner, setListOwner] = useState<{ username: string; avatar_url: string } | null>(null);
   const [activeMembers, setActiveMembers] = useState<{ id: string; username: string; avatar_url: string }[]>([]);
   const [loadingCollabs, setLoadingCollabs] = useState(true);
   const [isAccepting, setIsAccepting] = useState(false);
   const [showLikesModal, setShowLikesModal] = useState(false);
   const [likers, setLikers] = useState<ListLiker[]>([]);
   const [loadingLikers, setLoadingLikers] = useState(false);
   const [friendshipStatusByUserId, setFriendshipStatusByUserId] = useState<Record<string, DerivedFriendshipStatus>>({});
   const [friendActionLoadingByUserId, setFriendActionLoadingByUserId] = useState<Record<string, boolean>>({});

   const [listMovies, setListMovies] = useState<MovieData[]>(() => {
      if (listCache[list.id]) {
         return allMovies.filter(m => listCache[list.id].includes(m.tmdb_id));
      }
      return [];
   });
   
   const [loading, setLoading] = useState(!listCache[list.id]);

   const { 
      isLiked, 
      likesCount, 
      isActionLoading, 
      handleToggleLike, 
      handleShare, 
      handleDuplicate 
   } = useListSocial({
      listId: list.id,
      initialLikes: list.likes_count ?? 0,
      isInitialLiked: list.is_liked ?? false,
      ownerUsername: listOwner?.username || "",
      currentUserId
   });

   const onLike = async () => {
      const res = await handleToggleLike();
      if (!res.success && res.error) toast.error(res.error);
      if (res.success && showLikesModal) {
         await loadLikers();
      }
   };

   const onShare = async () => {
      const res = await handleShare();
      if (res.success) toast.success("Compartilhado com sucesso!");
      else toast.error(res.error || "Erro ao compartilhar lista");
   };

   const onConfirmDuplicate = async (
      newName: string,
      type: ListType,
      collaboratorIds: string[],
      copyRatings: boolean,
      ratingsExclusiveToList: boolean
   ) => {
      const res = await handleDuplicate(newName, type, {
         collaboratorIds,
         copyRatings,
         ratingsExclusiveToList,
      });

      if (res.success && res.data) {
         toast.success("Lista duplicada com sucesso!");
         setShowDuplicateModal(false);
         onListDuplicated?.(res.data);
         navigate(`/?aba=lists&listId=${res.data.id}`);
      } else {
         toast.error(res.error || "Erro ao duplicar");
      }
   };

   const loadLikers = useCallback(async () => {
      setLoadingLikers(true);
      try {
         const data = await fetchListLikers(list.id);
         setLikers(data);

         if (!currentUserId || data.length === 0) {
            setFriendshipStatusByUserId({});
            return;
         }

         const friendships = await fetchFriendshipsForTargets(
            currentUserId,
            data.map((liker) => liker.id)
         );

         const statusMap: Record<string, DerivedFriendshipStatus> = {};
         data.forEach((liker) => {
            const friendship = friendships.find(
               (item) =>
                  (item.requester_id === currentUserId && item.receiver_id === liker.id) ||
                  (item.receiver_id === currentUserId && item.requester_id === liker.id)
            ) || null;

            statusMap[liker.id] = mapFriendshipStatus(currentUserId, liker.id, friendship);
         });

         setFriendshipStatusByUserId(statusMap);
      } catch (error) {
         console.error("Erro ao buscar curtidas da lista:", error);
         toast.error("Erro ao carregar curtidas.");
      } finally {
         setLoadingLikers(false);
      }
   }, [currentUserId, list.id]);

   const openLikesModal = async () => {
      setShowLikesModal(true);
      await loadLikers();
   };

   const handleFriendActionFromLikes = useCallback(
      async (targetUserId: string, action: "send" | "accept" | "reject" | "remove") => {
         if (!currentUserId) {
            toast.error("Faça login para interagir.");
            return;
         }

         setFriendActionLoadingByUserId((previous) => ({ ...previous, [targetUserId]: true }));
         try {
            if (action === "send") {
               await createFriendRequest(currentUserId, targetUserId);
               await notifyFriendRequest(targetUserId, currentUserId);
               setFriendshipStatusByUserId((previous) => ({ ...previous, [targetUserId]: "request_sent" }));
               toast.success("Pedido de amizade enviado.");
               return;
            }

            if (action === "accept") {
               await acceptFriendRequest(targetUserId, currentUserId);
               await notifyFriendAccepted(targetUserId, currentUserId);
               setFriendshipStatusByUserId((previous) => ({ ...previous, [targetUserId]: "friends" }));
               toast.success("Pedido aceito.");
               return;
            }

            if (action === "reject") {
               await deleteIncomingFriendRequest(targetUserId, currentUserId);
               setFriendshipStatusByUserId((previous) => ({ ...previous, [targetUserId]: "none" }));
               toast.success("Pedido recusado.");
               return;
            }

            await deleteFriendshipBetween(currentUserId, targetUserId);
            setFriendshipStatusByUserId((previous) => ({ ...previous, [targetUserId]: "none" }));
            toast.success("Conexao removida.");
         } catch (error) {
            console.error("Erro ao processar amizade no modal de curtidas:", error);
            toast.error("Erro ao processar acao de amizade.");
         } finally {
            setFriendActionLoadingByUserId((previous) => ({ ...previous, [targetUserId]: false }));
         }
      },
      [currentUserId]
   );

   const fetchListMovies = useCallback(async () => {
      try {
         const tmdbIds = await fetchListMovieIds(list.id);
         if (tmdbIds.length === 0) {
            setListMovies([]);
            return;
         }

         const reviewsMap: Record<number, Partial<MovieData>> = {};

         if (list.type === "private") {
            const personalReviews = await fetchPrivateListReviews(list.owner_id, tmdbIds);
            personalReviews?.forEach(r => {
                reviewsMap[r.tmdb_id] = { ...r, list_type: "private" };
            });
         } else {
            const listReviews = await fetchSharedListReviews(list.id, tmdbIds);
            tmdbIds.forEach(id => {
               const movieReviews = listReviews?.filter(r => r.tmdb_id === id) || [];
               const groupReviews = movieReviews.map(r => {
                  const rawUser = Array.isArray(r.user) ? r.user[0] : r.user;
                  return {
                     user_id: r.user_id ?? undefined,
                     rating: r.rating ?? undefined,
                     review: r.review ?? undefined,
                     recommended: r.recommended ?? undefined,
                     user: rawUser ? { username: rawUser.username, avatar_url: rawUser.avatar_url ?? null } : undefined,
                  };
               });

               const validRatings = groupReviews.filter(r => r.rating != null);
               const avg = validRatings.length > 0 
                  ? validRatings.reduce((acc, r) => acc + (r.rating || 0), 0) / validRatings.length 
                  : undefined;

               const avgBadge = calculateAverageBadge(groupReviews.map(r => r.recommended).filter((value): value is string => !!value));
               const myReview = groupReviews.find(r => r.user_id === currentUserId);

               reviewsMap[id] = {
                  list_type: list.type,
                  list_average_rating: avg,
                  list_average_recommended: avgBadge,
                  list_group_reviews: groupReviews,
                  rating: list.type === "full_shared" ? groupReviews[0]?.rating : myReview?.rating,
                  review: list.type === "full_shared" ? groupReviews[0]?.review : myReview?.review,
                  recommended: list.type === "full_shared" ? groupReviews[0]?.recommended : myReview?.recommended,
               };
            });
         }

         const rawMovies: BaseMovieRow[] = tmdbIds.map(id => ({ ...reviewsMap[id], tmdb_id: id }));
         const fullListMovies = await Promise.all(rawMovies.map(movie => enrichMovieWithTmdb(movie)));
         setListMovies(fullListMovies);
      } catch (error) {
         console.error("Erro ao buscar filmes da lista:", error);
      } finally {
         setLoading(false);
      }
   }, [list.id, list.type, list.owner_id, currentUserId]);

   const fetchCollaborators = useCallback(async () => {
      setLoadingCollabs(true);
      try {
         const ownerData = await fetchListOwnerProfile(list.owner_id);
         if (ownerData) setListOwner(ownerData);

         if (list.type === "private") {
            setCurrentUserStatus(currentUserId === list.owner_id ? "owner" : "none");
            setActiveMembers([]);
            return;
         }

         const collabs = await fetchListCollaborators(list.id);
         type ProfileData = { id: string; username: string; avatar_url: string };
         type CollabData = { user_id: string; status: string; user: ProfileData | ProfileData[] | null };
         const typedCollabs = (collabs as unknown as CollabData[]) || [];

         const accepted = typedCollabs
            .filter(c => c.status === "accepted" && c.user)
            .map(c => Array.isArray(c.user) ? c.user[0] : c.user!);
         
         setActiveMembers(accepted);

         if (currentUserId === list.owner_id) {
            setCurrentUserStatus("owner");
         } else {
            const myCollab = collabs.find(c => c.user_id === currentUserId);
            setCurrentUserStatus(myCollab ? (myCollab.status as 'pending' | 'accepted') : "none");
         }
      } catch (error) {
         console.error("Erro ao processar colaboradores:", error);
      } finally {
         setLoadingCollabs(false);
      }
   }, [list.id, list.type, list.owner_id, currentUserId]);

   useEffect(() => {
      fetchListMovies();
      fetchCollaborators();
      if (!list.id) return;
      return subscribeListDetailsChanges(list.id, currentUserId, fetchListMovies);
   }, [fetchListMovies, fetchCollaborators, list.id, currentUserId]);

   const isOwner = currentUserStatus === 'owner';
   const canEditMovies = currentUserStatus === 'owner' || currentUserStatus === 'accepted';
   const canEditListInfo = currentUserStatus === 'owner' || currentUserStatus === 'accepted';

   const handleAcceptInvite = async () => {
      if (!currentUserId) return;
      setIsAccepting(true);
      try {
         await acceptListInvite(list.id, currentUserId);
         toast.success("Convite aceito!");
         fetchCollaborators();
      } catch { toast.error("Erro ao aceitar convite."); }
      setIsAccepting(false);
   };

   const handleRejectInvite = async () => {
      if (!currentUserId) return;
      setIsAccepting(true);
      try {
         await rejectListInvite(list.id, currentUserId);
         toast.success("Convite recusado.");
         onBack();
      } catch { toast.error("Erro ao recusar convite."); }
      setIsAccepting(false);
   };

   const handleDeleteList = async () => {
      setIsDeleting(true);
      try {
         await deleteListRecord(list.id);
         toast.success("Lista excluída!");
         onListDeleted();
      } catch (err) {
         toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
      } finally {
         setIsDeleting(false);
         setShowDeleteConfirm(false);
      }
   };

   const confirmRemoveMovie = async () => {
      if (!movieToRemove) return;
      setIsRemovingMovie(true);
      const { success, error } = await onRemoveMovie(list.id, movieToRemove);
      setIsRemovingMovie(false);
      if (success) {
         toast.success("Filme removido.");
         setMovieToRemove(null);
         fetchListMovies();
      } else { toast.error(error || "Erro ao remover."); }
   };

   const handleLeaveList = async () => {
      if (!currentUserId) return;
      setIsLeaving(true);
      try {
         await deleteUserListReviews(list.id, currentUserId);
         await removeUserFromListCollaborators(list.id, currentUserId);
         toast.success("Você saiu da lista.");
         onBack();
         onListDeleted(); 
      } catch { toast.error("Erro ao sair da lista."); }
      finally { setIsLeaving(false); setShowLeaveConfirm(false); }
   };

   const confirmRemoveMember = async () => {
      if (!memberToRemove) return;
      setIsRemovingMember(true);
      try {
         await deleteUserListReviews(list.id, memberToRemove.id);
         await removeUserFromListCollaborators(list.id, memberToRemove.id);
         toast.success(`${memberToRemove.username} removido.`);
         fetchCollaborators(); 
      } catch { toast.error("Erro ao remover membro."); }
      finally { setIsRemovingMember(false); setMemberToRemove(null); }
   };

   return (
      <div className={styles.container}>
         <div className={styles.header}>
            <button onClick={onBack} className={styles.backBtn}>
               <ArrowLeft size={20} />
               <span>Voltar às listas</span>
            </button>

            {currentUserStatus === 'pending' && !loadingCollabs && (
               <div className={styles.inviteBanner}>
                  <div className={styles.inviteText}>
                     <strong>@{listOwner?.username}</strong> convidou você para esta lista!
                  </div>
                  <div className={styles.inviteActions}>
                     <button onClick={handleRejectInvite} disabled={isAccepting} className={styles.rejectBtn}>Recusar</button>
                     <button onClick={handleAcceptInvite} disabled={isAccepting} className={styles.acceptBtn}>
                        {isAccepting ? <Spinner size="sm" /> : <><Check size={16} /> Aceitar</>}
                     </button>
                  </div>
               </div>
            )}

            <div className={styles.titleSection}>
               <div className="flex-grow-1">
                  <h1 className={styles.title}>{list.name}</h1>
                  {list.description && <p className={styles.description}>{list.description}</p>}
                  
                  <div className="d-flex align-items-center gap-3 mt-2 flex-wrap">
                     <p className={styles.metaInfo}>{listMovies.length} filmes</p>

                     {list.has_rating && (
                        <div className={styles.ratingBadge}>
                           <span>⭐</span>
                           <span className={styles.ratingValue}>
                              {list.rating_type === 'manual' ? list.manual_rating?.toFixed(1) : (() => {
                                 const valid = listMovies.map(m => m.list_type === "partial_shared" && m.list_average_rating ? m.list_average_rating : m.rating).filter(r => r != null) as number[];
                                 return valid.length ? (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1) : "-";
                              })()}
                           </span>
                        </div>
                     )}
                     
                     {list.type !== 'private' && (
                        <div className={styles.collaboratorsAvatars}>
                           {listOwner && (
                              <img src={listOwner.avatar_url || ""} alt="Dono" className={styles.avatarCircle} title={`Dono: ${listOwner.username}`} />
                           )}
                           {activeMembers.map(member => (
                              <img 
                                 key={member.id} 
                                 src={member.avatar_url || ""} 
                                 className={`${styles.avatarCircle} ${isOwner ? styles.avatarClickable : styles.avatarStatic}`}
                                 data-testid={isOwner ? `remove-member-${member.id}` : `member-${member.id}`}
                                 onClick={() => isOwner && setMemberToRemove(member)}
                                 title={isOwner ? `Remover ${member.username}` : member.username}
                              />
                           ))}
                        </div>
                     )}
                  </div>


                  <ListActionButtons 
                     isLiked={isLiked}
                     likesCount={likesCount}
                     isActionLoading={isActionLoading}
                     onLike={onLike}
                     onShowLikes={openLikesModal}
                     onShare={onShare}
                     onDuplicate={() => setShowDuplicateModal(true)}
                  />
               </div>

               <div className={styles.actions}>
                  {canEditListInfo && (
                     <button className={styles.actionBtn} onClick={() => setShowEditModal(true)} title="Editar">
                        <Pencil size={18} />
                     </button>
                  )}
                  {currentUserStatus === 'accepted' && (
                     <button
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => setShowLeaveConfirm(true)}
                        title="Sair"
                        data-testid="leave-list-action"
                     >
                        <LogOut size={18} />
                     </button>
                  )}
                  {isOwner && (
                     <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => setShowDeleteConfirm(true)} title="Excluir">
                        <Trash2 size={18} />
                     </button>
                  )}
               </div>
            </div>
         </div>

         <div className={styles.toolbar}>
            {canEditMovies && (
               <button className={styles.addBtn} onClick={onAddMovieClick}>
                  <Plus size={18} /> Adicionar Filme
               </button>
            )}
         </div>

         {loading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="light" /></div>
         ) : listMovies.length === 0 ? (
            <div className={styles.emptyState}>
               <p>Esta lista ainda não tem filmes.</p>
            </div>
         ) : (
            <div className="movie-grid">
               {listMovies.map((movie) => (
                  <div key={movie.tmdb_id} className={styles.movieWrapper}>
                     <MovieCard movie={movie} onClick={() => onMovieClick(movie)} />
                     {canEditMovies && (
                        <button className={styles.removeMovieBtn} onClick={(e) => { e.stopPropagation(); setMovieToRemove(movie.tmdb_id); }}>
                           <X size={14} />
                        </button>
                     )}
                  </div>
               ))}
            </div>
         )}

         <DuplicateListModal
            key={list.id} 
            show={showDuplicateModal}
            onHide={() => setShowDuplicateModal(false)}
            originalTitle={list.name}
            onConfirm={onConfirmDuplicate}
            isProcessing={isActionLoading}
         />

         <EditListModal
            show={showEditModal}
            onHide={() => setShowEditModal(false)}
            list={list}
            onUpdate={async (id, name, desc, has_rating, rating_type, manual_rating, auto_sync) => {
               const { success, error } = await onUpdateList(id, name, desc, has_rating, rating_type, manual_rating, auto_sync);
               if (success) {
                  toast.success("Atualizada!");
                  onListUpdated({ ...list, name, description: desc, has_rating, rating_type, manual_rating, auto_sync });
               } else { toast.error(error || "Erro."); }
               return success; 
            }}
         />

         <ConfirmModal 
            show={showDeleteConfirm} 
            onHide={() => setShowDeleteConfirm(false)}
            onConfirm={handleDeleteList}
            title="Excluir"
            message={`Excluir "${list.name}"?`}
            confirmText="Excluir"
            isProcessing={isDeleting} 
         />

         <ConfirmModal 
            show={movieToRemove !== null}
            onHide={() => setMovieToRemove(null)}
            onConfirm={confirmRemoveMovie}
            title="Remover" message="Remover este filme?"
            confirmText="Remover" isProcessing={isRemovingMovie}
         />

         <ConfirmModal
            show={showLeaveConfirm}
            onHide={() => setShowLeaveConfirm(false)}
            onConfirm={handleLeaveList}
            title="Sair"
            message={`Sair de "${list.name}"?`}
            confirmText="Sair"
            isProcessing={isLeaving}
         />

         <ConfirmModal
            show={memberToRemove !== null}
            onHide={() => setMemberToRemove(null)}
            onConfirm={confirmRemoveMember}
            title="Remover Membro"
            message={`Remover ${memberToRemove?.username}?`}
            confirmText="Remover"
            isProcessing={isRemovingMember}
         />

         <ListLikesModal
            show={showLikesModal}
            onHide={() => {
               setShowLikesModal(false);
               setFriendActionLoadingByUserId({});
            }}
            likers={likers}
            isLoading={loadingLikers}
            currentUserId={currentUserId}
            friendshipStatusByUserId={friendshipStatusByUserId}
            friendActionLoadingByUserId={friendActionLoadingByUserId}
            onFriendAction={handleFriendActionFromLikes}
            onProfileClick={(username) => {
               setShowLikesModal(false);
               navigate(`/perfil/${username}`);
            }}
         />
      </div>
   );
}
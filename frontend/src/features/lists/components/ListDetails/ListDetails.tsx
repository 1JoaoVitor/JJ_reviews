import { useState, useEffect, useCallback } from "react";
import { enrichMovieWithTmdb } from "@/features/movies/services/tmdbService";
import { Spinner } from "react-bootstrap";
import { ArrowLeft, Pencil, Trash2, Plus, X, Check, LogOut } from "lucide-react";
import { MovieCard } from "@/features/movies";
import { ConfirmModal } from "@/components/ui/ConfirmModal/ConfirmModal";
import { EditListModal } from "../EditListModal/EditListModal";
import { toast } from "react-hot-toast";
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
   onUpdateList,
   onRemoveMovie,
   onAddMovieClick,
   onMovieClick,
}: ListDetailsProps) {
   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
   const [showEditModal, setShowEditModal] = useState(false);
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

   const [listMovies, setListMovies] = useState<MovieData[]>(() => {
      if (listCache[list.id]) {
         return allMovies.filter(m => listCache[list.id].includes(m.tmdb_id));
      }
      return [];
   });
   
   const [loading, setLoading] = useState(!listCache[list.id]);

   // Busca os filmes da lista e junta com as avaliações corretas
   const fetchListMovies = useCallback(async () => {
      try {
         const tmdbIds = await fetchListMovieIds(list.id);
         
         if (tmdbIds.length === 0) {
            setListMovies([]);
            return;
         }

         // Buscar as notas de TODOS os membros e calcular a Média!
         const reviewsMap: Record<number, Partial<MovieData>> = {};

         if (list.type === "private") {
            const personalReviews = await fetchPrivateListReviews(list.owner_id, tmdbIds);
               
            personalReviews?.forEach(r => {
               reviewsMap[r.tmdb_id] = { ...r, list_type: "private" };
            });
         } else {
            // Se for compartilhada, busca TODAS as reviews (de todos os membros) para calcular a média
            const listReviews = await fetchSharedListReviews(list.id, tmdbIds);
            
            tmdbIds.forEach(id => {
               // Filtra as reviews apenas deste filme
               const movieReviews = listReviews?.filter(r => r.tmdb_id === id) || [];
               
               // Formata o array de reviews do grupo (Múltiplas opiniões)
               const groupReviews = movieReviews.map(r => {
                  const rawUser = Array.isArray(r.user) ? r.user[0] : r.user;
                  return {
                     user_id: r.user_id ?? undefined,
                     rating: r.rating ?? undefined,
                     review: r.review ?? undefined,
                     recommended: r.recommended ?? undefined,
                     user: rawUser
                        ? { username: rawUser.username, avatar_url: rawUser.avatar_url ?? null }
                        : undefined,
                  };
               });

               // Calcula a Média (ignorando quem não deu nota)
               const validRatings = groupReviews.filter(r => r.rating != null);
               const avg = validRatings.length > 0 
                  ? validRatings.reduce((acc, r) => acc + (r.rating || 0), 0) / validRatings.length 
                  : undefined;

               // Calcula a Média do Veredito (Badge) 
               const avgBadge = calculateAverageBadge(
                  groupReviews
                     .map(r => r.recommended)
                     .filter((value): value is string => !!value)
               );

               // Descobre qual é a "minha" review (para o modal e botão de editar funcionarem com a minha nota)
               const myReview = groupReviews.find(r => r.user_id === currentUserId);

               reviewsMap[id] = {
                  list_type: list.type,
                  list_average_rating: avg,
                  list_average_recommended: avgBadge,
                  list_group_reviews: groupReviews,
                  // Se for totalmente compartilhada, a nota base é única (a primeira). Se for parcialmente, o rating base é o MEU rating.
                  rating: list.type === "full_shared" ? groupReviews[0]?.rating : myReview?.rating,
                  review: list.type === "full_shared" ? groupReviews[0]?.review : myReview?.review,
                  recommended: list.type === "full_shared" ? groupReviews[0]?.recommended : myReview?.recommended,
               };
            });
         }

         // Junta as notas com os "esqueletos" (Resolvendo também a tipagem do TypeScript de forma segura)
         const rawMovies: BaseMovieRow[] = tmdbIds.map(id => {
            const reviewData = reviewsMap[id] || {};
            
            return {
               ...reviewData,
               tmdb_id: id
            };
         });

         // Vai ao TMDB buscar as capas
         const fullListMovies = await Promise.all(
            rawMovies.map(movie => enrichMovieWithTmdb(movie))
         );

         setListMovies(fullListMovies);
      } catch (error) {
         console.error("Erro ao buscar filmes da lista:", error);
      } finally {
         setLoading(false);
      }
   }, [list.id, list.type, list.owner_id, currentUserId]);

   // Busca os colaboradores e o status do usuário logado
   const fetchCollaborators = useCallback(async () => {
      setLoadingCollabs(true);
      try {
         //  Busca os dados do Dono da Lista
         const ownerData = await fetchListOwnerProfile(list.owner_id);

         if (ownerData) setListOwner(ownerData);

         //  Se a lista for privada, o usuário só pode ser o dono
         if (list.type === "private") {
            setCurrentUserStatus(currentUserId === list.owner_id ? "owner" : "none");
            setActiveMembers([]);
            return;
         }

         // 3Se for compartilhada, busca os convidados e faz o JOIN simplificado com profiles
         const collabs = await fetchListCollaborators(list.id);

        // Tipagem rápida para o TypeScript entender o retorno do Supabase
         type ProfileData = { id: string; username: string; avatar_url: string };
         type CollabData = { user_id: string; status: string; user: ProfileData | ProfileData[] | null };

         const typedCollabs = (collabs as unknown as CollabData[]) || [];

         // Descobre quem são os membros que já aceitaram o convite
         const accepted = typedCollabs
            .filter(c => c.status === "accepted" && c.user)
            .map(c => Array.isArray(c.user) ? c.user[0] : c.user!);
         
         setActiveMembers(accepted);

         // Define os poderes do usuário logado nesta tela
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
      // Carregamento inicial
      fetchListMovies();
      fetchCollaborators();

      if (!list.id) return;

      // TEMPO REAL (Multiplayer & Sincronização) 
      // Inscreve a página para ouvir qualquer mudança nos filmes desta lista
      return subscribeListDetailsChanges(list.id, currentUserId, fetchListMovies);
   }, [fetchListMovies, fetchCollaborators, list.id, currentUserId]);

   // Permissões Derivadas
   const isOwner = currentUserStatus === 'owner';
   const canEditMovies = currentUserStatus === 'owner' || currentUserStatus === 'accepted';
   const canEditListInfo = currentUserStatus === 'owner' || currentUserStatus === 'accepted';

   // ─── AÇÕES DE CONVITE ───
   const handleAcceptInvite = async () => {
      if (!currentUserId) return;
      setIsAccepting(true);
      try {
         await acceptListInvite(list.id, currentUserId);
         toast.success("Convite aceito! Bem-vindo à lista.");
         fetchCollaborators(); // Recarrega para mudar o status e mostrar a foto dele
      } catch {
         toast.error("Erro ao aceitar convite.");
      }
      setIsAccepting(false);
   };

   const handleRejectInvite = async () => {
      if (!currentUserId) return;
      setIsAccepting(true);
      try {
         await rejectListInvite(list.id, currentUserId);
         toast.success("Convite recusado.");
         onBack(); // Manda o usuário de volta para a tela anterior
      } catch {
         toast.error("Erro ao recusar convite.");
      }
      setIsAccepting(false);
   };

   // ─── AÇÕES DA LISTA ───
   const handleDeleteList = async () => {
      setIsDeleting(true);
      try {
         await deleteListRecord(list.id);
         toast.success("Lista excluída com sucesso!");
         onListDeleted();
      } catch (err) {
         if (err instanceof Error) {
            toast.error(err.message || "Erro ao excluir a lista.");
         } else {
            toast.error("Erro desconhecido ao excluir a lista.");
         }
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
         toast.success("Filme removido da lista.");
         setMovieToRemove(null);
         fetchListMovies();
      } else {
         toast.error(error || "Erro ao remover filme da lista.");
      }
   };

   // Ação: Convidado sai da lista
   const handleLeaveList = async () => {
      if (!currentUserId) return;
      setIsLeaving(true);
      try {
         // 1Apaga as avaliações que ele fez ESPECIFICAMENTE para esta lista 
         // (Se for uma lista de totalmente compartilhada  onde o user_id é nulo, isto não apaga nada, o que é o comportamento correto)
         await deleteUserListReviews(list.id, currentUserId);

         // emove o utilizador dos colaboradores
         await removeUserFromListCollaborators(list.id, currentUserId);
         
         toast.success("Você saiu da lista.");
         onBack();
         onListDeleted(); 
      } catch (err) {
         console.log("Erro: " + err);
         toast.error("Erro ao sair da lista.");
      } finally {
         setIsLeaving(false);
         setShowLeaveConfirm(false);
      }
   };

   // Ação: Dono expulsa um membro
   const confirmRemoveMember = async () => {
      if (!memberToRemove) return;
      setIsRemovingMember(true);
      try {
         // Apaga as avaliações do membro expulso
         await deleteUserListReviews(list.id, memberToRemove.id);

         // Remove o membro dos colaboradores
         await removeUserFromListCollaborators(list.id, memberToRemove.id);
         
         toast.success(`${memberToRemove.username} foi removido da lista.`);
         fetchCollaborators(); 
      } catch (err) {
         console.log("Erro: " + err);
         toast.error("Erro ao remover membro.");
      } finally {
         setIsRemovingMember(false);
         setMemberToRemove(null);
      }
   };

   return (
      <div className={styles.container}>
         <div className={styles.header}>
            <button onClick={onBack} className={styles.backBtn}>
               <ArrowLeft size={20} />
               <span>Voltar às listas</span>
            </button>

            {/* ─── BANNER DE CONVITE PENDENTE ─── */}
            {currentUserStatus === 'pending' && !loadingCollabs && (
               <div className={styles.inviteBanner}>
                  <div className={styles.inviteText}>
                     <strong>@{listOwner?.username}</strong> convidou você para colaborar nesta lista!
                  </div>
                  <div className={styles.inviteActions}>
                     <button onClick={handleRejectInvite} disabled={isAccepting} className={styles.rejectBtn}>
                        Recusar
                     </button>
                     <button onClick={handleAcceptInvite} disabled={isAccepting} className={styles.acceptBtn}>
                        {isAccepting ? <Spinner size="sm" animation="border" /> : <><Check size={16} /> Aceitar Convite</>}
                     </button>
                  </div>
               </div>
            )}

            <div className={styles.titleSection}>
               <div>
                  <h1 className={styles.title}>{list.name}</h1>
                  {list.description && <p className={styles.description}>{list.description}</p>}
                  
                  <div className="d-flex align-items-center gap-3 mt-2">
                     <p className={styles.metaInfo}>{listMovies.length} filmes na lista</p>

                     {/* ─── NOTA DA LISTA ─── */}
                     {list.has_rating && (
                        <div 
                           className={styles.ratingBadge}
                           title={list.rating_type === 'manual' ? "Nota Manual" : "Média dos Filmes"}
                        >
                           <span className={styles.ratingIcon}>⭐</span>
                           <span className={styles.ratingValue}>
                              {list.rating_type === 'manual' 
                                 ? list.manual_rating?.toFixed(1)
                                 : (() => {
                                    // Calcula a média em tempo real
                                    const validRatings = listMovies
                                       .map(m => m.list_type === "partial_shared" && m.list_average_rating ? m.list_average_rating : m.rating)
                                       .filter(r => r !== null && r !== undefined) as number[];
                                    
                                    if (validRatings.length === 0) return "-";
                                    return (validRatings.reduce((a, b) => a + b, 0) / validRatings.length).toFixed(1);
                                 })()
                              }
                           </span>
                        </div>
                     )}
                     
                     {/* ─── EXIBIÇÃO DOS AVATARES (MEMBROS) ─── */}
                     {list.type !== 'private' && (
                        <div className={styles.collaboratorsAvatars} title="Membros desta lista">
                           {/* Avatar do Dono */}
                           {listOwner?.avatar_url ? (
                              <img src={listOwner.avatar_url} alt="Dono" className={styles.avatarCircle} />
                           ) : (
                              <div className={styles.avatarCircle}>{listOwner?.username.charAt(0).toUpperCase()}</div>
                           )}
                           
                           {/* Avatares dos Membros Aceitos */}
                           {activeMembers.map(member => (
                              <img 
                                 key={member.id} 
                                 src={member.avatar_url || ""} 
                                 alt={member.username} 
                                 className={`${styles.avatarCircle} ${isOwner ? styles.avatarClickable : styles.avatarStatic}`}
                                 onClick={() => isOwner && setMemberToRemove(member)}
                                 title={isOwner ? `Clique para remover ${member.username}` : member.username}
                              />
                           ))}
                        </div>
                     )}
                  </div>
               </div>

               <div className={styles.actions}>
                  {canEditListInfo && (
                     <button className={styles.actionBtn} onClick={() => setShowEditModal(true)} title="Editar Lista">
                        <Pencil size={18} />
                     </button>
                  )}
                  {currentUserStatus === 'accepted' && (
                     <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => setShowLeaveConfirm(true)} title="Sair da Lista">
                        <LogOut size={18} />
                     </button>
                  )}
                  {isOwner && (
                     <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => setShowDeleteConfirm(true)} title="Excluir Lista">
                        <Trash2 size={18} />
                     </button>
                  )}
               </div>
            </div>
         </div>

         <div className={styles.toolbar}>
            {/* Se o usuário é Dono ou Convidado Aceito, ele pode adicionar filmes! */}
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
               <p>Clique em Adicionar Filme ou escolha uma lista ao Editar um filme.</p>
            </div>
         ) : (
            <div className="movie-grid">
               {listMovies.map((movie) => (
                  <div key={movie.tmdb_id} className={styles.movieWrapper}>
                     <MovieCard movie={movie} onClick={() => onMovieClick(movie)} />
                     {canEditMovies && (
                        <button 
                           className={styles.removeMovieBtn} 
                           onClick={(e) => {
                              e.stopPropagation();
                              setMovieToRemove(movie.tmdb_id);
                           }}
                           title="Remover da lista"
                        >
                           <X size={14} />
                        </button>
                     )}
                  </div>
               ))}
            </div>
         )}

         <EditListModal
            show={showEditModal}
            onHide={() => setShowEditModal(false)}
            list={list}
            onUpdate={async (id, name, desc, has_rating, rating_type, manual_rating, auto_sync) => {
               const { success, error } = await onUpdateList(id, name, desc, has_rating, rating_type, manual_rating, auto_sync);
               
               if (success) {
                  toast.success("Lista atualizada com sucesso!");
                  onListUpdated({ ...list, name, description: desc, has_rating, rating_type, manual_rating, auto_sync });
               } else {
                  toast.error(error || "Erro ao atualizar a lista.");
               }
               return success; 
            }}
         />

        <ConfirmModal
            show={showDeleteConfirm}
            onHide={() => setShowDeleteConfirm(false)}
            onConfirm={handleDeleteList}
            title="Excluir Lista"
            message={`Tem certeza que deseja excluir a lista "${list.name}"? Os filmes não serão apagados dos perfis.`}
            confirmText="Sim, excluir"
            isProcessing={isDeleting}
         />

         <ConfirmModal
            show={movieToRemove !== null}
            onHide={() => setMovieToRemove(null)}
            onConfirm={confirmRemoveMovie}
            title="Remover Filme"
            message="Tem certeza que deseja remover este filme desta lista?"
            confirmText="Sim, remover"
            isProcessing={isRemovingMovie}
         />

         <ConfirmModal
            show={showLeaveConfirm}
            onHide={() => setShowLeaveConfirm(false)}
            onConfirm={handleLeaveList}
            title="Sair da Lista"
            message={`Tem a certeza que deseja abandonar a lista "${list.name}"?`}
            confirmText="Sim, sair"
            isProcessing={isLeaving}
         />

         <ConfirmModal
            show={memberToRemove !== null}
            onHide={() => setMemberToRemove(null)}
            onConfirm={confirmRemoveMember}
            title="Remover Membro"
            message={`Tem a certeza que deseja remover ${memberToRemove?.username} desta lista?`}
            confirmText="Sim, remover"
            isProcessing={isRemovingMember}
         />
      </div>
   );
}
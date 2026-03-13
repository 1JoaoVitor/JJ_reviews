import { useState, useEffect, useCallback } from "react";
import { enrichMovieWithTmdb } from "@/features/movies/services/tmdbService";
import { Spinner } from "react-bootstrap";
import { ArrowLeft, Pencil, Trash2, Plus, X, Check, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MovieCard } from "@/features/movies";
import { ConfirmModal } from "@/components/ui/ConfirmModal/ConfirmModal";
import { EditListModal } from "../EditListModal/EditListModal";
import toast from "react-hot-toast";
import type { CustomList, MovieData } from "@/types";
import styles from "./ListDetails.module.css";
import { calculateAverageBadge } from "@/utils/badges";
import type { BaseMovieRow } from "@/features/movies";

const listCache: Record<string, number[]> = {};

interface ListDetailsProps {
   list: CustomList;
   allMovies: MovieData[];
   currentUserId?: string;
   onBack: () => void;
   onListDeleted: () => void;
   onListUpdated: (updatedList: CustomList) => void;
   onUpdateList: (id: string, name: string, description: string, has_rating: boolean, rating_type: "manual" | "average" | null, manual_rating: number | null, auto_sync: boolean) => Promise<boolean>;
   onRemoveMovie: (listId: string, tmdbId: number) => Promise<boolean>;
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
         // Busca os IDs na tabela da lista
         const { data: listMoviesData, error: lmError } = await supabase
            .from("list_movies")
            .select("tmdb_id")
            .eq("list_id", list.id);
            
         if (lmError) throw lmError;

         const tmdbIds = listMoviesData?.map(d => d.tmdb_id) || [];
         
         if (tmdbIds.length === 0) {
            setListMovies([]);
            return;
         }

         // Buscar as notas de TODOS os membros e calcular a Média!
         const reviewsMap: Record<number, Partial<MovieData>> = {};

         if (list.type === "private") {
            const { data: personalReviews } = await supabase
               .from("reviews")
               .select("*")
               .eq("user_id", list.owner_id)
               .in("tmdb_id", tmdbIds);
               
            personalReviews?.forEach(r => {
               reviewsMap[r.tmdb_id] = { ...r, list_type: "private" };
            });
         } else {
            // Se for compartilhada, busca TODAS as reviews (de todos os membros) para calcular a média
            const { data: listReviews } = await supabase
               .from("list_reviews")
               .select("*, user:profiles(id, username, avatar_url)")
               .eq("list_id", list.id)
               .in("tmdb_id", tmdbIds);
            
            tmdbIds.forEach(id => {
               // Filtra as reviews apenas deste filme
               const movieReviews = listReviews?.filter(r => r.tmdb_id === id) || [];
               
               // Formata o array de reviews do grupo (Múltiplas opiniões)
               const groupReviews = movieReviews.map(r => ({
                  user_id: r.user_id,
                  rating: r.rating,
                  review: r.review,
                  recommended: r.recommended,
                  user: Array.isArray(r.user) ? r.user[0] : r.user
               }));

               // Calcula a Média (ignorando quem não deu nota)
               const validRatings = groupReviews.filter(r => r.rating != null);
               const avg = validRatings.length > 0 
                  ? validRatings.reduce((acc, r) => acc + (r.rating || 0), 0) / validRatings.length 
                  : undefined;

               // Calcula a Média do Veredito (Badge) 
               const avgBadge = calculateAverageBadge(groupReviews.map(r => r.recommended));

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
         const { data: ownerData } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", list.owner_id)
            .single();

         if (ownerData) setListOwner(ownerData);

         //  Se a lista for privada, o usuário só pode ser o dono
         if (list.type === "private") {
            setCurrentUserStatus(currentUserId === list.owner_id ? "owner" : "none");
            setActiveMembers([]);
            return;
         }

         // 3Se for compartilhada, busca os convidados e faz o JOIN simplificado com profiles
         const { data: collabs, error } = await supabase
            .from("list_collaborators")
            .select(`
               user_id, 
               status, 
               user:profiles(id, username, avatar_url)
            `)
            .eq("list_id", list.id);

         if (error) {
            console.error("Erro do Supabase ao buscar colaboradores:", error.message);
            throw error;
         }

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
            const myCollab = collabs?.find(c => c.user_id === currentUserId);
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
      const channel = supabase
         .channel(`list_updates_${list.id}`)
         // Ouve novos filmes adicionados ou removidos da lista
         .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "list_movies", filter: `list_id=eq.${list.id}` },
            () => { fetchListMovies(); }
         )
         // Ouve mudanças nas notas exclusivas desta lista colaborativa
         .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "list_reviews", filter: `list_id=eq.${list.id}` },
            () => { fetchListMovies(); }
         );

      // Se o usuário estiver logado, também ouve as mudanças no diário pessoal dele
      // (Porque a lista pode estar usando uma nota puxada do perfil dele)
      if (currentUserId) {
         channel.on(
            "postgres_changes",
            { event: "*", schema: "public", table: "reviews", filter: `user_id=eq.${currentUserId}` },
            () => { fetchListMovies(); }
         );
      }

      channel.subscribe();

      // Limpa a inscrição quando sair da tela da lista
      return () => {
         supabase.removeChannel(channel);
      };
   }, [fetchListMovies, fetchCollaborators, list.id, currentUserId]);

   // Permissões Derivadas
   const isOwner = currentUserStatus === 'owner';
   const canEditMovies = currentUserStatus === 'owner' || currentUserStatus === 'accepted';
   const canEditListInfo = currentUserStatus === 'owner' || currentUserStatus === 'accepted';

   // ─── AÇÕES DE CONVITE ───
   const handleAcceptInvite = async () => {
      if (!currentUserId) return;
      setIsAccepting(true);
      const { error } = await supabase
         .from('list_collaborators')
         .update({ status: 'accepted' })
         .eq('list_id', list.id)
         .eq('user_id', currentUserId);
         
      if (!error) {
         toast.success("Convite aceito! Bem-vindo à lista.");
         fetchCollaborators(); // Recarrega para mudar o status e mostrar a foto dele
      } else {
         toast.error("Erro ao aceitar convite.");
      }
      setIsAccepting(false);
   };

   const handleRejectInvite = async () => {
      if (!currentUserId) return;
      setIsAccepting(true);
      const { error } = await supabase
         .from('list_collaborators')
         .delete()
         .eq('list_id', list.id)
         .eq('user_id', currentUserId);
         
      if (!error) {
         toast.success("Convite recusado.");
         onBack(); // Manda o usuário de volta para a tela anterior
      }
      setIsAccepting(false);
   };

   // ─── AÇÕES DA LISTA ───
   const handleDeleteList = async () => {
      setIsDeleting(true);
      try {
         const { error } = await supabase.from("lists").delete().eq("id", list.id);
         if (error) throw error;
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
      const success = await onRemoveMovie(list.id, movieToRemove);
      setIsRemovingMovie(false);
      
      if (success) {
         setMovieToRemove(null);
         fetchListMovies();
      }
   };

   // Ação: Convidado sai da lista
   const handleLeaveList = async () => {
      if (!currentUserId) return;
      setIsLeaving(true);
      try {
         // 1Apaga as avaliações que ele fez ESPECIFICAMENTE para esta lista 
         // (Se for uma lista de totalmente compartilhada  onde o user_id é nulo, isto não apaga nada, o que é o comportamento correto)
         await supabase.from('list_reviews').delete().eq('list_id', list.id).eq('user_id', currentUserId);

         // emove o utilizador dos colaboradores
         const { error } = await supabase.from('list_collaborators').delete().eq('list_id', list.id).eq('user_id', currentUserId);
         if (error) throw error;
         
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
         await supabase.from('list_reviews').delete().eq('list_id', list.id).eq('user_id', memberToRemove.id);

         // Remove o membro dos colaboradores
         const { error } = await supabase.from('list_collaborators').delete().eq('list_id', list.id).eq('user_id', memberToRemove.id);
         if (error) throw error;
         
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
                  <h1 className={styles.title} style={{ wordBreak: 'break-word' }}>{list.name}</h1>
                  {list.description && <p className={styles.description} style={{ wordBreak: 'break-word' }}>{list.description}</p>}
                  
                  <div className="d-flex align-items-center gap-3 mt-2">
                     <p className={styles.metaInfo}>{listMovies.length} filmes na lista</p>

                     {/* ─── NOTA DA LISTA ─── */}
                     {list.has_rating && (
                        <div 
                           className="d-flex align-items-center gap-1" 
                           style={{ 
                              background: 'rgba(255, 193, 7, 0.1)', 
                              padding: '0.2rem 0.6rem', 
                              borderRadius: 'var(--radius-pill)',
                              border: '1px solid var(--gold)'
                           }}
                           title={list.rating_type === 'manual' ? "Nota Manual" : "Média dos Filmes"}
                        >
                           <span style={{ fontSize: '14px' }}>⭐</span>
                           <span style={{ fontWeight: 'bold', color: 'var(--gold)', fontSize: '0.9rem' }}>
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
                                 className={styles.avatarCircle} 
                                 style={{ cursor: isOwner ? "pointer" : "default" }}
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
               const success = await onUpdateList(id, name, desc, has_rating, rating_type, manual_rating, auto_sync);
               if (success) onListUpdated({ ...list, name, description: desc, has_rating, rating_type, manual_rating, auto_sync });
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
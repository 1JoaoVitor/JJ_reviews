import { useState, useEffect, useCallback } from "react";
import { Spinner } from "react-bootstrap";
import { ArrowLeft, Pencil, Trash2, Plus, X, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MovieCard } from "@/features/movies";
import { ConfirmModal } from "@/components/ui/ConfirmModal/ConfirmModal";
import { EditListModal } from "../EditListModal/EditListModal";
import toast from "react-hot-toast";
import type { CustomList, MovieData } from "@/types";
import styles from "./ListDetails.module.css";

const listCache: Record<string, number[]> = {};

interface ListDetailsProps {
   list: CustomList;
   allMovies: MovieData[];
   currentUserId?: string;
   onBack: () => void;
   onListDeleted: () => void;
   onListUpdated: (updatedList: CustomList) => void;
   onUpdateList: (id: string, name: string, description: string) => Promise<boolean>;
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

   // ─── ESTADOS DE COLABORAÇÃO ───
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

   // Busca os filmes da lista
   const fetchListMovies = useCallback(async () => {
      if (!listCache[list.id]) setLoading(true);
      try {
         const { data, error } = await supabase.from("list_movies").select("tmdb_id").eq("list_id", list.id);
         if (error) throw error;

         const tmdbIds = data?.map(d => d.tmdb_id) || [];
         listCache[list.id] = tmdbIds;
         setListMovies(allMovies.filter(m => tmdbIds.includes(m.tmdb_id)));
      } catch (error) {
         console.error(error);
      } finally {
         setLoading(false);
      }
   }, [list.id, allMovies]);

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
      fetchListMovies();
      fetchCollaborators();
   }, [fetchListMovies, fetchCollaborators]);

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
                              member.avatar_url ? (
                                 <img key={member.id} src={member.avatar_url} alt={member.username} className={styles.avatarCircle} />
                              ) : (
                                 <div key={member.id} className={styles.avatarCircle}>{member.username.charAt(0).toUpperCase()}</div>
                              )
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
                  <div key={movie.id} className={styles.movieWrapper}>
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
            onUpdate={async (id, name, desc) => {
               const success = await onUpdateList(id, name, desc);
               if (success) onListUpdated({ ...list, name, description: desc });
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
      </div>
   );
}
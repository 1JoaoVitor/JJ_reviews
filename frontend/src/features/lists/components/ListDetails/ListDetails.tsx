import { useState, useEffect, useCallback } from "react";
import { Spinner } from "react-bootstrap";
import { ArrowLeft, Pencil, Trash2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { enrichMovieWithTmdb } from "@/features/movies/services/tmdbService";
import { MovieCard } from "@/features/movies";
import { ConfirmModal } from "@/components/ui/ConfirmModal/ConfirmModal";
import toast from "react-hot-toast";
import type { CustomList, MovieData } from "@/types";
import styles from "./ListDetails.module.css";

interface ListDetailsProps {
   list: CustomList;
   onBack: () => void;
   onListDeleted: () => void;
   onListUpdated: () => void;
   onAddMovieClick: () => void;
   onMovieClick: (movie: MovieData) => void;
   currentUserId?: string;
}

export function ListDetails({ 
   list, 
   onBack, 
   onListDeleted,
   onListUpdated,
   onAddMovieClick,
   onMovieClick,
   currentUserId 
}: ListDetailsProps) {
   const [movies, setMovies] = useState<MovieData[]>([]);
   const [loading, setLoading] = useState(true);
   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
   const [isDeleting, setIsDeleting] = useState(false);

   const isOwner = currentUserId === list.owner_id;

   const fetchListMovies = useCallback(async () => {
      setLoading(true);
      try {
         // Busca os IDs dos filmes guardados nesta lista
         const { data: listMovies, error } = await supabase
            .from("list_movies")
            .select("tmdb_id, created_at")
            .eq("list_id", list.id)
            .order("created_at", { ascending: false });

         if (error) throw error;
         if (!listMovies || listMovies.length === 0) {
            setMovies([]);
            return;
         }

         // Para cada filme, busca as informações do TMDB (Pôster, Nome, etc)
         const enrichedMoviesPromises = listMovies.map(async (lm) => {
            // Cria um objeto "falso" só com o tmdb_id para o TMDB preencher o resto
            const baseMovie = { id: lm.tmdb_id, tmdb_id: lm.tmdb_id, status: 'list' } as any;
            return await enrichMovieWithTmdb(baseMovie);
         });

         const enrichedMovies = await Promise.all(enrichedMoviesPromises);
         setMovies(enrichedMovies as MovieData[]);
      } catch (error) {
         console.error("Erro ao buscar filmes da lista:", error);
         toast.error("Não foi possível carregar os filmes desta lista.");
      } finally {
         setLoading(false);
      }
   }, [list.id]);

   useEffect(() => {
      fetchListMovies();
   }, [fetchListMovies]);

   const handleDeleteList = async () => {
      setIsDeleting(true);
      try {
         const { error } = await supabase
            .from("lists")
            .delete()
            .eq("id", list.id);

         if (error) throw error;
         
         toast.success("Lista eliminada com sucesso!");
         onListDeleted();
      } catch (error) {
         console.error("Erro ao eliminar lista:", error);
         toast.error("Erro ao eliminar a lista.");
         setIsDeleting(false);
         setShowDeleteConfirm(false);
      }
   };

   return (
      <div className={styles.container}>
         <div className={styles.header}>
            <button onClick={onBack} className={styles.backBtn}>
               <ArrowLeft size={20} />
               <span>Voltar às listas</span>
            </button>

            <div className={styles.titleSection}>
               <div>
                  <h1 className={styles.title}>{list.name}</h1>
                  {list.description && <p className={styles.description}>{list.description}</p>}
                  <p className={styles.metaInfo}>{movies.length} filmes na lista</p>
               </div>

               {isOwner && (
                  <div className={styles.actions}>
                     <button className={styles.actionBtn} onClick={() => alert("Modal de edição em breve!")} title="Editar Lista">
                        <Pencil size={18} />
                     </button>
                     <button 
                        className={`${styles.actionBtn} ${styles.deleteBtn}`} 
                        onClick={() => setShowDeleteConfirm(true)}
                        title="Eliminar Lista"
                     >
                        <Trash2 size={18} />
                     </button>
                  </div>
               )}
            </div>
         </div>

         <div className={styles.toolbar}>
            {isOwner && (
               <button className={styles.addBtn} onClick={onAddMovieClick}>
                  <Plus size={18} /> Adicionar Filme
               </button>
            )}
         </div>

         {loading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="light" /></div>
         ) : movies.length === 0 ? (
            <div className={styles.emptyState}>
               <p>Esta lista ainda não tem filmes.</p>
               {isOwner && (
                  <button className={styles.emptyAddBtn} onClick={onAddMovieClick}>
                     Procurar um filme para adicionar
                  </button>
               )}
            </div>
         ) : (
            <div className="movie-grid">
               {movies.map((movie) => (
                  <MovieCard 
                     key={movie.tmdb_id} 
                     movie={movie} 
                     onClick={() => onMovieClick(movie)} 
                  />
               ))}
            </div>
         )}

         <ConfirmModal
            show={showDeleteConfirm}
            onHide={() => setShowDeleteConfirm(false)}
            onConfirm={handleDeleteList}
            title="Eliminar Lista"
            message={`Tem a certeza que deseja eliminar a lista "${list.name}"? Todos os filmes guardados nela serão removidos desta lista (mas não do seu perfil).`}
            confirmText="Sim, eliminar"
            isProcessing={isDeleting}
         />
      </div>
   );
}
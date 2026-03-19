import { useState, useEffect} from "react";
import { useParams, useSearchParams} from "react-router-dom";
import { Container, Spinner } from "react-bootstrap";
import { ArrowLeft, UserPlus, UserCheck, Clock, X} from "lucide-react";
import { usePublicProfile } from "../../hooks/usePublicProfile";
import { MovieCard, MovieModal, AddMovieModal, useMovieFilters } from "@/features/movies";
import { Dashboard } from "@/features/dashboard";
import { AppNavbar } from "@/components/layout/AppNavbar/AppNavbar";
import { BottomNav } from "@/components/layout/BottomNav/BottomNav";
import { Footer } from "@/components/layout/Footer/Footer";
import { useAuth, LoginModal } from "@/features/auth";
import type { MovieData, CustomList } from "@/types";
import styles from "./PublicProfile.module.css";
import { ConfirmModal } from "@/components/ui/ConfirmModal/ConfirmModal";

import { useFriendship, FriendsModal} from "@/features/friends"; 
import { useLists, ListDetails } from "@/features/lists";
import { toast } from "react-hot-toast";




export function PublicProfile() {
   const { username: profileUsername } = useParams<{ username: string }>();
   
   const { movies, loading, error, profileName, profileAvatar, profileId } = usePublicProfile(profileUsername);
   const { session, username: loggedInUsername, avatarUrl: loggedInAvatar, logout } = useAuth();
   const filters = useMovieFilters(movies);

   const { lists, loading: listsLoading } = useLists(profileId || undefined);
   const [selectedList, setSelectedList] = useState<CustomList | null>(null);

   const { lists: myLists, addMovieToList, createList } = useLists(session?.user.id);

   const [searchParams, setSearchParams] = useSearchParams();
   const listIdInUrl = searchParams.get("listId");

   const [showLoginModal, setShowLoginModal] = useState(false);

   const { status: friendStatus, loading: friendLoading, sendRequest, acceptRequest, removeOrCancel, rejectRequest } = 
      useFriendship(session?.user.id, profileId ?? undefined);

   const [showAddModal, setShowAddModal] = useState(false);
   const [movieToEdit, setMovieToEdit] = useState<MovieData | null>(null);
   const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

   const [showFriendsModal, setShowFriendsModal] = useState(false);
   const [showRemoveFriend, setShowRemoveFriend] = useState(false);


   const movieIdInUrl = searchParams.get("movie");
   const selectedMovie = movieIdInUrl && movies.length > 0
      ? movies.find(m => 
           (m.tmdb_id && m.tmdb_id.toString() === movieIdInUrl) || 
           (m.id && m.id.toString() === movieIdInUrl)
        ) || null
      : null;


   const handleOpenPublicModal = (movie: MovieData) => {

      const targetId = movie.tmdb_id || movie.id;

      setSearchParams(prev => {
         prev.set("movie", targetId.toString());
         return prev;
      });
   };

   const handleClosePublicModal = () => {
      setSearchParams(prev => {
         prev.delete("movie");
         return prev;
      });
   };

   const handleSendRequest = async () => {
      const { success, error } = await sendRequest();
      if (success) toast.success("Pedido enviado!");
      else toast.error(error || "Erro ao enviar pedido.");
   };

   const handleAcceptRequest = async () => {
      const { success, error } = await acceptRequest();
      if (success) toast.success("Pedido aceite! Agora vocês são amigos.");
      else toast.error(error || "Erro ao aceitar pedido.");
   };

   const handleRejectRequest = async () => {
      const { success, error } = await rejectRequest();
      if (success) toast.success("Pedido recusado.");
      else toast.error(error || "Erro ao recusar pedido.");
   };

   const handleRemoveOrCancel = async () => {
      const { success, error } = await removeOrCancel();
      if (success) toast.success("Amizade/Pedido desfeito.");
      else toast.error(error || "Erro ao processar ação.");
   };

   useEffect(() => {
      if (error) {
         toast.error(error);
      }
   }, [error]);

   useEffect(() => {
      if (!listIdInUrl || listsLoading || lists.length === 0) return;
      const listToOpen = lists.find((item) => item.id === listIdInUrl);
      if (listToOpen) {
         setSelectedList(listToOpen);
      }
   }, [listIdInUrl, lists, listsLoading]);

   if (loading) {
      return (
         <div className={styles.loadingState}>
            <Spinner animation="border" />
            <p className="mt-3">Buscando a lista de @{profileUsername}...</p>
         </div>
      );
   }

   return (
      <div className={styles.profilePage}>
         <AppNavbar
            onlyNational={filters.onlyNational}
            setOnlyNational={filters.setOnlyNational}
            sortOrder={filters.sortOrder}
            setSortOrder={filters.setSortOrder}
            searchTerm={filters.searchTerm}
            setSearchTerm={filters.setSearchTerm}
            onlyOscar={filters.onlyOscar}
            setOnlyOscar={filters.setOnlyOscar}
            availableGenres={filters.availableGenres}
            selectedGenre={filters.selectedGenre}
            setSelectedGenre={filters.setSelectedGenre}
            onLoginClick={() => setShowLoginModal(true)}
            session={session}
            onLogout={() => setShowLogoutConfirm(true)}
            username={loggedInUsername}
            avatarUrl={loggedInAvatar}
            onFriendsClick={() => setShowFriendsModal(true)}
         />

         {/* Mobile tabs */}
         <div className={`d-md-none ${styles.mobileTabs}`}>
            <div className={styles.mobileTabsInner}>
               <button
                  className={`${styles.mobileTab} ${filters.viewMode === "watched" ? styles.mobileTabActive : ""}`}
                  onClick={() => filters.setViewMode("watched")}
               >
                  Assistidos
               </button>
               <button
                  className={`${styles.mobileTab} ${filters.viewMode === "watchlist" ? styles.mobileTabActive : ""}`}
                  onClick={() => filters.setViewMode("watchlist")}
               >
                  Watchlist
               </button>
               <button
                  className={`${styles.mobileTab} ${filters.viewMode === "lists" ? styles.mobileTabActive : ""}`} // Use styles.viewBtnActive no desktop
                  onClick={() => filters.setViewMode("lists")}
               >
                  Listas
               </button>
            </div>
         </div>

         <Container className="px-4 pb-5">
            <div className={styles.profileHeader}>
               <div className={styles.backBtnWrapper}>
                  <button onClick={() => window.history.back()} className={styles.backBtn}>
                     <ArrowLeft size={20} />
                     <span>Voltar</span>
                  </button>
               </div>

               <div className={styles.userInfo}>
                  {profileAvatar ? (
                     <img src={profileAvatar} alt={profileName} className={styles.avatar} />
                  ) : (
                     <div className={styles.avatarPlaceholder}>
                        {profileName.charAt(0).toUpperCase()}
                     </div>
                  )}
                  <div className={styles.nameContainer}>
                     <h2 className={styles.profileName}>@{profileName}</h2>
                     <p className={styles.profileCount}>
                        {movies.filter(m => m.status === "watched").length} filmes na coleção
                     </p>
                  </div>
               </div>

               <div className={styles.actionButtons}>
                  {session && session.user.id !== profileId && !friendLoading && (
                     <>
                        {friendStatus === "none" && (
                           <button className={styles.addFriendBtn} onClick={handleSendRequest}>
                              <UserPlus size={18} /> Adicionar
                           </button>
                        )}
                        {friendStatus === "request_sent" && (
                           <button className={styles.pendingBtn} onClick={handleRemoveOrCancel}>
                              <Clock size={18} /> Pendente
                           </button>
                        )}
                        {friendStatus === "request_received" && (
                           <div className="d-flex gap-2">
                              <button className={styles.acceptBtn} onClick={handleAcceptRequest}>
                                 <UserCheck size={18} /> Aceitar
                              </button>
                              <button className={`${styles.pendingBtn} ${styles.rejectFriendBtn}`} onClick={handleRejectRequest}>
                                 <X size={18} /> Recusar
                              </button>
                           </div>
                        )}
                        {friendStatus === "friends" && (
                           <button className={styles.friendsBtn} onClick={() => setShowRemoveFriend(true)}>
                              <UserCheck size={18} /> Amigos
                           </button>
                        )}
                     </>
                  )}

                  {!session && (
                     <button className={styles.createListBtn} onClick={() => setShowLoginModal(true)}>
                        Criar a minha lista
                     </button>
                  )}
               </div>
            </div>

            {!filters.searchTerm && !filters.selectedDirector && filters.viewMode === "watched" && (
               <Dashboard 
                  movies={movies.filter(m => m.status === "watched")} 
                  onFilterDirector={(director) => {
                     filters.setSearchTerm("");
                     filters.setOnlyNational(false);
                     filters.setOnlyOscar(false);
                     filters.setOnlyInternational(false);
                     filters.setSelectedGenre("");
                     
                     filters.setSelectedDirector(director);
                     window.scrollTo({ top: 300, behavior: 'smooth' }); 
                  }}
                  onFilterNonUS={() => {
                     filters.setSearchTerm("");
                     filters.setOnlyNational(false);
                     filters.setOnlyOscar(false);
                     filters.setSelectedGenre("");
                     filters.setSelectedDirector("");
                     
                     filters.setOnlyInternational(true);
                     window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
               />
            )}

            <div className={styles.subheader}>
               <div className="d-flex align-items-center justify-content-between w-100 w-md-auto">
                     <span className={styles.movieCount}>
                        {filters.viewMode === "lists" 
                           ? (listsLoading ? "Carregando..." : `Exibindo ${lists.length} listas`)
                           : loading
                              ? "Carregando..."
                              : filters.filteredMovies.length === movies.length
                              ? `Todos os ${movies.length} filmes`
                              : filters.filteredMovies.length === 1
                                 ? "Exibindo 1 filme"
                                 : `Exibindo ${filters.filteredMovies.length} filmes`
                        }
                     </span>
                  <div className={styles.viewToggle}>
                     <button
                        className={`${styles.viewBtn} ${filters.viewMode === "watched" ? styles.viewBtnActive : ""}`}
                        onClick={() => filters.setViewMode("watched")}
                     >
                        Assistidos
                     </button>
                     <button
                        className={`${styles.viewBtn} ${filters.viewMode === "watchlist" ? styles.viewBtnActive : ""}`}
                        onClick={() => filters.setViewMode("watchlist")}
                     >
                        Watchlist
                     </button>
                     <button
                        className={`${styles.viewBtn} ${filters.viewMode === "lists" ? styles.viewBtnActive : ""}`}
                        onClick={() => filters.setViewMode("lists")}
                     >
                        Listas
                     </button>
                  </div>
               </div>

               <div className={styles.mobileFilters}>
                  <button
                     className={`${styles.mobileFilterBtn} ${!filters.onlyNational && !filters.onlyOscar ? styles.mobileFilterBtnActive : ""}`}
                     onClick={() => { filters.setOnlyNational(false); filters.setOnlyOscar(false); }}
                  >
                     Todos
                  </button>
                  <button
                     className={`${styles.mobileFilterBtn} ${filters.onlyNational ? styles.mobileFilterBtnNationalActive : ""}`}
                     onClick={() => filters.setOnlyNational(!filters.onlyNational)}
                  >
                     Nacionais
                  </button>
                  <button
                     className={`${styles.mobileFilterBtn} ${filters.onlyOscar ? styles.mobileFilterBtnOscarActive : ""}`}
                     onClick={() => filters.setOnlyOscar(!filters.onlyOscar)}
                  >
                     Oscar
                  </button>
               </div>
            </div>

            {filters.viewMode === "lists" ? (
               selectedList ? (
                  <ListDetails
                     list={selectedList}
                     allMovies={movies}
                     currentUserId={session?.user.id}
                     onBack={() => setSelectedList(null)}
                     // Como é o perfil de outra pessoa, passa funções vazias para as ações destrutivas
                     onListDeleted={() => {}}
                     onListUpdated={() => {}}
                     onListDuplicated={() => {}}
                     onUpdateList={async () => ({ success: false, error: null })}
                     onRemoveMovie={async () => ({ success: false, error: null })}
                     onAddMovieClick={() => {}}
                     onMovieClick={handleOpenPublicModal}
                  />
               ) : (
                  <div className={styles.listsContainer}>
                     <div className="d-flex justify-content-between align-items-center mb-4 mt-3">
                        <h4 className="m-0 text-white fw-bold">Listas de @{profileName}</h4>
                     </div>

                     {listsLoading ? (
                        <div className="text-center py-5 text-muted">A procurar listas...</div>
                     ) : lists.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                           @{profileName} ainda não criou nenhuma lista temática.
                        </div>
                     ) : (
                        <div className="row g-3">
                           {lists.map((list) => (
                              <div key={list.id} className="col-12 col-md-6 col-lg-4">
                                 <div 
                                    className={`p-4 rounded h-100 ${styles.listCard}`}
                                    onClick={() => setSelectedList(list)}
                                 >
                                    <h5 className={styles.listCardTitle}>{list.name}</h5>
                                    <p className="text-muted small mb-0 text-truncate">{list.description || "Sem descrição"}</p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               )
             ) : filters.filteredMovies.length === 0 ? (
               <div className={styles.emptyState}>
                  <h5>Nenhum filme encontrado.</h5>
               </div>
            ) : (
               <>
                  {(filters.selectedDirector || filters.onlyInternational || filters.onlyNational || filters.onlyOscar || filters.selectedGenre) && (
                     <div className={styles.activeFilters}>
                        {filters.selectedDirector && (
                           <button className={styles.filterBadge} onClick={() => filters.setSelectedDirector("")}>
                              Diretor: {filters.selectedDirector} ✕
                           </button>
                        )}
                        {filters.onlyInternational && (
                           <button className={styles.filterBadge} onClick={() => filters.setOnlyInternational(false)}>
                              Fora dos EUA ✕
                           </button>
                        )}
                        {filters.onlyNational && (
                           <button className={styles.filterBadge} onClick={() => filters.setOnlyNational(false)}>
                              Cinema Nacional ✕
                           </button>
                        )}
                        {filters.onlyOscar && (
                           <button className={styles.filterBadge} onClick={() => filters.setOnlyOscar(false)}>
                              Vencedores do Oscar ✕
                           </button>
                        )}
                        {filters.selectedGenre && (
                           <button className={styles.filterBadge} onClick={() => filters.setSelectedGenre("")}>
                              Gênero: {filters.selectedGenre} ✕
                           </button>
                        )}
                     </div>
                  )}

                  <div className="movie-grid">
                     {filters.filteredMovies.map((movie) => (
                        <MovieCard 
                           key={movie.id} 
                           movie={movie} 
                           onClick={handleOpenPublicModal} 
                        />
                     ))}
                  </div>
               </>
            )}
         </Container>

         <Footer />

         <MovieModal
            show={!!selectedMovie}
            movie={selectedMovie}
            onHide={handleClosePublicModal}
            isAdmin={false}
            onEdit={() => {}} 
            onDelete={async () => ({ success: false, error: null })} 
            onShare={() => {}}
         />

         <AddMovieModal
            show={showAddModal}
            onHide={handleClosePublicModal}
            onSuccess={() => {}} 
            movieToEdit={movieToEdit}
            lists={myLists}
            addMovieToList={addMovieToList}
            createList={createList}
            preselectedListId=""
         />

         <LoginModal
            show={showLoginModal}
            onHide={() => setShowLoginModal(false)}
         />

         <FriendsModal 
            show={showFriendsModal} 
            onHide={() => setShowFriendsModal(false)} 
            session={session} 
         />

         <BottomNav
            session={session}
            avatarUrl={loggedInAvatar}
            onAddClick={() => {
               setMovieToEdit(null);
               setShowAddModal(true);
            }}
            onLoginClick={() => setShowLoginModal(true)}
            onFriendsClick={() => setShowFriendsModal(true)}
         />

         <ConfirmModal
            show={showLogoutConfirm}
            onHide={() => setShowLogoutConfirm(false)}
            onConfirm={() => {
               setShowLogoutConfirm(false);
               logout();
            }}
            title="Sair da conta"
            message="Tem certeza que deseja sair? Você precisará fazer login novamente para acessar seus filmes."
            confirmText="Sim, sair"
         />

         <ConfirmModal
            show={showRemoveFriend}
            onHide={() => setShowRemoveFriend(false)}
            onConfirm={async () => {
               setShowRemoveFriend(false);
               await handleRemoveOrCancel();
            }}
            title="Desfazer Amizade"
            message={`Tem certeza que deseja desfazer a amizade com @${profileName}?`}
            confirmText="Sim, desfazer"
         />
      </div>
   );
}
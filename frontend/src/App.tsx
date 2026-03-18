import { useEffect } from "react";
import { Container } from "react-bootstrap";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Dices, Plus} from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

// ─── Features ───
import { useAuth, LoginModal, ProfileModal, FriendsModal, ResetPassword } from "@/features/auth";
import {
   MovieCardSkeleton,
   MovieModal,
   AddMovieModal,
   useMovies,
   useMovieFilters,
   MoviesView,
   useDeleteMovie,
} from "@/features/movies";
import { Dashboard } from "@/features/dashboard";
import { MovieBattle } from "@/features/battle";
import { RouletteModal } from "@/features/roulette";
import { ListsView } from "@/features/lists"; 
import { ShareCard, ShareModal, useShare } from "@/features/share";
import { PublicProfile } from "@/features/publicProfile";
import { useLists, CreateListModal, ListDetails } from "@/features/lists";
import { BottomNav } from "@/components/layout/BottomNav/BottomNav";
import { ConfirmModal } from "@/components/ui/ConfirmModal/ConfirmModal";

// ─── Layout & UI ───
import { AppNavbar } from "@/components/layout/AppNavbar/AppNavbar";
import { Footer } from "@/components/layout/Footer/Footer";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay/LoadingOverlay";
import { LandingPage } from "@/components/landing/LandingPage";

import styles from "./App.module.css";

// ─── Hooks de Arquitetura  ───
import { useAppModals } from "@/hooks/useAppModals";
import { useAppNavigation } from "@/hooks/useAppNavigation";

export default function App() {
   return (
      <Routes>
         <Route path="/" element={<MainApp />} />
         <Route path="/perfil/:username" element={<PublicProfile />} />
         <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
   );
}

function MainApp() {
   const navigate = useNavigate();
   
   // Core Hooks
   const { session, username, avatarUrl, logout, updateUsername, loading: authLoading } = useAuth();
   const { movies, loading: moviesLoading, fetchMovies } = useMovies(session);
   const { lists, loading: listsLoading, createList, fetchLists, updateList, removeMovieFromList, addMovieToList } = useLists(session?.user.id);
   const filters = useMovieFilters(movies);
   const { shareRef, sharingMovie, isSharing } = useShare();

   const modals = useAppModals();

   const { handleOpenModal } = useAppNavigation({
      movies,
      lists,
      listsLoading,
      openMovie: modals.openMovie,
      closeMovie: modals.closeMovie,
      setSelectedList: modals.setSelectedList
   });

   const { handleDeleteMovie } = useDeleteMovie({
      lists,
      fetchMovies,
      fetchLists,
      closeModal: modals.closeMovie
   });

   usePushNotifications(session?.user.id);
   const isPageLoading = authLoading || moviesLoading;

   useEffect(() => {
      window.scrollTo(0, 0);
   }, []);

   // ─── Render da Batalha ───
   if (modals.isBattleMode) {
      return (
         <div className={styles.page}>
            <MovieBattle allMovies={movies} onExit={() => modals.setIsBattleMode(false)} />
         </div>
      );
   }


   

   return (
      <div className={styles.page}>
         <Toaster 
            position="bottom-right" 
            toastOptions={{
               style: { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' },
               success: { iconTheme: { primary: 'var(--gold)', secondary: '#000' } }
            }} 
         />

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
            onStartBattle={() => modals.setIsBattleMode(true)}
            onLoginClick={() => modals.setShowLoginModal(true)}
            session={session}
            onLogout={() => modals.setShowLogoutConfirm(true)}
            username={username}
            avatarUrl={avatarUrl}
            onProfileClick={() => modals.setShowProfileModal(true)}
            showFilters={!!session} 
            showBattle={!!session}
            onFriendsClick={() => modals.setShowFriendsModal(true)}
         />

         {session && (
            <div className={`d-md-none ${styles.mobileTabsWrapper}`}>
               <div className={styles.mobileTabsInner}>
                  <button className={`${styles.mobileTab} ${filters.viewMode === "watched" ? styles.mobileTabActive : ""}`} onClick={() => filters.setViewMode("watched")}>Assistidos</button>
                  <button className={`${styles.mobileTab} ${filters.viewMode === "watchlist" ? styles.mobileTabActive : ""}`} onClick={() => filters.setViewMode("watchlist")}>Watchlist</button>
                  <button className={`${styles.mobileTab} ${filters.viewMode === "lists" ? styles.mobileTabActive : ""}`} onClick={() => filters.setViewMode("lists")}>Listas</button>
               </div>
            </div>
         )}
         
         <Container className="px-4 pb-5">
            {session && (
               <>
               {!isPageLoading && !filters.searchTerm &&
               <Dashboard 
                  movies={movies} 
                  onFilterDirector={(director) => {
                     filters.setSearchTerm(""); filters.setOnlyNational(false); filters.setOnlyOscar(false); filters.setOnlyInternational(false); filters.setSelectedGenre(""); filters.setSelectedDirector(director);
                     window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onFilterNonUS={() => {
                     filters.setSearchTerm(""); filters.setOnlyNational(false); filters.setOnlyOscar(false); filters.setSelectedGenre(""); filters.setSelectedDirector(""); filters.setOnlyInternational(true);
                     window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
               />}

               <div className={styles.subheader}>
                  <div className="d-flex align-items-center justify-content-between w-100 w-md-auto">
                     <span className={styles.movieCount}>
                        {filters.viewMode === "lists" 
                           ? (listsLoading ? "Carregando..." : `Exibindo ${lists.length} listas`)
                           : isPageLoading
                              ? "Carregando..."
                              : filters.filteredMovies.length === movies.length
                              ? `Todos os ${movies.length} filmes`
                              : filters.filteredMovies.length === 1
                                 ? "Exibindo 1 filme"
                                 : `Exibindo ${filters.filteredMovies.length} filmes`
                        }
                     </span>

                     <div className={styles.viewToggle}>
                        <button className={`${styles.viewBtn} ${filters.viewMode === "watched" ? styles.viewBtnActive : ""}`} onClick={() => filters.setViewMode("watched")}>Assistidos</button>
                        <button className={`${styles.viewBtn} ${filters.viewMode === "watchlist" ? styles.viewBtnActive : ""}`} onClick={() => filters.setViewMode("watchlist")}>Watchlist</button>
                        <button className={`${styles.viewBtn} ${filters.viewMode === "lists" ? styles.viewBtnActive : ""}`} onClick={() => filters.setViewMode("lists")}>Minhas Listas</button>
                     </div>

                     <div className={styles.actionGroup}>
                        {filters.viewMode === "watchlist" && movies.some((m) => m.status === "watchlist") && (
                           <button className={styles.rouletteBtn} onClick={() => modals.setShowRoulette(true)} title="Sortear um filme aleatório">
                              <Dices size={16} /><span className="d-none d-md-inline">Sortear</span>
                           </button>
                        )}

                        {session && filters.viewMode !== "lists" && (
                           <button className={styles.addBtn} onClick={() => modals.openAddMovie(null, "")}>
                              <Plus size={16} className="d-md-none" />
                              <span className="d-md-none"> Filme</span>
                              <span className="d-none d-md-inline">+ Adicionar Filme</span>
                           </button>
                        )}
                     </div>
                  </div>
               </div>
               </>
            )}

            {isPageLoading && movies.length === 0 ? (
               <div className={styles.loadingState}>
                  {[...Array(8)].map((_, i) => <MovieCardSkeleton key={i} />)}
               </div>
            ) : !session ? (
               <LandingPage onLoginClick={() => modals.setShowLoginModal(true)} />
            ) : filters.viewMode === "lists" ? (
               modals.selectedList ? (
                  <ListDetails
                     list={modals.selectedList}
                     allMovies={movies}
                     currentUserId={session?.user.id}
                     onBack={() => modals.setSelectedList(null)}
                     onListDeleted={() => { modals.setSelectedList(null); fetchLists(); }}
                     onListUpdated={(updatedList) => { modals.setSelectedList(updatedList); fetchLists(); }}
                     onUpdateList={updateList}
                     onRemoveMovie={removeMovieFromList}
                     onAddMovieClick={() => modals.openAddMovie(null, modals.selectedList?.id)}
                     onMovieClick={handleOpenModal}
                  />
               ) : (
                  <ListsView 
                     lists={lists}
                     listsLoading={listsLoading}
                     onSelectList={modals.setSelectedList}
                     onCreateListClick={() => modals.setShowCreateListModal(true)}
                  />
               )
            ) : (
               <MoviesView
                  filteredMovies={filters.filteredMovies}
                  searchTerm={filters.searchTerm}
                  filters={{
                     selectedDirector: filters.selectedDirector,
                     setSelectedDirector: filters.setSelectedDirector,
                     onlyInternational: filters.onlyInternational,
                     setOnlyInternational: filters.setOnlyInternational,
                     onlyNational: filters.onlyNational,
                     setOnlyNational: filters.setOnlyNational,
                     onlyOscar: filters.onlyOscar,
                     setOnlyOscar: filters.setOnlyOscar,
                     selectedGenre: filters.selectedGenre,
                     setSelectedGenre: filters.setSelectedGenre,
                  }}
                  onAddMovieClick={() => modals.openAddMovie(null, "")}
                  onMovieClick={handleOpenModal}
               />
            )}
         </Container>

         <Footer />

         {/* ─── Modais ─── */}
         <MovieModal
            show={modals.showMovieModal}
            movie={modals.selectedMovie}
            onHide={modals.closeMovie}
            isAdmin={!!session}
            onEdit={(m) => { modals.closeMovie(); modals.openAddMovie(m, modals.selectedList?.id); }}
            onDelete={handleDeleteMovie}
            onShare={modals.openShare} 
         />

         <ShareModal 
            show={modals.showShareModal}
            movie={modals.movieToShare}
            onHide={() => { modals.setShowShareModal(false); modals.setMovieToShare(null); }}
         />

         <AddMovieModal
            show={modals.showAddModal}
            onHide={() => { modals.setShowAddModal(false); modals.setPreselectedListId(""); }}
            onSuccess={() => fetchMovies()}
            movieToEdit={modals.movieToEdit}
            lists={lists}
            addMovieToList={addMovieToList}
            createList={createList}
            preselectedListId={modals.preselectedListId}
         />

         <LoginModal show={modals.showLoginModal} onHide={() => modals.setShowLoginModal(false)} />

         <ProfileModal
            show={modals.showProfileModal}
            onHide={() => modals.setShowProfileModal(false)}
            session={session}
            currentUsername={username}
            onUpdate={updateUsername}
            onLogout={() => { modals.setShowProfileModal(false); modals.setShowLogoutConfirm(true); }}
            forceLogout={logout}
         />

         {sharingMovie && <ShareCard ref={shareRef} movie={sharingMovie} />}

         {isSharing && <LoadingOverlay message="Gerando imagem..." />}

         <ConfirmModal
            show={modals.showLogoutConfirm}
            onHide={() => modals.setShowLogoutConfirm(false)}
            onConfirm={() => { modals.setShowLogoutConfirm(false); logout(); }}
            title="Sair da conta"
            message="Tem certeza que deseja sair? Você precisará fazer login novamente para acessar seus filmes."
            confirmText="Sim, sair"
         />

         <RouletteModal
            show={modals.showRoulette}
            onHide={() => modals.setShowRoulette(false)}
            watchlist={movies.filter((m) => m.status === "watchlist")}
            onMovieSelect={(movie) => { modals.setShowRoulette(false); handleOpenModal(movie); }}
         />

         <FriendsModal show={modals.showFriendsModal} onHide={() => modals.setShowFriendsModal(false)} session={session} />

         <CreateListModal show={modals.showCreateListModal} onHide={() => modals.setShowCreateListModal(false)} onCreate={createList} />

         <BottomNav
            session={session}
            avatarUrl={avatarUrl}
            onHomeClick={() => { navigate("/"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            onGamesClick={() => modals.setIsBattleMode(true)} 
            onAddClick={() => modals.openAddMovie(null, "")}
            onProfileClick={() => modals.setShowProfileModal(true)}
            onLoginClick={() => modals.setShowLoginModal(true)}
            onFriendsClick={() => modals.setShowFriendsModal(true)}
         />
      </div>
   );
}
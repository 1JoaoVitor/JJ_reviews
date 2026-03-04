import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Spinner } from "react-bootstrap";
import { usePublicProfile } from "../../hooks/usePublicProfile";
import { MovieCard, MovieModal, useMovieFilters } from "@/features/movies";
import { Dashboard } from "@/features/dashboard";
import { AppNavbar } from "@/components/layout/AppNavbar/AppNavbar";
import { useAuth, LoginModal, ProfileModal } from "@/features/auth";
import { MovieBattle } from "@/features/battle";
import type { MovieData } from "@/types";
import styles from "./PublicProfile.module.css";

export function PublicProfile() {
   const { username: profileUsername } = useParams<{ username: string }>();
   const navigate = useNavigate();
   
   const { movies, loading, error, profileName, profileAvatar } = usePublicProfile(profileUsername);
   const { session, username: loggedInUsername, avatarUrl: loggedInAvatar, logout, updateUsername } = useAuth();
   const filters = useMovieFilters(movies);

   const [selectedMovie, setSelectedMovie] = useState<MovieData | null>(null);
   const [showLoginModal, setShowLoginModal] = useState(false);
   const [showProfileModal, setShowProfileModal] = useState(false);
   const [isBattleMode, setIsBattleMode] = useState(false);

   if (loading) {
      return (
         <div className={styles.loadingState}>
            <Spinner animation="border" />
            <p className="mt-3">Buscando a lista de @{profileUsername}...</p>
         </div>
      );
   }

   if (error) {
      return (
         <Container className="text-center mt-5 pt-5">
            <div className={styles.errorCard}>
               <h4 className={styles.errorTitle}>Ops!</h4>
               <p className={styles.errorText}>{error}</p>
               <button className={styles.backBtn} onClick={() => navigate("/")}>
                  Voltar para o início
               </button>
            </div>
         </Container>
      );
   }

   if (isBattleMode) {
      return (
         <div className={styles.profilePage}>
            <MovieBattle
               allMovies={movies}
               onExit={() => setIsBattleMode(false)}
            />
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
            onStartBattle={() => setIsBattleMode(true)}
            onLoginClick={() => setShowLoginModal(true)}
            session={session}
            onLogout={logout}
            username={loggedInUsername}
            avatarUrl={loggedInAvatar}
            onProfileClick={() => setShowProfileModal(true)}
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
            </div>
         </div>

         <Container className="px-4 pb-5">
            <div className={styles.profileHeader}>
               {profileAvatar ? (
                  <img src={profileAvatar} alt={profileName} className={styles.avatar} />
               ) : (
                  <div className={styles.avatarPlaceholder}>
                     {profileName.charAt(0).toUpperCase()}
                  </div>
               )}
               <div className="flex-grow-1">
                  <h2 className={styles.profileName}>Lista de @{profileName}</h2>
                  <p className={styles.profileCount}>{movies.filter(m => m.status === "watched").length} filmes na coleção</p>
               </div>
               <button className={styles.createListBtn} onClick={() => navigate("/")}>
                  Criar a minha lista
               </button>
            </div>

            {!filters.searchTerm && filters.viewMode === "watched" && (
               <Dashboard movies={movies.filter(m => m.status === "watched")} />
            )}

            <div className={styles.subheader}>
               <div className="d-flex align-items-center justify-content-between w-100 w-md-auto">
                  <span className={styles.movieCount}>
                     {filters.filteredMovies.length === 1
                        ? "Exibindo 1 filme"
                        : `Exibindo ${filters.filteredMovies.length} filmes`}
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

            {filters.filteredMovies.length === 0 ? (
               <div className={styles.emptyState}>
                  <h5>Nenhum filme encontrado.</h5>
               </div>
            ) : (
               <div className="movie-grid">
                  {filters.filteredMovies.map((movie) => (
                     <MovieCard 
                        key={movie.id} 
                        movie={movie} 
                        onClick={(m) => setSelectedMovie(m)} 
                     />
                  ))}
               </div>
            )}
         </Container>

         <MovieModal
            show={!!selectedMovie}
            movie={selectedMovie}
            onHide={() => setSelectedMovie(null)}
            isAdmin={false}
            onEdit={() => {}} 
            onDelete={() => {}}
            onShare={() => {}}
         />

         <LoginModal
            show={showLoginModal}
            onHide={() => setShowLoginModal(false)}
         />

         <ProfileModal
            show={showProfileModal}
            onHide={() => setShowProfileModal(false)}
            session={session}
            currentUsername={loggedInUsername}
            onUpdate={updateUsername}
         />
      </div>
   );
}
import { useState } from "react";
import { useParams} from "react-router-dom";
import { Container, Spinner } from "react-bootstrap";
import { ArrowLeft, UserPlus, UserCheck, Clock} from "lucide-react";
import { usePublicProfile } from "../../hooks/usePublicProfile";
import { MovieCard, MovieModal, AddMovieModal, useMovieFilters } from "@/features/movies";
import { Dashboard } from "@/features/dashboard";
import { AppNavbar } from "@/components/layout/AppNavbar/AppNavbar";
import { BottomNav } from "@/components/layout/BottomNav/BottomNav";
import { Footer } from "@/components/layout/Footer/Footer";
import { useAuth, LoginModal, ProfileModal } from "@/features/auth";
import { MovieBattle } from "@/features/battle";
import type { MovieData } from "@/types";
import styles from "./PublicProfile.module.css";
import { ConfirmModal } from "@/components/ui/ConfirmModal/ConfirmModal";

import { useFriendship } from "@/features/friends"; 
import { FriendsModal } from "@/features/auth";


export function PublicProfile() {
   const { username: profileUsername } = useParams<{ username: string }>();
   
   const { movies, loading, profileName, profileAvatar, profileId } = usePublicProfile(profileUsername);
   const { session, username: loggedInUsername, avatarUrl: loggedInAvatar, logout, updateUsername } = useAuth();
   const filters = useMovieFilters(movies);

   const [selectedMovie, setSelectedMovie] = useState<MovieData | null>(null);
   const [showLoginModal, setShowLoginModal] = useState(false);
   const [showProfileModal, setShowProfileModal] = useState(false);
   const [isBattleMode, setIsBattleMode] = useState(false);

   const { status: friendStatus, loading: friendLoading, sendRequest, acceptRequest, removeOrCancel } = 
      useFriendship(session?.user.id, profileId ?? undefined);

   const [showAddModal, setShowAddModal] = useState(false);
   const [movieToEdit, setMovieToEdit] = useState<MovieData | null>(null);
   const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

   const [showFriendsModal, setShowFriendsModal] = useState(false);

   if (loading) {
      return (
         <div className={styles.loadingState}>
            <Spinner animation="border" />
            <p className="mt-3">Buscando a lista de @{profileUsername}...</p>
         </div>
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
            onLogout={() => setShowLogoutConfirm(true)}
            username={loggedInUsername}
            avatarUrl={loggedInAvatar}
            onProfileClick={() => setShowProfileModal(true)}
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
                           <button className={styles.addFriendBtn} onClick={sendRequest}>
                              <UserPlus size={18} /> Adicionar
                           </button>
                        )}
                        {friendStatus === "pending_sent" && (
                           <button className={styles.pendingBtn} onClick={removeOrCancel}>
                              <Clock size={18} /> Pendente
                           </button>
                        )}
                        {friendStatus === "pending_received" && (
                           <button className={styles.acceptBtn} onClick={acceptRequest}>
                              <UserCheck size={18} /> Aceitar Pedido
                           </button>
                        )}
                        {friendStatus === "accepted" && (
                           <button className={styles.friendsBtn} onClick={() => {
                              if(window.confirm("Desfazer amizade?")) removeOrCancel();
                           }}>
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

         <Footer />

         <MovieModal
            show={!!selectedMovie}
            movie={selectedMovie}
            onHide={() => setSelectedMovie(null)}
            isAdmin={false}
            onEdit={() => {}} 
            onDelete={() => {}}
            onShare={() => {}}
         />

         <AddMovieModal
            show={showAddModal}
            onHide={() => setShowAddModal(false)}
            onSuccess={() => {}} 
            movieToEdit={movieToEdit}
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
            onLogout={() => {
               setShowProfileModal(false);
               setShowLogoutConfirm(true);
            }}
         />

         <FriendsModal 
            show={showFriendsModal} 
            onHide={() => setShowFriendsModal(false)} 
            session={session} 
         />

         <BottomNav
            session={session}
            avatarUrl={loggedInAvatar}
            onHomeClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            onGamesClick={() => setIsBattleMode(true)} 
            onAddClick={() => {
               setMovieToEdit(null);
               setShowAddModal(true);
            }}
            onProfileClick={() => setShowProfileModal(true)}
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
      </div>
   );
}
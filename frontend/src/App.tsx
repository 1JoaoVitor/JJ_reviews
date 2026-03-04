import { useState } from "react";
import { Container, Spinner } from "react-bootstrap";
import { Routes, Route } from "react-router-dom";
import { Dices, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { MovieData } from "@/types";

// ─── Features ───
import { useAuth, LoginModal, ProfileModal } from "@/features/auth";
import {
   MovieCard,
   MovieModal,
   AddMovieModal,
   useMovies,
   useMovieFilters,
} from "@/features/movies";
import { Dashboard } from "@/features/dashboard";
import { MovieBattle } from "@/features/battle";
import { RouletteModal } from "@/features/roulette";
import { ShareCard, useShare } from "@/features/share";
import { PublicProfile } from "@/features/publicProfile";

// ─── Layout & UI ───
import { AppNavbar } from "@/components/layout/AppNavbar/AppNavbar";
import { Footer } from "@/components/layout/Footer/Footer";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay/LoadingOverlay";

import styles from "./App.module.css";

export default function App() {
   return (
      <Routes>
         {/* Se a URL for apenas "/", carrega o seu sistema completo */}
         <Route path="/" element={<MainApp />} />
         
         {/* Se a URL for "/perfil/algum-nome", carrega a tela de visitante */}
         <Route path="/perfil/:username" element={<PublicProfile />} />
      </Routes>
   );
}

function MainApp() {
   const { session, username, avatarUrl, logout, updateUsername } = useAuth();
   const { movies, loading, fetchMovies } = useMovies(!!session);
   const filters = useMovieFilters(movies);
   const { shareRef, sharingMovie, isSharing, handleShare } = useShare();

   // ─── Estado local apenas de UI ───
   const [selectedMovie, setSelectedMovie] = useState<MovieData | null>(null);
   const [showModal, setShowModal] = useState(false);
   const [showAddModal, setShowAddModal] = useState(false);
   const [showLoginModal, setShowLoginModal] = useState(false);
   const [movieToEdit, setMovieToEdit] = useState<MovieData | null>(null);
   const [showRoulette, setShowRoulette] = useState(false);
   const [isBattleMode, setIsBattleMode] = useState(false);
   const [showProfileModal, setShowProfileModal] = useState(false);

   // ─── Handlers ───
   const handleOpenModal = (movie: MovieData) => {
      setSelectedMovie(movie);
      setShowModal(true);
   };

   const handleCloseModal = () => {
      setShowModal(false);
      setSelectedMovie(null);
   };

   const handleDeleteMovie = async (movie: MovieData) => {
      try {
         const { error } = await supabase
            .from("reviews")
            .delete()
            .eq("id", movie.id);
         if (error) throw error;
         handleCloseModal();
         fetchMovies();
      } catch (error) {
         alert("Erro ao excluir!");
         console.error(error);
      }
   };

   const handleEditMovie = (movie: MovieData) => {
      handleCloseModal();
      setMovieToEdit(movie);
      setShowAddModal(true);
   };

   // ─── Modo Batalha (tela inteira) ───
   if (isBattleMode) {
      return (
         <div className={styles.page}>
            <MovieBattle
               allMovies={movies}
               onExit={() => setIsBattleMode(false)}
            />
         </div>
      );
   }

   return (
      <div className={styles.page}>
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
            username={username}
            avatarUrl={avatarUrl}
            onProfileClick={() => setShowProfileModal(true)}
         />


         {session && (
            <div className={`d-md-none ${styles.mobileTabsWrapper}`}>
               <div className={styles.mobileTabsInner}>
                  <button
                     className={`${styles.mobileTab} ${filters.viewMode === "watched" ? styles.mobileTabActive : ""}`}
                     onClick={() => filters.setViewMode("watched")}
                  >
                     Já Vimos
                  </button>
                  <button
                     className={`${styles.mobileTab} ${filters.viewMode === "watchlist" ? styles.mobileTabActive : ""}`}
                     onClick={() => filters.setViewMode("watchlist")}
                  >
                     Watchlist
                  </button>
               </div>
            </div>
         )}
         

         <Container className="px-4 pb-5">
            {session && (
               <>
               {!loading && !filters.searchTerm && <Dashboard movies={movies} />}

               <div className={styles.subheader}>
                  <div className="d-flex align-items-center justify-content-between w-100 w-md-auto">
                     <span className={styles.movieCount}>
                        {loading
                           ? "Carregando..."
                           : filters.filteredMovies.length === movies.length
                           ? `Todos os ${movies.length} filmes`
                           : filters.filteredMovies.length === 1
                              ? "Exibindo 1 filme"
                              : `Exibindo ${filters.filteredMovies.length} filmes`}
                     </span>

                     <div className={styles.viewToggle}>
                        <button
                           className={`${styles.viewBtn} ${filters.viewMode === "watched" ? styles.viewBtnActive : ""}`}
                           onClick={() => filters.setViewMode("watched")}
                        >
                           Já Vimos
                        </button>
                        <button
                           className={`${styles.viewBtn} ${filters.viewMode === "watchlist" ? styles.viewBtnActive : ""}`}
                           onClick={() => filters.setViewMode("watchlist")}
                        >
                           Watchlist
                        </button>
                     </div>

                     <div className={styles.actionGroup}>
                        {filters.viewMode === "watchlist" &&
                           movies.some((m) => m.status === "watchlist") && (
                              <button
                                 className={styles.rouletteBtn}
                                 onClick={() => setShowRoulette(true)}
                                 title="Sortear um filme aleatório"
                              >
                                 <Dices size={16} />
                                 <span className="d-none d-md-inline">Sortear</span>
                              </button>
                           )}

                        {session && (
                           <button
                              className={styles.addBtn}
                              onClick={() => {
                                 setMovieToEdit(null);
                                 setShowAddModal(true);
                              }}
                           >
                              <Plus size={16} className="d-md-none" />
                              <span className="d-md-none"> Filme</span>
                              <span className="d-none d-md-inline">+ Adicionar Filme</span>
                           </button>
                        )}
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
               </>
            )}

            {loading && movies.length === 0 ? (
               <div className={styles.loadingState}>
                  <Spinner animation="border" role="status" />
                  <p className="mt-2">Carregando...</p>
               </div>
            ) : !session ? (
               <div className={styles.welcomeCard}>
                  <h3 className={styles.welcomeTitle}>Bem-vindo ao JJ Reviews!</h3>
                  <p className={styles.welcomeText}>
                     Faça login ou crie sua conta para começar a montar o seu diário de filmes e avaliações.
                  </p>
                  <button
                     className={styles.welcomeBtn}
                     onClick={() => setShowLoginModal(true)}
                  >
                     Fazer Login / Cadastrar
                  </button>
               </div>
            ) : filters.filteredMovies.length === 0 ? (
               <div className={styles.emptyState}>
                  <h5>Nenhum filme encontrado na sua lista.</h5>
                  <p>Que tal adicionar o seu primeiro filme?</p>
               </div>
            ) : (
               <div className="movie-grid">
                  {filters.filteredMovies.map((movie) => (
                     <MovieCard
                        key={movie.id}
                        movie={movie}
                        onClick={handleOpenModal}
                     />
                  ))}
               </div>
            )}
         </Container>

         <Footer />

         {/* ─── Modais ─── */}
         <MovieModal
            show={showModal}
            movie={selectedMovie}
            onHide={handleCloseModal}
            isAdmin={!!session}
            onEdit={handleEditMovie}
            onDelete={handleDeleteMovie}
            onShare={handleShare}
         />

         <AddMovieModal
            show={showAddModal}
            onHide={() => setShowAddModal(false)}
            onSuccess={() => fetchMovies()}
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
            currentUsername={username}
            onUpdate={updateUsername}
         />

         {sharingMovie && <ShareCard ref={shareRef} movie={sharingMovie} />}

         {isSharing && <LoadingOverlay message="Gerando imagem..." />}

         <RouletteModal
            show={showRoulette}
            onHide={() => setShowRoulette(false)}
            watchlist={movies.filter((m) => m.status === "watchlist")}
            onMovieSelect={(movie) => {
               setShowRoulette(false);
               handleOpenModal(movie);
            }}
         />
      </div>
   );
}


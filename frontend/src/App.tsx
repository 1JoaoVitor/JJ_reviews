import { useState } from "react";
import { Container, Button, ButtonGroup, Spinner } from "react-bootstrap";
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

// ─── Layout & UI ───
import { AppNavbar } from "@/components/layout/AppNavbar/AppNavbar";
import { Footer } from "@/components/layout/Footer/Footer";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay/LoadingOverlay";

import styles from "./App.module.css";

function App() {
   // ─── Custom Hooks (toda a lógica pesada fica isolada) ───
   const { session, username, logout, updateUsername } = useAuth();
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
            onProfileClick={() => setShowProfileModal(true)}
         />

         {/* Abas mobile */}
         <div className={`d-md-none ${styles.mobileTabsWrapper}`}>
            <div className={styles.mobileTabsInner}>
               <Button
                  variant={filters.viewMode === "watched" ? "primary" : "light"}
                  className="rounded-pill px-4 fw-bold"
                  onClick={() => filters.setViewMode("watched")}
               >
                  Já Vimos
               </Button>
               <Button
                  variant={filters.viewMode === "watchlist" ? "primary" : "light"}
                  className="rounded-pill px-4 fw-bold"
                  onClick={() => filters.setViewMode("watchlist")}
               >
                  Watchlist
               </Button>
            </div>
         </div>

         <Container className="px-4 pb-5">
            {!loading && !filters.searchTerm && <Dashboard movies={movies} />}

            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
               <div className="d-flex align-items-center justify-content-between w-100 w-md-auto">
                  <h5 className="text-muted mb-0">
                     {loading
                        ? "Carregando..."
                        : filters.filteredMovies.length === movies.length
                          ? `Todos os ${movies.length} filmes`
                          : filters.filteredMovies.length === 1
                            ? "Exibindo 1 filme"
                            : `Exibindo ${filters.filteredMovies.length} filmes`}
                  </h5>

                  <ButtonGroup size="sm" className="d-none d-md-inline-flex shadow-sm">
                     <Button
                        variant={filters.viewMode === "watched" ? "secondary" : "outline-secondary"}
                        onClick={() => filters.setViewMode("watched")}
                        className={filters.viewMode === "watched" ? "fw-bold border-secondary" : "text-muted border-secondary"}
                     >
                        Já Vimos
                     </Button>
                     <Button
                        variant={filters.viewMode === "watchlist" ? "secondary" : "outline-secondary"}
                        onClick={() => filters.setViewMode("watchlist")}
                        className={filters.viewMode === "watchlist" ? "fw-bold border-secondary" : "text-muted border-secondary"}
                     >
                        Watchlist
                     </Button>
                  </ButtonGroup>

                  <ButtonGroup>
                     {filters.viewMode === "watchlist" &&
                        movies.some((m) => m.status === "watchlist") && (
                           <Button
                              variant="warning"
                              size="sm"
                              className="ms-2 fw-bold shadow-sm d-flex align-items-center justify-content-center"
                              onClick={() => setShowRoulette(true)}
                              title="Sortear um filme aleatório"
                           >
                              <span className="fs-6 d-md-none">🎲</span>
                              <span className="d-none d-md-inline">Sortear</span>
                           </Button>
                        )}

                     {session && (
                        <Button
                           variant="primary"
                           size="sm"
                           className="fw-bold shadow-sm ms-3 rounded-pill px-3"
                           onClick={() => {
                              setMovieToEdit(null);
                              setShowAddModal(true);
                           }}
                        >
                           <span className="d-md-none">+ Filme</span>{" "}
                           <span className="d-none d-md-inline">+ Adicionar Filme</span>
                        </Button>
                     )}
                  </ButtonGroup>
               </div>

               <ButtonGroup size="sm" className="d-md-none w-100">
                  <Button
                     variant={!filters.onlyNational && !filters.onlyOscar ? "secondary" : "outline-secondary"}
                     onClick={() => { filters.setOnlyNational(false); filters.setOnlyOscar(false); }}
                     className="flex-grow-1"
                  >
                     Todos
                  </Button>
                  <Button
                     variant={filters.onlyNational ? "success" : "outline-success"}
                     onClick={() => filters.setOnlyNational(!filters.onlyNational)}
                     className="flex-grow-1"
                  >
                     Nacionais
                  </Button>
                  <Button
                     variant={filters.onlyOscar ? "warning" : "outline-warning"}
                     onClick={() => filters.setOnlyOscar(!filters.onlyOscar)}
                     className="flex-grow-1 btn-outline-oscar"
                  >
                     Oscar
                  </Button>
               </ButtonGroup>
            </div>

            {loading && movies.length === 0 ? (
               <div className="text-center mt-5">
                  <Spinner animation="border" role="status" />
                  <p className="mt-2">Carregando...</p>
               </div>
            ) : !session ? (
               <div className={styles.welcomeCard}>
                  <h3 className="fw-bold text-muted mb-3">Bem-vindo ao JJ Reviews!</h3>
                  <p className="text-secondary mb-4 fs-5">
                     Faça login ou crie sua conta para começar a montar o seu diário de filmes e avaliações.
                  </p>
                  <Button
                     variant="primary"
                     size="lg"
                     className="fw-bold px-5"
                     onClick={() => setShowLoginModal(true)}
                  >
                     Fazer Login / Cadastrar
                  </Button>
               </div>
            ) : filters.filteredMovies.length === 0 ? (
               <div className="text-center mt-5 text-muted">
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

export default App;

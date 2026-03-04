import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Button, Spinner, Alert, ButtonGroup } from "react-bootstrap";
import { usePublicProfile } from "../../hooks/usePublicProfile";
import { MovieCard, MovieModal, useMovieFilters } from "@/features/movies";
import { Dashboard } from "@/features/dashboard";
import { AppNavbar } from "@/components/layout/AppNavbar/AppNavbar";
import { useAuth, LoginModal, ProfileModal } from "@/features/auth";
import { MovieBattle } from "@/features/battle";
import type { MovieData } from "@/types";

export function PublicProfile() {
   const { username: profileUsername } = useParams<{ username: string }>();
   const navigate = useNavigate();
   
   // Busca os dados do amigo
   const { movies, loading, error, profileName, profileAvatar } = usePublicProfile(profileUsername);

   // Trazemos o usuário logado (o visitante pode estar logado na própria conta)
   const { session, username: loggedInUsername, avatarUrl: loggedInAvatar, logout, updateUsername } = useAuth();

   // Reutilizamos toda a lógica de filtros que você criou
   const filters = useMovieFilters(movies);

   // Estados Locais da UI
   const [selectedMovie, setSelectedMovie] = useState<MovieData | null>(null);
   const [showLoginModal, setShowLoginModal] = useState(false);
   const [showProfileModal, setShowProfileModal] = useState(false);
   const [isBattleMode, setIsBattleMode] = useState(false);


   if (loading) {
      return (
         <div className="text-center mt-5 pt-5">
            <Spinner animation="border" />
            <p className="mt-3 text-muted">Buscando a lista de @{profileUsername}...</p>
         </div>
      );
   }

   if (error) {
      return (
         <Container className="text-center mt-5 pt-5">
            <Alert variant="danger" className="d-inline-block p-4 shadow-sm">
               <h4 className="fw-bold">Ops!</h4>
               <p>{error}</p>
               <Button variant="outline-dark" onClick={() => navigate("/")}>
                  Voltar para o início
               </Button>
            </Alert>
         </Container>
      );
   }

   // Se o visitante clicar no modo Batalha, ele poderá batalhar com os filmes do amigo
   if (isBattleMode) {
      return (
         <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg-page)" }}>
            <MovieBattle
               allMovies={movies}
               onExit={() => setIsBattleMode(false)}
            />
         </div>
      );
   }

   return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg-page)" }}>
         {/* Navbar com todos os filtros funcionando perfeitamente */}
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

         {/* Abas mobile */}
         <div className="d-md-none d-flex justify-content-center mb-4">
            <div className="bg-white p-1 rounded-pill shadow-sm border d-inline-flex">
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
            <div className="d-flex align-items-center gap-3 mb-4 border-bottom pb-3">
            {profileAvatar ? (
                <img 
                    src={profileAvatar} 
                    alt={profileName}
                    className="rounded-circle shadow-sm border border-2 border-light"
                    style={{ width: "60px", height: "60px", objectFit: "cover" }}
                />
            ) : (
                <div 
                    className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white shadow-sm"
                    style={{ width: "60px", height: "60px", fontSize: "1.5rem" }}
                >
                    {profileName.charAt(0).toUpperCase()}
                </div>
            )}
            <div className="flex-grow-1">
                <h2 className="fw-bold mb-0">Lista de @{profileName}</h2>
                <p className="text-muted mb-0">{movies.filter(m => m.status === "watched").length} filmes na coleção</p>
            </div>
            <Button variant="outline-primary" onClick={() => navigate("/")}>
                Criar a minha lista
            </Button>
            </div>

            {/* Dashboard só aparece na aba de assistidos e se não estiver buscando nada */}
            {!filters.searchTerm && filters.viewMode === "watched" && (
               <Dashboard movies={movies.filter(m => m.status === "watched")} />
            )}

            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
               <div className="d-flex align-items-center justify-content-between w-100 w-md-auto">
                  <h5 className="text-muted mb-0">
                     {filters.filteredMovies.length === 1
                        ? "Exibindo 1 filme"
                        : `Exibindo ${filters.filteredMovies.length} filmes`}
                  </h5>

                  {/* Abas Desktop */}
                  <ButtonGroup size="sm" className="d-none d-md-inline-flex shadow-sm ms-3">
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
               </div>

               {/* Filtros rápidos Mobile */}
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

            {filters.filteredMovies.length === 0 ? (
               <div className="text-center text-muted mt-5">
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

         {/* ─── Modais Essenciais ─── */}
         <MovieModal
            show={!!selectedMovie}
            movie={selectedMovie}
            onHide={() => setSelectedMovie(null)}
            isAdmin={false} // Visitante não pode editar/excluir
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
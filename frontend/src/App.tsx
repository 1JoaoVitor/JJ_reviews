import { useState, useEffect } from "react";
import { Container} from "react-bootstrap";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Dices, Plus, Star, Bookmark, Swords, ListPlus} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { MovieData } from "@/types";

// ─── Features ───
import { useAuth, LoginModal, ProfileModal, FriendsModal } from "@/features/auth";
import {
   MovieCard,
   MovieCardSkeleton,
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
import { useLists, CreateListModal } from "@/features/lists";
import { BottomNav } from "@/components/layout/BottomNav/BottomNav";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";
import { ConfirmModal } from "@/components/ui/ConfirmModal/ConfirmModal";

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
   const { session, username, avatarUrl, logout, updateUsername, loading: authLoading} = useAuth();
   const { movies, loading: moviesLoading, fetchMovies } = useMovies(session);

   const isPageLoading = authLoading || moviesLoading;

   // Scroll to top on mount (F5 / navegação)
   useEffect(() => {
      window.scrollTo(0, 0);
   }, []);

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
   const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
   const [showFriendsModal, setShowFriendsModal] = useState(false);
   const { lists, loading: listsLoading, createList } = useLists(session?.user.id);
   const [showCreateListModal, setShowCreateListModal] = useState(false);

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
         
         <Toaster 
            position="bottom-right" 
            toastOptions={{
               style: {
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
               },
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
            onStartBattle={() => setIsBattleMode(true)}
            onLoginClick={() => setShowLoginModal(true)}
            session={session}
            onLogout={() => setShowLogoutConfirm(true)}
            username={username}
            avatarUrl={avatarUrl}
            onProfileClick={() => setShowProfileModal(true)}
            showFilters={!!session} 
            showBattle={!!session}
            onFriendsClick={() => setShowFriendsModal(true)}
         />


         {session && (
            <div className={`d-md-none ${styles.mobileTabsWrapper}`}>
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
                     className={`${styles.mobileTab} ${filters.viewMode === "lists" ? styles.mobileTabActive : ""}`}
                     onClick={() => filters.setViewMode("lists")}
                  >
                     Listas
                  </button>
               </div>
            </div>
         )}
         

         <Container className="px-4 pb-5">
            {session && (
               <>
               {!isPageLoading && !filters.searchTerm && <Dashboard movies={movies} />}

               <div className={styles.subheader}>
                  <div className="d-flex align-items-center justify-content-between w-100 w-md-auto">
                     <span className={styles.movieCount}>
                        {isPageLoading
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
                           Minhas Listas
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

            {isPageLoading && movies.length === 0 ? (
               <div className={styles.loadingState}>
                  {[...Array(8)].map((_, i) => (
                     <MovieCardSkeleton key={i} />
                  ))}
               </div>
            ) : !session ? (
               <div className={styles.landingContainer}>
                  <div className={styles.heroSection}>
                     <h1 className={styles.heroTitle}>Sua jornada cinematográfica<br/>começa aqui.</h1>
                     <p className={styles.heroSubtitle}>
                        O JJ Reviews é a sua plataforma pessoal para avaliar filmes, montar sua Watchlist, descobrir seu próximo filme e muito mais!
                     </p>
                     <button
                        className={styles.heroBtn}
                        onClick={() => setShowLoginModal(true)}
                     >
                        Criar minha conta grátis
                     </button>
                  </div>

                  <div className={styles.featuresGrid}>
                     <div className={styles.featureCard}>
                        <div className={styles.featureIcon}><Star size={28} /></div>
                        <h3>Avalie e Critique</h3>
                        <p>Dê suas notas e escreva o seu veredito. Construa uma biblioteca visual com tudo o que você já assistiu.</p>
                     </div>
                     <div className={styles.featureCard}>
                        <div className={styles.featureIcon}><Bookmark size={28} /></div>
                        <h3>Sua Watchlist</h3>
                        <p>Nunca mais esqueça o nome de um filme. Salve para ver depois e use a Roleta quando não souber o que escolher.</p>
                     </div>
                     <div className={styles.featureCard}>
                        <div className={styles.featureIcon}><Swords size={28} /></div>
                        <h3>Modo Batalha</h3>
                        <p>Coloque seus filmes frente a frente num torneio mata-mata para definir o seu favorito de verdade.</p>
                     </div>
                  </div>
               </div>
            ) : filters.viewMode === "lists" ? (
               <div className={styles.listsContainer}>
                  <div className="d-flex justify-content-between align-items-center mb-4 mt-3">
                     <h4 className="m-0 text-white fw-bold">Minhas Listas</h4>
                     <button onClick={() => setShowCreateListModal(true)} style={{ background: 'var(--gold)', color: 'var(--bg-page)', border: 'none', padding: '0.5rem 1rem', borderRadius: '50rem', fontWeight: 600 }}>
                        <ListPlus size={18} className="me-2" />
                        Nova Lista
                     </button>
                  </div>

                  {listsLoading ? (
                     <div className="text-center py-5 text-muted">Carregando listas...</div>
                  ) : lists.length === 0 ? (
                     <div className="text-center py-5 text-muted">
                        Você ainda não criou nenhuma lista. Que tal começar agora?
                     </div>
                  ) : (
                     <div className="row g-3">
                        {lists.map((list) => (
                           <div key={list.id} className="col-12 col-md-6 col-lg-4">
                              <div className="p-4 rounded" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                                 <h5 style={{ color: 'var(--gold)', fontWeight: 700, marginBottom: '0.5rem' }}>{list.name}</h5>
                                 <p className="text-muted small mb-0 text-truncate">{list.description || "Sem descrição"}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            ) : filters.filteredMovies.length === 0 ? (
               <EmptyState 
                  title="Nenhum filme por aqui"
                  message={
                     filters.searchTerm
                        ? `Não encontrámos nenhum resultado para "${filters.searchTerm}".`
                        : "Você ainda não adicionou nenhum filme à sua lista. Que tal começar a sua jornada cinematográfica agora?"
                  }
                  actionText="Adicionar Filme"
                  onAction={() => {
                     setMovieToEdit(null);
                     setShowAddModal(true);
                  }}
               />
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
            onLogout={() => {
               setShowProfileModal(false);
               setShowLogoutConfirm(true);
            }}
         />

         {sharingMovie && <ShareCard ref={shareRef} movie={sharingMovie} />}

         {isSharing && <LoadingOverlay message="Gerando imagem..." />}

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

         <RouletteModal
            show={showRoulette}
            onHide={() => setShowRoulette(false)}
            watchlist={movies.filter((m) => m.status === "watchlist")}
            onMovieSelect={(movie) => {
               setShowRoulette(false);
               handleOpenModal(movie);
            }}
         />

         <FriendsModal 
            show={showFriendsModal} 
            onHide={() => setShowFriendsModal(false)} 
            session={session} 
         />

         <CreateListModal
            show={showCreateListModal}
            onHide={() => setShowCreateListModal(false)}
            onCreate={createList}
         />

       { /* ─── Navegação Mobile ─── */}
         <BottomNav
            session={session}
            avatarUrl={avatarUrl}
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
      </div>
   );
}


import { useState, useEffect, useRef } from "react";
import { Container} from "react-bootstrap";
import { Routes, Route, useNavigate, useSearchParams} from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { Dices, Plus, Star, Bookmark, Swords, ListPlus, Users, Share2, Layers} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { MovieData, CustomList } from "@/types";
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { usePushNotifications } from "@/hooks/usePushNotifications";

// ─── Features ───
import { useAuth, LoginModal, ProfileModal, FriendsModal, ResetPassword } from "@/features/auth";
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
import { ShareCard, ShareModal, useShare } from "@/features/share";
import { PublicProfile } from "@/features/publicProfile";
import { useLists, CreateListModal, ListDetails } from "@/features/lists";
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
         <Route path="/" element={<MainApp />} />
         <Route path="/perfil/:username" element={<PublicProfile />} />
         <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
   );
}

function MainApp() {

   const navigate = useNavigate();
   
   const { session, username, avatarUrl, logout, updateUsername, loading: authLoading} = useAuth();
   const { movies, loading: moviesLoading, fetchMovies } = useMovies(session);

   //ATIVA AS NOTIFICAÇÕES NATIVAS
   usePushNotifications(session?.user.id);

   const isPageLoading = authLoading || moviesLoading;

   const filters = useMovieFilters(movies);
   const { shareRef, sharingMovie, isSharing} = useShare();

   const [selectedMovie, setSelectedMovie] = useState<MovieData | null>(null);
   const [showModal, setShowModal] = useState(false);
   const [showAddModal, setShowAddModal] = useState(false);
   const [showShareModal, setShowShareModal] = useState(false);
   const [movieToShare, setMovieToShare] = useState<MovieData | null>(null);
   const [showLoginModal, setShowLoginModal] = useState(false);
   const [movieToEdit, setMovieToEdit] = useState<MovieData | null>(null);
   const [showRoulette, setShowRoulette] = useState(false);

   const [searchParams, setSearchParams] = useSearchParams();
   const isBattleMode = searchParams.get("modo") === "batalha";

   const [showProfileModal, setShowProfileModal] = useState(false);
   const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
   const [showFriendsModal, setShowFriendsModal] = useState(false);

   const { lists, loading: listsLoading, createList, fetchLists, 
      updateList, removeMovieFromList, addMovieToList } = useLists(session?.user.id);

   const [showCreateListModal, setShowCreateListModal] = useState(false);
   const [preselectedListId, setPreselectedListId] = useState<string>("");
   const [selectedList, setSelectedList] = useState<CustomList | null>(null);

   // Lê o ID do filme diretamente da URL
   const movieIdInUrl = searchParams.get("movie");
   const prevUrlMovieId = useRef<string | null>(null);

   useEffect(() => {
      window.scrollTo(0, 0);
   }, []);


   // ───  BOTÃO NATIVO DO ANDROID ───
   useEffect(() => {
      const setupCapacitorBackButton = async () => {
         // Fica escutando o botão físico/gesto de voltar do celular
         CapacitorApp.addListener('backButton', ({ canGoBack }) => {
            // canGoBack é true se o histórico (modais ou abas) tiver algo
            if (canGoBack) {
               window.history.back(); // Obedece à lógica da Web (fecha modal/muda aba)
            } else {
               CapacitorApp.exitApp(); // Se for a tela inicial limpa, fecha o aplicativo de verdade
            }
         });
      };

      setupCapacitorBackButton();

      // Limpeza de segurança
      return () => {
         CapacitorApp.removeAllListeners();
      };
   }, []);

   useEffect(() => {
      const setupDeepLinks = async () => {
         if (!Capacitor.isNativePlatform()) return;

         CapacitorApp.addListener('appUrlOpen', (event) => {
            const url = new URL(event.url);
            const movieIdFromDeepLink = url.searchParams.get("movie");
            
            if (movieIdFromDeepLink) {
               setSearchParams(prev => {
                  prev.set("movie", movieIdFromDeepLink);
                  return prev;
               });
            }
         });
      };

      setupDeepLinks();

      return () => {
         if (Capacitor.isNativePlatform()) {
            CapacitorApp.removeAllListeners();
         }
      };
   }, [setSearchParams]);

   // ─── LÓGICA PARA ABRIR LISTAS DIRETAMENTE PELA URL ───
   const listIdInUrl = searchParams.get("listId");
   
   useEffect(() => {
      if (listIdInUrl && !listsLoading && lists.length > 0) {
         const listToOpen = lists.find(l => l.id === listIdInUrl);
         if (listToOpen) {
            setSelectedList(listToOpen);
         }
      }
   }, [listIdInUrl, lists, listsLoading]);

   
   // ─── ESCUTA DA URL PARA O BOTÃO VOLTAR E F5 ───
   useEffect(() => {
      // Se a URL não mudou de verdade, ignora (Isso mata o atraso)
      if (movieIdInUrl === prevUrlMovieId.current) return;

      if (!movieIdInUrl) {
         // A URL limpou (o usuário apertou Voltar nativo)
         setShowModal(false);
         setTimeout(() => setSelectedMovie(null), 200);
      } else {
         // F5 da página ou link do WhatsApp: Busca o filme no perfil e abre
         const movieToOpen = movies.find(m => 
            (m.id && m.id.toString() === movieIdInUrl) || 
            (m.tmdb_id && m.tmdb_id.toString() === movieIdInUrl)
         );
         
         if (movieToOpen) {
            setSelectedMovie(movieToOpen);
            setShowModal(true);
         }
      }

      // Atualiza a memória
      prevUrlMovieId.current = movieIdInUrl;
   }, [movieIdInUrl, movies]);

   const handleOpenModal = (movie: MovieData) => {
      const targetId = movie.tmdb_id || movie.id;
      if (!targetId) return;

      // Abre a interface com zero atraso
      setSelectedMovie(movie);
      setShowModal(true);

      // Avisa a memória para ignorar a mudança da URL que vem a seguir (Zero piscada)
      prevUrlMovieId.current = targetId.toString();

      // Muda a URL em pano de fundo silenciosamente
      setSearchParams(prev => {
         prev.set("movie", targetId.toString());
         return prev;
      });
   };

   const handleCloseModal = () => {
      // Remove o filme da URL
      setSearchParams(prev => {
         prev.delete("movie");
         return prev;
      });
   };

   const handleDeleteMovie = async (movie: MovieData) => {
      try {
         //Apaga do perfil principal (tabela reviews)
         const { error } = await supabase
            .from("reviews")
            .delete()
            .eq("id", movie.id);
            
         if (error) throw error;

         // Identifica quais são as suas listas particulares
         const privateListIds = lists
            .filter(l => l.type === "private" || !l.type)
            .map(l => l.id);

         // Se tiver listas particulares, varre e apaga o filme delas também
         if (privateListIds.length > 0 && movie.tmdb_id) {
            const { error: listError } = await supabase
               .from("list_movies")
               .delete()
               .eq("tmdb_id", movie.tmdb_id)
               .in("list_id", privateListIds); // Apaga apenas se o list_id for privado
            
            if (listError) console.error("Erro ao limpar das listas particulares:", listError);
         }

         handleCloseModal();
         fetchMovies(); 
         fetchLists(); 
         
         toast.success("Filme removido do perfil e das listas particulares!");
      } catch (error) {
         toast.error("Erro ao excluir!");
         console.error(error);
      }
   };

   const handleEditMovie = (movie: MovieData) => {
      handleCloseModal();
      setMovieToEdit(movie);
      setShowAddModal(true);
      if (selectedList) {
         setPreselectedListId(selectedList.id);
      }
   };

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

   // ─── Lógica para separar os tipos de listas ───
   const privateLists = lists.filter(l => l.type === "private" || !l.type);
   const partialSharedLists = lists.filter(l => l.type === "partial_shared");
   const fullSharedLists = lists.filter(l => l.type === "full_shared");

   const renderListGroup = (title: string, groupLists: CustomList[], icon: React.ReactNode) => {
      if (groupLists.length === 0) return null;
      return (
         <div className="mb-5">
            <h5 className="mb-3 d-flex align-items-center gap-2" style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: '1.05rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
               {icon} {title}
            </h5>
            <div className="row g-3">
               {groupLists.map((list) => (
                  <div key={list.id} className="col-12 col-md-6 col-lg-4">
                     <div 
                        className="p-4 rounded h-100" 
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'border-color 0.2s, transform 0.2s' }}
                        onClick={() => setSelectedList(list)}
                        onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                        onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'translateY(0)' }}
                     >
                        <h5 style={{ color: 'var(--gold)', fontWeight: 700, marginBottom: '0.5rem', wordBreak: 'break-word' }}>{list.name}</h5>
                        <p className="text-muted small mb-0" style={{ wordBreak: 'break-word' }}>{list.description || "Sem descrição"}</p>
                        <p className="text-muted small mb-0 mt-2" style={{ fontWeight: 600 }}>{(list.movie_count ?? 0) === 1 ? "1 filme" : `${list.movie_count ?? 0} filmes`}</p>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      );
   };

   const setIsBattleMode = (active: boolean) => {
      setSearchParams(prev => {
         if (active) {
            prev.set("modo", "batalha");
         } else {
            prev.delete("modo");
         }
         return prev;
      });
   };

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
               {!isPageLoading && !filters.searchTerm &&
               <Dashboard 
                  movies={movies} 
                  
                  onFilterDirector={(director) => {
                     filters.setSearchTerm("");
                     filters.setOnlyNational(false);
                     filters.setOnlyOscar(false);
                     filters.setOnlyInternational(false);
                     filters.setSelectedGenre("");
                     
                     filters.setSelectedDirector(director);
                     window.scrollTo({ top: 500, behavior: 'smooth' });
                  }}
                  onFilterNonUS={() => {
                     filters.setSearchTerm("");
                     filters.setOnlyNational(false);
                     filters.setOnlyOscar(false);
                     filters.setSelectedGenre("");
                     filters.setSelectedDirector("");

                     filters.setOnlyInternational(true);
                     window.scrollTo({ top: 500, behavior: 'smooth' });
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

                        {/* Botão Global escondido quando estamos nas listas */}
                        {session && filters.viewMode !== "lists" && (
                           <button
                              className={styles.addBtn}
                              onClick={() => {
                                 setMovieToEdit(null);
                                 setPreselectedListId("");
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
               /* ─── LANDING PAGE ATUALIZADA ─── */
               <div className={styles.landingContainer}>
                  <div className={styles.heroSection}>
                     <h1 className={styles.heroTitle}>Sua jornada cinematográfica<br/>começa aqui.</h1>
                     <p className={styles.heroSubtitle}>
                        O JJ Reviews é a sua plataforma pessoal para avaliar filmes, montar sua Watchlist, criar listas com amigos e compartilhar suas opiniões com o mundo!
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
                        <p>Salve filmes para ver depois e use a Roleta quando não souber qual escolher para a noite.</p>
                     </div>
                     <div className={styles.featureCard}>
                        <div className={styles.featureIcon}><Users size={28} /></div>
                        <h3>Listas Compartilhadas</h3>
                        <p>Convide os seus amigos para listas colaborativas. Avaliem filmes em grupo e descubram a nota média da galera.</p>
                     </div>
                     <div className={styles.featureCard}>
                        <div className={styles.featureIcon}><Share2 size={28} /></div>
                        <h3>Compartilhe Opiniões</h3>
                        <p>Gere cards das suas avaliações para compartilhar facilmente nas suas redes sociais.</p>
                     </div>
                     <div className={styles.featureCard}>
                        <div className={styles.featureIcon}><Swords size={28} /></div>
                        <h3>Modo Batalha</h3>
                        <p>Coloque seus filmes frente a frente num torneio mata-mata para definir o seu favorito de verdade.</p>
                     </div>
                  </div>
               </div>
            ) : filters.viewMode === "lists" ? (
               selectedList ? (
                  <ListDetails
                     list={selectedList}
                     allMovies={movies}
                     currentUserId={session?.user.id}
                     onBack={() => setSelectedList(null)}
                     onListDeleted={() => {
                        setSelectedList(null);
                        fetchLists();
                     }}
                     onListUpdated={(updatedList) => {
                        setSelectedList(updatedList);
                        fetchLists();
                     }}
                     onUpdateList={updateList}
                     onRemoveMovie={removeMovieFromList}
                     onAddMovieClick={() => {
                        setMovieToEdit(null);
                        setPreselectedListId(selectedList.id);
                        setShowAddModal(true);
                     }}
                     onMovieClick={handleOpenModal}
                  />
               ) : (
                  <div className={styles.listsContainer}>
                     <div className="d-flex justify-content-between align-items-center mb-5 mt-3">
                        <h4 className="m-0 text-white fw-bold">Minhas Listas</h4>
                        <button onClick={() => setShowCreateListModal(true)} className={styles.createListBtn}>
                           <ListPlus size={18} className="me-2" />
                           Nova Lista
                        </button>
                     </div>

                     {listsLoading ? (
                        <div className="text-center py-5 text-muted">Carregando listas...</div>
                     ) : lists.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                           Você ainda não participa de nenhuma lista. Que tal começar agora?
                        </div>
                     ) : (
                        <div>
                           {renderListGroup("Listas Particulares", privateLists, <Bookmark size={18} />)}
                           {renderListGroup("Listas Colaborativas", partialSharedLists, <Users size={18} />)}
                           {renderListGroup("Listas Unificadas", fullSharedLists, <Layers size={18} />)}
                        </div>
                     )}
                  </div>
               )
            ) : filters.filteredMovies.length === 0 ? (
               <EmptyState 
                  title="Nenhum filme por aqui"
                  message={
                     filters.searchTerm
                        ? `Não encontramos nenhum resultado para "${filters.searchTerm}".`
                        : "Você ainda não adicionou nenhum filme à sua lista. Que tal começar a sua jornada cinematográfica agora?"
                  }
                  actionText="Adicionar Filme"
                  onAction={() => {
                     setMovieToEdit(null);
                     setPreselectedListId("");
                     setShowAddModal(true);
                  }}
               />
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
                           onClick={handleOpenModal}
                        />
                     ))}
                  </div>
               </>
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
            onShare={(movie) => {
               setMovieToShare(movie);
               setShowShareModal(true);
            }} 
         />

         <ShareModal 
            show={showShareModal}
            movie={movieToShare}
            onHide={() => {
               setShowShareModal(false);
               setMovieToShare(null);
            }}
         />

         <AddMovieModal
            show={showAddModal}
            onHide={() => {
               setShowAddModal(false);
               setPreselectedListId(""); 
            }}
            onSuccess={() => fetchMovies()}
            movieToEdit={movieToEdit}
            lists={lists}
            addMovieToList={addMovieToList}
            createList={createList}
            preselectedListId={preselectedListId}
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
            forceLogout={logout}
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

         <BottomNav
            session={session}
            avatarUrl={avatarUrl}
            onHomeClick={() => {
               navigate("/");
               window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onGamesClick={() => setIsBattleMode(true)} 
            onAddClick={() => {
               setMovieToEdit(null);
               setPreselectedListId("");
               setShowAddModal(true);
            }}
            onProfileClick={() => setShowProfileModal(true)}
            onLoginClick={() => setShowLoginModal(true)}
            onFriendsClick={() => setShowFriendsModal(true)}
         />
      </div>
   );
}


import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import axios from "axios";
import { Container, Button, ButtonGroup, Spinner } from "react-bootstrap";
import type { Session } from "@supabase/supabase-js";

import type {
   MovieData,
   TmdbCrew,
   TmdbCast,
   TmdbCountry,
   TmdbGenre,
} from "./types";
import { MovieCard } from "./components/movie-card";
import { MovieModal } from "./components/movie-modal";
import { AppNavbar } from "./components/nav-bar";
import { Dashboard } from "./components/dashboard";
import { AddMovieModal } from "./components/add-movie-modal";
import { LoginModal } from "./components/login-modal";
import { OSCAR_NOMINEES_IDS } from "./constants";

const regionNames = new Intl.DisplayNames(["pt-BR"], { type: "region" });

function App() {
   const [movies, setMovies] = useState<MovieData[]>([]);
   const [loading, setLoading] = useState(true);

   // Controle de Usuário (Admin)
   const [session, setSession] = useState<Session | null>(null);

   const [searchTerm, setSearchTerm] = useState("");
   const [onlyNational, setOnlyNational] = useState(false);
   const [onlyOscar, setOnlyOscar] = useState(false);
   const [sortOrder, setSortOrder] = useState("default");
   const [selectedGenre, setSelectedGenre] = useState("");
   const [showModal, setShowModal] = useState(false);
   const [selectedMovie, setSelectedMovie] = useState<MovieData | null>(null);

   // Modais de Ação
   const [showAddModal, setShowAddModal] = useState(false);
   const [showLoginModal, setShowLoginModal] = useState(false);
   const [movieToEdit, setMovieToEdit] = useState<MovieData | null>(null); // Guardar qual filme estamos editando

   // --- AUTENTICAÇÃO ---
   useEffect(() => {
      // Verifica se já está logado ao abrir o site
      supabase.auth.getSession().then(({ data: { session } }) => {
         setSession(session);
      });

      // Escuta mudanças (login/logout) em tempo real
      const {
         data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
         setSession(session);
      });

      return () => subscription.unsubscribe();
   }, []);

   const handleLogout = async () => {
      await supabase.auth.signOut();
   };

   const handleOpenModal = (movie: MovieData) => {
      setSelectedMovie(movie);
      setShowModal(true);
   };

   const handleCloseModal = () => {
      setShowModal(false);
      setSelectedMovie(null);
   };

   const fetchMovies = useCallback(async () => {
      setLoading(true);
      try {
         const { data: supabaseData, error } = await supabase
            .from("reviews")
            .select("*")
            .order("created_at", { ascending: false });

         if (error) throw error;
         if (!supabaseData) return;

         const fullMovies = await Promise.all(
            supabaseData.map(async (movie) => {
               try {
                  const tmdbResponse = await axios.get(
                     `https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=pt-BR&append_to_response=credits`,
                  );

                  const data = tmdbResponse.data;

                  const directors = data.credits?.crew
                     ?.filter((person: TmdbCrew) => person.job === "Director")
                     .map((d: TmdbCrew) => d.name)
                     .join(", ");

                  const cast = data.credits?.cast
                     ?.slice(0, 5)
                     .map((c: TmdbCast) => c.name);

                  const genres =
                     data.genres?.map((g: TmdbGenre) => g.name) || [];

                  const rawCountries = data.production_countries || [];

                  const translatedCountries = rawCountries.map(
                     (c: TmdbCountry) => {
                        try {
                           return regionNames.of(c.iso_3166_1);
                        } catch {
                           return c.name;
                        }
                     },
                  );

                  const isBr = rawCountries.some(
                     (c: TmdbCountry) => c.iso_3166_1 === "BR",
                  );

                  const isOscarNominee = OSCAR_NOMINEES_IDS.includes(
                     movie.tmdb_id,
                  );

                  return {
                     ...movie,
                     title: data.title,
                     poster_path: data.poster_path,
                     release_date: data.release_date,
                     overview: data.overview,
                     director: directors || "Desconhecido",
                     cast: cast || [],
                     countries: translatedCountries || [],
                     genres: genres,
                     isNational: isBr,
                     isOscar: isOscarNominee,
                  };
               } catch (err) {
                  console.error(`Erro TMDB ID ${movie.tmdb_id}`, err);
                  return movie;
               }
            }),
         );
         setMovies(fullMovies);
      } catch (error) {
         console.error("Erro geral:", error);
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      fetchMovies();
   }, [fetchMovies]);

   // --- AÇÕES DE ADMIN ---
   const handleDeleteMovie = async (movie: MovieData) => {
      try {
         const { error } = await supabase
            .from("reviews")
            .delete()
            .eq("id", movie.id);
         if (error) throw error;

         // Fecha o modal de detalhes e recarrega a lista
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

   const availableGenres = Array.from(
      new Set(movies.flatMap((m) => m.genres || [])),
   ).sort();

   const filteredMovies = movies
      .filter((movie) => {
         const searchLower = searchTerm.toLowerCase();
         const matchesSearch =
            !searchTerm ||
            (movie.title && movie.title.toLowerCase().includes(searchLower)) ||
            (movie.review &&
               movie.review.toLowerCase().includes(searchLower)) ||
            (movie.recommended &&
               movie.recommended.toLowerCase().includes(searchLower)) ||
            (movie.director &&
               movie.director.toLowerCase().includes(searchLower)) ||
            (movie.genres &&
               movie.genres.some((g) =>
                  g.toLowerCase().includes(searchLower),
               )) ||
            (movie.isOscar && "oscar".includes(searchLower));

         if (onlyNational && !movie.isNational) return false;
         if (onlyOscar && !movie.isOscar) return false;

         if (selectedGenre && !movie.genres?.includes(selectedGenre))
            return false;

         return matchesSearch;
      })
      .sort((a, b) => {
         if (sortOrder === "rating") return b.rating - a.rating;
         if (sortOrder === "date") {
            const dateA = new Date(a.release_date || "1900-01-01").getTime();
            const dateB = new Date(b.release_date || "1900-01-01").getTime();
            return dateB - dateA;
         }
         if (sortOrder === "alpha")
            return (a.title || "").localeCompare(b.title || "");
         return 0;
      });

   return (
      <div className="bg-light" style={{ minHeight: "100vh" }}>
         <AppNavbar
            onlyNational={onlyNational}
            setOnlyNational={setOnlyNational}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onlyOscar={onlyOscar}
            setOnlyOscar={setOnlyOscar}
            availableGenres={availableGenres}
            selectedGenre={selectedGenre}
            setSelectedGenre={setSelectedGenre}
         />

         <Container className="px-4 pb-5">
            {!loading && !searchTerm && !onlyNational && (
               <Dashboard movies={movies} />
            )}

            <div className="d-flex justify-content-between align-items-center mb-4">
               <div className="d-flex align-items-center gap-3">
                  <h5 className="text-muted mb-0">
                     {loading
                        ? "Carregando..."
                        : filteredMovies.length === movies.length
                          ? `Todos os ${movies.length} filmes`
                          : `Exibindo ${filteredMovies.length} filmes`}
                  </h5>

                  {/* BOTÃO ADICIONAR (Só aparece se tiver sessão/login) */}
                  {session && (
                     <Button
                        variant="primary"
                        size="sm"
                        className="fw-bold shadow-sm"
                        onClick={() => {
                           setMovieToEdit(null); // Garante que é um NOVO filme
                           setShowAddModal(true);
                        }}
                     >
                        + Adicionar Filme
                     </Button>
                  )}
               </div>

               <ButtonGroup size="sm" className="d-md-none">
                  <Button
                     variant={!onlyNational ? "secondary" : "outline-secondary"}
                     onClick={() => setOnlyNational(false)}
                  >
                     Todos
                  </Button>
                  <Button
                     variant={onlyNational ? "success" : "outline-success"}
                     onClick={() => setOnlyNational(true)}
                  >
                     Nacionais
                  </Button>
               </ButtonGroup>
            </div>

            {loading ? (
               <div className="text-center mt-5">
                  <Spinner animation="border" role="status" />
                  <p className="mt-2">Carregando...</p>
               </div>
            ) : (
               <div className="movie-grid">
                  {filteredMovies.map((movie) => (
                     <MovieCard
                        key={movie.id}
                        movie={movie}
                        onClick={handleOpenModal}
                     />
                  ))}
               </div>
            )}
         </Container>

         {/* --- RODAPÉ COM LOGIN --- */}
         <footer className="text-center py-4 mt-5 bg-white border-top">
            <Container>
               <div className="mb-2 text-muted small">
                  Desenvolvido por <strong>João Vitor E. Souza</strong>
               </div>
               <div className="mb-3">
                  <a
                     href="https://github.com/1JoaoVitor"
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-decoration-none text-secondary me-3"
                  >
                     <i className="bi bi-github"></i> GitHub
                  </a>
                  <a
                     href="https://www.linkedin.com/in/joão-vitor-evangelista-de-souza-a0954526b"
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-decoration-none text-secondary"
                  >
                     LinkedIn
                  </a>
               </div>

               {/* Botão de Login */}
               {session ? (
                  <div className="small">
                     <span className="me-2 text-success">
                        ● Logado como Admin
                     </span>
                     <button
                        onClick={handleLogout}
                        className="btn btn-link btn-sm text-danger p-0"
                        style={{ textDecoration: "none" }}
                     >
                        Sair
                     </button>
                  </div>
               ) : (
                  <button
                     onClick={() => setShowLoginModal(true)}
                     className="btn btn-link btn-sm text-muted p-0 opacity-50"
                     style={{ textDecoration: "none", fontSize: "0.8rem" }}
                  >
                     Admin
                  </button>
               )}
            </Container>
         </footer>

         {/* --- MODAIS --- */}

         {/* Detalhes (Recebe isAdmin para saber se mostra os botões) */}
         <MovieModal
            show={showModal}
            movie={selectedMovie}
            onHide={handleCloseModal}
            isAdmin={!!session} // Transforma objeto em booleano (true se existir sessão)
            onEdit={handleEditMovie}
            onDelete={handleDeleteMovie}
         />

         {/* Adicionar/Editar (Recebe movieToEdit para saber se preenche os campos) */}
         <AddMovieModal
            show={showAddModal}
            onHide={() => setShowAddModal(false)}
            onSuccess={() => fetchMovies()}
            movieToEdit={movieToEdit}
         />

         {/* Login */}
         <LoginModal
            show={showLoginModal}
            onHide={() => setShowLoginModal(false)}
         />
      </div>
   );
}

export default App;

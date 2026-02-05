import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import axios from "axios";
import { Container, Button, ButtonGroup, Spinner } from "react-bootstrap";
import type { MovieData, TmdbCrew, TmdbCast, TmdbCountry } from "./types";
import { MovieCard } from "./components/movie-card";
import { MovieModal } from "./components/movie-modal";
import { AppNavbar } from "./components/nav-bar";
import { Dashboard } from "./components/dashboard.tsx";

const regionNames = new Intl.DisplayNames(["pt-BR"], { type: "region" });

function App() {
   const [movies, setMovies] = useState<MovieData[]>([]);
   const [loading, setLoading] = useState(true);

   // Estados de Controle
   const [searchTerm, setSearchTerm] = useState("");
   const [onlyNational, setOnlyNational] = useState(false);
   const [sortOrder, setSortOrder] = useState("default");

   const [showModal, setShowModal] = useState(false);
   const [selectedMovie, setSelectedMovie] = useState<MovieData | null>(null);

   // Funções do Modal
   const handleOpenModal = (movie: MovieData) => {
      setSelectedMovie(movie);
      setShowModal(true);
   };

   const handleCloseModal = () => {
      setShowModal(false);
      setSelectedMovie(null);
   };

   // --- SOLUÇÃO DO AVISO useEffect ---
   // A função fetchMovies agora é definida DENTRO do useEffect.
   // Isso garante que ela não tenha dependências faltando.
   useEffect(() => {
      const fetchMovies = async () => {
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
                        ?.filter(
                           (person: TmdbCrew) => person.job === "Director",
                        )
                        .map((d: TmdbCrew) => d.name)
                        .join(", ");

                     const cast = data.credits?.cast
                        ?.slice(0, 5)
                        .map((c: TmdbCast) => c.name);

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

                     return {
                        ...movie,
                        title: data.title,
                        poster_path: data.poster_path,
                        release_date: data.release_date,
                        overview: data.overview,
                        director: directors || "Desconhecido",
                        cast: cast || [],
                        countries: translatedCountries || [],
                        isNational: isBr,
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
      };

      fetchMovies();
   }, []); // Array vazio = roda apenas uma vez ao montar a tela

   // Lógica de Filtro e Ordenação
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
               movie.director.toLowerCase().includes(searchLower));

         if (onlyNational && !movie.isNational) return false;

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
         return 0; // default
      });

   return (
      <div className="bg-light" style={{ minHeight: "100vh" }}>
         {/* Navbar Modularizada */}
         <AppNavbar
            onlyNational={onlyNational}
            setOnlyNational={setOnlyNational}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
         />

         <Container className="px-4 pb-5">
            {/* --- Painel de Estatísticas --- */}
            {/* Só mostra se não estiver carregando e se não tiver busca ativa (para mostrar estatísticas gerais) */}
            {!loading && !searchTerm && !onlyNational && (
               <Dashboard movies={movies} />
            )}

            <div className="d-flex justify-content-between align-items-center mb-4">
               <h5 className="text-muted">
                  {loading
                     ? "Carregando..."
                     : filteredMovies.length === movies.length
                       ? `Todos os ${movies.length} filmes`
                       : `Exibindo ${filteredMovies.length} filmes`}
               </h5>

               {/* Botões Mobile (mantidos aqui por layout, ou poderia ir para um sub-componente) */}
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

         {/* Modal Modularizado */}
         <MovieModal
            show={showModal}
            movie={selectedMovie}
            onHide={handleCloseModal}
         />
      </div>
   );
}

export default App;

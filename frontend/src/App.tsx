import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import axios from "axios";
import { Container, Card, Row, Col, Badge, Spinner } from "react-bootstrap";

interface MovieData {
   id: number;
   tmdb_id: number;
   rating: number;
   review: string;
   recommended: string; // <--- MUDOU DE BOOLEAN PARA STRING
   title?: string;
   poster_path?: string;
   release_date?: string;
}

function App() {
   const [movies, setMovies] = useState<MovieData[]>([]);
   const [loading, setLoading] = useState(true);

   // Função para escolher a cor da Badge baseada no texto do seu Excel
   const getBadgeColor = (text: string) => {
      if (!text) return "secondary";
      const t = text.toLowerCase();

      // Adapte essas palavras conforme o que está no seu Excel!
      if (t.includes("super") || t.includes("muito")) return "success"; // Verde escuro
      if (t.includes("sim") || t.includes("recomendamos")) return "primary"; // Azul
      if (t.includes("talvez") || t.includes("neutro")) return "warning"; // Amarelo
      if (t.includes("não") || t.includes("nunca")) return "danger"; // Vermelho

      return "secondary"; // Cinza (padrão)
   };

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
                     `https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${import.meta.env.VITE_TMDB_API_KEY}&language=pt-BR`,
                  );
                  return {
                     ...movie,
                     title: tmdbResponse.data.title,
                     poster_path: tmdbResponse.data.poster_path,
                     release_date: tmdbResponse.data.release_date,
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

   useEffect(() => {
      fetchMovies();
   }, []);

   return (
      <Container className="py-5 bg-light" style={{ minHeight: "100vh" }}>
         <div className="d-flex justify-content-between align-items-center mb-5">
            <h1 className="fw-bold">🎬 Meus Reviews</h1>
            <Badge bg="dark" className="p-2">
               {movies.length} Filmes
            </Badge>
         </div>

         {loading ? (
            <div className="text-center mt-5">
               <Spinner animation="border" role="status" />
               <p className="mt-2">Carregando filmes...</p>
            </div>
         ) : (
            <Row xs={1} md={2} lg={4} className="g-4">
               {movies.map((movie) => (
                  <Col key={movie.id}>
                     <Card className="h-100 shadow border-0 overflow-hidden">
                        <div
                           style={{
                              height: "350px",
                              overflow: "hidden",
                              backgroundColor: "#222",
                           }}
                        >
                           {movie.poster_path ? (
                              <Card.Img
                                 variant="top"
                                 src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                                 style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                 }}
                              />
                           ) : (
                              <div className="d-flex align-items-center justify-content-center h-100 text-white">
                                 Sem Capa
                              </div>
                           )}
                        </div>

                        <Card.Body className="d-flex flex-column">
                           <Card.Title
                              className="fs-5 fw-bold text-truncate"
                              title={movie.title}
                           >
                              {movie.title || `Filme #${movie.tmdb_id}`}
                           </Card.Title>
                           <p className="text-muted small mb-2">
                              {movie.release_date
                                 ? movie.release_date.split("-")[0]
                                 : ""}
                           </p>

                           <Card.Text className="flex-grow-1 small text-secondary">
                              {movie.review ? (
                                 movie.review.length > 80 ? (
                                    movie.review.substring(0, 80) + "..."
                                 ) : (
                                    movie.review
                                 )
                              ) : (
                                 <em className="text-muted">
                                    Sem comentários.
                                 </em>
                              )}
                           </Card.Text>

                           <hr className="my-2" />

                           <div className="d-flex justify-content-between align-items-center">
                              <span className="fw-bold fs-5">
                                 ⭐ {movie.rating}
                              </span>

                              {/* Badge Dinâmica */}
                              <Badge bg={getBadgeColor(movie.recommended)}>
                                 {movie.recommended || "Avaliado"}
                              </Badge>
                           </div>
                        </Card.Body>
                     </Card>
                  </Col>
               ))}
            </Row>
         )}
      </Container>
   );
}

export default App;

import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import axios from "axios";
import {
   Container,
   Card,
   Row,
   Col,
   Badge,
   Spinner,
   Navbar,
   Form,
   InputGroup,
   Modal,
   Button,
   ButtonGroup,
} from "react-bootstrap";

interface TmdbCrew {
   job: string;
   name: string;
}

interface TmdbCast {
   name: string;
}

interface TmdbCountry {
   iso_3166_1: string; // O código do país (ex: "BR", "US")
   name: string;
}

interface MovieData {
   id: number;
   tmdb_id: number;
   rating: number;
   review: string;
   recommended: string;
   title?: string;
   poster_path?: string;
   release_date?: string;
   overview?: string;
   director?: string;
   cast?: string[];
   countries?: string[];
   isNational?: boolean;
}

function App() {
   const [movies, setMovies] = useState<MovieData[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchTerm, setSearchTerm] = useState("");
   const [onlyNational, setOnlyNational] = useState(false);
   const [showModal, setShowModal] = useState(false);
   const [selectedMovie, setSelectedMovie] = useState<MovieData | null>(null);

   // Ferramenta nativa do navegador para traduzir códigos de países (US -> Estados Unidos)
   const regionNames = new Intl.DisplayNames(["pt-BR"], { type: "region" });

   const getBadgeStyle = (text: string) => {
      if (!text) return { bg: "#6c757d", color: "white" };
      const t = text.toLowerCase().trim();
      if (t.includes("assista com certeza"))
         return { bg: "#198754", color: "white" };
      if (t.includes("vale a pena")) return { bg: "#20c997", color: "black" };
      if (t.includes("tem filmes melhores") || t.includes("legal"))
         return { bg: "#ffc107", color: "black" };
      if (t.includes("não tão bom")) return { bg: "#fd7e14", color: "white" };
      if (t.includes("não perca seu tempo") || t.includes("nunca"))
         return { bg: "#dc3545", color: "white" };
      return { bg: "#6c757d", color: "white" };
   };

   const handleOpenModal = (movie: MovieData) => {
      setSelectedMovie(movie);
      setShowModal(true);
   };

   const handleCloseModal = () => {
      setShowModal(false);
      setSelectedMovie(null);
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

                  const rawCountries = data.production_countries || [];

                  // Traduz US -> Estados Unidos, BR -> Brasil
                  const translatedCountries = rawCountries.map(
                     (c: TmdbCountry) => {
                        try {
                           return regionNames.of(c.iso_3166_1);
                        } catch {
                           return c.name; // Se falhar a tradução, usa o nome original
                        }
                     },
                  );

                  // Verifica se é Brasil olhando o CÓDIGO "BR"
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

   useEffect(() => {
      fetchMovies();
   }, []);

   const filteredMovies = movies.filter((movie) => {
      // 1. Filtro de Texto
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
         !searchTerm ||
         (movie.title && movie.title.toLowerCase().includes(searchLower)) ||
         (movie.review && movie.review.toLowerCase().includes(searchLower)) ||
         (movie.recommended &&
            movie.recommended.toLowerCase().includes(searchLower)) ||
         (movie.director && movie.director.toLowerCase().includes(searchLower));

      // 2. Filtro Nacional
      if (onlyNational && !movie.isNational) return false;

      return matchesSearch;
   });

   return (
      <div className="bg-light" style={{ minHeight: "100vh" }}>
         <Navbar
            bg="dark"
            variant="dark"
            expand="lg"
            sticky="top"
            className="mb-4 shadow-sm px-3"
         >
            <Container fluid>
               <Navbar.Brand href="#" className="fw-bold fs-3">
                  JJ Reviews
               </Navbar.Brand>

               <div className="d-flex align-items-center gap-3 w-100 justify-content-end">
                  <ButtonGroup className="d-none d-md-flex me-2">
                     <Button
                        variant={
                           !onlyNational ? "secondary" : "outline-secondary"
                        }
                        onClick={() => setOnlyNational(false)}
                        className="fw-bold"
                     >
                        Todos os Filmes
                     </Button>
                     <Button
                        variant={onlyNational ? "success" : "outline-success"}
                        onClick={() => setOnlyNational(true)}
                        className="fw-bold"
                     >
                        Nacionais
                     </Button>
                  </ButtonGroup>
                  <Form
                     className="d-flex"
                     style={{ maxWidth: "400px", width: "100%" }}
                  >
                     <InputGroup>
                        <InputGroup.Text id="search-icon">🔎</InputGroup.Text>
                        <Form.Control
                           type="search"
                           placeholder="Filme, diretor, opinião..."
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                        />
                     </InputGroup>
                  </Form>
               </div>
            </Container>
         </Navbar>

         <Container fluid className="px-4 pb-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
               <h5 className="text-muted">
                  {loading
                     ? "Carregando..."
                     : filteredMovies.length === movies.length
                       ? `Todos os ${movies.length} filmes`
                       : `Exibindo ${filteredMovies.length} filmes`}
               </h5>

               <ButtonGroup size="sm" className="d-md-none">
                  <Button
                     variant={!onlyNational ? "secondary" : "outline-secondary"}
                     onClick={() => setOnlyNational(false)}
                  >
                     🌎
                  </Button>
                  <Button
                     variant={onlyNational ? "success" : "outline-success"}
                     onClick={() => setOnlyNational(true)}
                  >
                     🇧🇷
                  </Button>
               </ButtonGroup>
            </div>

            {loading ? (
               <div className="text-center mt-5">
                  <Spinner animation="border" role="status" />
                  <p className="mt-2">Preparando a pipoca...</p>
               </div>
            ) : (
               <div className="movie-grid">
                  {filteredMovies.map((movie) => {
                     const badgeStyle = getBadgeStyle(movie.recommended);

                     return (
                        <Card
                           key={movie.id}
                           className="h-100 shadow border-0 overflow-hidden movie-card"
                           style={{
                              cursor: "pointer",
                              transition: "transform 0.2s",
                           }}
                           onClick={() => handleOpenModal(movie)}
                        >
                           <div
                              style={{
                                 height: "400px",
                                 overflow: "hidden",
                                 backgroundColor: "#222",
                                 position: "relative",
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
                              <div
                                 style={{
                                    position: "absolute",
                                    top: "10px",
                                    right: "10px",
                                    background: "rgba(0,0,0,0.8)",
                                    color: "#ffc107",
                                    padding: "5px 10px",
                                    borderRadius: "8px",
                                    fontWeight: "bold",
                                 }}
                              >
                                 ⭐ {movie.rating}
                              </div>
                           </div>

                           <Card.Body className="d-flex flex-column p-3">
                              <Card.Title
                                 className="fs-6 fw-bold text-truncate"
                                 title={movie.title}
                              >
                                 {movie.title || `Filme #${movie.tmdb_id}`}
                              </Card.Title>

                              <p className="text-muted small mb-1 text-truncate">
                                 🎬 {movie.director}
                              </p>
                              <p className="text-muted small mb-2">
                                 📅{" "}
                                 {movie.release_date
                                    ? movie.release_date.split("-")[0]
                                    : ""}
                                 {movie.isNational && (
                                    <span
                                       className="ms-2"
                                       title="Filme Nacional"
                                    >
                                       🇧🇷
                                    </span>
                                 )}
                              </p>

                              <hr className="my-2" />

                              <div className="mt-auto text-center">
                                 <span
                                    className="badge rounded-pill w-100 py-2"
                                    style={{
                                       backgroundColor: badgeStyle.bg,
                                       color: badgeStyle.color,
                                       fontWeight: "500",
                                    }}
                                 >
                                    {movie.recommended || "Avaliado"}
                                 </span>
                              </div>
                           </Card.Body>
                        </Card>
                     );
                  })}
               </div>
            )}
         </Container>

         <Modal show={showModal} onHide={handleCloseModal} size="xl" centered>
            {selectedMovie && (
               <>
                  <Modal.Header closeButton className="border-0 pb-0">
                     <Modal.Title className="fw-bold display-6">
                        {selectedMovie.title}
                     </Modal.Title>
                  </Modal.Header>
                  <Modal.Body className="pt-2">
                     <p className="text-muted mb-4">
                        {selectedMovie.director} •{" "}
                        {selectedMovie.release_date?.split("-")[0]} •{" "}
                        {selectedMovie.countries?.join(", ")}
                     </p>

                     <Row>
                        <Col md={4} className="mb-3">
                           {selectedMovie.poster_path ? (
                              <img
                                 src={`https://image.tmdb.org/t/p/w500${selectedMovie.poster_path}`}
                                 alt={selectedMovie.title}
                                 className="img-fluid rounded shadow w-100"
                              />
                           ) : (
                              <div className="bg-secondary text-white p-5 rounded text-center">
                                 Sem Imagem
                              </div>
                           )}
                        </Col>
                        <Col md={8}>
                           <div className="d-flex align-items-center gap-3 mb-4">
                              <div
                                 className="d-flex align-items-center justify-content-center shadow-sm"
                                 style={{
                                    backgroundColor: "#ffc107",
                                    color: "#000",
                                    width: "80px",
                                    height: "80px",
                                    borderRadius: "15px",
                                    fontWeight: "bold",
                                    fontSize: "1.8rem",
                                    border: "2px solid #e0a800",
                                 }}
                              >
                                 {selectedMovie.rating}
                              </div>
                              <div>
                                 <h5 className="mb-0 fw-bold">Sua Avaliação</h5>
                                 <small className="text-muted">
                                    Escala de 0 a 10
                                 </small>
                              </div>

                              <div className="ms-auto">
                                 <span
                                    className="badge rounded-pill px-4 py-2"
                                    style={{
                                       backgroundColor: getBadgeStyle(
                                          selectedMovie.recommended,
                                       ).bg,
                                       color: getBadgeStyle(
                                          selectedMovie.recommended,
                                       ).color,
                                       fontSize: "1rem",
                                    }}
                                 >
                                    {selectedMovie.recommended}
                                 </span>
                              </div>
                           </div>

                           <div className="mb-4">
                              <h5 className="fw-bold border-bottom pb-2">
                                 O que você achou:
                              </h5>
                              <p
                                 className="fs-5"
                                 style={{
                                    whiteSpace: "pre-line",
                                    lineHeight: "1.6",
                                 }}
                              >
                                 "
                                 {selectedMovie.review ||
                                    "Sem análise detalhada."}
                                 "
                              </p>
                           </div>

                           {selectedMovie.cast &&
                              selectedMovie.cast.length > 0 && (
                                 <div className="mb-4">
                                    <h6 className="fw-bold text-muted text-uppercase small">
                                       Elenco Principal
                                    </h6>
                                    <div className="d-flex flex-wrap gap-2">
                                       {selectedMovie.cast.map((actor, idx) => (
                                          <Badge
                                             key={idx}
                                             bg="light"
                                             text="dark"
                                             className="border"
                                          >
                                             {actor}
                                          </Badge>
                                       ))}
                                    </div>
                                 </div>
                              )}

                           {selectedMovie.overview && (
                              <div className="p-3 bg-light rounded border mt-auto">
                                 <small className="text-muted fw-bold text-uppercase">
                                    Sinopse (TMDB)
                                 </small>
                                 <p className="small text-secondary mb-0 mt-1">
                                    {selectedMovie.overview}
                                 </p>
                              </div>
                           )}
                        </Col>
                     </Row>
                  </Modal.Body>
                  <Modal.Footer className="border-0">
                     <Button variant="secondary" onClick={handleCloseModal}>
                        Fechar
                     </Button>
                  </Modal.Footer>
               </>
            )}
         </Modal>
      </div>
   );
}

export default App;

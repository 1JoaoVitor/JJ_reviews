import { Card, Row, Col } from "react-bootstrap";
import type { MovieData } from "../types";

interface DashboardProps {
   movies: MovieData[];
}

export function Dashboard({ movies }: DashboardProps) {
   if (movies.length === 0) return null;

   const totalMovies = movies.length;

   const totalRating = movies.reduce((acc, movie) => acc + movie.rating, 0);
   const averageRating = (totalRating / totalMovies).toFixed(1);

   // Filmes fora dos EUA
   const nonUSCount = movies.filter(
      (m) => !m.countries?.includes("Estados Unidos"),
   ).length;
   const nonUSPercentage = ((nonUSCount / totalMovies) * 100).toFixed(0);

   // Diretor Mais Assistido
   const directorCounts: Record<string, number> = {};

   movies.forEach((movie) => {
      // Pegam só o primeiro diretor para simplificar
      const mainDirector =
         movie.director?.split(",")[0].trim() || "Desconhecido";
      if (mainDirector !== "Desconhecido") {
         directorCounts[mainDirector] = (directorCounts[mainDirector] || 0) + 1;
      }
   });

   // Descobre qual diretor tem o maior número
   let topDirector = "-";
   let maxCount = 0;

   Object.entries(directorCounts).forEach(([director, count]) => {
      if (count > maxCount) {
         topDirector = director;
         maxCount = count;
      }
   });

   return (
      <div className="mb-5">
         <h5 className="text-muted mb-3">Resumo</h5>
         <Row xs={2} md={4} className="g-3">
            {/* Card 1: Total */}
            <Col>
               <Card
                  className="h-100 border-0 shadow-sm text-center py-3"
                  style={{ backgroundColor: "#e9ecef" }}
               >
                  <h3 className="fw-bold mb-0">{totalMovies}</h3>
                  <small className="text-muted">Filmes Assistidos</small>
               </Card>
            </Col>

            {/* Card 2: Média */}
            <Col>
               <Card
                  className="h-100 border-0 shadow-sm text-center py-3"
                  style={{ backgroundColor: "#fff3cd" }}
               >
                  <h3
                     className="fw-bold mb-0"
                     style={{ textShadow: "1px 1px 0 #dac17c" }}
                  >
                     {averageRating}
                  </h3>
                  <small className="text-muted">Média Geral</small>
               </Card>
            </Col>

            {/* Card 3: Não EUA */}
            <Col>
               <Card
                  className="h-100 border-0 shadow-sm text-center py-3"
                  style={{ backgroundColor: "#d1e7dd" }}
               >
                  <h3 className="fw-bold mb-0">{nonUSCount}</h3>
                  <small className="text-muted">
                     Fora dos EUA ({nonUSPercentage}%)
                  </small>
               </Card>
            </Col>

            {/* Card 4: Top Diretor */}
            <Col>
               <Card
                  className="h-100 border-0 shadow-sm text-center py-3"
                  style={{ backgroundColor: "#cfe2ff" }}
               >
                  <div className="d-flex align-items-center justify-content-center h-100 px-2">
                     <div>
                        <h6
                           className="fw-bold mb-1 text-truncate"
                           style={{ maxWidth: "150px", margin: "0 auto" }}
                        >
                           {maxCount > 1 ? topDirector : "Vários"}
                        </h6>
                        <small className="text-muted">
                           {maxCount > 1
                              ? `${maxCount} filmes`
                              : "Diretor Favorito"}
                        </small>
                     </div>
                  </div>
               </Card>
            </Col>
         </Row>
      </div>
   );
}

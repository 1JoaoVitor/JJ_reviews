import { Card, Row, Col } from "react-bootstrap";
import type { MovieData } from "@/types";
import styles from "./Dashboard.module.css";

interface DashboardProps {
   movies: MovieData[];
}

export function Dashboard({ movies }: DashboardProps) {
   if (movies.length === 0) return null;

   const ratedMovies = movies.filter(
      (m) => m.rating !== null && m.rating !== undefined,
   );

   const totalMovies = ratedMovies.length;

   const totalRating = ratedMovies.reduce(
      (acc, movie) => acc + (movie.rating || 0),
      0,
   );

   const averageRating =
      ratedMovies.length > 0
         ? (totalRating / ratedMovies.length).toFixed(1)
         : "0.0";

   const nonUSCount = movies.filter(
      (m) => !m.countries?.includes("Estados Unidos"),
   ).length;

   const nonUSPercentage = ((nonUSCount / totalMovies) * 100).toFixed(0);

   const directorCounts: Record<string, number> = {};
   movies.forEach((movie) => {
      const mainDirector =
         movie.director?.split(",")[0].trim() || "Desconhecido";
      if (mainDirector !== "Desconhecido") {
         directorCounts[mainDirector] = (directorCounts[mainDirector] || 0) + 1;
      }
   });

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
            <Col>
               <Card className={`h-100 border-0 shadow-sm ${styles.statCard} ${styles.statCardTotal}`}>
                  <h3 className="fw-bold mb-0">{totalMovies}</h3>
                  <small className="text-muted">Filmes Assistidos</small>
               </Card>
            </Col>

            <Col>
               <Card className={`h-100 border-0 shadow-sm ${styles.statCard} ${styles.statCardAverage}`}>
                  <h3 className={`fw-bold mb-0 ${styles.averageValue}`}>
                     {averageRating}
                  </h3>
                  <small className="text-muted">Média Geral</small>
               </Card>
            </Col>

            <Col>
               <Card className={`h-100 border-0 shadow-sm ${styles.statCard} ${styles.statCardInternational}`}>
                  <h3 className="fw-bold mb-0">{nonUSCount}</h3>
                  <small className="text-muted">
                     Fora dos EUA ({nonUSPercentage}%)
                  </small>
               </Card>
            </Col>

            <Col>
               <Card className={`h-100 border-0 shadow-sm ${styles.statCard} ${styles.statCardDirector}`}>
                  <div className="d-flex align-items-center justify-content-center h-100 px-2">
                     <div>
                        <h6 className={`fw-bold mb-1 text-truncate ${styles.directorName}`}>
                           {maxCount > 1 ? topDirector : "Vários"}
                        </h6>
                        <small className="text-muted">
                           {maxCount > 1 ? `${maxCount} filmes` : "Diretor Favorito"}
                        </small>
                     </div>
                  </div>
               </Card>
            </Col>
         </Row>
      </div>
   );
}

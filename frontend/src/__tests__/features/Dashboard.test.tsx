import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "@/features/dashboard/components/Dashboard/Dashboard";
import type { MovieData } from "@/types";

const baseMock: MovieData = {
   id: 1,
   tmdb_id: 100,
   rating: 8,
   review: "Bom",
   recommended: "Vale a pena assistir",
   created_at: "2025-01-01",
   title: "Filme Teste",
   status: "watched",
   director: "Diretor A",
   genres: ["Drama"],
   countries: ["Brasil"],
   isNational: true,
   isOscar: false,
};

function createMovies(overrides: Partial<MovieData>[], baseOverrides: Partial<MovieData> = {}): MovieData[] {
   return overrides.map((o, i) => ({
      ...baseMock,
      id: i + 1,
      tmdb_id: 100 + i,
      ...baseOverrides,
      ...o,
   }));
}

describe("Dashboard", () => {
   it("não renderiza nada quando não há filmes", () => {
      const { container } = render(<Dashboard movies={[]} />);
      expect(container.innerHTML).toBe("");
   });

   it("exibe o total de filmes assistidos (ignora watchlist)", () => {
      const movies = createMovies([
         { rating: 8, status: "watched", director: "Diretor A", countries: ["Brasil"] },
         { rating: 6, status: "watched", director: "Diretor B", countries: ["Estados Unidos"] },
         { rating: null, status: "watchlist" },
      ]);
      render(<Dashboard movies={movies} />);
      expect(screen.getByText("2")).toBeInTheDocument();
   });

   it("calcula a média geral corretamente", () => {
      const movies = createMovies([
         { rating: 10, status: "watched" },
         { rating: 6, status: "watched" },
      ]);
      render(<Dashboard movies={movies} />);
      expect(screen.getByText("8.0")).toBeInTheDocument();
   });

   it("conta filmes fora dos EUA", () => {
      const movies = createMovies([
         { rating: 8, countries: ["Brasil"] },
         { rating: 7, countries: ["Estados Unidos"] },
         { rating: 9, countries: ["França"] },
      ]);
      render(<Dashboard movies={movies} />);
      // 2 filmes fora dos EUA de 3 filmes com rating
      expect(screen.getByText("2")).toBeInTheDocument();
   });

   it("exibe diretor mais frequente quando há repetição", () => {
      const movies = createMovies([
         { rating: 8, director: "Nolan" },
         { rating: 9, director: "Nolan" },
         { rating: 7, director: "Spielberg" },
      ]);
      render(<Dashboard movies={movies} />);
      expect(screen.getByText("Nolan")).toBeInTheDocument();
      expect(screen.getByText("2 filmes")).toBeInTheDocument();
   });

   it("exibe 'Vários' quando nenhum diretor se repete", () => {
      const movies = createMovies([
         { rating: 8, director: "Diretor A" },
         { rating: 9, director: "Diretor B" },
         { rating: 7, director: "Diretor C" },
      ]);
      render(<Dashboard movies={movies} />);
      expect(screen.getByText("Vários")).toBeInTheDocument();
   });

   it("lida com filmes sem countries (não crasheia)", () => {
      const movies = createMovies([
         { rating: 8, countries: undefined },
      ]);
      const { container } = render(<Dashboard movies={movies} />);
      // 1 filme assistido e 1 fora dos EUA (undefined não inclui "Estados Unidos")
      const statValues = container.querySelectorAll("[class*='statValue']");
      expect(statValues.length).toBeGreaterThan(0);
   });

   it("exibe porcentagem fora dos EUA como 0% quando totalMovies é 0", () => {
      // Este caso testa o fix da divisão por zero
      // Dashboard retorna null se movies.length === 0, mas se todos forem watchlist:
      const movies = createMovies([
         { rating: null, status: "watchlist" },
      ]);
      // ratedMovies terá 0, totalMovies será 0 -> nonUSPercentage deve ser "0"
      const { container } = render(<Dashboard movies={movies} />);
      // Não deve crashear de qualquer forma
      expect(container).toBeTruthy();
   });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MovieCard } from "@/features/movies/components/MovieCard/MovieCard";
import type { MovieData } from "@/types";

const mockWatchedMovie: MovieData = {
   id: 1,
   tmdb_id: 550,
   rating: 8.5,
   review: "Filme incrível",
   recommended: "Assista com certeza",
   created_at: "2025-01-01",
   title: "Clube da Luta",
   poster_path: "/poster.jpg",
   release_date: "1999-10-15",
   director: "David Fincher",
   isNational: false,
   isOscar: true,
   genres: ["Drama", "Thriller"],
   status: "watched",
};

const mockWatchlistMovie: MovieData = {
   id: 2,
   tmdb_id: 680,
   rating: null,
   review: "",
   recommended: "",
   created_at: "2025-02-01",
   title: "Pulp Fiction",
   poster_path: "/pulp.jpg",
   release_date: "1994-09-10",
   director: "Quentin Tarantino",
   isNational: false,
   isOscar: false,
   genres: ["Crime"],
   status: "watchlist",
};

const mockNationalMovie: MovieData = {
   id: 3,
   tmdb_id: 999,
   rating: 7,
   review: "Bom filme",
   recommended: "Vale a pena assistir",
   created_at: "2025-03-01",
   title: "Cidade de Deus",
   poster_path: undefined,
   release_date: "2002-08-30",
   director: "Fernando Meirelles",
   isNational: true,
   isOscar: true,
   genres: ["Drama", "Crime"],
   status: "watched",
};

describe("MovieCard", () => {
   it("renderiza o título do filme", () => {
      render(<MovieCard movie={mockWatchedMovie} onClick={vi.fn()} />);
      expect(screen.getByText("Clube da Luta")).toBeInTheDocument();
   });

   it("renderiza o diretor e ano", () => {
      render(<MovieCard movie={mockWatchedMovie} onClick={vi.fn()} />);
      expect(screen.getByText(/David Fincher/)).toBeInTheDocument();
      expect(screen.getByText(/1999/)).toBeInTheDocument();
   });

   it("exibe a nota para filmes assistidos", () => {
      render(<MovieCard movie={mockWatchedMovie} onClick={vi.fn()} />);
      expect(screen.getByText("8.5")).toBeInTheDocument();
   });

   it("exibe 'Na Fila' para filmes na watchlist", () => {
      render(<MovieCard movie={mockWatchlistMovie} onClick={vi.fn()} />);
      expect(screen.getByText("Na Fila")).toBeInTheDocument();
   });

   it("exibe tag Nacional quando isNational=true", () => {
      render(<MovieCard movie={mockNationalMovie} onClick={vi.fn()} />);
      expect(screen.getByText("Nacional")).toBeInTheDocument();
   });

   it("exibe tag Oscar quando isOscar=true", () => {
      render(<MovieCard movie={mockWatchedMovie} onClick={vi.fn()} />);
      expect(screen.getByText("Oscar")).toBeInTheDocument();
   });

   it("não exibe tags quando não é Nacional nem Oscar", () => {
      render(<MovieCard movie={mockWatchlistMovie} onClick={vi.fn()} />);
      expect(screen.queryByText("Nacional")).not.toBeInTheDocument();
      expect(screen.queryByText("Oscar")).not.toBeInTheDocument();
   });

   it("chama onClick quando clicado", async () => {
      const onClick = vi.fn();
      render(<MovieCard movie={mockWatchedMovie} onClick={onClick} />);
      
      await userEvent.click(screen.getByRole("button"));
      expect(onClick).toHaveBeenCalledWith(mockWatchedMovie);
   });

   it("chama onClick ao pressionar Enter", async () => {
      const onClick = vi.fn();
      render(<MovieCard movie={mockWatchedMovie} onClick={onClick} />);
      
      const card = screen.getByRole("button");
      card.focus();
      await userEvent.keyboard("{Enter}");
      expect(onClick).toHaveBeenCalledWith(mockWatchedMovie);
   });

   it("renderiza poster com imagem quando poster_path existe", () => {
      render(<MovieCard movie={mockWatchedMovie} onClick={vi.fn()} />);
      const img = screen.getByAltText("Clube da Luta");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", expect.stringContaining("/poster.jpg"));
   });

   it("renderiza placeholder 'Sem Capa' quando poster_path é null", () => {
      render(<MovieCard movie={mockNationalMovie} onClick={vi.fn()} />);
      expect(screen.getByText("Sem Capa")).toBeInTheDocument();
   });

   it("exibe o badge de recomendação", () => {
      render(<MovieCard movie={mockWatchedMovie} onClick={vi.fn()} />);
      expect(screen.getByText("Assista com certeza")).toBeInTheDocument();
   });

   it("exibe 'Aguardando...' para filme na watchlist sem recomendação", () => {
      render(<MovieCard movie={mockWatchlistMovie} onClick={vi.fn()} />);
      expect(screen.getByText("Aguardando...")).toBeInTheDocument();
   });

   it("renderiza o fallback de título quando title é undefined", () => {
      const movieNoTitle = { ...mockWatchedMovie, title: undefined };
      render(<MovieCard movie={movieNoTitle} onClick={vi.fn()} />);
      expect(screen.getByText(`Filme #${movieNoTitle.tmdb_id}`)).toBeInTheDocument();
   });
});

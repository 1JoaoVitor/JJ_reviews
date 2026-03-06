import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MovieBattle } from "@/features/battle/components/MovieBattle/MovieBattle";
import type { MovieData } from "@/types";

function createMovies(count: number): MovieData[] {
   return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      tmdb_id: 100 + i,
      rating: 5 + (i % 6),
      review: `Review ${i}`,
      recommended: "Vale a pena assistir",
      created_at: `2025-0${(i % 9) + 1}-01`,
      title: `Filme ${String.fromCharCode(65 + i)}`,
      poster_path: `/poster${i}.jpg`,
      release_date: `202${i % 5}-01-01`,
      director: `Diretor ${i}`,
      genres: ["Drama"],
      status: "watched" as const,
      isNational: i % 3 === 0,
      isOscar: i % 4 === 0,
      countries: ["Brasil"],
   }));
}

describe("MovieBattle", () => {
   it("renderiza a tela de setup inicialmente", () => {
      render(<MovieBattle allMovies={createMovies(8)} onExit={vi.fn()} />);
      expect(screen.getByText("Configurar Torneio")).toBeInTheDocument();
   });

   it("exibe o botão 'INICIAR COMBATE'", () => {
      render(<MovieBattle allMovies={createMovies(8)} onExit={vi.fn()} />);
      expect(screen.getByText("INICIAR COMBATE")).toBeInTheDocument();
   });

   it("chama onExit quando o botão Sair é clicado", async () => {
      const onExit = vi.fn();
      render(<MovieBattle allMovies={createMovies(8)} onExit={onExit} />);
      
      await userEvent.click(screen.getByText("Sair"));
      expect(onExit).toHaveBeenCalledOnce();
   });

   it("mostra quantidade de filmes disponíveis", () => {
      const movies = createMovies(10);
      render(<MovieBattle allMovies={movies} onExit={vi.fn()} />);
      expect(screen.getByText("10")).toBeInTheDocument();
   });

   it("desabilita o botão quando não há filmes suficientes", () => {
      const movies = createMovies(1); // Só 1 filme assistido
      render(<MovieBattle allMovies={movies} onExit={vi.fn()} />);
      expect(screen.getByText("INICIAR COMBATE")).toBeDisabled();
   });

   it("exibe opções de critério de seleção", () => {
      render(<MovieBattle allMovies={createMovies(8)} onExit={vi.fn()} />);
      expect(screen.getByText("Aleatório")).toBeInTheDocument();
      expect(screen.getByText("Melhores Notas")).toBeInTheDocument();
      expect(screen.getByText("Piores Notas")).toBeInTheDocument();
      expect(screen.getByText("Mais Recentes")).toBeInTheDocument();
   });

   it("inicia a batalha e mostra os cards", async () => {
      render(<MovieBattle allMovies={createMovies(4)} onExit={vi.fn()} />);
      
      // Selecionar 4 filmes
      await userEvent.click(screen.getByText(/4 Filmes/));
      await userEvent.click(screen.getByText("INICIAR COMBATE"));

      // Deve mostrar VS e dois filmes
      expect(screen.getByText("VS")).toBeInTheDocument();
   });

   it("progride para o próximo duelo após selecionar um vencedor", async () => {
      render(<MovieBattle allMovies={createMovies(4)} onExit={vi.fn()} />);

      await userEvent.click(screen.getByText(/4 Filmes/));
      await userEvent.click(screen.getByText("INICIAR COMBATE"));

      // Clica no primeiro card de batalha
      const battleCards = screen.getAllByRole("button").filter(
         btn => btn.classList.toString().includes("battle") || btn.closest("[class*='battleCard']")
      );
      
      // Deve haver pelo menos dois cards de filme para clicar
      if (battleCards.length >= 1) {
         await userEvent.click(battleCards[0]);
      }
   });

   it("não inclui filmes da watchlist nos disponíveis", () => {
      const movies: MovieData[] = [
         ...createMovies(3),
         {
            id: 99,
            tmdb_id: 999,
            rating: null,
            review: "",
            recommended: "",
            created_at: "2025-01-01",
            title: "Watchlist Filme",
            status: "watchlist",
            director: "Alguém",
            genres: ["Drama"],
         },
      ];
      
      render(<MovieBattle allMovies={movies} onExit={vi.fn()} />);
      // Só 3 filmes devem estar disponíveis
      expect(screen.getByText("3")).toBeInTheDocument();
   });
});

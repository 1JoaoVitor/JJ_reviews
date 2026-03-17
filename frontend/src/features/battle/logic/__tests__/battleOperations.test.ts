import { describe, it, expect } from "vitest";
import { filterMoviesByCriteria, setupTournament, nextPowerOfTwo } from "../battleOperations";
import type { MovieData } from "@/types";

describe("battleOperations (Functional Core)", () => {

   describe("1. nextPowerOfTwo", () => {
      it("deve retornar a próxima potência de 2 corretamente", () => {
         expect(nextPowerOfTwo(2)).toBe(2);
         expect(nextPowerOfTwo(3)).toBe(4);
         expect(nextPowerOfTwo(5)).toBe(8);
         expect(nextPowerOfTwo(12)).toBe(16);
      });
      
      it("Sad Path: deve retornar 0 se receber 0 ou número negativo", () => {
         expect(nextPowerOfTwo(0)).toBe(0);
         expect(nextPowerOfTwo(-5)).toBe(0);
      });
   });

   describe("2. filterMoviesByCriteria", () => {
      const mockMovies = [
         { id: 1, title: "A", status: "watched", isOscar: true, isNational: false, rating: 9 },
         { id: 2, title: "B", status: "watched", isOscar: false, isNational: true, rating: 5 },
         { id: 3, title: "C", status: "watchlist", isOscar: true, isNational: false, rating: null }, // Watchlist não entra!
      ] as MovieData[];

      it("deve filtrar apenas os assistidos com nota, aplicando o critério 'oscar'", () => {
         const result = filterMoviesByCriteria(mockMovies, "oscar");
         expect(result).toHaveLength(1);
         expect(result[0].title).toBe("A");
      });

      it("deve filtrar apenas os assistidos aplicando o critério 'national'", () => {
         const result = filterMoviesByCriteria(mockMovies, "national");
         expect(result).toHaveLength(1);
         expect(result[0].title).toBe("B");
      });
   });

   describe("3. setupTournament", () => {
      const generateMockMovies = (count: number) => {
         return Array.from({ length: count }, (_, i) => ({
            id: i, title: `Filme ${i}`, rating: Math.random() * 10 
         })) as MovieData[];
      };

      it("deve criar um torneio perfeito se a quantidade de filmes for potência de 2 (Ex: 8 filmes)", () => {
         const movies = generateMockMovies(8);
         const tournament = setupTournament(movies, "random", 8);

         expect(tournament.bracketSize).toBe(8);
         expect(tournament.fighters).toHaveLength(8);
         expect(tournament.byes).toHaveLength(0); // Ninguém ganha folga num torneio perfeito
      });

      it("deve calcular lutadores e folgas (byes) corretamente para números ímpares (Ex: 5 filmes)", () => {
         const movies = generateMockMovies(5);
         // Se temos 5 filmes, a próxima potência é 8. 
         // Folgas (byes) = 8 - 5 = 3 folgas.
         // Lutadores iniciais = 5 - 3 = 2 lutadores.
         const tournament = setupTournament(movies, "random", 5);

         expect(tournament.bracketSize).toBe(8);
         expect(tournament.fighters).toHaveLength(2);
         expect(tournament.byes).toHaveLength(3);
      });

      it("Sad Path: deve lançar erro se tentar iniciar torneio com menos de 2 filmes", () => {
         const movies = generateMockMovies(1);
         expect(() => setupTournament(movies, "random", 8)).toThrowError("Mínimo de 2 filmes necessários");
      });
   });
});
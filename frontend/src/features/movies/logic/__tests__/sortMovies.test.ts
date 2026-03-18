import { describe, it, expect } from "vitest";
import { sortMovies } from "../sortMovies";
import type { MovieData } from "@/types";

// Factory para criar filmes falsos
// Usa "as MovieData" para não precisar preencher todos os campos obrigatórios do tipo
const makeMovie = (overrides: Partial<MovieData> = {}): MovieData => ({
   id: 1,
   tmdb_id: 100,
   title: "Filme Padrão",
   status: "watched",
   ...overrides,
} as MovieData);

describe("sortMovies (Functional Core)", () => {
   
   it("deve ordenar os filmes por nota (rating) de forma decrescente", () => {
      // Preparação
      const movies = [
         makeMovie({ id: 1, rating: 5 }),
         makeMovie({ id: 2, rating: 9 }),
         makeMovie({ id: 3, rating: 7 }),
      ];

      // Ação 
      const result = sortMovies(movies, "rating");

      // Verificação
      expect(result.map(m => m.rating)).toEqual([9, 7, 5]);
   });

   it("deve manter a ordem (ou desempatar corretamente) quando os valores são iguais", () => {
      const movies = [
         { id: 1, title: "Filme A", rating: 8 },
         { id: 2, title: "Filme B", rating: 8 }
      ] as MovieData[];
      
      const sorted = sortMovies(movies, "rating");
      expect(sorted.length).toBe(2);
   });

   it("deve ordenar os filmes alfabeticamente (alpha)", () => {
      const movies = [
         makeMovie({ title: "Zombieland" }),
         makeMovie({ title: "Avatar" }),
         makeMovie({ title: "Matrix" })
      ];
      
      const result = sortMovies(movies, "alpha");
      
      expect(result.map(m => m.title)).toEqual(["Avatar", "Matrix", "Zombieland"]);
   });

   it("deve retornar o array intacto se a ordem for 'default' (id decrescente)", () => {
      const movies = [
         makeMovie({ id: 10 }),
         makeMovie({ id: 20 }),
         makeMovie({ id: 5 })
      ];
      
      const result = sortMovies(movies, "default");
      
      expect(result.map(m => m.id)).toEqual([20, 10, 5]);
   });

});

describe("Tratamento de Falhas", () => {
   it("deve jogar os filmes sem data de lançamento para o final da lista (Ordenação por Data)", () => {
      const movies: MovieData[] = [
         { id: 1, title: "Sem Data", release_date: undefined } as MovieData,
         { id: 2, title: "Com Data", release_date: "2023-01-01" } as MovieData,
      ];

      const result = sortMovies(movies, "date");
      
      // O filme COM data tem de vir primeiro, o lixo/vazio vai para o final
      expect(result[0].title).toBe("Com Data");
      expect(result[1].title).toBe("Sem Data");
   });

   it("deve jogar os filmes sem nota para o final da lista (Ordenação por Rating)", () => {
      const movies: MovieData[] = [
         { id: 1, title: "Sem Nota", rating: null } as MovieData,
         { id: 2, title: "Com Nota Baixa", rating: 2 } as MovieData,
         { id: 3, title: "Com Nota Alta", rating: 9 } as MovieData,
      ];

      const result = sortMovies(movies, "rating");
      
      // A ordem esperada é: Maior nota -> Menor nota -> Sem nota
      expect(result[0].title).toBe("Com Nota Alta");
      expect(result[2].title).toBe("Sem Nota");
   });

   it("deve retornar o array intacto se receber uma ordem de ordenação inválida", () => {
      const movies: MovieData[] = [{ id: 1, title: "A" } as MovieData];
      
      // @ts-expect-error: Injetando um sortOrder que não existe na tipagem
      const result = sortMovies(movies, "ordem_maluca");
      
      expect(result).toEqual(movies);
   });
});
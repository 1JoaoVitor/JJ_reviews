import { describe, it, expect } from "vitest";
import { mapTmdbToMovieData, type TmdbRawResponse, type BaseMovieRow } from "../enrichMovie";

const makeSupabaseRow = (overrides: Partial<BaseMovieRow> = {}): BaseMovieRow => ({
   id: 1,
   tmdb_id: 100,
   status: "watched",
   ...overrides,
});

const makeTmdbRaw = (overrides: Partial<TmdbRawResponse> = {}): TmdbRawResponse => ({
   title: "Filme Padrão",
   ...overrides,
});

describe("mapTmdbToMovieData (Functional Core)", () => {
   
   it("deve mapear os dados crus do TMDB e juntar com os dados do banco local", () => {
      const mockSupabaseRow = makeSupabaseRow({
         id: 42,
         tmdb_id: 550,
         rating: 9,
         review: "Filme incrível!",
      });

      const mockTmdbRaw = makeTmdbRaw({
         title: "Clube da Luta",
         overview: "Primeira regra...",
         poster_path: "/luta.jpg",
         runtime: 139,
         release_date: "1999-10-15",
         genres: [{ id: 1, name: "Drama" }, { id: 2, name: "Suspense" }],
         production_countries: [{ iso_3166_1: "US", name: "United States of America" }],
         credits: {
            crew: [
               { job: "Director", name: "David Fincher" },
               { job: "Producer", name: "Art Linson" }
            ],
            cast: [
               { name: "Brad Pitt" },
               { name: "Edward Norton" },
               { name: "Helena Bonham Carter" },
               { name: "Meat Loaf" },
               { name: "Jared Leto" },
               { name: "Zach Grenier" } 
            ]
         },
         "watch/providers": {
            results: {
               BR: {
                  flatrate: [{ provider_id: 8, provider_name: "Netflix", logo_path: "/netflix.jpg" }]
               }
            }
         }
      });

      const result = mapTmdbToMovieData(mockSupabaseRow, mockTmdbRaw, [100, 200]);

      expect(result.id).toBe(42);
      expect(result.title).toBe("Clube da Luta");
      expect(result.director).toBe("David Fincher");
      expect(result.cast).toHaveLength(5); // Ignora o 6º ator
      expect(result.cast).toContain("Brad Pitt");
      expect(result.genres).toEqual(["Drama", "Suspense"]);
      expect(result.runtime).toBe(139);
      expect(result.isNational).toBe(false);
      expect(result.isOscar).toBe(false);
      expect(result.providers?.[0].provider_name).toBe("Netflix");
   });

   it("deve identificar um filme como Nacional e como Indicado ao Oscar do ano corrente", () => {
      const mockSupabaseRow = makeSupabaseRow({ id: 2, tmdb_id: 12345 });
      
      const mockTmdbRaw = makeTmdbRaw({
         title: "O Agente Secreto",
         production_countries: [{ iso_3166_1: "BR", name: "Brazil" }],
      });

      // Passa  o ID 12345 na lista de indicados (OSCAR_NOMINEES_IDS simulado)
      const result = mapTmdbToMovieData(mockSupabaseRow, mockTmdbRaw, [12345, 67890]);

      expect(result.isNational).toBe(true);
      expect(result.isOscar).toBe(true); // Verdadeiro porque o tmdb_id está no array de indicados
   });
});

describe("Tratamento de Falhas e Dados Ausentes)", () => {
      it("deve lidar com uma resposta do TMDB completamente vazia sem quebrar a aplicação (Fallback Seguro)", () => {
         const mockSupabaseRow = makeSupabaseRow({ id: 99, tmdb_id: 101 });
         const emptyTmdbRaw = {} as TmdbRawResponse; // Simulando falha silenciosa da API

         const result = mapTmdbToMovieData(mockSupabaseRow, emptyTmdbRaw);

         expect(result.title).toBe("Título Desconhecido");
         expect(result.director).toBe("Desconhecido"); 
         expect(result.cast).toEqual([]);
         expect(result.genres).toEqual([]);
         expect(result.runtime).toBe(0);
         expect(result.countries).toEqual([]);
      });

      it("deve ignorar códigos de país inválidos no Intl.DisplayNames sem lançar exceção (Try/Catch)", () => {
         const mockSupabaseRow = makeSupabaseRow();
         const tmdbWithBadCountry = makeTmdbRaw({
            production_countries: [{ iso_3166_1: "XX", name: "País Inventado" }]
         });

         const result = mapTmdbToMovieData(mockSupabaseRow, tmdbWithBadCountry);

         // Como falhou a tradução, tem de devolver o nome original que veio da API
         expect(result.countries).toContain("País Inventado");
      });
      
      it("deve retornar providers vazio se a árvore de watch/providers do TMDB vier pela metade", () => {
         const mockSupabaseRow = makeSupabaseRow();
         const tmdbBrokenProviders = makeTmdbRaw({
            "watch/providers": { results: {} } // Sem a região BR
         });

         const result = mapTmdbToMovieData(mockSupabaseRow, tmdbBrokenProviders);

         expect(result.providers).toEqual([]);
      });
   });
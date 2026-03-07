import { describe, it, expect, vi, beforeEach } from "vitest";
import { enrichMovieWithTmdb, searchMovies } from "@/features/movies/services/tmdbService";
import axios from "axios";

vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

vi.mock("@/constants/oscar", () => ({
   OSCAR_NOMINEES_IDS: [550, 680],
}));

describe("tmdbService", () => {
   beforeEach(() => {
      vi.clearAllMocks();
   });

   describe("enrichMovieWithTmdb", () => {
      it("enriquece filme com dados do TMDB", async () => {
         mockedAxios.get.mockResolvedValue({
            data: {
               title: "Clube da Luta",
               poster_path: "/poster.jpg",
               release_date: "1999-10-15",
               overview: "Um homem deprimido...",
               credits: {
                  crew: [{ job: "Director", name: "David Fincher" }],
                  cast: [{ name: "Brad Pitt" }, { name: "Edward Norton" }],
               },
               genres: [{ id: 18, name: "Drama" }],
               production_countries: [{ iso_3166_1: "US", name: "United States" }],
               "watch/providers": {
                  results: {
                     BR: {
                        flatrate: [{ provider_id: 8, provider_name: "Netflix", logo_path: "/netflix.png" }],
                     },
                  },
               },
            },
         });

         const movie = { tmdb_id: 550, id: 1, rating: 8, review: "Bom", recommended: "Assista", created_at: "2025-01-01" };
         const result = await enrichMovieWithTmdb(movie);

         expect(result.title).toBe("Clube da Luta");
         expect(result.director).toBe("David Fincher");
         expect(result.cast).toEqual(["Brad Pitt", "Edward Norton"]);
         expect(result.genres).toEqual(["Drama"]);
         expect(result.isOscar).toBe(true);
         expect(result.providers).toHaveLength(1);
      });

      it("marca filme brasileiro como isNational", async () => {
         mockedAxios.get.mockResolvedValue({
            data: {
               title: "Cidade de Deus",
               poster_path: "/cdeus.jpg",
               release_date: "2002-08-30",
               overview: "...",
               credits: { crew: [], cast: [] },
               genres: [],
               production_countries: [{ iso_3166_1: "BR", name: "Brazil" }],
               "watch/providers": { results: {} },
            },
         });

         const movie = { tmdb_id: 999, id: 2, rating: 9, review: "Incrível", recommended: "Assista", created_at: "2025-01-01" };
         const result = await enrichMovieWithTmdb(movie);

         expect(result.isNational).toBe(true);
      });

      it("retorna dados originais quando TMDB falha", async () => {
         mockedAxios.get.mockRejectedValue(new Error("Network error"));

         const movie = { tmdb_id: 123, id: 3, rating: 5 };
         const result = await enrichMovieWithTmdb(movie);

         expect(result.tmdb_id).toBe(123);
      });

      it("lida com créditos ausentes", async () => {
         mockedAxios.get.mockResolvedValue({
            data: {
               title: "Filme Sem Crew",
               credits: { crew: [], cast: [] },
               genres: [],
               production_countries: [],
               "watch/providers": { results: {} },
            },
         });

         const movie = { tmdb_id: 777, id: 4 };
         const result = await enrichMovieWithTmdb(movie);

         expect(result.director).toBe("Desconhecido");
         expect(result.cast).toEqual([]);
      });

      it("marca filme do Oscar corretamente", async () => {
         mockedAxios.get.mockResolvedValue({
            data: {
               title: "Pulp Fiction",
               credits: { crew: [], cast: [] },
               genres: [],
               production_countries: [],
               "watch/providers": { results: {} },
            },
         });

         const movie = { tmdb_id: 680, id: 5 }; // 680 está no mock de OSCAR_NOMINEES_IDS
         const result = await enrichMovieWithTmdb(movie);

         expect(result.isOscar).toBe(true);
      });
   });

   describe("searchMovies", () => {
      it("retorna até 5 resultados", async () => {
         mockedAxios.get.mockResolvedValue({
            data: {
               results: Array.from({ length: 10 }, (_, i) => ({
                  id: i,
                  title: `Filme ${i}`,
                  release_date: "2025-01-01",
                  poster_path: "/poster.jpg",
               })),
            },
         });

         const results = await searchMovies("teste");
         expect(results).toHaveLength(5);
      });

      it("retorna array vazio quando API falha", async () => {
         mockedAxios.get.mockRejectedValue(new Error("Network error"));

         const results = await searchMovies("teste");
         expect(results).toEqual([]);
      });

      it("encoda a query corretamente", async () => {
         mockedAxios.get.mockResolvedValue({
            data: { results: [] },
         });

         await searchMovies("filme com espaço & caracteres especiais");
         expect(mockedAxios.get).toHaveBeenCalledWith(
            expect.stringContaining("filme%20com%20espa%C3%A7o%20%26%20caracteres%20especiais")
         );
      });
   });
});

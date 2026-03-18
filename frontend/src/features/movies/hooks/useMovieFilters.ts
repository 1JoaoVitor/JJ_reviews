import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { filterMovies } from "../logic/filterMovies";
import { sortMovies, type SortOrder } from "../logic/sortMovies";
import type { MovieData } from "@/types";

export function useMovieFilters(movies: MovieData[]) {
   const [searchParams, setSearchParams] = useSearchParams();
   const viewMode = (searchParams.get("aba") as "watched" | "watchlist" | "lists") || "watched";

   const setViewMode = (mode: "watched" | "watchlist" | "lists") => {
      setSearchParams(prev => {
         if (mode === "watched") {
            prev.delete("aba"); // Como "watched" é o padrão, limpa a URL para ficar mais limpo
         } else {
            prev.set("aba", mode);
         }
         return prev;
      });
   };

   // Estados locais de filtros
   const [searchTerm, setSearchTerm] = useState("");
   const [sortOrder, setSortOrder] = useState<SortOrder>("default");
   const [onlyNational, setOnlyNational] = useState(false);
   const [onlyOscar, setOnlyOscar] = useState(false);
   const [onlyInternational, setOnlyInternational] = useState(false);
   const [selectedGenre, setSelectedGenre] = useState("");
   const [selectedDirector, setSelectedDirector] = useState("");

   // Extração dinâmica de gêneros (Apenas para popular o dropdown no menu)
   const availableGenres = useMemo(() => {
      const genres = new Set<string>();
      movies.forEach(m => m.genres?.forEach(g => genres.add(g)));
      return Array.from(genres).sort();
   }, [movies]);

   // ARQUITETURA FC/IS ACONTECE AQUI
   // O hook apenas empacota os estados atuais e delega todo o trabalho pesado para o Core.
   const filteredMovies = useMemo(() => {
      const filters = {
         viewMode,
         searchTerm,
         onlyNational,
         onlyOscar,
         onlyInternational,
         selectedGenre,
         selectedDirector,
      };

      const filtered = filterMovies(movies, filters);
      return sortMovies(filtered, sortOrder);
   }, [
      movies,
      viewMode,
      searchTerm,
      onlyNational,
      onlyOscar,
      onlyInternational,
      selectedGenre,
      selectedDirector,
      sortOrder
   ]);

   // Retorna tudo para o Componente React usar
   return {
      viewMode,
      setViewMode,
      searchTerm,
      setSearchTerm,
      sortOrder,
      setSortOrder,
      onlyNational,
      setOnlyNational,
      onlyOscar,
      setOnlyOscar,
      onlyInternational,
      setOnlyInternational,
      selectedGenre,
      setSelectedGenre,
      selectedDirector,
      setSelectedDirector,
      availableGenres,
      filteredMovies,
   };
}
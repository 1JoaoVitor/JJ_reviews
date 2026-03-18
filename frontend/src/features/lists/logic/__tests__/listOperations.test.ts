import { describe, it, expect } from "vitest";
import { 
   mergeLists, 
   deduplicateLists, 
   mapListCounts, 
   sortListsByDate,
   type RawSupabaseList
} from "../listOperations";
import type { CustomList } from "@/types";

// Helper para criar os dados crus simulando o banco de dados
const makeRawList = (id: string, name: string, date: string, count?: number): RawSupabaseList => ({
   id,
   owner_id: "user_1",
   name,
   type: "private" as const,
   created_at: date,
   list_movies: count !== undefined ? [{ count }] : [],
});

describe("listOperations (Functional Core)", () => {

   describe("1. mergeLists", () => {
      it("deve juntar dois arrays de listas corretamente", () => {
         const myLists = [makeRawList("1", "A", "2023")];
         const sharedLists = [makeRawList("2", "B", "2023")];
         
         const result = mergeLists(myLists, sharedLists);
         expect(result).toHaveLength(2);
         expect(result[0].id).toBe("1");
         expect(result[1].id).toBe("2");
      });

      it("Sad Path: deve retornar array vazio se receber null ou undefined", () => {
         expect(mergeLists(null, undefined)).toEqual([]);
      });
   });

   describe("2. deduplicateLists", () => {
      it("deve remover listas com IDs duplicados, mantendo a primeira ocorrência", () => {
         const listA = makeRawList("1", "Lista Única", "2023");
         const listB = makeRawList("1", "Lista Duplicada (Bug do DB)", "2023"); // Mesmo ID!
         const listC = makeRawList("2", "Outra Lista", "2023");

         const result = deduplicateLists([listA, listB, listC]);

         expect(result).toHaveLength(2);
         expect(result[0].name).toBe("Lista Única"); // A primeira sobreviveu
         expect(result[1].id).toBe("2");
      });
   });

   describe("3. mapListCounts", () => {
      it("deve extrair a contagem correta da estrutura aninhada do Supabase", () => {
         const lists = [
            makeRawList("1", "Com Filmes", "2023", 10),
            makeRawList("2", "Sem Filmes", "2023", 0),
         ];

         const result = mapListCounts(lists);

         expect(result[0].movie_count).toBe(10);
         expect(result[1].movie_count).toBe(0);
         
         // Garante que a propriedade original suja 'list_movies' foi removida
         expect(result[0]).not.toHaveProperty("list_movies");
      });

      it("Sad Path: deve mapear o movie_count para 0 se o list_movies vier nulo, vazio ou sem count", () => {
         const corruptedLists = [
            { id: "1", list_movies: null },
            { id: "2", list_movies: [] },
            { id: "3", list_movies: [{ something: 123 }] }, // Objeto sem 'count'
            { id: "4", list_movies: "lixo em formato de string" },
         ];

         // @ts-expect-error: Injetando estrutura corrompida propositalmente
         const result = mapListCounts(corruptedLists);

         expect(result[0].movie_count).toBe(0);
         expect(result[1].movie_count).toBe(0);
         expect(result[2].movie_count).toBe(0);
         expect(result[3].movie_count).toBe(0);
      });
   });

   describe("4. sortListsByDate", () => {
      it("deve ordenar as listas da mais recente para a mais antiga", () => {
         // Já convertidas para CustomList (com movie_count)
         const lists: CustomList[] = [
            { id: "1", created_at: "2023-01-01T10:00:00Z" } as CustomList, // Antiga
            { id: "2", created_at: "2023-01-03T10:00:00Z" } as CustomList, // Nova
            { id: "3", created_at: "2023-01-02T10:00:00Z" } as CustomList, // Média
         ];

         const result = sortListsByDate(lists);

         expect(result[0].id).toBe("2");
         expect(result[1].id).toBe("3"); 
         expect(result[2].id).toBe("1");
      });

      it("Sad Path: deve jogar datas inválidas ou nulas para o final da ordenação", () => {
         const lists: CustomList[] = [
            { id: "1", created_at: "data-invalida" } as CustomList,
            { id: "2", created_at: "2023-01-01T10:00:00Z" } as CustomList,
         ];

         const result = sortListsByDate(lists);

         expect(result[0].id).toBe("2");
         expect(result[1].id).toBe("1");
      });
   });

});
import { describe, it, expect } from "vitest";
import { buildShareUrl, buildShareContent, buildImageFileName } from "../shareOperations";
import type { MovieData } from "@/types";

describe("shareOperations (Functional Core)", () => {

   describe("1. buildShareUrl", () => {
      it("deve redirecionar a raiz ('/') para o perfil do usuário se ele estiver logado", () => {
         const movie = { tmdb_id: 123 } as MovieData;
         const url = buildShareUrl(movie, "/", "joao123");
         
         expect(url).toBe("https://jj-reviews.vercel.app/perfil/joao123?movie=123");
      });

      it("deve manter a rota atual se não estiver na raiz, mesmo logado", () => {
         const movie = { tmdb_id: 456 } as MovieData;
         const url = buildShareUrl(movie, "/listas/favoritos", "joao123");
         
         expect(url).toBe("https://jj-reviews.vercel.app/listas/favoritos?movie=456");
      });

      it("deve usar o id interno caso o tmdb_id não exista (Sad Path/Fallback)", () => {
         const movie = { id: 999 } as MovieData; // Sem tmdb_id
         const url = buildShareUrl(movie, "/", null); // Sem username
         
         expect(url).toBe("https://jj-reviews.vercel.app/?movie=999");
      });
   });

   describe("2. buildShareContent", () => {
      it("deve montar o título e o texto da mensagem corretamente", () => {
         const content = buildShareContent("Batman");
         expect(content.title).toBe("Review de Batman");
         expect(content.text).toBe("Confira a minha avaliação de Batman no JJ Reviews!");
      });

      it("Sad Path: deve usar um fallback seguro se o título for vazio", () => {
         const content = buildShareContent("");
         expect(content.title).toBe("Review de Filme");
      });
   });

   describe("3. buildImageFileName", () => {
      it("deve gerar o nome do arquivo da imagem de forma previsível (Função Pura)", () => {
         const timestamp = 1600000000000;
         const fileName = buildImageFileName(123, timestamp);
         expect(fileName).toBe("review-123-1600000000000.png");
      });
   });
});
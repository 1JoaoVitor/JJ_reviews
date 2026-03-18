import { describe, it, expect } from "vitest";
import { mapFriendshipStatus } from "./../mapFriendshipStatus";
import type { Friendship } from "@/types";

describe("mapFriendshipStatus (Functional Core)", () => {
   
   describe("Caminhos de Corretude", () => {
      it("deve retornar 'self' se o usuário estiver vendo o próprio perfil", () => {
         const status = mapFriendshipStatus("user_123", "user_123", null);
         expect(status).toBe("self");
      });

      it("deve retornar 'none' se não houver registro de amizade", () => {
         const status = mapFriendshipStatus("user_123", "user_456", null);
         expect(status).toBe("none");
      });

      it("deve retornar 'friends' se o convite foi aceito", () => {
         const mockFriendship: Friendship = {
            id: "f_1", requester_id: "user_123", receiver_id: "user_456", status: "accepted", created_at: ""
         };
         const status = mapFriendshipStatus("user_123", "user_456", mockFriendship);
         expect(status).toBe("friends");
      });

      it("deve retornar 'request_sent' se o usuário logado enviou o convite pendente", () => {
         const mockFriendship: Friendship = {
            id: "f_1", requester_id: "user_123", receiver_id: "user_456", status: "pending", created_at: ""
         };
         // O currentUserId (123) é igual ao requester_id
         const status = mapFriendshipStatus("user_123", "user_456", mockFriendship);
         expect(status).toBe("request_sent");
      });

      it("deve retornar 'request_received' se o usuário logado recebeu o convite pendente", () => {
         const mockFriendship: Friendship = {
            id: "f_1", requester_id: "user_999", receiver_id: "user_123", status: "pending", created_at: ""
         };
         // O currentUserId (123) é igual ao receiver_id
         const status = mapFriendshipStatus("user_123", "user_999", mockFriendship);
         expect(status).toBe("request_received");
      });
   });

   describe("Tratamento de Falhas", () => {
      it("deve retornar 'none' se a amizade foi recusada ('declined')", () => {
         const mockFriendship: Friendship = {
            id: "f_1", requester_id: "user_123", receiver_id: "user_456", status: "declined", created_at: ""
         };
         const status = mapFriendshipStatus("user_123", "user_456", mockFriendship);
         expect(status).toBe("none"); // Volta à estaca zero, pode adicionar de novo
      });

      it("deve retornar 'none' de forma segura se faltarem os IDs dos usuários", () => {
         expect(mapFriendshipStatus(undefined, "user_456", null)).toBe("none");
         expect(mapFriendshipStatus("user_123", undefined, null)).toBe("none");
      });
   });
});
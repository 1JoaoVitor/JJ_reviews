import { describe, it, expect } from "vitest";
import { formatNotifications, countUnread, type RawNotification } from "../notificationOperations";
import type { AppNotification } from "@/types";

describe("notificationOperations (Functional Core)", () => {

   describe("1. formatNotifications", () => {
      it("deve achatar o array do sender gerado pelo Supabase", () => {
         const rawData: RawNotification[] = [
            {
               id: "1", user_id: "u1", type: "general", message: "Olá", is_read: false, created_at: "",
               sender: [{ username: "joao", avatar_url: "url1" }] 
            }
         ];

         const result = formatNotifications(rawData);
         
         expect(Array.isArray(result[0].sender)).toBe(false);
         expect(result[0].sender?.username).toBe("joao");
      });

      it("deve lidar corretamente se o sender já for um objeto simples", () => {
         const rawData: RawNotification[] = [
            {
               id: "1", user_id: "u1", type: "general", message: "Olá", is_read: false, created_at: "",
               sender: { username: "maria", avatar_url: "url2" }
            }
         ];

         const result = formatNotifications(rawData);
         expect(result[0].sender?.username).toBe("maria");
      });

      it("Sad Path: deve retornar array vazio se receber nulo ou undefined", () => {
         expect(formatNotifications(null)).toEqual([]);
         expect(formatNotifications(undefined)).toEqual([]);
      });
   });

   describe("2. countUnread", () => {
      it("deve contar corretamente as notificações não lidas", () => {
         const notifications = [
            { is_read: true },
            { is_read: false },
            { is_read: false },
         ] as AppNotification[];

         expect(countUnread(notifications)).toBe(2);
      });

      it("Sad Path: deve retornar 0 se receber array vazio ou nulo", () => {
         expect(countUnread([])).toBe(0);
         expect(countUnread(null)).toBe(0);
      });
   });

});
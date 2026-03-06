import { describe, it, expect } from "vitest";
import { OSCAR_NOMINEES_IDS } from "@/constants/oscar";

describe("OSCAR_NOMINEES_IDS", () => {
   it("é um array de números", () => {
      expect(Array.isArray(OSCAR_NOMINEES_IDS)).toBe(true);
      OSCAR_NOMINEES_IDS.forEach(id => {
         expect(typeof id).toBe("number");
      });
   });

   it("não contém duplicatas", () => {
      const uniqueIds = new Set(OSCAR_NOMINEES_IDS);
      expect(uniqueIds.size).toBe(OSCAR_NOMINEES_IDS.length);
   });

   it("todos os IDs são positivos", () => {
      OSCAR_NOMINEES_IDS.forEach(id => {
         expect(id).toBeGreaterThan(0);
      });
   });

   it("contém pelo menos um ID", () => {
      expect(OSCAR_NOMINEES_IDS.length).toBeGreaterThan(0);
   });
});

import { describe, it, expect } from "vitest";
import { getBadgeStyle } from "@/utils/badges";

describe("getBadgeStyle", () => {
   it("retorna badge correto para 'Assista com certeza'", () => {
      const result = getBadgeStyle("Assista com certeza");
      expect(result.bg).toBe("var(--badge-great)");
      expect(result.color).toBe("#0D0D0D");
   });

   it("retorna badge correto para 'Vale a pena assistir'", () => {
      const result = getBadgeStyle("Vale a pena assistir");
      expect(result.bg).toBe("var(--badge-good)");
      expect(result.color).toBe("#0D0D0D");
   });

   it("retorna badge correto para 'Tem filmes melhores, mas é legal'", () => {
      const result = getBadgeStyle("Tem filmes melhores, mas é legal");
      expect(result.bg).toBe("var(--badge-ok)");
      expect(result.color).toBe("#0D0D0D");
   });

   it("retorna badge correto para 'Não tão bom'", () => {
      const result = getBadgeStyle("Não tão bom");
      expect(result.bg).toBe("var(--badge-bad)");
      expect(result.color).toBe("#0D0D0D");
   });

   it("retorna badge correto para 'Não perca seu tempo'", () => {
      const result = getBadgeStyle("Não perca seu tempo");
      expect(result.bg).toBe("var(--badge-terrible)");
      expect(result.color).toBe("#F5F5F5");
   });

   it("retorna badge padrão para string vazia", () => {
      const result = getBadgeStyle("");
      expect(result.bg).toBe("var(--badge-default)");
      expect(result.color).toBe("#F5F5F5");
   });

   it("retorna badge padrão para texto desconhecido", () => {
      const result = getBadgeStyle("Texto qualquer");
      expect(result.bg).toBe("var(--badge-default)");
      expect(result.color).toBe("#F5F5F5");
   });

   it("funciona com case insensitive", () => {
      const result = getBadgeStyle("ASSISTA COM CERTEZA");
      expect(result.bg).toBe("var(--badge-great)");
   });

   it("funciona com espaços extras", () => {
      const result = getBadgeStyle("  Vale a pena assistir  ");
      expect(result.bg).toBe("var(--badge-good)");
   });
});

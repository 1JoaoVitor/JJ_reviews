import { describe, it, expect, vi, afterEach } from "vitest";
import { buildListShareUrl, generateDuplicateTitle, requiresImmediateCollaborators } from "../listSocial";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listSocial Logic", () => {
  it("deve gerar o título de cópia corretamente", () => {
    expect(generateDuplicateTitle("Favoritos")).toBe("Favoritos (Cópia)");
  });

  it("deve formatar a URL de compartilhamento corretamente", () => {
    const url = buildListShareUrl("123", "joao");
    expect(url).toBe(`${window.location.origin}/perfil/joao?aba=lists&listId=123`);
  });

  it("deve gerar URL com caminho raiz quando nao houver dono", () => {
    const url = buildListShareUrl("123", "");
    expect(url).toBe(`${window.location.origin}/?aba=lists&listId=123`);
  });

  it("deve usar origin fallback quando window nao estiver disponivel", () => {
    vi.stubGlobal("window", undefined);
    const url = buildListShareUrl("123", "joao");
    expect(url).toBe("https://jj-reviews.vercel.app/perfil/joao?aba=lists&listId=123");
  });

  it("deve identificar tipos que exigem colaboradores imediatos", () => {
    expect(requiresImmediateCollaborators("private")).toBe(false);
    expect(requiresImmediateCollaborators("partial_shared")).toBe(true);
    expect(requiresImmediateCollaborators("full_shared")).toBe(true);
  });
});
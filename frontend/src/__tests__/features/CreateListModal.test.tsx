import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateListModal } from "@/features/lists/components/CreateListModal/CreateListModal";
import type { CustomList } from "@/types";

// Mock do useAuth
vi.mock("@/features/auth", () => ({
   useAuth: () => ({
      session: { user: { id: "user-123" } },
   }),
}));

describe("CreateListModal", () => {
   let onHide: () => void;
   let onCreate: (name: string, description: string, type: "private" | "partial_shared" | "full_shared", collaboratorIds: string[]) => Promise<CustomList | null>;

   beforeEach(() => {
      onHide = vi.fn<() => void>();
      onCreate = vi.fn<(name: string, description: string, type: "private" | "partial_shared" | "full_shared", collaboratorIds: string[]) => Promise<CustomList | null>>().mockResolvedValue({ id: "new-list" } as CustomList);
   });

   it("renderiza título 'Nova Lista' quando aberto", () => {
      render(
         <CreateListModal show={true} onHide={onHide} onCreate={onCreate} />
      );
      expect(screen.getByText("Nova Lista")).toBeInTheDocument();
   });

   it("não renderiza quando show=false", () => {
      render(
         <CreateListModal show={false} onHide={onHide} onCreate={onCreate} />
      );
      expect(screen.queryByText("Nova Lista")).not.toBeInTheDocument();
   });

   it("exibe os três tipos de lista", () => {
      render(
         <CreateListModal show={true} onHide={onHide} onCreate={onCreate} />
      );
      expect(screen.getByText("Particular")).toBeInTheDocument();
      expect(screen.getByText("Colaborativa")).toBeInTheDocument();
      expect(screen.getByText("Unificada")).toBeInTheDocument();
   });

   it("começa com o tipo 'private' (Particular) selecionado", () => {
      render(
         <CreateListModal show={true} onHide={onHide} onCreate={onCreate} />
      );
      // Não deve mostrar seção de amigos quando tipo é particular
      expect(screen.queryByText("Convide seus amigos:")).not.toBeInTheDocument();
   });

   it("desabilita botão de submit quando nome está vazio", () => {
      render(
         <CreateListModal show={true} onHide={onHide} onCreate={onCreate} />
      );
      const submitBtn = screen.getByText("Criar Lista");
      expect(submitBtn).toBeDisabled();
   });

   it("habilita botão de submit quando nome é preenchido", async () => {
      render(
         <CreateListModal show={true} onHide={onHide} onCreate={onCreate} />
      );

      const nameInput = screen.getByPlaceholderText("Ex: Filmes de Terror Anos 80");
      await userEvent.type(nameInput, "Minha Lista de Testes");

      const submitBtn = screen.getByText("Criar Lista");
      expect(submitBtn).not.toBeDisabled();
   });

   it("nome tem maxLength de 50", () => {
      render(
         <CreateListModal show={true} onHide={onHide} onCreate={onCreate} />
      );
      const nameInput = screen.getByPlaceholderText("Ex: Filmes de Terror Anos 80");
      expect(nameInput).toHaveAttribute("maxLength", "50");
   });

   it("descrição tem maxLength de 200", () => {
      render(
         <CreateListModal show={true} onHide={onHide} onCreate={onCreate} />
      );
      const descInput = screen.getByPlaceholderText("Sobre o que é esta lista?");
      expect(descInput).toHaveAttribute("maxLength", "200");
   });

   it("mostra seção de amigos ao selecionar tipo compartilhado", async () => {
      render(
         <CreateListModal show={true} onHide={onHide} onCreate={onCreate} />
      );

      await userEvent.click(screen.getByText("Colaborativa"));
      expect(screen.getByText("Convide seus amigos:")).toBeInTheDocument();
   });

   it("esconde seção de amigos ao voltar para Particular", async () => {
      render(
         <CreateListModal show={true} onHide={onHide} onCreate={onCreate} />
      );

      await userEvent.click(screen.getByText("Colaborativa"));
      expect(screen.getByText("Convide seus amigos:")).toBeInTheDocument();

      await userEvent.click(screen.getByText("Particular"));
      expect(screen.queryByText("Convide seus amigos:")).not.toBeInTheDocument();
   });

   it("submete lista particular corretamente", async () => {
      render(
         <CreateListModal show={true} onHide={onHide} onCreate={onCreate} />
      );

      const nameInput = screen.getByPlaceholderText("Ex: Filmes de Terror Anos 80");
      await userEvent.type(nameInput, "Lista Teste");

      await userEvent.click(screen.getByText("Criar Lista"));

      expect(onCreate).toHaveBeenCalledWith(
         "Lista Teste",
         "",
         "private",
         []
      );
   });
});

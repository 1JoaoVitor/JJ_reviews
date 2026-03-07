import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditListModal } from "@/features/lists/components/EditListModal/EditListModal";
import type { CustomList } from "@/types";

const mockList: CustomList = {
   id: "list-1",
   owner_id: "user-1",
   name: "Minha Lista",
   description: "Descrição da lista",
   type: "private",
   created_at: "2025-01-01",
};

describe("EditListModal", () => {

   type OnUpdateType = (id: string, name: string, description: string, has_rating: boolean, rating_type: "manual" | "average" | null, manual_rating: number | null) => Promise<boolean>;
   let onHide: () => void;
   let onUpdate: OnUpdateType;

   beforeEach(() => {
      onHide = vi.fn<() => void>();
      onUpdate = vi.fn<OnUpdateType>().mockResolvedValue(true);
   });

   it("renderiza com os dados da lista pré-preenchidos", () => {
      render(
         <EditListModal show={true} onHide={onHide} onUpdate={onUpdate} list={mockList} />
      );

      expect(screen.getByText("Editar Lista")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Minha Lista")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Descrição da lista")).toBeInTheDocument();
   });

   it("não renderiza quando show=false", () => {
      render(
         <EditListModal show={false} onHide={onHide} onUpdate={onUpdate} list={mockList} />
      );
      expect(screen.queryByText("Editar Lista")).not.toBeInTheDocument();
   });

   it("chama onUpdate com os dados corretos ao submeter", async () => {
      render(
         <EditListModal show={true} onHide={onHide} onUpdate={onUpdate} list={mockList} />
      );

      const nameInput = screen.getByDisplayValue("Minha Lista");
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, "Lista Atualizada");

      await userEvent.click(screen.getByText("Salvar Alterações"));
      expect(onUpdate).toHaveBeenCalledWith("list-1", "Lista Atualizada", "Descrição da lista", false, null, null);
   });

   it("chama onHide ao clicar em Cancelar", async () => {
      render(
         <EditListModal show={true} onHide={onHide} onUpdate={onUpdate} list={mockList} />
      );

      await userEvent.click(screen.getByText("Cancelar"));
      expect(onHide).toHaveBeenCalledOnce();
   });

   it("não submete com nome vazio", async () => {
      render(
         <EditListModal show={true} onHide={onHide} onUpdate={onUpdate} list={mockList} />
      );

      const nameInput = screen.getByDisplayValue("Minha Lista");
      await userEvent.clear(nameInput);

      const saveBtn = screen.getByText("Salvar Alterações");
      expect(saveBtn).toBeDisabled();
   });

   it("respeita maxLength de 50 para o nome", () => {
      render(
         <EditListModal show={true} onHide={onHide} onUpdate={onUpdate} list={mockList} />
      );

      const nameInput = screen.getByDisplayValue("Minha Lista");
      expect(nameInput).toHaveAttribute("maxLength", "50");
   });

   it("respeita maxLength de 200 para a descrição", () => {
      render(
         <EditListModal show={true} onHide={onHide} onUpdate={onUpdate} list={mockList} />
      );

      const descInput = screen.getByDisplayValue("Descrição da lista");
      expect(descInput).toHaveAttribute("maxLength", "200");
   });

   it("exibe contador de caracteres para nome e descrição", () => {
      render(
         <EditListModal show={true} onHide={onHide} onUpdate={onUpdate} list={mockList} />
      );

      // "Minha Lista" tem 11 caracteres
      expect(screen.getByText("11/50")).toBeInTheDocument();
      // "Descrição da lista" tem 18 caracteres
      expect(screen.getByText("18/200")).toBeInTheDocument();
   });
});

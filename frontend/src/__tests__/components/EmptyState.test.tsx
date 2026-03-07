import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "@/components/ui/EmptyState/EmptyState";

describe("EmptyState", () => {
   it("renderiza título, mensagem e botão de ação", () => {
      render(
         <EmptyState
            title="Nenhum filme"
            message="Você ainda não adicionou filmes."
            actionText="Adicionar"
            onAction={vi.fn()}
         />
      );

      expect(screen.getByText("Nenhum filme")).toBeInTheDocument();
      expect(screen.getByText("Você ainda não adicionou filmes.")).toBeInTheDocument();
      expect(screen.getByText("Adicionar")).toBeInTheDocument();
   });

   it("chama onAction quando o botão é clicado", async () => {
      const onAction = vi.fn();
      render(
         <EmptyState
            title="Vazio"
            message="Nada aqui."
            actionText="Criar"
            onAction={onAction}
         />
      );

      await userEvent.click(screen.getByText("Criar"));
      expect(onAction).toHaveBeenCalledOnce();
   });
});

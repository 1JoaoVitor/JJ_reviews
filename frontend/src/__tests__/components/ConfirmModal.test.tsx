import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmModal } from "@/components/ui/ConfirmModal/ConfirmModal";

describe("ConfirmModal", () => {
   it("renderiza título e mensagem quando show=true", () => {
      render(
         <ConfirmModal
            show={true}
            onHide={vi.fn()}
            onConfirm={vi.fn()}
            title="Atenção"
            message="Tem certeza?"
            confirmText="Sim"
         />
      );

      expect(screen.getByText("Atenção")).toBeInTheDocument();
      expect(screen.getByText("Tem certeza?")).toBeInTheDocument();
   });

   it("não renderiza conteúdo quando show=false", () => {
      render(
         <ConfirmModal
            show={false}
            onHide={vi.fn()}
            onConfirm={vi.fn()}
            message="Teste"
         />
      );

      expect(screen.queryByText("Teste")).not.toBeInTheDocument();
   });

   it("chama onConfirm quando o botão de confirmação é clicado", async () => {
      const onConfirm = vi.fn();
      render(
         <ConfirmModal
            show={true}
            onHide={vi.fn()}
            onConfirm={onConfirm}
            message="Excluir?"
            confirmText="Sim, excluir"
         />
      );

      await userEvent.click(screen.getByText("Sim, excluir"));
      expect(onConfirm).toHaveBeenCalledOnce();
   });

   it("chama onHide quando o botão Cancelar é clicado", async () => {
      const onHide = vi.fn();
      render(
         <ConfirmModal
            show={true}
            onHide={onHide}
            onConfirm={vi.fn()}
            message="Excluir?"
         />
      );

      await userEvent.click(screen.getByText("Cancelar"));
      expect(onHide).toHaveBeenCalledOnce();
   });

   it("desabilita botões quando isProcessing=true", () => {
      render(
         <ConfirmModal
            show={true}
            onHide={vi.fn()}
            onConfirm={vi.fn()}
            message="Processando..."
            isProcessing={true}
         />
      );

      expect(screen.getByText("Cancelar")).toBeDisabled();
   });

   it("usa título padrão 'Atenção' quando title não é fornecido", () => {
      render(
         <ConfirmModal
            show={true}
            onHide={vi.fn()}
            onConfirm={vi.fn()}
            message="Mensagem"
         />
      );

      expect(screen.getByText("Atenção")).toBeInTheDocument();
   });

   it("usa texto padrão 'Sim, excluir' quando confirmText não é fornecido", () => {
      render(
         <ConfirmModal
            show={true}
            onHide={vi.fn()}
            onConfirm={vi.fn()}
            message="Mensagem"
         />
      );

      expect(screen.getByText("Sim, excluir")).toBeInTheDocument();
   });
});

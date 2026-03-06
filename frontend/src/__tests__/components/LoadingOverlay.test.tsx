import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay/LoadingOverlay";

describe("LoadingOverlay", () => {
   it("renderiza com mensagem padrão 'Carregando...'", () => {
      render(<LoadingOverlay />);
      expect(screen.getByText("Carregando...")).toBeInTheDocument();
   });

   it("renderiza com mensagem personalizada", () => {
      render(<LoadingOverlay message="Gerando imagem..." />);
      expect(screen.getByText("Gerando imagem...")).toBeInTheDocument();
   });

   it("contém spinner de carregamento", () => {
      render(<LoadingOverlay />);
      const spinner = document.querySelector(".spinner-border");
      expect(spinner).toBeInTheDocument();
   });
});

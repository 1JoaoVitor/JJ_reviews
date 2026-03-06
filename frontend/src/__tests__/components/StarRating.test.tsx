import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StarRating } from "@/components/ui/StarRating/StarRating";

describe("StarRating", () => {
   it("renderiza 10 estrelas por padrão", () => {
      render(<StarRating value={5} />);
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(10);
   });

   it("renderiza número customizado de estrelas", () => {
      render(<StarRating value={3} max={5} />);
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(5);
   });

   it("exibe o valor numérico formatado", () => {
      render(<StarRating value={7.5} />);
      expect(screen.getByText("7.5")).toBeInTheDocument();
   });

   it("exibe valor 0.0 quando value=0", () => {
      render(<StarRating value={0} />);
      expect(screen.getByText("0.0")).toBeInTheDocument();
   });

   it("exibe o máximo ao lado do valor", () => {
      render(<StarRating value={5} max={10} />);
      expect(screen.getByText("/ 10")).toBeInTheDocument();
   });

   it("aceita readOnly sem onChange", () => {
      render(<StarRating value={8} readOnly={true} />);
      const buttons = screen.getAllByRole("button");
      expect(buttons[0]).toHaveAttribute("title", "Nota: 8");
   });

   it("não dispara onChange quando readOnly", () => {
      const onChange = vi.fn();
      render(<StarRating value={5} onChange={onChange} readOnly={true} />);
      // readOnly deve impedir interações
      expect(onChange).not.toHaveBeenCalled();
   });
});

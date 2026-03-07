import { describe, it, expect } from "vitest";
import { render} from "@testing-library/react";
import { Footer } from "@/components/layout/Footer/Footer";

describe("Footer", () => {
   it("renderiza sem crash", () => {
      const { container } = render(<Footer />);
      expect(container).toBeTruthy();
   });
});

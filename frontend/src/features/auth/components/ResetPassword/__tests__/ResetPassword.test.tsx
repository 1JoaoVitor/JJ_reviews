import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
   navigateMock,
   getCurrentSessionMock,
   updateCurrentUserPasswordMock,
   toastSuccessMock,
   toastErrorMock,
} = vi.hoisted(() => ({
   navigateMock: vi.fn(),
   getCurrentSessionMock: vi.fn(),
   updateCurrentUserPasswordMock: vi.fn(),
   toastSuccessMock: vi.fn(),
   toastErrorMock: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
   useNavigate: () => navigateMock,
}));

vi.mock("react-hot-toast", () => ({
   default: {
      success: toastSuccessMock,
      error: toastErrorMock,
   },
}));

vi.mock("../../../services/authService", () => ({
   getCurrentSession: getCurrentSessionMock,
   updateCurrentUserPassword: updateCurrentUserPasswordMock,
}));

import { ResetPassword } from "../ResetPassword";

describe("ResetPassword", () => {
   beforeEach(() => {
      vi.clearAllMocks();
   });

   it("redirects to home when recovery session is missing", async () => {
      getCurrentSessionMock.mockResolvedValue(null);

      render(<ResetPassword />);

      await waitFor(() => {
         expect(toastErrorMock).toHaveBeenCalledWith("Link de recuperação inválido ou expirado.");
         expect(navigateMock).toHaveBeenCalledWith("/");
      });
   });

   it("updates password and redirects to home", async () => {
      getCurrentSessionMock.mockResolvedValue({ user: { id: "u1" } });
      updateCurrentUserPasswordMock.mockResolvedValue(undefined);

      render(<ResetPassword />);

      const passwordInputs = await screen.findAllByPlaceholderText("••••••••");
      await userEvent.type(passwordInputs[0], "123456");
      await userEvent.type(passwordInputs[1], "123456");

      await userEvent.click(screen.getByRole("button", { name: "Salvar Nova Senha" }));

      await waitFor(() => {
         expect(updateCurrentUserPasswordMock).toHaveBeenCalledWith("123456");
         expect(toastSuccessMock).toHaveBeenCalledWith("Senha alterada com sucesso! Bem-vindo de volta.");
         expect(navigateMock).toHaveBeenCalledWith("/");
      });
   });
});

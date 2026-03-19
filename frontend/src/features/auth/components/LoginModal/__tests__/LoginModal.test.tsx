import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

const {
   getEmailByUsernameMock,
   signInWithEmailPasswordMock,
   isUsernameTakenMock,
   signUpWithUsernameMock,
   sendResetPasswordLinkMock,
   toastSuccessMock,
   toastErrorMock,
} = vi.hoisted(() => ({
   getEmailByUsernameMock: vi.fn(),
   signInWithEmailPasswordMock: vi.fn(),
   isUsernameTakenMock: vi.fn(),
   signUpWithUsernameMock: vi.fn(),
   sendResetPasswordLinkMock: vi.fn(),
   toastSuccessMock: vi.fn(),
   toastErrorMock: vi.fn(),
}));

vi.mock("@/hooks/useModalBack", () => ({
   useModalBack: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
   default: {
      success: toastSuccessMock,
      error: toastErrorMock,
   },
}));

vi.mock("../../../services/authService", () => ({
   getEmailByUsername: getEmailByUsernameMock,
   signInWithEmailPassword: signInWithEmailPasswordMock,
   isUsernameTaken: isUsernameTakenMock,
   signUpWithUsername: signUpWithUsernameMock,
   sendResetPasswordLink: sendResetPasswordLinkMock,
}));

import { LoginModal } from "../LoginModal";

describe("LoginModal", () => {
   beforeEach(() => {
      vi.clearAllMocks();
   });

   it("logs in using username via auth service", async () => {
      const onHide = vi.fn();
      getEmailByUsernameMock.mockResolvedValue("user@mail.com");
      signInWithEmailPasswordMock.mockResolvedValue(undefined);

      render(<LoginModal show onHide={onHide} />);

      await userEvent.type(
         screen.getByPlaceholderText("Ex: usuario_reviews99 ou email@exemplo.com"),
         "usuario"
      );
      await userEvent.type(screen.getByPlaceholderText("••••••••"), "123456");
      await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

      await waitFor(() => {
         expect(getEmailByUsernameMock).toHaveBeenCalledWith("usuario");
         expect(signInWithEmailPasswordMock).toHaveBeenCalledWith("user@mail.com", "123456");
         expect(toastSuccessMock).toHaveBeenCalled();
         expect(onHide).toHaveBeenCalled();
      });
   });

   it("shows error when username is not found", async () => {
      const onHide = vi.fn();
      getEmailByUsernameMock.mockResolvedValue(null);

      render(<LoginModal show onHide={onHide} />);

      await userEvent.type(
         screen.getByPlaceholderText("Ex: usuario_reviews99 ou email@exemplo.com"),
         "inexistente"
      );
      await userEvent.type(screen.getByPlaceholderText("••••••••"), "123456");
      await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

      await waitFor(() => {
         expect(getEmailByUsernameMock).toHaveBeenCalledWith("inexistente");
         expect(signInWithEmailPasswordMock).not.toHaveBeenCalled();
         expect(toastErrorMock).toHaveBeenCalledWith(
            "Usuário não encontrado. Verifique o nome ou use o seu email."
         );
         expect(onHide).not.toHaveBeenCalled();
      });
   });

   it("registers a new user through auth service", async () => {
      const onHide = vi.fn();
      isUsernameTakenMock.mockResolvedValue(false);
      signUpWithUsernameMock.mockResolvedValue(undefined);

      render(<LoginModal show onHide={onHide} />);

      await userEvent.click(screen.getByRole("button", { name: "Registre-se" }));

      await userEvent.type(screen.getByPlaceholderText("Ex: usuario_reviews99"), "novo_user");
      await userEvent.type(screen.getByPlaceholderText("seu@email.com"), "novo@user.com");

      const passwordInputs = screen.getAllByPlaceholderText("••••••••");
      await userEvent.type(passwordInputs[0], "123456");
      await userEvent.type(passwordInputs[1], "123456");

      await userEvent.click(screen.getByRole("button", { name: "Criar Conta" }));

      await waitFor(() => {
         expect(isUsernameTakenMock).toHaveBeenCalledWith("novo_user");
         expect(signUpWithUsernameMock).toHaveBeenCalledWith("novo@user.com", "123456", "novo_user");
         expect(toastSuccessMock).toHaveBeenCalled();
         expect(onHide).toHaveBeenCalled();
      });
   });

   it("sends password recovery link", async () => {
      const onHide = vi.fn();
      sendResetPasswordLinkMock.mockResolvedValue(undefined);

      render(<LoginModal show onHide={onHide} />);

      await userEvent.click(screen.getByRole("button", { name: "Esqueceu a senha?" }));
      await userEvent.type(screen.getByPlaceholderText("seu@email.com"), "recuperar@user.com");
      await userEvent.click(screen.getByRole("button", { name: "Enviar Link de Recuperação" }));

      await waitFor(() => {
         expect(sendResetPasswordLinkMock).toHaveBeenCalledWith(
            "recuperar@user.com",
            `${window.location.origin}/reset-password`
         );
         expect(toastSuccessMock).toHaveBeenCalled();
         expect(onHide).not.toHaveBeenCalled();
      });
   });
});

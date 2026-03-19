import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
   searchMoviesMock,
   getMovieDetailsMock,
   getAuthenticatedUserMock,
   getExistingProfileReviewMock,
   upsertPersonalReviewMock,
   toastSuccessMock,
   toastErrorMock,
} = vi.hoisted(() => ({
   searchMoviesMock: vi.fn(),
   getMovieDetailsMock: vi.fn(),
   getAuthenticatedUserMock: vi.fn(),
   getExistingProfileReviewMock: vi.fn(),
   upsertPersonalReviewMock: vi.fn(),
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

vi.mock("../../../services/tmdbService", () => ({
   searchMovies: searchMoviesMock,
   getMovieDetails: getMovieDetailsMock,
}));

vi.mock("../../../services/moviePersistenceService", () => ({
   getAuthenticatedUser: getAuthenticatedUserMock,
   getExistingProfileReview: getExistingProfileReviewMock,
   hasUserReview: vi.fn(),
   syncReviewToListMembers: vi.fn(),
   uploadReviewAttachment: vi.fn(),
   upsertFullSharedListReview: vi.fn(),
   upsertPartialSharedListReview: vi.fn(),
   upsertPersonalReview: upsertPersonalReviewMock,
}));

vi.mock("@/features/lists", () => ({
   CreateListModal: () => null,
}));

import { AddMovieModal } from "../AddMovieModal";

describe("AddMovieModal", () => {
   beforeEach(() => {
      vi.clearAllMocks();
   });

   it("searches, selects and saves personal review through service", async () => {
      searchMoviesMock.mockResolvedValue([
         { id: 10, title: "Matrix", release_date: "1999-03-31", poster_path: null },
      ]);
      getMovieDetailsMock.mockResolvedValue({ runtime: 136 });
      getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
      getExistingProfileReviewMock.mockResolvedValue(null);
      upsertPersonalReviewMock.mockResolvedValue(undefined);

      const onHide = vi.fn();
      const onSuccess = vi.fn();

      render(
         <AddMovieModal
            show
            onHide={onHide}
            onSuccess={onSuccess}
            lists={[]}
            addMovieToList={vi.fn().mockResolvedValue({ success: true, error: null })}
            createList={vi.fn().mockResolvedValue({ success: true, data: null, error: null })}
         />
      );

      await userEvent.type(screen.getByPlaceholderText("Digite o nome do filme..."), "Matrix");
      await userEvent.click(screen.getByRole("button", { name: /Buscar/ }));

      await screen.findByText("Matrix");
      await userEvent.click(screen.getByText(/Selecionar/));

      await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => {
         expect(upsertPersonalReviewMock).toHaveBeenCalledWith(
            "u1",
            10,
            expect.objectContaining({ runtime: 136, status: "watched" })
         );
         expect(onSuccess).toHaveBeenCalled();
         expect(onHide).toHaveBeenCalled();
      });
   });

   it("shows error and skips save when user is unauthenticated", async () => {
      searchMoviesMock.mockResolvedValue([
         { id: 11, title: "Interstellar", release_date: "2014-11-07", poster_path: null },
      ]);
      getMovieDetailsMock.mockResolvedValue({ runtime: 169 });
      getAuthenticatedUserMock.mockResolvedValue(null);

      const onHide = vi.fn();
      const onSuccess = vi.fn();

      render(
         <AddMovieModal
            show
            onHide={onHide}
            onSuccess={onSuccess}
            lists={[]}
            addMovieToList={vi.fn().mockResolvedValue({ success: true, error: null })}
            createList={vi.fn().mockResolvedValue({ success: true, data: null, error: null })}
         />
      );

      await userEvent.type(screen.getByPlaceholderText("Digite o nome do filme..."), "Interstellar");
      await userEvent.click(screen.getByRole("button", { name: /Buscar/ }));

      await screen.findByText("Interstellar");
      await userEvent.click(screen.getByText(/Selecionar/));

      await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => {
         expect(toastErrorMock).toHaveBeenCalledWith("Você precisa estar logado para adicionar filmes.");
         expect(upsertPersonalReviewMock).not.toHaveBeenCalled();
         expect(onSuccess).not.toHaveBeenCalled();
         expect(onHide).not.toHaveBeenCalled();
      });
   });
});

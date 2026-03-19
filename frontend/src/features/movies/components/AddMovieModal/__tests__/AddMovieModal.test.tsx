import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
   searchMoviesMock,
   getMovieDetailsMock,
   getAuthenticatedUserMock,
   hasUserReviewMock,
   getExistingProfileReviewMock,
   upsertPersonalReviewMock,
   upsertFullSharedListReviewMock,
   upsertPartialSharedListReviewMock,
   syncReviewToListMembersMock,
   toastSuccessMock,
   toastErrorMock,
} = vi.hoisted(() => ({
   searchMoviesMock: vi.fn(),
   getMovieDetailsMock: vi.fn(),
   getAuthenticatedUserMock: vi.fn(),
    hasUserReviewMock: vi.fn(),
   getExistingProfileReviewMock: vi.fn(),
   upsertPersonalReviewMock: vi.fn(),
    upsertFullSharedListReviewMock: vi.fn(),
    upsertPartialSharedListReviewMock: vi.fn(),
    syncReviewToListMembersMock: vi.fn(),
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
   hasUserReview: hasUserReviewMock,
   syncReviewToListMembers: syncReviewToListMembersMock,
   uploadReviewAttachment: vi.fn(),
   upsertFullSharedListReview: upsertFullSharedListReviewMock,
   upsertPartialSharedListReview: upsertPartialSharedListReviewMock,
   upsertPersonalReview: upsertPersonalReviewMock,
}));

vi.mock("@/features/lists", () => ({
   CreateListModal: () => null,
}));

import { AddMovieModal } from "../AddMovieModal";

describe("AddMovieModal", () => {
   beforeEach(() => {
      vi.clearAllMocks();
      hasUserReviewMock.mockResolvedValue(true);
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
   }, 15000);

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

      await waitFor(() => {
         expect(screen.getByRole("button", { name: "Salvar" })).not.toBeDisabled();
      });
   }, 15000);

   it("saves into full shared list and triggers sync when auto_sync is enabled", async () => {
      searchMoviesMock.mockResolvedValue([
         { id: 20, title: "Avatar", release_date: "2009-12-18", poster_path: null },
      ]);
      getMovieDetailsMock.mockResolvedValue({ runtime: 162 });
      getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
      getExistingProfileReviewMock.mockResolvedValue(null);
      upsertPersonalReviewMock.mockResolvedValue(undefined);
      upsertFullSharedListReviewMock.mockResolvedValue(undefined);
      syncReviewToListMembersMock.mockResolvedValue(undefined);

      const onHide = vi.fn();
      const onSuccess = vi.fn();
      const addMovieToList = vi.fn().mockResolvedValue({ success: true, error: null });

      render(
         <AddMovieModal
            show
            onHide={onHide}
            onSuccess={onSuccess}
            lists={[
               {
                  id: "l1",
                  owner_id: "u1",
                  name: "Full Shared",
                  type: "full_shared",
                  auto_sync: true,
                  created_at: "2026-03-18",
               },
            ]}
            addMovieToList={addMovieToList}
            createList={vi.fn().mockResolvedValue({ success: true, data: null, error: null })}
            preselectedListId="l1"
         />
      );

      await userEvent.type(screen.getByPlaceholderText("Digite o nome do filme..."), "Avatar");
      await userEvent.click(screen.getByRole("button", { name: /Buscar/ }));
      await screen.findByText("Avatar");
      await userEvent.click(screen.getByText(/Selecionar/));
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => {
         expect(addMovieToList).toHaveBeenCalledWith("l1", 20);
         expect(upsertFullSharedListReviewMock).toHaveBeenCalledWith(
            "l1",
            20,
            expect.objectContaining({ rating: 5 })
         );
         expect(syncReviewToListMembersMock).toHaveBeenCalledWith(
            expect.objectContaining({ listId: "l1", tmdbId: 20, addedBy: "u1" })
         );
      });
   }, 15000);

   it("saves into partial shared list without sync when auto_sync is disabled", async () => {
      searchMoviesMock.mockResolvedValue([
         { id: 30, title: "Dune", release_date: "2021-10-22", poster_path: null },
      ]);
      getMovieDetailsMock.mockResolvedValue({ runtime: 155 });
      getAuthenticatedUserMock.mockResolvedValue({ id: "u1" });
      getExistingProfileReviewMock.mockResolvedValue(null);
      upsertPersonalReviewMock.mockResolvedValue(undefined);
      upsertPartialSharedListReviewMock.mockResolvedValue(undefined);
      syncReviewToListMembersMock.mockResolvedValue(undefined);

      const addMovieToList = vi.fn().mockResolvedValue({ success: true, error: null });

      render(
         <AddMovieModal
            show
            onHide={vi.fn()}
            onSuccess={vi.fn()}
            lists={[
               {
                  id: "l2",
                  owner_id: "u1",
                  name: "Partial Shared",
                  type: "partial_shared",
                  auto_sync: false,
                  created_at: "2026-03-18",
               },
            ]}
            addMovieToList={addMovieToList}
            createList={vi.fn().mockResolvedValue({ success: true, data: null, error: null })}
            preselectedListId="l2"
         />
      );

      await userEvent.type(screen.getByPlaceholderText("Digite o nome do filme..."), "Dune");
      await userEvent.click(screen.getByRole("button", { name: /Buscar/ }));
      await screen.findByText("Dune");
      await userEvent.click(screen.getByText(/Selecionar/));
      await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

      await waitFor(() => {
         expect(addMovieToList).toHaveBeenCalledWith("l2", 30);
         expect(upsertPartialSharedListReviewMock).toHaveBeenCalledWith(
            "l2",
            30,
            "u1",
            expect.objectContaining({ runtime: 155 })
         );
         expect(syncReviewToListMembersMock).not.toHaveBeenCalled();
      });
   }, 15000);
});

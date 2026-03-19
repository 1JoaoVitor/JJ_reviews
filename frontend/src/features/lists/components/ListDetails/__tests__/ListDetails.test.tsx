import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
   fetchListMovieIdsMock,
   fetchListOwnerProfileMock,
   fetchListCollaboratorsMock,
   subscribeListDetailsChangesMock,
   acceptListInviteMock,
   deleteUserListReviewsMock,
   removeUserFromListCollaboratorsMock,
   toastSuccessMock,
   toastErrorMock,
} = vi.hoisted(() => ({
   fetchListMovieIdsMock: vi.fn(),
   fetchListOwnerProfileMock: vi.fn(),
   fetchListCollaboratorsMock: vi.fn(),
   subscribeListDetailsChangesMock: vi.fn(),
   acceptListInviteMock: vi.fn(),
   deleteUserListReviewsMock: vi.fn(),
   removeUserFromListCollaboratorsMock: vi.fn(),
   toastSuccessMock: vi.fn(),
   toastErrorMock: vi.fn(),
}));

vi.mock("@/features/movies/services/tmdbService", () => ({
   enrichMovieWithTmdb: vi.fn(),
}));

vi.mock("@/features/movies", () => ({
   MovieCard: () => <div>movie-card</div>,
}));

vi.mock("@/components/ui/ConfirmModal/ConfirmModal", () => ({
   ConfirmModal: ({ show, confirmText, onConfirm }: { show: boolean; confirmText?: string; onConfirm: () => void }) =>
      show ? <button onClick={onConfirm}>{confirmText || "confirmar"}</button> : null,
}));

vi.mock("../EditListModal/EditListModal", () => ({
   EditListModal: () => null,
}));

vi.mock("react-hot-toast", () => ({
   toast: {
      success: toastSuccessMock,
      error: toastErrorMock,
   },
}));

vi.mock("../../../services/listsService", () => ({
   acceptListInvite: acceptListInviteMock,
   deleteListRecord: vi.fn(),
   deleteUserListReviews: deleteUserListReviewsMock,
   fetchListCollaborators: fetchListCollaboratorsMock,
   fetchListMovieIds: fetchListMovieIdsMock,
   fetchListOwnerProfile: fetchListOwnerProfileMock,
   fetchPrivateListReviews: vi.fn(),
   fetchSharedListReviews: vi.fn(),
   rejectListInvite: vi.fn(),
   removeUserFromListCollaborators: removeUserFromListCollaboratorsMock,
   subscribeListDetailsChanges: subscribeListDetailsChangesMock,
}));

import { ListDetails } from "../ListDetails";

describe("ListDetails", () => {
   beforeEach(() => {
      vi.clearAllMocks();
      fetchListMovieIdsMock.mockResolvedValue([]);
      fetchListOwnerProfileMock.mockResolvedValue({ username: "owner", avatar_url: "owner.png" });
      fetchListCollaboratorsMock.mockResolvedValue([
         {
            user_id: "u2",
            status: "pending",
            user: { id: "u2", username: "guest", avatar_url: "guest.png" },
         },
      ]);
      subscribeListDetailsChangesMock.mockReturnValue(() => undefined);
      acceptListInviteMock.mockResolvedValue(undefined);
      deleteUserListReviewsMock.mockResolvedValue(undefined);
      removeUserFromListCollaboratorsMock.mockResolvedValue(undefined);
   });

   it("accepts pending invite through service", async () => {
      render(
         <ListDetails
            list={{
               id: "l1",
               owner_id: "u1",
               name: "Lista Colab",
               type: "partial_shared",
               created_at: "2026-03-18",
            }}
            allMovies={[]}
            currentUserId="u2"
            onBack={vi.fn()}
            onListDeleted={vi.fn()}
            onListUpdated={vi.fn()}
            onUpdateList={vi.fn().mockResolvedValue({ success: true, error: null })}
            onRemoveMovie={vi.fn().mockResolvedValue({ success: true, error: null })}
            onAddMovieClick={vi.fn()}
            onMovieClick={vi.fn()}
         />
      );

      const acceptButton = await screen.findByRole("button", { name: /Aceitar Convite/ });
      await userEvent.click(acceptButton);

      await waitFor(() => {
         expect(acceptListInviteMock).toHaveBeenCalledWith("l1", "u2");
         expect(toastSuccessMock).toHaveBeenCalled();
      });
   });

   it("shows error when accepting invite fails", async () => {
      acceptListInviteMock.mockRejectedValue(new Error("boom"));

      render(
         <ListDetails
            list={{
               id: "l1",
               owner_id: "u1",
               name: "Lista Colab",
               type: "partial_shared",
               created_at: "2026-03-18",
            }}
            allMovies={[]}
            currentUserId="u2"
            onBack={vi.fn()}
            onListDeleted={vi.fn()}
            onListUpdated={vi.fn()}
            onUpdateList={vi.fn().mockResolvedValue({ success: true, error: null })}
            onRemoveMovie={vi.fn().mockResolvedValue({ success: true, error: null })}
            onAddMovieClick={vi.fn()}
            onMovieClick={vi.fn()}
         />
      );

      const acceptButton = await screen.findByRole("button", { name: /Aceitar Convite/ });
      await userEvent.click(acceptButton);

      await waitFor(() => {
         expect(acceptListInviteMock).toHaveBeenCalledWith("l1", "u2");
         expect(toastErrorMock).toHaveBeenCalledWith("Erro ao aceitar convite.");
      });
   });

   it("lets accepted collaborator leave list", async () => {
      fetchListCollaboratorsMock.mockResolvedValue([
         {
            user_id: "u2",
            status: "accepted",
            user: { id: "u2", username: "guest", avatar_url: "guest.png" },
         },
      ]);

      const onBack = vi.fn();
      const onListDeleted = vi.fn();

      render(
         <ListDetails
            list={{
               id: "l1",
               owner_id: "u1",
               name: "Lista Colab",
               type: "partial_shared",
               created_at: "2026-03-18",
            }}
            allMovies={[]}
            currentUserId="u2"
            onBack={onBack}
            onListDeleted={onListDeleted}
            onListUpdated={vi.fn()}
            onUpdateList={vi.fn().mockResolvedValue({ success: true, error: null })}
            onRemoveMovie={vi.fn().mockResolvedValue({ success: true, error: null })}
            onAddMovieClick={vi.fn()}
            onMovieClick={vi.fn()}
         />
      );

      await userEvent.click(await screen.findByTitle("Sair da Lista"));
      await userEvent.click(screen.getByRole("button", { name: "Sim, sair" }));

      await waitFor(() => {
         expect(deleteUserListReviewsMock).toHaveBeenCalledWith("l1", "u2");
         expect(removeUserFromListCollaboratorsMock).toHaveBeenCalledWith("l1", "u2");
         expect(onBack).toHaveBeenCalled();
         expect(onListDeleted).toHaveBeenCalled();
      });
   });

   it("lets owner remove an accepted member", async () => {
      fetchListCollaboratorsMock.mockResolvedValue([
         {
            user_id: "u3",
            status: "accepted",
            user: { id: "u3", username: "membro", avatar_url: "membro.png" },
         },
      ]);

      render(
         <ListDetails
            list={{
               id: "l1",
               owner_id: "u1",
               name: "Lista Colab",
               type: "partial_shared",
               created_at: "2026-03-18",
            }}
            allMovies={[]}
            currentUserId="u1"
            onBack={vi.fn()}
            onListDeleted={vi.fn()}
            onListUpdated={vi.fn()}
            onUpdateList={vi.fn().mockResolvedValue({ success: true, error: null })}
            onRemoveMovie={vi.fn().mockResolvedValue({ success: true, error: null })}
            onAddMovieClick={vi.fn()}
            onMovieClick={vi.fn()}
         />
      );

      await userEvent.click(await screen.findByTitle("Clique para remover membro"));
      await userEvent.click(screen.getByRole("button", { name: "Sim, remover" }));

      await waitFor(() => {
         expect(deleteUserListReviewsMock).toHaveBeenCalledWith("l1", "u3");
         expect(removeUserFromListCollaboratorsMock).toHaveBeenCalledWith("l1", "u3");
      });
   });
});

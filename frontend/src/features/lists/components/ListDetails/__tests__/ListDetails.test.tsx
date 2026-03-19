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
   navigateMock,
   fetchListLikersMock,
   fetchFriendshipsForTargetsMock,
   createFriendRequestMock,
   notifyFriendRequestMock,
   acceptFriendRequestSocialMock,
   notifyFriendAcceptedMock,
   deleteIncomingFriendRequestMock,
   deleteFriendshipBetweenMock,
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
   navigateMock: vi.fn(),
   fetchListLikersMock: vi.fn(),
   fetchFriendshipsForTargetsMock: vi.fn(),
   createFriendRequestMock: vi.fn(),
   notifyFriendRequestMock: vi.fn(),
   acceptFriendRequestSocialMock: vi.fn(),
   notifyFriendAcceptedMock: vi.fn(),
   deleteIncomingFriendRequestMock: vi.fn(),
   deleteFriendshipBetweenMock: vi.fn(),
}));

vi.mock("@/features/movies/services/tmdbService", () => ({
   enrichMovieWithTmdb: vi.fn(),
}));

vi.mock("@/features/movies", () => ({
   MovieCard: () => <div>movie-card</div>,
}));

vi.mock("@/components/ui/ConfirmModal/ConfirmModal", () => ({
   ConfirmModal: ({ show, confirmText, onConfirm }: { show: boolean; confirmText?: string; onConfirm: () => void }) =>
      show ? (
         <button
            data-testid={`confirm-${(confirmText || "confirmar").toLowerCase().replace(/\s+/g, "-")}`}
            onClick={onConfirm}
         >
            {confirmText || "confirmar"}
         </button>
      ) : null,
}));

vi.mock("../../EditListModal/EditListModal", () => ({
   EditListModal: () => null,
}));

vi.mock("../../DuplicateListModal/DuplicateListModal", () => ({
   DuplicateListModal: () => null,
}));

vi.mock("react-hot-toast", () => ({
   toast: {
      success: toastSuccessMock,
      error: toastErrorMock,
   },
}));

vi.mock("react-router-dom", () => ({
   useNavigate: () => navigateMock,
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

vi.mock("../../../services/listSocialService", () => ({
   toggleListLike: vi.fn(),
   cloneListService: vi.fn(),
   fetchListLikers: fetchListLikersMock,
}));

vi.mock("@/features/friends/services/friendshipService", () => ({
   fetchFriendshipsForTargets: fetchFriendshipsForTargetsMock,
   createFriendRequest: createFriendRequestMock,
   notifyFriendRequest: notifyFriendRequestMock,
   acceptFriendRequest: acceptFriendRequestSocialMock,
   notifyFriendAccepted: notifyFriendAcceptedMock,
   deleteIncomingFriendRequest: deleteIncomingFriendRequestMock,
   deleteFriendshipBetween: deleteFriendshipBetweenMock,
}));

import { ListDetails } from "../ListDetails";

describe("ListDetails", () => {
   beforeEach(() => {
      vi.clearAllMocks();
      navigateMock.mockReset();
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
      fetchListLikersMock.mockResolvedValue([]);
      fetchFriendshipsForTargetsMock.mockResolvedValue([]);
      createFriendRequestMock.mockResolvedValue(undefined);
      notifyFriendRequestMock.mockResolvedValue(undefined);
      acceptFriendRequestSocialMock.mockResolvedValue(undefined);
      notifyFriendAcceptedMock.mockResolvedValue(undefined);
      deleteIncomingFriendRequestMock.mockResolvedValue(undefined);
      deleteFriendshipBetweenMock.mockResolvedValue(undefined);
   });

   it("opens likes modal and navigates to liker profile", async () => {
      fetchListLikersMock.mockResolvedValue([
         {
            id: "u9",
            username: "fan",
            avatar_url: null,
            liked_at: "2026-03-19T12:00:00.000Z",
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
               likes_count: 1,
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

      await userEvent.click(await screen.findByRole("button", { name: /Ver curtidas/i }));

      await waitFor(() => {
         expect(fetchListLikersMock).toHaveBeenCalledWith("l1");
      });

      const likerLabel = await screen.findByText("@fan");
      const likerRow = likerLabel.closest('[role="button"]');
      expect(likerRow).not.toBeNull();

      if (likerRow) {
         await userEvent.click(likerRow);
      }

      await waitFor(() => {
         expect(navigateMock).toHaveBeenCalledWith("/perfil/fan");
      });
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

      const acceptButton = await screen.findByRole("button", { name: /Aceitar/i });
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

      const acceptButton = await screen.findByRole("button", { name: /Aceitar/i });
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

      await userEvent.click(await screen.findByTestId("leave-list-action"));
      await userEvent.click(screen.getByTestId("confirm-sair"));

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

      await userEvent.click(await screen.findByTestId("remove-member-u3"));
      await userEvent.click(screen.getByTestId("confirm-remover"));

      await waitFor(() => {
         expect(deleteUserListReviewsMock).toHaveBeenCalledWith("l1", "u3");
         expect(removeUserFromListCollaboratorsMock).toHaveBeenCalledWith("l1", "u3");
      });
   });
});

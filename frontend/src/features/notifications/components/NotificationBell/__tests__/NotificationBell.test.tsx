import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigateMock, markAsReadMock, markAllAsReadMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  markAsReadMock: vi.fn(),
  markAllAsReadMock: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/features/notifications/hooks/useNotifications", () => ({
  useNotifications: vi.fn(() => ({
    notifications: [
      {
        id: "n1",
        user_id: "u1",
        sender_id: "u2",
        type: "movie_added",
        message: "registrou um filme no diary",
        is_read: false,
        created_at: new Date().toISOString(),
        sender: {
          username: "amigo",
          avatar_url: null,
        },
      },
    ],
    unreadCount: 1,
    loading: false,
    markAsRead: markAsReadMock,
    markAllAsRead: markAllAsReadMock,
  })),
}));

import { NotificationBell } from "../NotificationBell";

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navigates to /social when clicking movie_added notification", async () => {
    render(<NotificationBell userId="u1" />);

    await userEvent.click(screen.getByRole("button"));

    const notificationMessage = await screen.findByText((content) => content.includes("registrou um filme no diary"));
    await userEvent.click(notificationMessage.closest("div") || notificationMessage);

    expect(markAsReadMock).toHaveBeenCalledWith("n1");
    expect(navigateMock).toHaveBeenCalledWith("/social");
  });
});

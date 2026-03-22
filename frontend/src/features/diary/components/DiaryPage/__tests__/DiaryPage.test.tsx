import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  navigateMock,
  getMovieDetailsMock,
  useDiaryMock,
  useFriendDiaryActivitiesMock,
  fromMock,
  selectMock,
  orMock,
  inMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  getMovieDetailsMock: vi.fn(),
  useDiaryMock: vi.fn(),
  useFriendDiaryActivitiesMock: vi.fn(),
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  orMock: vi.fn(),
  inMock: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/features/movies/services/tmdbService", () => ({
  getMovieDetails: getMovieDetailsMock,
}));

vi.mock("../../../hooks/useDiary", () => ({
  useDiary: useDiaryMock,
}));

vi.mock("../../../hooks/useFriendDiaryActivities", () => ({
  useFriendDiaryActivities: useFriendDiaryActivitiesMock,
}));

vi.mock("@/features/friends/services/friendshipService", () => ({
  fetchFriendshipsForTargets: vi.fn().mockResolvedValue([]),
  createFriendRequest: vi.fn().mockResolvedValue(undefined),
  notifyFriendRequest: vi.fn().mockResolvedValue(undefined),
  acceptFriendRequest: vi.fn().mockResolvedValue(undefined),
  notifyFriendAccepted: vi.fn().mockResolvedValue(undefined),
  deleteIncomingFriendRequest: vi.fn().mockResolvedValue(undefined),
  deleteFriendshipBetween: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: fromMock,
  },
}));

import { DiaryPage } from "../DiaryPage";

function mockSupabaseEmptyResponses() {
  const orderMock = vi.fn().mockReturnThis();
  const limitMock = vi.fn().mockResolvedValue({ data: [], error: null });

  const chain = {
    select: selectMock,
    or: orMock,
    in: inMock,
    order: orderMock,
    limit: limitMock,
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
  };

  selectMock.mockReturnValue(chain);
  orMock.mockReturnValue(chain);
  inMock.mockReturnValue(chain);
  fromMock.mockReturnValue(chain);
}

describe("DiaryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseEmptyResponses();

    useDiaryMock.mockReturnValue({
      entries: [
        {
          id: "d1",
          user_id: "u1",
          tmdb_id: 10,
          watched_date: "2026-03-20",
          created_at: "2026-03-20T12:00:00.000Z",
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
      removeEntry: vi.fn(),
      notifyFriendActivity: false,
      setNotifyFriendActivity: vi.fn(),
    });

    useFriendDiaryActivitiesMock.mockReturnValue({
      activities: [
        {
          id: "a1",
          user_id: "u2",
          tmdb_id: 777,
          watched_date: "2026-03-21",
          created_at: "2026-03-21T12:00:00.000Z",
          friend_id: "u2",
          friend_username: "maria",
          friend_avatar_url: null,
          rating: 9,
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  it("opens local movie via onOpenMovie when entry exists in loaded movies", async () => {
    const onOpenMovie = vi.fn();

    render(
      <DiaryPage
        userId="u1"
        onOpenMovie={onOpenMovie}
        movies={[
          {
            id: 1,
            tmdb_id: 10,
            title: "Matrix",
            rating: 9,
            review: "",
            recommended: "",
            created_at: "2026-03-20T12:00:00.000Z",
          },
        ]}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /abrir filme matrix/i }));

    await waitFor(() => {
      expect(onOpenMovie).toHaveBeenCalled();
      expect(getMovieDetailsMock).not.toHaveBeenCalled();
    });
  });

  it("falls back to TMDB details when friend activity movie is not in local list", async () => {
    const onOpenMovie = vi.fn();
    getMovieDetailsMock.mockResolvedValue({
      id: 777,
      title: "Fallback Movie",
      poster_path: null,
      release_date: "2026-01-01",
      overview: "overview",
      runtime: 120,
      credits: { crew: [], cast: [] },
      production_countries: [],
      genres: [],
    });

    render(<DiaryPage userId="u1" onOpenMovie={onOpenMovie} movies={[]} />);

    await userEvent.click(screen.getByRole("button", { name: /abrir filme filme #777/i }));

    await waitFor(() => {
      expect(getMovieDetailsMock).toHaveBeenCalledWith(777);
      expect(onOpenMovie).toHaveBeenCalledWith(
        expect.objectContaining({
          tmdb_id: 777,
          title: "Fallback Movie",
        })
      );
    });
  });
});

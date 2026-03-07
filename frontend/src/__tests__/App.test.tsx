import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";

// Mock de todos os features modules
vi.mock("@/features/auth", () => ({
   useAuth: () => ({
      session: null,
      username: "",
      avatarUrl: null,
      logout: vi.fn(),
      updateUsername: vi.fn(),
      loading: false,
   }),
   LoginModal: ({ show }: { show: boolean }) => show ? <div data-testid="login-modal">LoginModal</div> : null,
   ProfileModal: () => null,
   FriendsModal: () => null,
   ResetPassword: () => <div data-testid="reset-password">ResetPassword</div>,
}));

vi.mock("@/features/movies", () => ({
   MovieCard: () => <div>MovieCard</div>,
   MovieCardSkeleton: () => <div>Skeleton</div>,
   MovieModal: () => null,
   AddMovieModal: () => null,
   useMovies: () => ({
      movies: [],
      loading: false,
      fetchMovies: vi.fn(),
   }),
   useMovieFilters: () => ({
      searchTerm: "",
      setSearchTerm: vi.fn(),
      onlyNational: false,
      setOnlyNational: vi.fn(),
      onlyOscar: false,
      setOnlyOscar: vi.fn(),
      sortOrder: "default",
      setSortOrder: vi.fn(),
      selectedGenre: "",
      setSelectedGenre: vi.fn(),
      viewMode: "watched",
      setViewMode: vi.fn(),
      availableGenres: [],
      filteredMovies: [],
   }),
}));

vi.mock("@/features/dashboard", () => ({
   Dashboard: () => null,
}));

vi.mock("@/features/battle", () => ({
   MovieBattle: () => <div>MovieBattle</div>,
}));

vi.mock("@/features/roulette", () => ({
   RouletteModal: () => null,
}));

vi.mock("@/features/share", () => ({
   ShareCard: () => null,
   ShareModal: () => null,
   useShare: () => ({
      shareRef: { current: null },
      sharingMovie: null,
      isSharing: false,
      handleShare: vi.fn(),
   }),
}));

vi.mock("@/features/publicProfile", () => ({
   PublicProfile: () => <div data-testid="public-profile">PublicProfile</div>,
}));

vi.mock("@/features/lists", () => ({
   useLists: () => ({
      lists: [],
      loading: false,
      createList: vi.fn(),
      fetchLists: vi.fn(),
      updateList: vi.fn(),
      removeMovieFromList: vi.fn(),
      addMovieToList: vi.fn(),
   }),
   CreateListModal: () => null,
   ListDetails: () => null,
}));

vi.mock("@/components/layout/BottomNav/BottomNav", () => ({
   BottomNav: () => null,
}));

vi.mock("@/components/layout/AppNavbar/AppNavbar", () => ({
   AppNavbar: () => <nav data-testid="navbar">Navbar</nav>,
}));

vi.mock("@/components/layout/Footer/Footer", () => ({
   Footer: () => <footer data-testid="footer">Footer</footer>,
}));

vi.mock("@/components/ui/LoadingOverlay/LoadingOverlay", () => ({
   LoadingOverlay: () => null,
}));

vi.mock("@/components/ui/ConfirmModal/ConfirmModal", () => ({
   ConfirmModal: () => null,
}));

vi.mock("@/components/ui/EmptyState/EmptyState", () => ({
   EmptyState: () => null,
}));

describe("App", () => {
   it("renderiza a landing page para usuários não logados", () => {
      render(
         <MemoryRouter initialEntries={["/"]}>
            <App />
         </MemoryRouter>
      );

      expect(screen.getByText(/Sua jornada cinematográfica/i)).toBeInTheDocument();
      expect(screen.getByText("Criar minha conta grátis")).toBeInTheDocument();
   });

   it("renderiza o Navbar e Footer", () => {
      render(
         <MemoryRouter initialEntries={["/"]}>
            <App />
         </MemoryRouter>
      );

      expect(screen.getByTestId("navbar")).toBeInTheDocument();
      expect(screen.getByTestId("footer")).toBeInTheDocument();
   });

   it("renderiza a rota de perfil público", () => {
      render(
         <MemoryRouter initialEntries={["/perfil/joao"]}>
            <App />
         </MemoryRouter>
      );

      expect(screen.getByTestId("public-profile")).toBeInTheDocument();
   });

   it("renderiza a rota de reset de senha", () => {
      render(
         <MemoryRouter initialEntries={["/reset-password"]}>
            <App />
         </MemoryRouter>
      );

      expect(screen.getByTestId("reset-password")).toBeInTheDocument();
   });

   it("exibe as features cards na landing page", () => {
      render(
         <MemoryRouter initialEntries={["/"]}>
            <App />
         </MemoryRouter>
      );

      expect(screen.getByText("Avalie e Critique")).toBeInTheDocument();
      expect(screen.getByText("Sua Watchlist")).toBeInTheDocument();
      expect(screen.getByText("Modo Batalha")).toBeInTheDocument();
   });
});

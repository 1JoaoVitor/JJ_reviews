import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock do Supabase para todos os testes
vi.mock("@/lib/supabase", () => ({
   supabase: {
      auth: {
         getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
         getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
         onAuthStateChange: vi.fn(() => ({
            data: { subscription: { unsubscribe: vi.fn() } },
         })),
         signInWithPassword: vi.fn(),
         signUp: vi.fn(),
         signOut: vi.fn(),
      },
      from: vi.fn(() => ({
         select: vi.fn().mockReturnThis(),
         insert: vi.fn().mockReturnThis(),
         update: vi.fn().mockReturnThis(),
         delete: vi.fn().mockReturnThis(),
         eq: vi.fn().mockReturnThis(),
         or: vi.fn().mockReturnThis(),
         in: vi.fn().mockReturnThis(),
         is: vi.fn().mockReturnThis(),
         match: vi.fn().mockReturnThis(),
         single: vi.fn().mockResolvedValue({ data: null, error: null }),
         maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
         order: vi.fn().mockReturnThis(),
         limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
      channel: vi.fn(() => ({
         on: vi.fn().mockReturnThis(),
         subscribe: vi.fn().mockReturnThis(),
      })),
      removeChannel: vi.fn(),
   },
}));

// Mock do react-hot-toast
vi.mock("react-hot-toast", () => ({
   default: {
      success: vi.fn(),
      error: vi.fn(),
   },
   Toaster: () => null,
}));

// Mock de variáveis de ambiente
vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_SUPABASE_KEY", "test-key");
vi.stubEnv("VITE_TMDB_API_KEY", "test-tmdb-key");

// Mock do IntersectionObserver
class MockIntersectionObserver {
   observe = vi.fn();
   unobserve = vi.fn();
   disconnect = vi.fn();
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

// Mock do matchMedia
Object.defineProperty(window, "matchMedia", {
   writable: true,
   value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
   })),
});

// Mock do scrollTo
window.scrollTo = vi.fn();

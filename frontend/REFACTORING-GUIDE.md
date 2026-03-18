# Guia de Refatoração — Functional Core, Imperative Shell + TDD

Este documento é um plano completo para refatorar o JJ Reviews aplicando a arquitetura **Functional Core, Imperative Shell (FC/IS)**, tornando o código mais testável, previsível e preparado para TDD.

---

## Índice

1. [O que é Functional Core, Imperative Shell?](#1-o-que-é-functional-core-imperative-shell)
2. [Diagnóstico do estado atual](#2-diagnóstico-do-estado-atual)
3. [Nova estrutura de pastas](#3-nova-estrutura-de-pastas)
4. [Plano de refatoração por feature](#4-plano-de-refatoração-por-feature)
5. [Padrões e convenções da nova arquitetura](#5-padrões-e-convenções-da-nova-arquitetura)
6. [Estratégia de testes](#6-estratégia-de-testes)
7. [Como fazer TDD no projeto](#7-como-fazer-tdd-no-projeto)
8. [Ordem de execução recomendada](#8-ordem-de-execução-recomendada)
9. [Anti-patterns a eliminar](#9-anti-patterns-a-eliminar)

---

## 1. O que é Functional Core, Imperative Shell?

A ideia central é dividir todo o código em duas camadas:

### Functional Core (Núcleo Funcional)
- **Funções puras**: recebem dados, retornam dados. Sem side effects.
- **Zero dependências externas**: não importam `supabase`, `axios`, `toast`, `navigator`, nem hooks do React.
- **100% testáveis**: testa-se com `expect(fn(input)).toEqual(output)`. Sem mocks.
- **Onde mora a lógica de negócio**: filtros, validações, transformações, cálculos, state machines.

### Imperative Shell (Casca Imperativa)
- **Hooks do React**: gerenciam estado, efeitos, subscriptions.
- **Services**: fazem chamadas HTTP, escrevem no banco, disparam notificações.
- **Componentes**: renderizam UI, despacham eventos.
- **A "cola"**: conecta o core puro ao mundo exterior (APIs, DOM, navegador).

```
┌─────────────────────────────────────────────────────┐
│                 Imperative Shell                     │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │  Hooks   │  │ Services  │  │   Components     │  │
│  │ (React)  │  │ (Supabase │  │   (UI + JSX)     │  │
│  │          │  │  TMDB)    │  │                  │  │
│  └─────┬────┘  └─────┬─────┘  └────────┬─────────┘  │
│        │             │                 │             │
│        ▼             ▼                 ▼             │
│  ┌───────────────────────────────────────────────┐   │
│  │              Functional Core                  │   │
│  │                                               │   │
│  │  filterMovies()    calculateDashboard()       │   │
│  │  sortMovies()      mapFriendshipStatus()      │   │
│  │  enrichMovieData() validateReview()           │   │
│  │  buildShareUrl()   deduplicateLists()         │   │
│  │  buildBracket()    formatNotification()       │   │
│  │                                               │   │
│  │  ★ Funções puras — SEM side effects           │   │
│  │  ★ 100% testáveis sem mocks                   │   │
│  └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Regra de ouro:** O core nunca importa do shell. O shell importa do core.

---

## 2. Diagnóstico do estado atual

### O que já está bom ✅

| Aspecto | Observação |
|---|---|
| Feature-based structure | Cada feature é auto-contida |
| Barrel exports | `index.ts` em todas as features |
| CSS Modules | Escopo local, sem conflitos |
| Design tokens | Variáveis CSS centralizadas |
| Service layer | `tmdbService.ts` isola chamadas TMDB |
| `useMovieFilters` | Já é quase 100% lógica pura (useMemo) |
| Types | Bem definidos em `types/index.ts` |

### O que precisa melhorar ❌

| Problema | Onde | Impacto |
|---|---|---|
| **App.tsx é um God Component** | `App.tsx` (~750 linhas) | Concentra ~15 estados, ~10 modais, lógica de URL, deep links, delete, edit — impossível testar isoladamente |
| **Hooks misturam lógica pura com side effects** | `useLists`, `useFriendship`, `useNotifications` | Não dá pra testar a lógica de deduplicate/sort/status-machine sem mockar Supabase |
| **Lógica de negócio dentro de handlers do App.tsx** | `handleDeleteMovie`, `handleOpenModal` | Lógica de "apagar de listas privadas" mora no componente, não numa função reutilizável |
| **Toasts acoplados nos hooks** | `useLists`, `useFriendship` | Hooks disparam `toast.success()` diretamente — impede reutilização e dificulta testes |
| **Validações implícitas** | Vários hooks | Validações como "não fazer nada se userId é undefined" não são funções testáveis |
| **Transformações de dados inline** | `useNotifications`, `useLists` | Mapeamento de dados do Supabase feito dentro do hook em vez de função pura |
| **`tmdbService.ts` mistura fetch + transformação** | `tmdbService.ts` | `enrichMovieWithTmdb` faz o HTTP e a transformação numa só função |
| **Componentes renderizam lógica condicional complexa** | `App.tsx` (landing, lists, grid) | O corpo do JSX decide qual "página" mostrar — refatorar para sub-componentes |

---

## 3. Nova estrutura de pastas

Para cada feature, adicionar uma pasta `logic/` com as funções puras:

```
src/features/movies/
├── components/           # (mantém como está)
├── hooks/
│   ├── useMovies.ts      # Shell: chama service, gerencia state
│   └── useMovieFilters.ts # Shell: useState + delega para logic
├── logic/                 # ★ NOVO — Functional Core
│   ├── filterMovies.ts    #   Filtragem pura (recebe movies + filtros, retorna movies[])
│   ├── sortMovies.ts      #   Ordenação pura
│   ├── enrichMovie.ts     #   Transformação de dados TMDB → MovieData (sem HTTP)
│   └── __tests__/         #   Testes unitários do core
│       ├── filterMovies.test.ts
│       ├── sortMovies.test.ts
│       └── enrichMovie.test.ts
├── services/
│   └── tmdbService.ts     # Shell: apenas HTTP (fetch bruto)
└── index.ts
```

Aplicar o mesmo padrão para todas as features:

```
src/
├── features/
│   ├── auth/
│   │   ├── logic/
│   │   │   └── validateProfile.ts
│   │   └── ...
│   ├── battle/
│   │   ├── logic/
│   │   │   ├── buildBracket.ts
│   │   │   ├── resolveMatchup.ts
│   │   │   └── __tests__/
│   │   └── ...
│   ├── dashboard/
│   │   ├── logic/
│   │   │   ├── calculateStats.ts
│   │   │   └── __tests__/
│   │   └── ...
│   ├── friends/
│   │   ├── logic/
│   │   │   ├── mapFriendshipStatus.ts
│   │   │   └── __tests__/
│   │   └── ...
│   ├── lists/
│   │   ├── logic/
│   │   │   ├── deduplicateLists.ts
│   │   │   ├── categorizeLists.ts
│   │   │   ├── mapListCounts.ts
│   │   │   └── __tests__/
│   │   └── ...
│   ├── movies/
│   │   ├── logic/
│   │   │   ├── filterMovies.ts
│   │   │   ├── sortMovies.ts
│   │   │   ├── enrichMovie.ts
│   │   │   └── __tests__/
│   │   └── ...
│   ├── notifications/
│   │   ├── logic/
│   │   │   ├── formatNotification.ts
│   │   │   ├── countUnread.ts
│   │   │   └── __tests__/
│   │   └── ...
│   └── share/
│       ├── logic/
│       │   ├── buildShareUrl.ts
│       │   └── __tests__/
│       └── ...
└── utils/                 # Permanece para utilitários cross-feature
    ├── badges.ts          # Já é puro ✅
    └── cropImage.ts
```

---

## 4. Plano de refatoração por feature

### 4.1. Movies — Extrair lógica de filtros e enriquecimento

**ANTES** (`useMovieFilters.ts` — lógica pura presa dentro do `useMemo`):

```typescript
// Tudo junto num useMemo de 40 linhas
const filteredMovies = useMemo(() => {
   return movies
      .filter((movie) => {
         if (movieStatus !== viewMode) return false;
         // ... 15 linhas de filtros
      })
      .sort((a, b) => {
         // ... 12 linhas de sort
      });
}, [movies, viewMode, searchTerm, /* ... */]);
```

**DEPOIS** — Functional Core em `logic/filterMovies.ts`:

```typescript
// logic/filterMovies.ts — FUNÇÃO PURA, zero imports do React
export interface MovieFilters {
   viewMode: "watched" | "watchlist";
   searchTerm: string;
   onlyNational: boolean;
   onlyOscar: boolean;
   onlyInternational: boolean;
   selectedGenre: string;
   selectedDirector: string;
}

export function filterMovies(movies: MovieData[], filters: MovieFilters): MovieData[] {
   return movies.filter((movie) => {
      const movieStatus = movie.status || "watched";
      if (movieStatus !== filters.viewMode) return false;

      if (filters.onlyNational && !movie.isNational) return false;
      if (filters.onlyOscar && !movie.isOscar) return false;
      if (filters.onlyInternational && movie.countries?.includes("Estados Unidos")) return false;
      if (filters.selectedDirector && movie.director?.toLowerCase() !== filters.selectedDirector.toLowerCase()) return false;
      if (filters.selectedGenre && !movie.genres?.includes(filters.selectedGenre)) return false;

      if (!filters.searchTerm) return true;
      
      const searchLower = filters.searchTerm.toLowerCase();
      return (
         movie.title?.toLowerCase().includes(searchLower) ||
         movie.review?.toLowerCase().includes(searchLower) ||
         movie.director?.toLowerCase().includes(searchLower) ||
         movie.genres?.some(g => g.toLowerCase().includes(searchLower)) ||
         movie.cast?.some(actor => actor.toLowerCase().includes(searchLower)) ||
         (movie.isOscar && "oscar".includes(searchLower))
      );
   });
}
```

```typescript
// logic/sortMovies.ts — FUNÇÃO PURA
export type SortOrder = "default" | "rating" | "date" | "alpha";

export function sortMovies(movies: MovieData[], order: SortOrder): MovieData[] {
   return [...movies].sort((a, b) => {
      switch (order) {
         case "rating": return (b.rating ?? 0) - (a.rating ?? 0);
         case "date": return new Date(b.release_date || "1900").getTime() - new Date(a.release_date || "1900").getTime();
         case "alpha": return (a.title || "").localeCompare(b.title || "");
         default: return b.id - a.id;
      }
   });
}
```

**DEPOIS** — o hook fica fino:

```typescript
// hooks/useMovieFilters.ts — Shell: só estado + delega pro core
import { filterMovies } from "../logic/filterMovies";
import { sortMovies } from "../logic/sortMovies";

export function useMovieFilters(movies: MovieData[]) {
   const [searchTerm, setSearchTerm] = useState("");
   // ... outros estados ...

   const filteredMovies = useMemo(
      () => sortMovies(filterMovies(movies, { viewMode, searchTerm, /* ... */ }), sortOrder),
      [movies, viewMode, searchTerm, sortOrder, /* ... */]
   );

   return { filteredMovies, searchTerm, setSearchTerm, /* ... */ };
}
```

---

### 4.2. Movies — Separar fetch de transformação no tmdbService

**ANTES** (`tmdbService.ts`):

```typescript
// Faz HTTP + mapeia dados na mesma função
export async function enrichMovieWithTmdb(movie) {
   const { data } = await axios.get(`${BASE_URL}/movie/${movie.tmdb_id}?...`);
   const directors = data.credits?.crew?.filter(...).map(...);
   // ... 30 linhas de mapeamento
   return { ...movie, title: data.title, director: directors, ... };
}
```

**DEPOIS** — Separa em duas camadas:

```typescript
// services/tmdbService.ts — Shell: apenas HTTP
export async function fetchTmdbMovie(tmdbId: number): Promise<TmdbRawResponse> {
   const { data } = await axios.get(`${BASE_URL}/movie/${tmdbId}?...`);
   return data;
}

export async function fetchTmdbSearch(query: string): Promise<TmdbSearchResult[]> {
   const { data } = await axios.get(`${BASE_URL}/search/movie?...`);
   return data.results.slice(0, 5);
}
```

```typescript
// logic/enrichMovie.ts — Core: transformação pura
export function mapTmdbToMovieData(
   supabaseMovie: Record<string, unknown> & { tmdb_id: number },
   tmdbData: TmdbRawResponse
): MovieData {
   const directors = tmdbData.credits?.crew
      ?.filter((p) => p.job === "Director")
      .map((d) => d.name)
      .join(", ");
   
   const cast = tmdbData.credits?.cast?.slice(0, 5).map((c) => c.name);
   // ... restante da transformação
   return { ...supabaseMovie, title: tmdbData.title, director: directors, cast, ... };
}
```

---

### 4.3. Lists — Extrair deduplicação e categorização

**ANTES** (`useLists.ts` — lógica presa dentro do `fetchLists`):

```typescript
// Dentro de fetchLists, mistura HTTP + transformação
const uniqueLists = Array.from(new Map(allLists.map(item => [item.id, item])).values());
uniqueLists.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
const listsWithCount = uniqueLists.map(list => ({ ...list, movie_count: ... }));
```

**DEPOIS**:

```typescript
// logic/deduplicateLists.ts — Core
export function deduplicateLists(lists: CustomList[]): CustomList[] {
   return Array.from(new Map(lists.map(item => [item.id, item])).values());
}

export function sortListsByDate(lists: CustomList[]): CustomList[] {
   return [...lists].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
   );
}

export function mapListCounts(lists: RawListWithCount[]): CustomList[] {
   return lists.map(list => ({
      ...list,
      movie_count: list.list_movies?.[0]?.count ?? 0,
   }));
}
```

```typescript
// logic/categorizeLists.ts — Core
export function categorizeLists(lists: CustomList[]) {
   return {
      private: lists.filter(l => l.type === "private" || !l.type),
      partialShared: lists.filter(l => l.type === "partial_shared"),
      fullShared: lists.filter(l => l.type === "full_shared"),
   };
}
```

---

### 4.4. Friends — Extrair state machine de amizade

**ANTES** (`useFriendship.ts`):

```typescript
// Lógica de status presa dentro do checkFriendship (async function)
if (!data) setStatus("none");
else if (data.status === "accepted") setStatus("accepted");
else if (data.requester_id === loggedUserId) setStatus("pending_sent");
else setStatus("pending_received");
```

**DEPOIS**:

```typescript
// logic/mapFriendshipStatus.ts — Core
export function mapFriendshipStatus(
   data: { status: string; requester_id: string } | null,
   loggedUserId: string
): FriendshipState {
   if (!data) return "none";
   if (data.status === "accepted") return "accepted";
   if (data.requester_id === loggedUserId) return "pending_sent";
   return "pending_received";
}
```

---

### 4.5. Dashboard — Extrair cálculos estatísticos

Se os cálculos estiverem inline no componente, extrair:

```typescript
// logic/calculateStats.ts — Core
export interface DashboardStats {
   totalMovies: number;
   averageRating: number;
   internationalCount: number;
   internationalPercent: number;
   topDirector: { name: string; count: number } | null;
}

export function calculateDashboardStats(movies: MovieData[]): DashboardStats {
   const watched = movies.filter(m => m.status === "watched");
   const totalMovies = watched.length;

   const averageRating = totalMovies > 0
      ? watched.reduce((sum, m) => sum + (m.rating ?? 0), 0) / totalMovies
      : 0;

   const international = watched.filter(m => !m.countries?.includes("Estados Unidos"));
   
   const directorMap = new Map<string, number>();
   watched.forEach(m => {
      if (m.director) {
         directorMap.set(m.director, (directorMap.get(m.director) || 0) + 1);
      }
   });
   
   let topDirector: { name: string; count: number } | null = null;
   directorMap.forEach((count, name) => {
      if (!topDirector || count > topDirector.count) {
         topDirector = { name, count };
      }
   });

   return {
      totalMovies,
      averageRating: Math.round(averageRating * 10) / 10,
      internationalCount: international.length,
      internationalPercent: totalMovies > 0 ? Math.round((international.length / totalMovies) * 100) : 0,
      topDirector,
   };
}
```

---

### 4.6. Battle — Extrair lógica de bracket

```typescript
// logic/buildBracket.ts — Core
export function buildBracket(movies: MovieData[], size: number): MovieData[][] {
   const shuffled = [...movies].sort(() => Math.random() - 0.5);
   const selected = shuffled.slice(0, size);
   
   const pairs: MovieData[][] = [];
   for (let i = 0; i < selected.length; i += 2) {
      if (i + 1 < selected.length) {
         pairs.push([selected[i], selected[i + 1]]);
      } else {
         pairs.push([selected[i]]); // bye
      }
   }
   return pairs;
}

export function advanceWinner(
   bracket: MovieData[][],
   currentMatch: number,
   winner: MovieData
): { nextBracket: MovieData[][]; nextMatch: number; isFinished: boolean } {
   // Lógica pura de progressão do torneio
   // ...
}
```

---

### 4.7. Share — Extrair construção de URL

```typescript
// logic/buildShareUrl.ts — Core
export function buildShareUrl(
   movie: MovieData,
   username: string | null,
   currentPath: string
): string {
   const baseUrl = "https://jj-reviews.vercel.app";
   let path = currentPath;
   
   if ((path === "/" || path === "") && username) {
      path = `/perfil/${username}`;
   }
   
   const targetId = movie.tmdb_id || movie.id;
   return `${baseUrl}${path}?movie=${targetId}`;
}
```

---

### 4.8. Notifications — Extrair formatação

```typescript
// logic/formatNotification.ts — Core
export function normalizeNotificationSender(
   rawSender: unknown
): { username: string; avatar_url: string } | undefined {
   if (Array.isArray(rawSender)) return rawSender[0];
   return rawSender as { username: string; avatar_url: string } | undefined;
}

export function countUnread(notifications: AppNotification[]): number {
   return notifications.filter(n => !n.is_read).length;
}
```

---

### 4.9. App.tsx — Quebrar o God Component

O `App.tsx` tem ~750 linhas e gerencia tudo. Refatorar em sub-componentes:

```typescript
// ANTES: tudo no MainApp()
function MainApp() {
   // 15+ useState
   // 6+ useEffect
   // handlers complexos
   // 200+ linhas de JSX com 3 "páginas" condicionais
}
```

```typescript
// DEPOIS: MainApp orquestra sub-componentes
function MainApp() {
   const { session, username, avatarUrl, logout } = useAuth();
   const movies = useMovies(session);
   const filters = useMovieFilters(movies.movies);
   const lists = useLists(session?.user.id);

   // Estado de modais num único reducer ou hook dedicado
   const modals = useModals();

   if (!session) return <LandingPage onLogin={() => modals.open("login")} />;
   if (filters.viewMode === "lists") return <ListsView lists={lists} modals={modals} />;
   
   return <MoviesView movies={movies} filters={filters} modals={modals} />;
}
```

**Criar `useModals` hook** para centralizar os 10+ estados booleanos:

```typescript
// hooks/useModals.ts
type ModalName = "login" | "profile" | "friends" | "addMovie" | "roulette" | 
                 "createList" | "logoutConfirm" | "share" | "movieDetail";

export function useModals() {
   const [openModal, setOpenModal] = useState<ModalName | null>(null);
   const [modalData, setModalData] = useState<Record<string, unknown>>({});

   return {
      current: openModal,
      data: modalData,
      open: (name: ModalName, data?: Record<string, unknown>) => {
         setOpenModal(name);
         if (data) setModalData(data);
      },
      close: () => {
         setOpenModal(null);
         setModalData({});
      },
      isOpen: (name: ModalName) => openModal === name,
   };
}
```

---

## 5. Padrões e convenções da nova arquitetura

### 5.1. Regras para código no `logic/`

```
✅ PODE usar:
   - Tipos do TypeScript
   - Imports de outros arquivos em logic/
   - Imports de types/ e constants/
   - Funções utilitárias de utils/

❌ NÃO PODE importar:
   - supabase, axios, fetch, ou qualquer cliente HTTP
   - useState, useEffect, useRef, ou qualquer hook do React
   - toast, navigator, window, document
   - Componentes React (JSX)
```

### 5.2. Assinatura padrão de funções puras

```typescript
// Sempre dados de entrada → dados de saída
// Nunca void (exceto se for assertion/validação que lança erro)
export function filterMovies(movies: MovieData[], filters: MovieFilters): MovieData[]
export function calculateStats(movies: MovieData[]): DashboardStats
export function mapFriendshipStatus(data: FriendshipRow | null, userId: string): FriendshipState
export function buildShareUrl(movie: MovieData, username: string | null, path: string): string
```

### 5.3. Hooks como Shell fino

```typescript
// Hook = estado + conectar core + side effects
export function useMovieFilters(movies: MovieData[]) {
   // 1. Estado do React
   const [searchTerm, setSearchTerm] = useState("");
   
   // 2. Delegar para funções puras do core
   const filtered = useMemo(
      () => sortMovies(filterMovies(movies, filters), sortOrder),
      [movies, filters, sortOrder]
   );

   // 3. Retornar estado + setters + resultado
   return { filteredMovies: filtered, searchTerm, setSearchTerm };
}
```

### 5.4. Services como Shell de I/O

```typescript
// Service = HTTP puro, sem transformação
export async function fetchTmdbMovie(tmdbId: number): Promise<TmdbRawResponse> {
   const { data } = await axios.get(`...`);
   return data;
}

// Transformação vai para logic/
export function mapTmdbToMovie(raw: TmdbRawResponse, supabase: SupabaseRow): MovieData {
   // mapeamento puro
}
```

### 5.5. Toasts e side effects fora dos hooks de lógica

**ANTES:**
```typescript
// Hook dispara toast diretamente
const createList = async (...) => {
   // ... supabase call ...
   toast.success("Lista criada!");
};
```

**DEPOIS:**
```typescript
// Hook retorna resultado, componente decide a UX
const createList = async (...): Promise<{ success: boolean; list?: CustomList; error?: string }> => {
   // ... supabase call ...
   return { success: true, list: newList };
};

// No componente:
const result = await createList(name, desc);
if (result.success) toast.success("Lista criada!");
else toast.error(result.error);
```

---

## 6. Estratégia de testes

### Pirâmide de testes para FC/IS

```
         ╱╲
        ╱ E2E ╲         Poucos (Playwright/Cypress — fluxos críticos)
       ╱────────╲
      ╱Integration╲     Médio (hooks com mocks do Supabase)
     ╱──────────────╲
    ╱   Unit (Core)   ╲  MUITOS (funções puras — sem mocks!)
   ╱____________________╲
```

### 6.1. Testes unitários do Core (sem mocks)

São os mais valiosos. Testam as funções puras em `logic/`:

```typescript
// logic/__tests__/filterMovies.test.ts
import { describe, it, expect } from "vitest";
import { filterMovies } from "../filterMovies";
import type { MovieData } from "@/types";

// Factory para criar filmes de teste
const makeMovie = (overrides: Partial<MovieData> = {}): MovieData => ({
   id: 1,
   tmdb_id: 100,
   rating: 8,
   review: "Ótimo",
   recommended: "Muito Bom",
   created_at: "2025-01-01",
   title: "Filme Teste",
   status: "watched",
   ...overrides,
});

describe("filterMovies", () => {
   it("filtra por viewMode watched", () => {
      const movies = [
         makeMovie({ id: 1, status: "watched" }),
         makeMovie({ id: 2, status: "watchlist" }),
      ];
      const result = filterMovies(movies, { viewMode: "watched", searchTerm: "", onlyNational: false, onlyOscar: false, onlyInternational: false, selectedGenre: "", selectedDirector: "" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
   });

   it("filtra por busca no título", () => {
      const movies = [
         makeMovie({ id: 1, title: "Matrix" }),
         makeMovie({ id: 2, title: "Inception" }),
      ];
      const result = filterMovies(movies, { viewMode: "watched", searchTerm: "matrix", onlyNational: false, onlyOscar: false, onlyInternational: false, selectedGenre: "", selectedDirector: "" });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Matrix");
   });

   it("filtra só filmes nacionais", () => {
      const movies = [
         makeMovie({ id: 1, isNational: true }),
         makeMovie({ id: 2, isNational: false }),
      ];
      const result = filterMovies(movies, { viewMode: "watched", searchTerm: "", onlyNational: true, onlyOscar: false, onlyInternational: false, selectedGenre: "", selectedDirector: "" });
      expect(result).toHaveLength(1);
   });

   it("combina múltiplos filtros", () => {
      const movies = [
         makeMovie({ id: 1, isNational: true, isOscar: true }),
         makeMovie({ id: 2, isNational: true, isOscar: false }),
         makeMovie({ id: 3, isNational: false, isOscar: true }),
      ];
      const result = filterMovies(movies, { viewMode: "watched", searchTerm: "", onlyNational: true, onlyOscar: true, onlyInternational: false, selectedGenre: "", selectedDirector: "" });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
   });
});
```

```typescript
// logic/__tests__/sortMovies.test.ts
import { describe, it, expect } from "vitest";
import { sortMovies } from "../sortMovies";

describe("sortMovies", () => {
   it("ordena por rating decrescente", () => {
      const movies = [makeMovie({ rating: 5 }), makeMovie({ rating: 9 }), makeMovie({ rating: 7 })];
      const result = sortMovies(movies, "rating");
      expect(result.map(m => m.rating)).toEqual([9, 7, 5]);
   });

   it("ordena alfabeticamente", () => {
      const movies = [makeMovie({ title: "Zebra" }), makeMovie({ title: "Alpha" })];
      const result = sortMovies(movies, "alpha");
      expect(result.map(m => m.title)).toEqual(["Alpha", "Zebra"]);
   });
});
```

```typescript
// logic/__tests__/calculateStats.test.ts
import { describe, it, expect } from "vitest";
import { calculateDashboardStats } from "../calculateStats";

describe("calculateDashboardStats", () => {
   it("calcula média correta", () => {
      const movies = [
         makeMovie({ rating: 8, status: "watched" }),
         makeMovie({ rating: 6, status: "watched" }),
      ];
      const stats = calculateDashboardStats(movies);
      expect(stats.averageRating).toBe(7);
      expect(stats.totalMovies).toBe(2);
   });

   it("ignora filmes na watchlist", () => {
      const movies = [
         makeMovie({ rating: 8, status: "watched" }),
         makeMovie({ rating: null, status: "watchlist" }),
      ];
      const stats = calculateDashboardStats(movies);
      expect(stats.totalMovies).toBe(1);
   });

   it("retorna topDirector correto", () => {
      const movies = [
         makeMovie({ director: "Nolan" }),
         makeMovie({ director: "Nolan" }),
         makeMovie({ director: "Tarantino" }),
      ];
      const stats = calculateDashboardStats(movies);
      expect(stats.topDirector).toEqual({ name: "Nolan", count: 2 });
   });
});
```

### 6.2. Testes de integração dos hooks (com mocks)

Testar que o shell conecta corretamente ao core:

```typescript
// hooks/__tests__/useMovieFilters.test.ts
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useMovieFilters } from "../useMovieFilters";
// Precisa de wrapper com MemoryRouter para useSearchParams

describe("useMovieFilters", () => {
   it("retorna todos os filmes quando não há filtros", () => {
      const movies = [makeMovie({ status: "watched" })];
      const { result } = renderHook(() => useMovieFilters(movies), { wrapper: RouterWrapper });
      expect(result.current.filteredMovies).toHaveLength(1);
   });

   it("atualiza filteredMovies quando searchTerm muda", () => {
      const movies = [makeMovie({ title: "Matrix" }), makeMovie({ title: "Inception" })];
      const { result } = renderHook(() => useMovieFilters(movies), { wrapper: RouterWrapper });
      
      act(() => result.current.setSearchTerm("matrix"));
      
      expect(result.current.filteredMovies).toHaveLength(1);
   });
});
```

### 6.3. Testes de componentes (visuais + interação)

```typescript
// components/__tests__/MovieCard.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MovieCard } from "../MovieCard/MovieCard";

describe("MovieCard", () => {
   it("exibe o título do filme", () => {
      render(<MovieCard movie={makeMovie({ title: "Matrix" })} onClick={() => {}} />);
      expect(screen.getByText("Matrix")).toBeInTheDocument();
   });

   it("dispara onClick ao clicar no card", async () => {
      const onClick = vi.fn();
      render(<MovieCard movie={makeMovie()} onClick={onClick} />);
      await userEvent.click(screen.getByRole("button")); // ou o elemento clicável
      expect(onClick).toHaveBeenCalledOnce();
   });
});
```

---

## 7. Como fazer TDD no projeto

### Ciclo Red → Green → Refactor

```
1. RED    — Escreva um teste que falha
2. GREEN  — Escreva o código MÍNIMO para passar
3. REFACTOR — Melhore sem quebrar o teste
```

### Exemplo prático: adicionar filtro "por década"

**Passo 1 — RED** (escreva o teste primeiro):

```typescript
// logic/__tests__/filterMovies.test.ts
it("filtra filmes dos anos 2020", () => {
   const movies = [
      makeMovie({ release_date: "2024-05-01" }),
      makeMovie({ release_date: "2015-03-20" }),
      makeMovie({ release_date: "2023-12-01" }),
   ];
   const result = filterMovies(movies, {
      ...defaultFilters,
      selectedDecade: "2020",
   });
   expect(result).toHaveLength(2);
});
```

Rode `npm run test` → **FALHA** (propriedade `selectedDecade` não existe).

**Passo 2 — GREEN** (implemente o mínimo):

```typescript
// Adicione a prop no MovieFilters
export interface MovieFilters {
   // ... existentes ...
   selectedDecade: string;
}

// Adicione o filtro
export function filterMovies(movies: MovieData[], filters: MovieFilters): MovieData[] {
   return movies.filter((movie) => {
      // ... filtros existentes ...
      
      if (filters.selectedDecade) {
         const year = new Date(movie.release_date || "1900").getFullYear();
         const decade = Math.floor(year / 10) * 10;
         if (decade.toString() !== filters.selectedDecade) return false;
      }

      return matchesSearch;
   });
}
```

Rode `npm run test` → **PASSA** ✅

**Passo 3 — REFACTOR** (melhore se necessário):

- Pode extrair `getDecade(date)` como helper se for usado em mais lugares.
- Ajuste o hook `useMovieFilters` para adicionar o `selectedDecade` no estado.
- Ajuste o componente para exibir o dropdown de décadas.

### Workflow diário com TDD

```bash
# Terminal 1 — testes em watch mode
npm run test:watch

# Terminal 2 — dev server
npm run dev

# Ciclo:
# 1. Escreve teste em logic/__tests__/
# 2. Vê falhar no terminal 1
# 3. Implementa em logic/
# 4. Vê passar no terminal 1
# 5. Conecta no hook/componente
# 6. Verifica no browser (terminal 2)
```

---

## 8. Ordem de execução recomendada

Refatore incrementalmente, feature por feature. Não refatore tudo de uma vez.

### Fase 1 — Fundação (baixo risco, alto valor)

| # | Tarefa | Risco | Valor |
|---|---|---|---|
| 1 | Criar pasta `logic/` + `__tests__/` em `features/movies/` | Nenhum | Alto — estabelece o padrão |
| 2 | Extrair `filterMovies()` e `sortMovies()` de `useMovieFilters` | Baixo | Alto — lógica mais complexa do app |
| 3 | Escrever testes unitários para filtros e sort | Nenhum | Alto — cobertura imediata |
| 4 | Extrair `mapTmdbToMovieData()` de `tmdbService.ts` | Baixo | Alto — separa I/O de transformação |
| 5 | Extrair `calculateDashboardStats()` do Dashboard | Baixo | Médio |

### Fase 2 — Expandir para outras features

| # | Tarefa |
|---|---|
| 6 | Extrair `mapFriendshipStatus()` de `useFriendship` |
| 7 | Extrair `deduplicateLists()`, `categorizeLists()`, `mapListCounts()` de `useLists` |
| 8 | Extrair `formatNotification()`, `countUnread()` de `useNotifications` |
| 9 | Extrair `buildShareUrl()` de `useShare` |
| 10 | Extrair `buildBracket()` e lógica de matchup do Battle |

### Fase 3 — Limpar o App.tsx

| # | Tarefa |
|---|---|
| 11 | Criar `useModals` hook para centralizar estados de modais |
| 12 | Extrair `LandingPage` em componente separado |
| 13 | Extrair `ListsView` em componente separado |
| 14 | Extrair `MoviesView` (grid + filtros) em componente separado |
| 15 | Mover `handleDeleteMovie` para um service ou hook dedicado |

### Fase 4 — Desacoplar toasts dos hooks

| # | Tarefa |
|---|---|
| 16 | Alterar hooks para retornar `{ success, data, error }` em vez de disparar toast |
| 17 | Mover `toast.success/error` para os componentes que chamam os hooks |

### Fase 5 — Configuração de CI e cobertura

| # | Tarefa |
|---|---|
| 18 | Adicionar `vitest.config.ts` com configuração de coverage |
| 19 | Criar script `test:ci` para rodar no pipeline |
| 20 | Definir threshold mínimo de cobertura para `logic/` (ex: 90%) |

---

## 9. Anti-patterns a eliminar

### ❌ Lógica de negócio em componentes

```typescript
// RUIM — lógica de "apagar de listas privadas" no App.tsx
const handleDeleteMovie = async (movie: MovieData) => {
   const privateListIds = lists.filter(l => l.type === "private" || !l.type).map(l => l.id);
   // ... deletar do supabase ...
};
```

```typescript
// BOM — extrair para service/logic
// logic/identifyPrivateLists.ts
export function getPrivateListIds(lists: CustomList[]): string[] {
   return lists.filter(l => l.type === "private" || !l.type).map(l => l.id);
}
```

### ❌ Hook que faz tudo (God Hook)

```typescript
// RUIM — useLists faz fetch, realtime, create, update, delete, add movie, remove movie
export function useLists(userId) { /* 260 linhas */ }
```

```typescript
// BOM — dividir por responsabilidade
export function useLists(userId) { /* fetch + realtime */ }
export function useListMutations(userId) { /* create, update, delete */ }
export function useListMovies(listId) { /* add, remove */ }
```

### ❌ Inline styles em lógica condicional do JSX

```typescript
// RUIM
<div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
     onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--gold)'; }}>
```

```typescript
// BOM — usar CSS Module
<div className={styles.listCard}>
```

### ❌ 15+ useState no mesmo componente

```typescript
// RUIM
const [showModal, setShowModal] = useState(false);
const [showAddModal, setShowAddModal] = useState(false);
const [showShareModal, setShowShareModal] = useState(false);
const [showLoginModal, setShowLoginModal] = useState(false);
// ... mais 8 ...
```

```typescript
// BOM — usar um hook de modais ou useReducer
const modals = useModals();
// modals.open("addMovie"), modals.close(), modals.isOpen("login")
```

---

## Resumo

| Camada | Responsabilidade | Testabilidade |
|---|---|---|
| `logic/` (Core) | Filtros, transformações, validações, cálculos | ★★★★★ Sem mocks |
| `hooks/` (Shell) | Estado React + conectar core + side effects | ★★★☆☆ Mocks do Supabase |
| `services/` (Shell) | HTTP puro (fetch/axios) | ★★☆☆☆ Mocks de rede |
| `components/` (Shell) | UI + eventos | ★★★☆☆ Testing Library |

**A regra mais importante:** toda vez que você escrever uma `if`, um `.filter()`, um `.map()`, um `.sort()`, ou qualquer transformação de dados — pergunte: **"isso pode ser uma função pura em `logic/`?"**. Se sim, extraia.

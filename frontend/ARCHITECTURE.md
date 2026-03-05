# Arquitetura do Frontend — JJ Reviews

Este documento explica como o projeto frontend está organizado, o porquê de cada decisão, e como manter a arquitetura ao adicionar funcionalidades novas.

---

## Stack Tecnológico

| Tecnologia | Versão | Uso |
|---|---|---|
| React | 19.2 | Framework de UI |
| TypeScript | 5.9 | Tipagem estática |
| Vite | 7.2 | Build tool + dev server |
| Supabase | 2.93 | Auth, banco de dados (PostgreSQL), storage |
| React Bootstrap | 2.10 | Componentes UI + utilidades CSS |
| React Router Dom | 7.13 | Roteamento SPA |
| Axios | 1.13 | Requisições HTTP (TMDB API) |
| Lucide React | 0.576 | Ícones SVG |
| Vite PWA Plugin | 1.2 | Progressive Web App |
| React Hot Toast | 2.6 | Notificações toast |
| html2canvas | 1.4 | Geração de imagem para compartilhamento |
| canvas-confetti | 1.9 | Animação de confetti (batalha e roleta) |
| react-easy-crop | 5.5 | Recorte de imagem (avatar) |

---

## Visão Geral da Estrutura

```
src/
├── assets/               # Arquivos estáticos (imagens, fontes, SVGs)
├── components/           # Componentes GLOBAIS compartilhados
│   ├── layout/           #   Estrutura da página (Navbar, BottomNav, Footer)
│   └── ui/               #   Componentes genéricos (ConfirmModal, EmptyState, LoadingOverlay, StarRating)
├── constants/            # Constantes globais do app
├── features/             # Módulos por funcionalidade (CORAÇÃO da arquitetura)
│   ├── auth/             #   Autenticação (login, perfil, amigos, hook useAuth)
│   ├── battle/           #   Modo Batalha — torneio mata-mata de filmes
│   ├── dashboard/        #   Cards estatísticos do usuário
│   ├── friends/          #   Hook de amizade (useFriendship)
│   ├── movies/           #   CRUD de filmes (cards, modais, filtros, serviço TMDB)
│   ├── publicProfile/    #   Perfil público visitável por URL
│   ├── roulette/         #   Roleta — sorteio de filme da watchlist
│   └── share/            #   Gerar imagem e compartilhar review
├── lib/                  # Clientes de serviços externos (Supabase)
├── styles/               # Design tokens (variáveis CSS) e estilos globais
├── types/                # Tipos TypeScript compartilhados
├── utils/                # Funções utilitárias puras
├── App.tsx               # Componente raiz — Rotas + composição de features
├── App.module.css        # Estilos do App (CSS Module)
└── main.tsx              # Ponto de entrada — React 19, BrowserRouter, imports globais
```

---

## Roteamento

O app usa **React Router Dom** com duas rotas:

| Rota | Componente | Descrição |
|---|---|---|
| `/` | `MainApp` | Tela principal (dashboard, filmes, modais) |
| `/perfil/:username` | `PublicProfile` | Perfil público de outro usuário |

```tsx
// App.tsx
<Routes>
   <Route path="/" element={<MainApp />} />
   <Route path="/perfil/:username" element={<PublicProfile />} />
</Routes>
```

Usuários não logados veem uma **landing page** com cards explicativos das features. Usuários logados veem o dashboard + grid de filmes.

---

## Princípios da Arquitetura

### 1. Feature-Based Structure (Estrutura por Funcionalidade)

Cada funcionalidade do app vive em sua pasta dentro de `features/`.
Uma feature é **auto-contida**: tem seus próprios componentes, hooks, serviços e estilos.

```
features/movies/
├── components/
│   ├── MovieCard/
│   │   ├── MovieCard.tsx
│   │   └── MovieCard.module.css
│   ├── MovieCardSkeleton/
│   │   ├── MovieCardSkeleton.tsx
│   │   └── MovieCardSkeleton.module.css
│   ├── MovieModal/
│   │   ├── MovieModal.tsx
│   │   └── MovieModal.module.css
│   └── AddMovieModal/
│       ├── AddMovieModal.tsx
│       └── AddMovieModal.module.css
├── hooks/
│   ├── useMovies.ts
│   └── useMovieFilters.ts
├── services/
│   └── tmdbService.ts
└── index.ts
```

**Por quê?**
- Facilita encontrar qualquer arquivo: quer mudar algo de autenticação? Vá até `features/auth/`.
- Ao adicionar uma feature nova, cria-se uma pasta nova sem mexer no resto.
- Reduz acoplamento: cada feature importa apenas do `@/types`, `@/utils`, `@/lib`, nunca de outras features.

### 2. Barrel Exports (`index.ts`)

Toda feature expõe um `index.ts` como "API pública":

```typescript
// features/auth/index.ts
export { LoginModal } from "./components/LoginModal/LoginModal";
export { ProfileModal } from "./components/ProfileModal/ProfileModal";
export { useAuth } from "./hooks/useAuth";
```

```typescript
// App.tsx — importações limpas
import { useAuth, LoginModal, ProfileModal } from "@/features/auth";
```

**Regra:** Nunca importe diretamente de dentro de uma feature (ex: `@/features/auth/hooks/useAuth`).
Sempre importe do `index.ts` da feature.

### 3. CSS Modules para Estilos de Componente

Cada componente tem um arquivo `*.module.css` na mesma pasta.

```tsx
import styles from "./MovieCard.module.css";

<div className={styles.card}>
```

**Por quê?**
- **Escopo local**: Os nomes de classe são únicos por componente. Não há conflito global.
- **Colocalização**: O CSS mora junto do componente, fácil de encontrar e manter.
- **Sem overhead**: CSS Modules é nativo do Vite, zero dependências extras.

### 4. Design Tokens (CSS Custom Properties)

Todo o design system está centralizado em `styles/variables.css`:

```css
:root {
   /* Cores principais */
   --gold: #E8B100;
   --gold-hover: #FFC620;
   --accent-blue: #3B82F6;

   /* Backgrounds (dark theme) */
   --bg-page: #0D0D0D;
   --bg-surface: #1A1A1A;
   --bg-elevated: #252525;

   /* Texto */
   --text-primary: #F5F5F5;
   --text-secondary: #A0A0A0;

   /* Badges de recomendação */
   --badge-great: #22C55E;
   --badge-good: #34D399;
   --badge-ok: #FACC15;
   --badge-bad: #FB923C;
   --badge-terrible: #EF4444;

   /* Métricas do dashboard */
   --metric-total: var(--gold);
   --metric-average: var(--accent-blue);
   --metric-international: #22C55E;
   --metric-director: #A855F7;

   /* Tipografia */
   --font-family: "Inter", sans-serif;
   --font-xs: 0.75rem;
   --font-3xl: 1.875rem;

   /* Efeitos */
   --radius-sm: 6px;
   --radius-pill: 50rem;
   --transition-fast: 0.15s ease;
   --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
}
```

**Regra:** Nunca escreva cores hardcoded nos CSS Modules. Use `var(--nome)`.

### 5. Custom Hooks para Lógica de Estado

Toda lógica "pesada" foi extraída para hooks dedicados:

| Hook | Feature | Responsabilidade |
|---|---|---|
| `useAuth` | auth | Sessão, perfil, login/logout, avatar |
| `useMovies` | movies | Carregar filmes do Supabase + enriquecer com TMDB |
| `useMovieFilters` | movies | Filtros, busca full-text, ordenação, view mode |
| `useShare` | share | Gerar imagem PNG e compartilhar via Web Share API |
| `usePublicProfile` | publicProfile | Carregar perfil público de outro usuário |
| `useFriendship` | friends | Enviar/aceitar/remover pedidos de amizade |

O `App.tsx` faz apenas **composição** — monta hooks e passa para componentes. Zero lógica de negócio.

### 6. Service Layer (Camada de Serviços)

Chamadas a APIs externas ficam isoladas em `services/`:

```typescript
// features/movies/services/tmdbService.ts
export async function enrichMovieWithTmdb(movie) { ... }
export async function searchMovies(query) { ... }
```

**Regra:** Componentes nunca chamam `axios.get()` diretamente. Sempre passam por um service.

---

## Features em Detalhe

### Auth (`features/auth/`)

Gerencia sessão, cadastro, login, perfil e modal de amigos.

| Export | Tipo | Descrição |
|---|---|---|
| `useAuth` | Hook | Sessão Supabase, `username`, `avatarUrl`, `loading`, `logout()`, `updateUsername()` |
| `LoginModal` | Componente | Alterna entre login e cadastro. Usa `signInWithPassword()` e `signUp()` |
| `ProfileModal` | Componente | Edição de avatar (com crop circular + zoom), edição de username, copiar link, logout |
| `FriendsModal` | Componente | Aba "Amigos" (lista com badges de status) e aba "Buscar" (pesquisa por username via `ilike`) |

O `ProfileModal` faz upload do avatar recortado para o **Supabase Storage** (bucket `avatars`) e atualiza a URL pública no perfil.

### Movies (`features/movies/`)

CRUD completo de filmes com enriquecimento de dados via TMDB.

| Export | Tipo | Descrição |
|---|---|---|
| `useMovies` | Hook | Carrega reviews do Supabase, enriquece com TMDB, gerencia loading |
| `useMovieFilters` | Hook | Busca full-text, filtros (nacional, Oscar, gênero), ordenação, view mode (watched/watchlist) |
| `MovieCard` | Componente | Card com poster, nota, diretor, ano, tags (Nacional, Oscar), badge de recomendação |
| `MovieCardSkeleton` | Componente | Skeleton loading que replica o layout do MovieCard |
| `MovieModal` | Componente | Detalhes completos: metadata, streaming providers (BR), elenco, sinopse, ações admin |
| `AddMovieModal` | Componente | Fluxo em duas etapas: busca TMDB → formulário (nota, veredito, review ou watchlist) |

**Serviço TMDB** (`tmdbService.ts`):
- `enrichMovieWithTmdb(movie)` — busca diretores, elenco (top 5), gêneros, países, sinopse, poster, providers de streaming (região BR), verifica indicação ao Oscar e se é filme nacional
- `searchMovies(query)` — busca por título, retorna top 5 resultados

### Battle (`features/battle/`)

Torneio mata-mata de filmes com bracket eliminatório.

**Estágios:**
1. **Setup** — Critério (Random, Top-rated, Worst-rated, Recent, Oscar 2026, Nacional) + tamanho do bracket (4, 8, 16, 32, 64, Todos)
2. **Battle** — Matchups 1v1 com cards clicáveis, barra de progresso, suporte a byes
3. **Winner** — Exibição do campeão com troféu + confetti

Pré-carrega imagens antes de iniciar. Calcula bracket em potência de 2.

### Dashboard (`features/dashboard/`)

4 cards estatísticos exibidos acima do grid de filmes:

| Card | Cor | Métrica |
|---|---|---|
| Total de Filmes | Dourado | Contagem de filmes avaliados |
| Nota Média | Azul | Média das notas (0-10) |
| Internacionais | Verde | Filmes não-americanos + percentual |
| Top Diretor | Roxo | Diretor mais frequente + contagem |

### Friends (`features/friends/`)

Hook `useFriendship(loggedUserId, profileUserId)` que gerencia o ciclo de amizade:

| Estado | Significado |
|---|---|
| `none` | Sem relação — pode enviar pedido |
| `pending_sent` | Pedido enviado — aguardando resposta |
| `pending_received` | Pedido recebido — pode aceitar |
| `accepted` | Amigos confirmados |

Funções: `sendRequest()`, `acceptRequest()`, `removeOrCancel()`.

### Public Profile (`features/publicProfile/`)

Página acessível por `/perfil/:username`. Exibe o perfil de outro usuário com:
- Avatar, username, contagem de filmes
- Botões de amizade (Adicionar, Pendente, Aceitar, Amigos)
- Dashboard e grid de filmes (read-only)
- Mesmo sistema de filtros do MainApp
- Link "Crie sua própria lista" para visitantes não logados

### Roulette (`features/roulette/`)

Modal de sorteio aleatório de filme da watchlist:
- Animação de spinning (20 iterações, carrossel de posters)
- Exibição do filme sorteado com confetti
- Botão "Ver Detalhes" para abrir o MovieModal

### Share (`features/share/`)

Gera imagem compartilhável (1080×1920, formato story) de uma review:

| Export | Tipo | Descrição |
|---|---|---|
| `useShare` | Hook | Gera PNG via html2canvas. Web Share API no mobile, download no desktop |
| `ShareCard` | Componente | Card invisível (forwardRef) com layout: poster + nota + veredito + branding |

O `ShareCard` usa **inline styles** (exceção à regra CSS Modules) porque o `html2canvas` exige.

---

## Componentes Globais

### Layout (`components/layout/`)

| Componente | Descrição |
|---|---|
| `AppNavbar` | Barra superior: logo, busca, filtros (chips + dropdowns de gênero/ordenação), ações (batalha, amigos, perfil) |
| `BottomNav` | Navegação mobile fixa no rodapé: Home, Batalha, Adicionar, Amigos, Perfil/Login |
| `Footer` | Créditos do desenvolvedor + links sociais (GitHub, LinkedIn) |

### UI (`components/ui/`)

| Componente | Props Principais | Descrição |
|---|---|---|
| `ConfirmModal` | `title`, `message`, `confirmText`, `onConfirm`, `isProcessing` | Modal de confirmação com ícone de alerta e botão de perigo |
| `EmptyState` | `title`, `message`, `actionText`, `onAction` | Estado vazio com ícone de filme e CTA |
| `LoadingOverlay` | `message` | Overlay com spinner centralizado |
| `StarRating` | `value`, `onChange`, `max`, `readOnly` | Avaliação com meia-estrela (0.5), suporte a mouse e touch |

---

## Tipos TypeScript (`types/index.ts`)

| Tipo | Descrição |
|---|---|
| `MovieData` | Objeto completo de filme com dados do Supabase + TMDB (id, tmdb_id, rating, review, recommended, status, título, poster, diretor, elenco, gêneros, países, providers, isOscar, isNational) |
| `TmdbSearchResult` | Resultado de busca TMDB (id, title, release_date, poster_path) |
| `TmdbProvider` | Provider de streaming (provider_id, name, logo_path) |
| `TmdbGenre` | Gênero (id, name) |
| `TmdbCrew` | Membro da equipe (job, name) |
| `TmdbCast` | Membro do elenco (name) |
| `TmdbCountry` | País de produção (iso_3166_1, name) |
| `Friendship` | Registro de amizade (id, requester_id, receiver_id, status, created_at) |
| `FriendProfile` | Perfil de amigo com status da amizade |

---

## Utilitários (`utils/`)

| Função | Arquivo | Descrição |
|---|---|---|
| `getBadgeStyle(text)` | `badges.ts` | Mapeia texto de recomendação → esquema de cores (verde, amarelo, laranja, vermelho) |
| `getCroppedImg(src, pixelCrop)` | `cropImage.ts` | Recorta imagem do avatar usando coordenadas de pixel. Retorna Blob JPEG (90% qualidade) |

---

## Constantes (`constants/`)

| Constante | Arquivo | Descrição |
|---|---|---|
| `OSCAR_NOMINEES_IDS` | `oscar.ts` | Array de TMDB IDs dos filmes indicados ao Oscar 2026 |

---

## Integração com APIs Externas

### Supabase

| Recurso | Uso |
|---|---|
| **Auth** | `signInWithPassword()`, `signUp()`, `signOut()`, `onAuthStateChange()` |
| **Database** | Tabelas `profiles`, `reviews`, `friendships` |
| **Storage** | Bucket `avatars` para upload de fotos de perfil |

**Variáveis de ambiente:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`

### TMDB (The Movie Database)

| Endpoint | Uso |
|---|---|
| `/movie/{id}` | Detalhes completos + créditos + providers |
| `/search/movie` | Busca por título |

**Parâmetros:** `api_key` (env), `language=pt-BR`, `append_to_response=credits,watch/providers`
**Variável de ambiente:** `VITE_TMDB_API_KEY`

---

## Schema do Banco (inferido do código)

### `profiles`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID (FK auth.users) | ID do usuário |
| `username` | TEXT (unique) | Nome de usuário |
| `avatar_url` | TEXT (nullable) | URL pública do avatar |

### `reviews`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | BIGINT (PK) | ID da review |
| `user_id` | UUID (FK profiles) | Autor |
| `tmdb_id` | INTEGER | ID do filme no TMDB |
| `rating` | FLOAT (nullable) | Nota (null = watchlist) |
| `review` | TEXT | Texto da review |
| `recommended` | TEXT | Veredito (5 opções) |
| `status` | TEXT | `'watched'` ou `'watchlist'` |
| `created_at` | TIMESTAMP | Data de criação |

### `friendships`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID (PK) | ID da amizade |
| `requester_id` | UUID (FK profiles) | Quem enviou |
| `receiver_id` | UUID (FK profiles) | Quem recebeu |
| `status` | TEXT | `'pending'`, `'accepted'`, `'declined'` |
| `created_at` | TIMESTAMP | Data do pedido |

### Storage: Bucket `avatars`
Bucket público. Arquivos nomeados `{user_id}-{random}.jpg`.

---

## PWA (Progressive Web App)

O app é instalável como PWA via **Vite PWA Plugin**:

- Estratégia: **auto-update** (atualiza automaticamente)
- Service Worker: gerado pelo Workbox (`dev-dist/sw.js`)
- Manifest: ícones 192×192 e 512×512, display standalone
- Cor do tema: `#212529`

---

## Quando Usar Cada Pasta

| Pasta | O que vai aqui | Exemplo |
|---|---|---|
| `components/layout/` | Peças estruturais da página (navbar, footer, bottom nav) | `AppNavbar`, `BottomNav`, `Footer` |
| `components/ui/` | Componentes genéricos reutilizáveis, sem lógica de negócio | `ConfirmModal`, `EmptyState`, `StarRating` |
| `features/XYZ/` | Tudo relacionado a uma funcionalidade completa | `movies`, `auth`, `battle`, `friends` |
| `lib/` | Inicialização de clientes externos | `supabase.ts` |
| `services/` (dentro de feature) | Chamadas de API dessa feature | `tmdbService.ts` |
| `types/` | Interfaces/types compartilhados entre features | `MovieData`, `Friendship` |
| `utils/` | Funções puras sem side effects | `getBadgeStyle()`, `getCroppedImg()` |
| `constants/` | Valores fixos | `OSCAR_NOMINEES_IDS` |
| `styles/` | Design tokens e CSS global (reset, dark theme, overrides Bootstrap) | `variables.css`, `global.css` |

---

## Como Adicionar uma Nova Feature

Exemplo: Adicionar uma feature **"Listas"** (listas personalizadas de filmes).

### Passo 1: Criar a pasta da feature

```
src/features/lists/
├── components/
│   └── ListCard/
│       ├── ListCard.tsx
│       └── ListCard.module.css
├── hooks/
│   └── useLists.ts
├── services/
│   └── listService.ts       # (se tiver API própria)
└── index.ts
```

### Passo 2: Criar o barrel export

```typescript
// features/lists/index.ts
export { ListCard } from "./components/ListCard/ListCard";
export { useLists } from "./hooks/useLists";
```

### Passo 3: Tipos novos? Adicionar em `types/index.ts`

```typescript
export interface MovieList {
   id: number;
   name: string;
   movie_ids: number[];
   created_at: string;
}
```

### Passo 4: Usar no App.tsx

```typescript
import { ListCard, useLists } from "@/features/lists";
```

### Passo 5: Estilos

- Crie `ListCard.module.css` na pasta do componente
- Use variáveis de `variables.css`
- Se precisar de uma cor nova, adicione em `variables.css` primeiro

---

## Relação com Bootstrap

O projeto usa `react-bootstrap` para:
- **Componentes prontos**: `Modal`, `Button`, `Form`, `Badge`, `Dropdown`, etc.
- **Classes utilitárias**: `d-flex`, `text-center`, `mb-4`, `fw-bold`, `d-md-none`, etc.

**Quando usar Bootstrap:** Para layouts rápidos e componentes de UI padrão.
**Quando usar CSS Module:** Para estilos visuais específicos do componente (hover, cores customizadas, animações).

**Regra prática:**
- Layout e espaçamento → classes Bootstrap (`d-flex`, `gap-3`, `mb-4`)
- Visual único do componente → CSS Module (`.ratingBadge`, `.championImage`)
- Inline styles → **EVITAR**. Exceção: `ShareCard` (necessário para `html2canvas`)

Os estilos globais em `global.css` incluem **overrides de dark theme** para componentes Bootstrap (modais, forms, cards, badges, focus states com glow dourado).

---

## Convenções de Nomenclatura

| Item | Convenção | Exemplo |
|---|---|---|
| Pasta de componente | PascalCase | `MovieCard/` |
| Arquivo de componente | PascalCase | `MovieCard.tsx` |
| CSS Module | PascalCase + `.module.css` | `MovieCard.module.css` |
| Hook | camelCase, prefixo `use` | `useMovies.ts` |
| Service | camelCase + `Service` | `tmdbService.ts` |
| Barrel export | `index.ts` | `features/movies/index.ts` |
| Constantes | UPPER_SNAKE_CASE | `OSCAR_NOMINEES_IDS` |
| Tipos/Interfaces | PascalCase | `MovieData`, `TmdbProvider`, `Friendship` |
| Variáveis CSS | kebab-case com `--` prefix | `--gold`, `--bg-surface` |

---

## Path Alias

O projeto usa `@/` como alias para `src/`:

```typescript
// ✅ Correto
import { MovieData } from "@/types";
import { supabase } from "@/lib/supabase";

// ❌ Errado (imports relativos longos)
import { MovieData } from "../../../types";
```

Configurado em `tsconfig.app.json` e `vite.config.ts`.

---

## Checklist para Code Review

Antes de aprovar um PR, verifique:

- [ ] Componentes novos ficam dentro de `features/` (não soltos em `src/`)
- [ ] Estilos de componente usam CSS Module (não inline styles)
- [ ] Cores novas são variáveis CSS em `variables.css`
- [ ] Chamadas de API passam por um service
- [ ] Imports usam `@/` (não caminhos relativos longos)
- [ ] Feature tem `index.ts` com exports públicos
- [ ] Hooks novos seguem prefixo `use`
- [ ] Types compartilhados estão em `types/index.ts`
- [ ] Componentes de layout/ui genéricos ficam em `components/`, não em `features/`
- [ ] Dark theme respeitado — sem cores claras hardcoded

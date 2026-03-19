# Arquitetura do Frontend — JJ Reviews

Documento completo da arquitetura do projeto frontend. Explica como tudo está organizado, o que cada peça faz, e como manter a qualidade ao adicionar features.

## Playbook de Novas Features (FC/IS)

Para garantir consistência na criação de novas funcionalidades, o processo oficial está documentado em `FEATURE_PLAYBOOK.md`.

Use esse playbook como checklist de PR e definição de pronto para qualquer feature nova.

---

## Stack Tecnológico

| Tecnologia | Versão | Uso |
|---|---|---|
| React | 19.2 | Framework de UI |
| TypeScript | 5.9 | Tipagem estática |
| Vite | 7.2 | Build tool + dev server |
| Vitest | 4.0 | Framework de testes (unit + integration) |
| Testing Library | 16.3 | Testes de componentes React |
| Supabase | 2.93 | Auth, banco de dados (PostgreSQL), storage, realtime, edge functions |
| Capacitor | 8.2 | Build nativo Android (APK/AAB), deep links, push, share nativo |
| React Bootstrap | 2.10 | Componentes UI + utilidades CSS |
| React Router Dom | 7.13 | Roteamento SPA com search params como fonte de verdade |
| Axios | 1.13 | Requisições HTTP (TMDB API) |
| Lucide React | 0.576 | Ícones SVG |
| Vite PWA Plugin | 1.2 | Progressive Web App (auto-update, offline) |
| React Hot Toast | 2.6 | Notificações toast |
| html2canvas | 1.4 | Geração de imagem para compartilhamento |
| canvas-confetti | 1.9 | Animação de confetti (batalha e roleta) |
| react-easy-crop | 5.5 | Recorte circular de imagem (avatar) |

---

## Visão Geral da Estrutura

```
src/
├── assets/               # Arquivos estáticos (imagens, fontes, SVGs)
├── components/           # Componentes GLOBAIS compartilhados
│   ├── layout/           #   Navbar, BottomNav, Footer
│   └── ui/               #   ConfirmModal, EmptyState, LoadingOverlay, StarRating
├── constants/            # Constantes globais (ex: IDs do Oscar)
├── features/             # Módulos por funcionalidade (CORAÇÃO da arquitetura)
│   ├── auth/             #   Login, cadastro, perfil, amigos, reset senha
│   ├── battle/           #   Torneio mata-mata de filmes
│   ├── dashboard/        #   5 cards estatísticos interativos
│   ├── friends/          #   Hook de amizade (useFriendship)
│   ├── lists/            #   Listas personalizadas (privadas, colaborativas, unificadas)
│   ├── movies/           #   CRUD de filmes (cards, modais, filtros, serviço TMDB)
│   ├── notifications/    #   Notificações in-app (realtime) + push nativo (FCM)
│   ├── publicProfile/    #   Perfil público visitável por URL
│   ├── roulette/         #   Roleta — sorteio aleatório da watchlist
│   └── share/            #   Gerar imagem customizável e compartilhar review
├── hooks/                # Hooks globais (useModalBack, usePushNotifications)
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

O app usa **React Router Dom** com três rotas:

| Rota | Componente | Descrição |
|---|---|---|
| `/` | `MainApp` | Tela principal (landing, dashboard, filmes, listas, modais) |
| `/perfil/:username` | `PublicProfile` | Perfil público de outro usuário (read-only com amizade) |
| `/reset-password` | `ResetPassword` | Tela de redefinição de senha (valida sessão via token) |

```tsx
// App.tsx
<Routes>
   <Route path="/" element={<MainApp />} />
   <Route path="/perfil/:username" element={<PublicProfile />} />
   <Route path="/reset-password" element={<ResetPassword />} />
</Routes>
```

**Usuários não logados:** veem uma **landing page** com hero section + 5 cards explicativos (Avalie, Watchlist, Listas Compartilhadas, Compartilhe, Modo Batalha).

**Usuários logados:** veem o dashboard + grid de filmes com 3 abas (Assistidos, Watchlist, Minhas Listas).

### URL como Fonte de Verdade

A URL controla o estado de navegação via **search params**:

| Param | Exemplo | Controla |
|---|---|---|
| `aba` | `?aba=watchlist`, `?aba=lists` | Aba ativa (watched é default, sem param) |
| `movie` | `?movie=550` | Filme selecionado no modal (permite deep links e F5) |
| `listId` | `?listId=abc-123` | Lista aberta diretamente |
| `modo` | `?modo=batalha` | Ativa o modo batalha fullscreen |

Isso permite que deep links do WhatsApp, F5 e o botão voltar nativo do Android funcionem corretamente.

---

## Princípios da Arquitetura

### 1. Feature-Based Structure

Cada feature vive em `features/` e é **auto-contida**: componentes, hooks, serviços e estilos próprios.

```
features/movies/
├── components/
│   ├── MovieCard/
│   │   ├── MovieCard.tsx          (114 linhas)
│   │   └── MovieCard.module.css
│   ├── MovieCardSkeleton/
│   │   ├── MovieCardSkeleton.tsx
│   │   └── MovieCardSkeleton.module.css
│   ├── MovieModal/
│   │   ├── MovieModal.tsx          (222 linhas)
│   │   └── MovieModal.module.css
│   └── AddMovieModal/
│       ├── AddMovieModal.tsx       (465 linhas)
│       └── AddMovieModal.module.css
├── hooks/
│   ├── useMovies.ts                (54 linhas)
│   └── useMovieFilters.ts          (99 linhas)
├── services/
│   └── tmdbService.ts              (78 linhas)
└── index.ts
```

**Regras:**
- Cada feature importa apenas de `@/types`, `@/utils`, `@/lib` — nunca de outra feature.
- Exceção: `useShare` importa `useAuth` para obter o username.

### 2. Barrel Exports (`index.ts`)

Toda feature tem um `index.ts` como API pública:

```typescript
// features/auth/index.ts
export { LoginModal } from "./components/LoginModal/LoginModal";
export { ProfileModal } from "./components/ProfileModal/ProfileModal";
export { FriendsModal } from "./components/FriendsModal/FriendsModal";
export { ResetPassword } from "./components/ResetPassword/ResetPassword";
export { useAuth } from "./hooks/useAuth";
```

**Regra:** Importar sempre do `index.ts`, nunca do caminho interno.

### 3. CSS Modules

Cada componente tem um `*.module.css` co-localizado:

```tsx
import styles from "./MovieCard.module.css";
<div className={styles.card}>
```

- Escopo local automático (sem conflito de classes)
- Nativo do Vite, zero dependências
- **Exceção:** `ShareCard` usa inline styles (exigência do html2canvas)

### 4. Design Tokens

O design system vive em `styles/variables.css`:

```css
:root {
   /* Cores principais */
   --gold: #E8B100;
   --gold-hover: #FFC620;
   --gold-dim: #A37D00;
   --accent: #3B82F6;
   --success: #22C55E;
   --danger: #EF4444;

   /* Backgrounds (dark theme) */
   --bg-page: #0D0D0D;
   --bg-surface: #1A1A1A;
   --bg-elevated: #252525;

   /* Texto */
   --text-primary: #F5F5F5;
   --text-secondary: #A0A0A0;
   --text-muted: #666666;

   /* Badges de recomendação */
   --badge-great: #22C55E;
   --badge-good: #34D399;
   --badge-ok: #FACC15;
   --badge-bad: #FB923C;
   --badge-terrible: #EF4444;

   /* Tipografia */
   --font-family: "Inter", sans-serif;

   /* Efeitos */
   --radius-sm: 6px;
   --radius-md: 10px;
   --radius-lg: 16px;
   --radius-xl: 20px;
   --radius-pill: 50rem;
   --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
   --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
   --shadow-lg: 0 10px 30px rgba(0, 0, 0, 0.6);
   --transition-fast: 0.15s ease-out;
   --transition-normal: 0.25s ease;
}
```

**Regra:** Zero cores hardcoded nos CSS Modules. Sempre `var(--nome)`.

### 5. Custom Hooks

Toda lógica de estado e side effects vive em hooks dedicados:

| Hook | Feature | Linhas | Responsabilidade |
|---|---|---|---|
| `useAuth` | auth | 59 | Sessão Supabase, perfil, login/logout, avatar |
| `useMovies` | movies | 54 | Carregar filmes do Supabase + enriquecer com TMDB |
| `useMovieFilters` | movies | 99 | Filtros, busca full-text, ordenação, view mode via URL |
| `useLists` | lists | 220 | CRUD de listas, filmes, colaboradores, realtime |
| `useNotifications` | notifications | 115 | Fetch com join, realtime, marcar lidas (individual e batch) |
| `useFriendship` | friends | 142 | State machine de amizade + notificações cross-table |
| `useShare` | share | 143 | Gerar imagem PNG, compartilhar via Web Share / Capacitor / download |
| `usePublicProfile` | publicProfile | 59 | Carregar perfil + filmes de outro usuário via username |
| `useModalBack` | global | 33 | Controle do botão Voltar para fechar modais (hash `#modal`) |
| `usePushNotifications` | global | 62 | Registro FCM + salvar token no Supabase |

### 6. Service Layer

Chamadas a APIs externas ficam isoladas:

```typescript
// features/movies/services/tmdbService.ts
export async function enrichMovieWithTmdb(movie) { ... }  // fetch + merge
export async function searchMovies(query) { ... }         // busca por título
export async function getMovieDetails(tmdbId) { ... }     // detalhes extras (runtime)
```

**Regra:** Componentes nunca chamam `axios.get()` ou `fetch()` diretamente.

---

## Features em Detalhe

### Auth (`features/auth/`)

```
auth/
├── components/
│   ├── LoginModal/     (182 linhas) — Login, cadastro, esqueci senha
│   ├── ProfileModal/   (385 linhas) — Avatar crop, username, senha, deletar conta
│   ├── FriendsModal/   (235 linhas) — Lista de amigos + busca por username
│   └── ResetPassword/  (65 linhas)  — Redefinir senha via token
└── hooks/
    └── useAuth.ts      (59 linhas)  — Sessão, perfil, avatar, logout
```

| Export | Tipo | Descrição |
|---|---|---|
| `useAuth` | Hook | `session`, `username`, `avatarUrl`, `loading`, `logout()`, `updateUsername()`, `fetchProfile()` |
| `LoginModal` | Componente | 3 modos: login, cadastro, esqueci senha. Validação de username (lowercase, alfanumérico + underscore). Usa `useModalBack()` |
| `ProfileModal` | Componente | 2 abas: "Perfil" (avatar crop com zoom + username) e "Segurança" (alterar senha, deletar conta). Upload para Supabase Storage bucket `avatars`. Copiar link do perfil. Compartilhar perfil |
| `FriendsModal` | Componente | 2 abas: "Amigos" (lista com badges: Amigos/Enviado/Analisar Pedido) e "Buscar" (pesquisa case-insensitive via `ilike`). Navegação para `/perfil/:username` |
| `ResetPassword` | Componente | Página standalone. Valida sessão, exige min. 6 caracteres, redireciona para home após reset |

### Movies (`features/movies/`)

```
movies/
├── components/
│   ├── MovieCard/          (114 linhas) — Card com poster, nota, badges, tags
│   ├── MovieCardSkeleton/  — Skeleton loading que replica o layout do MovieCard
│   ├── MovieModal/         (222 linhas) — Detalhes completos do filme
│   └── AddMovieModal/      (465 linhas) — Busca TMDB + formulário de review
├── hooks/
│   ├── useMovies.ts        (54 linhas)  — Fetch + enriquecimento TMDB
│   └── useMovieFilters.ts  (99 linhas)  — Filtros, sort, busca, view mode
└── services/
    └── tmdbService.ts      (78 linhas)  — axios para API TMDB
```

| Export | Tipo | Descrição |
|---|---|---|
| `useMovies` | Hook | Carrega reviews do Supabase, enriquece com TMDB via `enrichMovieWithTmdb()`. Skeleton só no primeiro load (refresh silencioso depois) |
| `useMovieFilters` | Hook | Filtros: nacional, Oscar, internacional (fora dos EUA), gênero, diretor. Busca full-text (título, review, diretor, elenco, gênero). Ordenação: recentes, rating, lançamento, A-Z. View mode via URL param `aba` |
| `MovieCard` | Componente | Poster lazy-loaded, badge de nota (ou "Na Fila" para watchlist), diretor + ano, tags Nacional/Oscar, badge de recomendação colorido. Para listas `partial_shared`: mostra ícone Users e avatares dos membros |
| `MovieCardSkeleton` | Componente | Placeholder animado durante loading |
| `MovieModal` | Componente | Layout responsivo: poster + streaming providers (coluna esquerda) + metadata + review (coluna direita). Layouts adaptam para `partial_shared` (mostra reviews de todos os membros em grupo). Sinopse TMDB, elenco como badges, imagem anexa (bilhete/coleção). Barra admin: Editar, Excluir, Compartilhar |
| `AddMovieModal` | Componente | Fluxo em 2 etapas: **Busca** (pesquisa TMDB, seleciona filme) → **Formulário** (2 modos: "Já Assisti" com nota/veredito/review/localização/imagem ou "Quero Ver" para watchlist). Pode salvar no perfil ou exclusivamente numa lista compartilhada. Upload de imagem para Supabase Storage. Modo edição: pré-popula campos. Opção "salvar e adicionar outro" |

**Serviço TMDB** (`tmdbService.ts`):
- `enrichMovieWithTmdb()` — busca diretores, elenco (top 5), gêneros, países traduzidos para PT-BR, sinopse, poster, streaming providers (região BR), verifica Oscar e se é nacional
- `searchMovies()` — busca por título, top 5 resultados
- `getMovieDetails()` — detalhes extras como `runtime` (duração em minutos)

### Dashboard (`features/dashboard/`)

5 cards estatísticos exibidos acima do grid de filmes. Heading: **"Sua Jornada Cinematográfica"**.

| # | Card | Ícone | Cor | Métrica | Interativo? |
|---|---|---|---|---|---|
| 1 | Filmes Assistidos | Film | Dourado `#E8B100` | Total de filmes com status `watched` | Não |
| 2 | Média Geral | Star | Amarelo `#EAB308` | Média aritmética de todas as notas (1 casa decimal) | Não |
| 3 | Tempo de Vida | Clock | Azul `#3B82F6` | Soma dos `runtime` de todos os filmes em formato `Xd Yh` | Não |
| 4 | Fora dos EUA | Globe | Verde `#10B981` | Percentual + contagem de filmes sem "Estados Unidos" nos países | **Sim** — clique filtra por filmes internacionais |
| 5 | Diretor Favorito | Clapperboard | Roxo `#A855F7` | Nome do diretor mais frequente + contagem. Se nenhum tem 2+, exibe "Vários" | **Sim (condicional)** — clique filtra por diretor (se tem 2+ filmes) |

**Props:** `movies`, `onFilterDirector(directorName)`, `onFilterNonUS()`

**Layout:** Grid 5 colunas → 3 colunas em tablet → 2 colunas em mobile. Cards com hover (elevação + borda dourada). Barra colorida no topo de cada card.

### Battle (`features/battle/`)

Torneio mata-mata de filmes com bracket eliminatório (270 linhas).

| Estágio | Descrição |
|---|---|
| **Setup** | Escolhe critério de seleção + tamanho do bracket |
| **Battle** | Matchups 1v1 em cards clicáveis, barra de progresso por rodada |
| **Winner** | Campeão exibido com troféu dourado + confetti |

**Critérios de seleção:** Random, Top-rated, Worst-rated, Recent, Oscar, Nacional
**Tamanhos:** 4, 8, 16, 32, 64

**Detalhes técnicos:**
- Fisher-Yates shuffle para randomização sem viés
- Bracket calculado em potência de 2 com byes (walkovers automáticos)
- Pré-carregamento de imagens dos posters antes do início
- Títulos de rodada dinâmicos: "Grande Final", "Semifinais", "Quartas de Final", etc.
- Sub-componente privado `BattleCard` para cada confronto

### Friends (`features/friends/`)

Hook `useFriendship(loggedUserId, profileUserId)` — state machine de amizade (142 linhas):

| Estado | Significado | Ação possível |
|---|---|---|
| `none` | Sem relação | `sendRequest()` — envia pedido + cria notificação |
| `pending_sent` | Pedido enviado | `removeOrCancel()` — cancela pedido |
| `pending_received` | Pedido recebido | `acceptRequest()` + notificação de aceite / `rejectRequest()` |
| `accepted` | Amigos | `removeOrCancel()` — desfaz amizade |

Query bidirecional: verifica `(A→B)` ou `(B→A)` com um único `or()`.

### Public Profile (`features/publicProfile/`)

Página acessível por `/perfil/:username` (512 linhas). Funciona como um "mini-app" completo:

- Header: avatar, username, total de filmes, botão de amizade (estado dinâmico)
- Dashboard de estatísticas do perfil visitado
- 3 abas: Assistidos, Watchlist, Listas (mesmas do MainApp)
- Sistema completo de filtros: nacional, Oscar, busca, gênero, ordenação
- Modo Batalha dentro do perfil
- Deep link para filme: `?movie={id}` abre o modal direto
- Bottom navigation mobile
- Para não logados: CTA "Crie sua própria lista"

### Roulette (`features/roulette/`)

Modal de sorteio aleatório (80 linhas):

- Gatilho: abre automaticamente quando o modal é exibido
- Animação: 20 iterações (100ms cada), mostra posters em sequência rápida
- Resultado: filme sorteado + confetti
- "Ver Detalhes": abre MovieModal do filme sorteado
- Tratamento de watchlist vazia

### Lists (`features/lists/`)

```
lists/
├── components/
│   ├── CreateListModal/  (260 linhas) — Criar lista com convite de amigos
│   ├── EditListModal/    (95 linhas)  — Editar nome, descrição, configurações
│   └── ListDetails/      (520 linhas) — Visualização completa da lista
└── hooks/
    └── useLists.ts       (220 linhas) — CRUD + realtime
```

**3 tipos de lista:**

| Tipo | Nome na UI | Descrição |
|---|---|---|
| `private` | Lista Particular | Apenas do dono, não compartilhada |
| `partial_shared` | Lista Colaborativa | Cada membro avalia independentemente; sistema calcula média |
| `full_shared` | Lista Unificada | Uma review/rating compartilhada do grupo inteiro |

| Export | Tipo | Descrição |
|---|---|---|
| `useLists` | Hook | `fetchLists()`, `createList()`, `addMovieToList()`, `updateList()`, `removeMovieFromList()`. Realtime: escuta DELETE/INSERT em `lists`, `list_collaborators`, `list_movies` |
| `CreateListModal` | Componente | Formulário: nome (max 50), descrição (max 200), tipo, seletor de amigos (com avatares + checkmarks), toggle de rating (manual/average), toggle auto_sync (só full_shared). Envia notificação de convite |
| `EditListModal` | Componente | Mesmo formulário, pré-populado para edição com contadores de caracteres |
| `ListDetails` | Componente | Header com nome + descrição + rating da lista. Banner de aceite/rejeição de convite. Grid de filmes com overlay de nota. Avatares de colaboradores (clicável para remover se é dono). Reviews em grupo (partial_shared). Permissões: Owner > Accepted > Pending > None. Ações: editar, sair, excluir |

**Funcionalidades avançadas:**
- Ao apagar um filme do perfil → remove automaticamente das listas particulares
- Auto_sync: filmes adicionados ao perfil vão automaticamente para listas com sync ativo
- Deduplicação de listas (listas próprias + listas como colaborador aceito/pendente)
- Verificação de filme duplicado antes de adicionar à lista

### Share (`features/share/`)

```
share/
├── components/
│   ├── ShareCard/  — Card invisível para gerar imagem (forwardRef)
│   └── ShareModal/ (108 linhas) — Modal com opções de compartilhamento
└── hooks/
    └── useShare.ts (143 linhas) — Lógica de gerar imagem + compartilhar
```

| Export | Tipo | Descrição |
|---|---|---|
| `useShare` | Hook | `handleShareImage(movie)` — gera PNG via html2canvas (1080×1920). Suporta 3 plataformas: Capacitor nativo (Filesystem + Share), Web Share API (mobile browser), download direto (desktop). `handleShareLink(movie)` — monta URL pública e compartilha ou copia para clipboard |
| `ShareCard` | Componente | forwardRef renderizado off-screen. Inline styles obrigatórios (html2canvas). Exibe: poster, nota, veredito, branding. Configurável via `ShareOptions` |
| `ShareModal` | Componente | 2 métodos: "Enviar Link" e "Criar Imagem". Toggles customizáveis: mostrar/ocultar título, detalhes (ano + diretor), estrelas, veredito. Preview reativo do ShareCard. Usa `useModalBack()` |

**ShareOptions (toggles):** `showTitle`, `showDetails`, `showRating`, `showVerdict`

### Notifications (`features/notifications/`)

```
notifications/
├── components/
│   └── NotificationBell/ (107 linhas) — Sino com dropdown
└── hooks/
    └── useNotifications.ts (115 linhas) — Fetch + realtime
```

| Export | Tipo | Descrição |
|---|---|---|
| `useNotifications` | Hook | `fetchNotifications()` (últimas 50 com join de sender profile), `markAsRead(id)`, `markAllAsRead()`, `unreadCount`. Realtime: canal `realtime:notifications` escuta INSERT |
| `NotificationBell` | Componente | Ícone de sino com badge (mostra "9+" se >9). Dropdown com lista. Ícones por tipo (friend_request, list_invite, movie_added). Tempo relativo ("5 min atrás", "2h atrás"). Navegação inteligente: friend → perfil, list_invite → `/?aba=lists&listId=X`, movie_added → `/?aba=lists` |

**Tipos de notificação e gatilhos:**

| Tipo | Gatilho | Mensagem exemplo |
|---|---|---|
| `friend_request` | Envio ou aceitação de pedido | "enviou-te um pedido de amizade!" |
| `list_invite` | Convite para lista | "convidou você para uma Lista Colaborativa!" |
| `movie_added` | Filme adicionado a lista compartilhada | (customizável) |
| `general` | Sistema | (customizável) |

**Push nativo (FCM):** `usePushNotifications` registra no Firebase, salva token em `fcm_tokens`. Edge Function `send-push` dispara os pushes.

---

## Componentes Globais

### Layout (`components/layout/`)

| Componente | Descrição |
|---|---|
| `AppNavbar` | Barra superior responsiva. Logo + search input + botão de filtros. Dropdown de sort (Recentes, Melhores Notas, Lançamento, A-Z). Filtro de gênero. Botão Batalha. `NotificationBell`. Avatar/username ou botão Login. Filter chips: Nacional, Oscar |
| `BottomNav` | Barra fixa mobile (5 itens): Home, Batalha, Adicionar (botão central destaque), Amigos, Perfil/Login. Avatar do usuário no botão de perfil. Rendering condicional por estado de auth |
| `Footer` | Créditos do desenvolvedor + links sociais (GitHub, LinkedIn) |

### UI (`components/ui/`)

| Componente | Props | Descrição |
|---|---|---|
| `ConfirmModal` | `show`, `title`, `message`, `confirmText`, `onConfirm`, `onHide`, `isProcessing` | Modal genérico de confirmação com ícone de alerta e botão de perigo |
| `EmptyState` | `title`, `message`, `actionText`, `onAction` | Estado vazio com ícone de filme + CTA para adicionar |
| `LoadingOverlay` | `message` | Overlay fullscreen com spinner centralizado |
| `StarRating` | `value`, `onChange`, `max`, `readOnly` | Sistema de 10 estrelas com precisão de 0.5. Pointer events unificados (mouse + touch). Pointer capture para drag. Double-tap reseta -0.5. Exibe valor numérico ao lado |

---

## Tipos TypeScript (`types/index.ts`)

| Tipo | Campos chave | Descrição |
|---|---|---|
| `MovieData` | `id`, `tmdb_id`, `rating`, `review`, `recommended`, `status`, `title`, `poster_path`, `director`, `cast[]`, `genres[]`, `countries[]`, `providers[]`, `isOscar`, `isNational`, `runtime`, `attachment_url`, `list_type`, `list_average_rating`, `list_group_reviews[]` | Objeto completo de filme (Supabase + TMDB + metadados de lista) |
| `TmdbSearchResult` | `id`, `title`, `release_date`, `poster_path` | Resultado de busca TMDB |
| `TmdbProvider` | `provider_id`, `provider_name`, `logo_path` | Streaming provider |
| `TmdbGenre` | `id`, `name` | Gênero de filme |
| `TmdbCrew` | `job`, `name` | Membro da equipe |
| `TmdbCast` | `name` | Membro do elenco |
| `TmdbCountry` | `iso_3166_1`, `name` | País de produção |
| `Friendship` | `id`, `requester_id`, `receiver_id`, `status`, `created_at` | Registro de amizade |
| `FriendProfile` | `friendship_id`, `user_id`, `username`, `avatar_url`, `status`, `is_requester` | Perfil de amigo com contexto da amizade |
| `CustomList` | `id`, `owner_id`, `name`, `description`, `type`, `has_rating`, `rating_type`, `manual_rating`, `auto_sync`, `movie_count` | Lista personalizada |
| `ListMovie` | `list_id`, `tmdb_id`, `added_by`, `created_at` | Relação filme-lista |
| `ListCollaborator` | `id`, `list_id`, `user_id`, `role`, `status`, `user?` | Colaborador (com perfil aninhado) |
| `ListReview` | `id`, `list_id`, `tmdb_id`, `user_id`, `rating`, `review`, `user?` | Review em lista unificada |
| `AppNotification` | `id`, `user_id`, `sender_id`, `type`, `message`, `is_read`, `created_at`, `sender?` | Notificação (com perfil do remetente) |

---

## Utilitários (`utils/`)

| Função | Arquivo | Descrição |
|---|---|---|
| `getBadgeStyle(text)` | `badges.ts` | Mapeia texto de recomendação → `{bg, color}` |
| `getBadgeValue(text)` | `badges.ts` | Converte texto de recomendação → valor numérico (-2 a +2) |
| `getBadgeTextFromValue(value)` | `badges.ts` | Converte valor numérico → texto de recomendação |
| `calculateAverageBadge(badges[])` | `badges.ts` | Calcula média de recomendações (arredonda para baixo) |
| `getCroppedImg(src, pixelCrop)` | `cropImage.ts` | Recorta imagem via Canvas. Retorna Blob JPEG (90% qualidade) |

**Escala de recomendação:**

| Valor | Texto | Cor |
|---|---|---|
| +2 | "Assista com certeza" | Verde `#22C55E` |
| +1 | "Vale a pena" | Verde claro `#34D399` |
| 0 | "Tem filmes melhores, legal" | Amarelo `#FACC15` |
| -1 | "Não tão bom" | Laranja `#FB923C` |
| -2 | "Não perca seu tempo" | Vermelho `#EF4444` |

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
| **Auth** | `signInWithPassword()`, `signUp()`, `signOut()`, `onAuthStateChange()`, password recovery |
| **Database** | 9 tabelas: `profiles`, `reviews`, `friendships`, `lists`, `list_movies`, `list_collaborators`, `list_reviews`, `notifications`, `fcm_tokens` |
| **Storage** | Bucket público `avatars` + bucket de attachment images |
| **Realtime** | Channels para escutar INSERT/DELETE em `notifications`, `lists`, `list_collaborators`, `list_movies`, `list_reviews` |
| **Edge Functions** | `send-push` — dispara push notifications via Firebase Cloud Messaging |

**Variáveis de ambiente:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`

### TMDB (The Movie Database)

| Endpoint | Uso |
|---|---|
| `/movie/{id}?append_to_response=credits,watch/providers` | Detalhes completos + créditos + streaming |
| `/search/movie` | Busca por título |

**Parâmetros padrão:** `api_key`, `language=pt-BR`
**Variável de ambiente:** `VITE_TMDB_API_KEY`

**Dados extraídos:**
- Diretores (filtro `job === "Director"`)
- Elenco (top 5)
- Gêneros traduzidos
- Países (traduzidos via `Intl.DisplayNames`)
- Poster e sinopse em PT-BR
- Streaming providers (região BR, flatrate)
- Runtime (duração em minutos)

---

## Schema do Banco (inferido do código)

### `profiles`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID (FK auth.users) | ID do usuário |
| `username` | TEXT (unique) | Nome de usuário (lowercase, alfanumérico + underscore) |
| `avatar_url` | TEXT (nullable) | URL pública do avatar |

### `reviews`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | BIGINT (PK) | ID da review |
| `user_id` | UUID (FK profiles) | Autor |
| `tmdb_id` | INTEGER | ID do filme no TMDB |
| `rating` | FLOAT (nullable) | Nota 0-10 (null = watchlist) |
| `review` | TEXT | Texto da review |
| `recommended` | TEXT | Veredito (5 opções: de "Assista com certeza" a "Não perca seu tempo") |
| `location` | TEXT (nullable) | Onde assistiu (cinema, casa, etc.) |
| `status` | TEXT | `'watched'` ou `'watchlist'` |
| `attachment_url` | TEXT (nullable) | URL de imagem anexa (bilhete, foto) |
| `created_at` | TIMESTAMP | Data de criação |

### `friendships`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID (PK) | ID da amizade |
| `requester_id` | UUID (FK profiles) | Quem enviou |
| `receiver_id` | UUID (FK profiles) | Quem recebeu |
| `status` | TEXT | `'pending'`, `'accepted'`, `'declined'` |
| `created_at` | TIMESTAMP | Data do pedido |

### `lists`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID (PK) | ID da lista |
| `owner_id` | UUID (FK profiles) | Dono da lista |
| `name` | TEXT | Nome (max 50 caracteres) |
| `description` | TEXT (nullable) | Descrição (max 200 caracteres) |
| `type` | TEXT | `'private'`, `'partial_shared'`, `'full_shared'` |
| `has_rating` | BOOLEAN | Se a lista tem sistema de rating |
| `rating_type` | TEXT (nullable) | `'manual'` ou `'average'` |
| `manual_rating` | FLOAT (nullable) | Rating manual definido pelo dono |
| `auto_sync` | BOOLEAN | Sincronizar filmes do perfil automaticamente |
| `created_at` | TIMESTAMP | Data de criação |

### `list_movies`
| Coluna | Tipo | Descrição |
|---|---|---|
| `list_id` | UUID (FK lists) | Lista |
| `tmdb_id` | INTEGER | Filme |
| `added_by` | UUID (FK profiles) | Quem adicionou |
| `created_at` | TIMESTAMP | Data de adição |

### `list_collaborators`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID (PK) | ID |
| `list_id` | UUID (FK lists) | Lista |
| `user_id` | UUID (FK profiles) | Colaborador |
| `role` | TEXT | `'owner'` ou `'member'` |
| `status` | TEXT | `'pending'` ou `'accepted'` |
| `created_at` | TIMESTAMP | Data do convite |

### `list_reviews`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID (PK) | ID |
| `list_id` | UUID (FK lists) | Lista |
| `tmdb_id` | INTEGER | Filme |
| `user_id` | UUID (FK profiles, nullable) | Autor (null = review da lista) |
| `rating` | FLOAT (nullable) | Nota |
| `review` | TEXT (nullable) | Texto |
| `recommended` | TEXT (nullable) | Veredito |
| `created_at` | TIMESTAMP | Data |

### `notifications`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | UUID (PK) | ID |
| `user_id` | UUID (FK profiles) | Destinatário |
| `sender_id` | UUID (FK profiles, nullable) | Remetente |
| `type` | TEXT | `'friend_request'`, `'list_invite'`, `'movie_added'`, `'general'` |
| `message` | TEXT | Texto |
| `reference_id` | UUID (nullable) | Referência (ex: `list_id` para convites) |
| `is_read` | BOOLEAN | Lida |
| `created_at` | TIMESTAMP | Data |

### `fcm_tokens`
| Coluna | Tipo | Descrição |
|---|---|---|
| `user_id` | UUID (FK profiles) | Dono do dispositivo |
| `token` | TEXT | Token FCM |
| `created_at` | TIMESTAMP | Data de registro |

### Storage

| Bucket | Tipo | Uso |
|---|---|---|
| `avatars` | Público | Fotos de perfil. Nomeados `{user_id}-{random}.jpg` |
| (attachments) | Público | Imagens anexas a reviews (bilhetes, fotos) |

---

## PWA (Progressive Web App)

- **Plugin:** Vite PWA (`vite-plugin-pwa`)
- **Estratégia:** Auto-update (atualiza automaticamente sem intervenção)
- **Service Worker:** Workbox (`dev-dist/sw.js`)
- **Manifest:** Nome "JJ Review", ícones 192×192 e 512×512, display standalone
- **Instalação:** Funciona como app nativo quando instalado no celular

---

## Capacitor (App Nativo Android)

| Config | Valor |
|---|---|
| **App ID** | `com.jv.jjreviews` |
| **App Name** | `JJ Reviews` |
| **Web Dir** | `dist` |

| Plugin | Uso |
|---|---|
| `@capacitor/app` | Botão voltar nativo (`backButton` listener). Deep links (`appUrlOpen` listener) |
| `@capacitor/push-notifications` | Registro FCM, listener de push em foreground e tap |
| `@capacitor/filesystem` | Salvar PNG no cache do dispositivo antes de compartilhar |
| `@capacitor/share` | Share sheet nativo para imagem e link |

**Botão Voltar Android:** `backButton` → `window.history.back()` (fecha modal/muda aba) ou `exitApp()` (tela inicial limpa).

**Deep Links:** Escuta `appUrlOpen` e extrai `?movie={id}` da URL para abrir o filme dentro do app nativo.

---

## Testes

| Script | Comando |
|---|---|
| `test` | `vitest run` — roda uma vez e sai |
| `test:watch` | `vitest` — modo watch interativo |
| `test:coverage` | `vitest run --coverage` — com relatório de cobertura |

**Ambiente:** jsdom (simula browser para componentes React)

| Biblioteca | Uso |
|---|---|
| `vitest` | Test runner nativo do Vite |
| `@testing-library/react` | `render()`, `screen`, queries para testar componentes |
| `@testing-library/jest-dom` | Matchers: `.toBeInTheDocument()`, `.toHaveTextContent()`, etc. |
| `@testing-library/user-event` | `userEvent.click()`, `userEvent.type()` para simular interação |
| `jsdom` | Ambiente de browser virtual |

---

## Relação com Bootstrap

`react-bootstrap` é usado para:
- **Componentes:** `Modal`, `Button`, `Form`, `Badge`, `Dropdown`, `ProgressBar`
- **Utilitários:** `d-flex`, `text-center`, `mb-4`, `fw-bold`, `d-md-none`, `gap-3`

**Quando usar Bootstrap:** Layout rápido + componentes de UI padrão.
**Quando usar CSS Module:** Visual único do componente (hover, cores, animações).

**Regra:**
- Layout → Bootstrap (`d-flex`, `gap-3`, `mb-4`)
- Visual → CSS Module (`.ratingBadge`, `.championImage`)
- Inline styles → **EVITAR**. Exceção: `ShareCard` (html2canvas)

`global.css` inclui **overrides de dark theme** para Bootstrap: modais, forms, focus states com glow dourado.

---

## Quando Usar Cada Pasta

| Pasta | O que vai aqui | Exemplo |
|---|---|---|
| `features/XYZ/` | Tudo de uma funcionalidade completa | `movies`, `auth`, `lists`, `notifications` |
| `features/XYZ/components/` | Componentes visuais da feature | `MovieCard`, `CreateListModal` |
| `features/XYZ/hooks/` | Hooks de estado/efeitos da feature | `useMovies`, `useLists` |
| `features/XYZ/services/` | Chamadas de API da feature | `tmdbService.ts` |
| `components/layout/` | Estrutura da página | `AppNavbar`, `BottomNav`, `Footer` |
| `components/ui/` | Componentes genéricos sem lógica de negócio | `ConfirmModal`, `StarRating` |
| `hooks/` | Hooks globais cross-feature | `useModalBack`, `usePushNotifications` |
| `lib/` | Clientes de serviços externos | `supabase.ts` |
| `types/` | Types compartilhados entre features | `MovieData`, `CustomList` |
| `utils/` | Funções puras sem side effects | `getBadgeStyle()`, `getCroppedImg()` |
| `constants/` | Valores fixos imutáveis | `OSCAR_NOMINEES_IDS` |
| `styles/` | Design tokens + CSS global + overrides Bootstrap | `variables.css`, `global.css` |

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
| Tipos/Interfaces | PascalCase | `MovieData`, `TmdbProvider`, `CustomList` |
| Variáveis CSS | kebab-case com `--` | `--gold`, `--bg-surface` |

---

## Path Alias

`@/` é alias para `src/`:

```typescript
// ✅ Correto
import { MovieData } from "@/types";
import { supabase } from "@/lib/supabase";

// ❌ Errado
import { MovieData } from "../../../types";
```

Configurado em `tsconfig.app.json` e `vite.config.ts`.

---

## Checklist para Code Review

- [ ] Componentes novos ficam dentro de `features/` (não soltos em `src/`)
- [ ] Estilos usam CSS Module (não inline styles, exceto ShareCard)
- [ ] Cores novas são variáveis CSS em `variables.css`
- [ ] Chamadas de API passam por um service
- [ ] Imports usam `@/` (não caminhos relativos longos)
- [ ] Feature tem `index.ts` com exports públicos
- [ ] Hooks seguem prefixo `use` e estão na pasta `hooks/` da feature
- [ ] Types compartilhados estão em `types/index.ts`
- [ ] Componentes genéricos (layout/ui) ficam em `components/`, não em `features/`
- [ ] Dark theme respeitado — sem cores claras hardcoded
- [ ] Realtime subscriptions têm cleanup no `return` do useEffect
- [ ] Notificações criadas quando ações afetam outros usuários
- [ ] `useModalBack()` usado em todos os modais para suporte ao botão voltar Android

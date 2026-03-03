# Arquitetura do Frontend — JJ Reviews

Este documento explica como o projeto frontend está organizado, o porquê de cada decisão, e como manter a arquitetura ao adicionar funcionalidades novas.

---

## Visão Geral

```
src/
├── assets/               # Arquivos estáticos (imagens, fontes, SVGs)
├── components/           # Componentes GLOBAIS compartilhados
│   ├── layout/           #   Layout da página (Navbar, Footer)
│   └── ui/               #   Componentes genéricos reutilizáveis (botões, overlays...)
├── constants/            # Constantes globais do app
├── features/             # Módulos por funcionalidade (CORAÇÃO da arquitetura)
│   ├── auth/             #   Autenticação (login, perfil, hook useAuth)
│   ├── battle/           #   Modo Batalha de filmes
│   ├── dashboard/        #   Resumo estatístico
│   ├── movies/           #   CRUD de filmes (cards, modais, filtros, serviço TMDB)
│   ├── roulette/         #   Sorteio de filmes
│   └── share/            #   Gerar imagem e compartilhar review
├── hooks/                # Hooks globais (não pertencem a uma feature específica)
├── lib/                  # Clientes de serviços externos (Supabase, etc.)
├── styles/               # Estilos globais e variáveis CSS
├── types/                # Tipos TypeScript compartilhados
├── utils/                # Funções utilitárias puras
├── App.tsx               # Componente raiz — apenas composição de features
├── App.module.css        # Estilos do App (CSS Module)
└── main.tsx              # Ponto de entrada — Bootstrap + estilos globais
```

---

## Princípios da Arquitetura

### 1. Feature-Based Structure (Estrutura por Funcionalidade)

Cada funcionalidade do app vive em sua pasta dentro de `features/`. 
Uma feature é **auto-contida**: tem seus próprios componentes, hooks, serviços e estilos.

```
features/movies/
├── components/
│   ├── MovieCard/
│   │   ├── MovieCard.tsx          # Componente
│   │   └── MovieCard.module.css   # Estilos (CSS Module)
│   ├── MovieModal/
│   │   ├── MovieModal.tsx
│   │   └── MovieModal.module.css
│   └── AddMovieModal/
│       └── AddMovieModal.tsx
├── hooks/
│   ├── useMovies.ts               # Carrega filmes do Supabase + TMDB
│   └── useMovieFilters.ts         # Filtros, busca e ordenação
├── services/
│   └── tmdbService.ts             # Chamadas à API do TMDB
└── index.ts                       # Barrel export (exporta tudo da feature)
```

**Por quê?**
- Facilita encontrar qualquer arquivo: quer mudar algo de autenticação? Vá até `features/auth/`.
- Ao adicionar uma feature nova, cria-se uma pasta nova sem mexer no resto.
- Reduz acoplamento: cada feature importa apenas do `@/types`, `@/utils`, `@/lib`, nunca de outras features.

### 2. Barrel Exports (`index.ts`)

Toda feature expõe um `index.ts` como "API pública":

```typescript
// features/auth/index.ts
export { LoginModal } from "./components/LoginModal";
export { ProfileModal } from "./components/ProfileModal";
export { useAuth } from "./hooks/useAuth";
```

```typescript
// App.tsx — importações limpas
import { useAuth, LoginModal, ProfileModal } from "@/features/auth";
```

**Regra:** Nunca importe diretamente de dentro de uma feature (ex: `@/features/auth/hooks/useAuth`). 
Sempre importe do `index.ts` da feature.

### 3. CSS Modules para Estilos de Componente

Cada componente que precisa de estilização própria tem um arquivo `*.module.css` na mesma pasta.

```tsx
import styles from "./MovieCard.module.css";

<Card className={`h-100 shadow ${styles.card}`}>
```

**Por quê?**
- **Escopo local**: Os nomes de classe são únicos por componente. Não há conflito global.
- **Colocalização**: O CSS mora junto do componente, fácil de encontrar e manter.
- **Sem overhead**: CSS Modules é nativo do Vite, zero dependências extras.

### 4. CSS Custom Properties (Variáveis)

Cores, sombras, border-radius e transições estão centralizadas em `styles/variables.css`:

```css
:root {
   --color-primary: #0d6efd;
   --color-warning: #ffc107;
   --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.15);
   --radius-lg: 15px;
   --transition-fast: 0.2s ease-in-out;
}
```

**Regra:** Nunca escreva cores hardcoded nos CSS Modules. Use `var(--nome)`.

### 5. Custom Hooks para Lógica de Estado

Toda lógica "pesada" foi extraída do `App.tsx` para hooks dedicados:

| Hook | Feature | Responsabilidade |
|---|---|---|
| `useAuth` | auth | Sessão, perfil, login/logout |
| `useMovies` | movies | Carregar e atualizar filmes do Supabase + TMDB |
| `useMovieFilters` | movies | Filtros, busca, ordenação, view mode |
| `useShare` | share | Gerar imagem e compartilhar via Web Share API |

**Por quê?**  
O `App.tsx` caiu de **634 linhas** para ~230, e agora faz apenas **composição** — monta hooks e passa para componentes. Zero lógica de negócio.

### 6. Service Layer (Camada de Serviços)

Chamadas a APIs externas ficam isoladas em `services/`:

```typescript
// features/movies/services/tmdbService.ts
export async function enrichMovieWithTmdb(movie) { ... }
export async function searchMovies(query) { ... }
```

**Regra:** Componentes nunca chamam `axios.get()` diretamente. Sempre passam por um service.

---

## Quando Usar Cada Pasta

| Pasta | O que vai aqui | Exemplo |
|---|---|---|
| `components/layout/` | Peças estruturais da página (navbar, footer, sidebar) | `AppNavbar`, `Footer` |
| `components/ui/` | Componentes genéricos reutilizáveis, sem lógica de negócio | `LoadingOverlay`, futuro `ConfirmDialog` |
| `features/XYZ/` | Tudo relacionado a uma funcionalidade completa | `movies`, `auth`, `battle` |
| `hooks/` | Hooks globais que servem múltiplas features | futuro `useDebounce`, `useLocalStorage` |
| `lib/` | Inicialização de clientes externos | `supabase.ts` |
| `services/` (dentro de feature) | Chamadas de API dessa feature | `tmdbService.ts` |
| `types/` | Interfaces/types compartilhados entre features | `MovieData`, `TmdbSearchResult` |
| `utils/` | Funções puras sem side effects | `getBadgeStyle()` |
| `constants/` | Valores fixos | `OSCAR_NOMINEES_IDS` |
| `styles/` | CSS global (variáveis, reset, classes globais) | `variables.css`, `global.css` |

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
- **Componentes prontos**: `Modal`, `Button`, `Form`, `Badge`, `Card`, etc.
- **Classes utilitárias**: `d-flex`, `text-center`, `mb-4`, `fw-bold`, etc.

**Quando usar Bootstrap:** Para layouts rápidos e componentes de UI padrão.  
**Quando usar CSS Module:** Para estilos visuais específicos do componente (hover, cores customizadas, animações).

**Regra prática:**
- Layout e espaçamento → classes Bootstrap (`d-flex`, `gap-3`, `mb-4`)  
- Visual único do componente → CSS Module (`.ratingBadge`, `.championImage`)  
- Inline styles → **EVITAR**. Exceção: `ShareCard` (necessário para `html2canvas`)

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
| Tipos/Interfaces | PascalCase | `MovieData`, `TmdbProvider` |
| Variáveis CSS | kebab-case com `--` prefix | `--color-primary` |

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

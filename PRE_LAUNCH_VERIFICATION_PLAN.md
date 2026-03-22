# 🚀 **PLANO DE VERIFICAÇÃO PRÉ-LANÇAMENTO - JJ REVIEWS**

## 📋 Sumário Executivo

**Status Atual**: Aplicação bem arquitetada, mas **NÃO PRONTA para produção com dados sensíveis** sem correções de segurança críticas.

**Tempo Estimado para Lançar Seguro**: **7-14 dias** (aplicando ações críticas)

**Capacidade de Usuários**:
- ✅ **Fase 1 (Beta)**: até 50 usuários simultâneos (Free Supabase)
- ⚠️ **Fase 2**: 50-200 usuários → requer upgrade Pro ($25/mês)
- 🔴 **Fase 3**: >200 usuários → requer backend customizado + Redis cache

---

# 1️⃣ **PILAR SEGURANÇA**

## 1.1 Vulnerabilidades Críticas (Risco Alto 🔴)

### 🔴 **CRÍTICO**: Falta de RLS (Row Level Security)

**Problema**:
```typescript
// Qualquer usuário autenticado pode fazer isso:
const supabase = createClient(URL, ANON_KEY) // Chave pública
const data = await supabase
  .from("reviews")
  .select("*")
  .eq("user_id", "outro-user-id") // ❌ RETORNA DADOS DELE SEM PERMISSÃO!
```

**Impacto**: Acesso lateral a dados privados de outros usuários (3/10 - Alto)

**Mitigação - Implementar RLS Policies**:
```sql
-- reviews.sql
CREATE POLICY "Users can only view own reviews"
  ON reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert own reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Aplicar em: reviews, diary_entries, lists, list_collaborators, friendships, notifications
```

**Prazo**: 1-2 dias | **Criticidade**: 🔴 ANTES de qualquer launch

---

### 🔴 **CRÍTICO**: Chaves Expostas no `.env`

**Problema**:
```env
# .env (COMMITADO no Git ❌)
VITE_SUPABASE_URL=https://mdhacgiqtuqiounjrrov.supabase.co
VITE_SUPABASE_KEY=eyJhbGc... # ← Chave pública, mas ainda assim
VITE_TMDB_API_KEY=763dec7... # ← Visível no Git history
```

**Risco**:
- Anon key de Supabase (limitado por RLS, OK se RLS implementado)
- TMDB key (leitura apenas, mas pode sofrer abuse)
- Histórico Git permanente (rebase necessário)

**Mitigação**:
1. Remover `.env` do Git:
   ```bash
   git rm --cached .env
   echo ".env" >> .gitignore
   git commit -m "Remove exposed keys from git"
   git filter-branch -f --tree-filter 'rm -f .env' HEAD  # Limpar histórico
   ```
2. Configurar variáveis no Vercel:
   ```
   Settings → Environment Variables
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_KEY=...
   VITE_TMDB_API_KEY=...
   ```
3. Regenerar chave Supabase (invalidar a antiga):
   ```
   Supabase Dashboard → Settings → API Keys → Regenerate Anon Key
   ```

**Prazo**: 1 dia | **Criticidade**: 🔴 ANTES do Github público

---

### 🔴 **CRÍTICO**: `delete_user` RPC sem Validação

**Problema** (em [securityService.ts](src/features/profile/services/securityService.ts)):
```typescript
export async function deleteUserAccount() {
  return supabase.rpc('delete_user') // ❌ Sem verificar se é o owner
}

// No Supabase, a função RPC provavelmente não valida auth.uid():
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = ?; -- ❌ Parâmetro não bindado corretamente
END;
$$ LANGUAGE plpgsql;
```

**Risco**: Usuário X pode deletar conta de usuário Y passando ID dele

**Mitigação**:
```sql
-- Verificar RPC no Supabase:
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void AS $$
BEGIN
  -- ✅ Apenas deletar o usuário autenticado
  DELETE FROM auth.users WHERE id = auth.uid();
  DELETE FROM profiles WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql;

-- E no TypeScript:
export async function deleteUserAccount() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")
  return supabase.rpc('delete_user') // Seguro agora, validado server-side
}
```

**Prazo**: 1 dia | **Criticidade**: 🔴 CRÍTICO

---

## 1.2 Vulnerabilidades Médias (Risco Médio 🟠)

### 🟠 **AUTH**: Falta de Rate Limiting no Login

**Problema**: Sem proteção contra brute force
```typescript
// Nenhuma limitação em tentativas de login
await supabase.auth.signInWithPassword({ email, password })
// Atacante pode tentar 1000x/segundo
```

**Solução**:
1. Supabase Auth já tem alguns limites, mas verificar:
   ```
   Supabase Dashboard → Settings → Auth → Rate Limiting
   ```
2. Frontend: Implementar cooldown local
   ```typescript
   const [loginAttempts, setLoginAttempts] = useState(0)
   const [lockoutTime, setLockoutTime] = useState(0)
   
   if (loginAttempts >= 5 && Date.now() < lockoutTime) {
     throw new Error("Too many attempts, try again in 15 minutes")
   }
   ```

**Prazo**: 2 dias | **Criticidade**: 🟠 ANTES de launch público

---

### 🟠 **DATA**: TMDB API Key Usada no Frontend

**Problema**:
```typescript
// Qualquer pessoa pode ver a chave no DevTools
const tmdb = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  params: { api_key: VITE_TMDB_API_KEY } // ← Visível em network tab
})
```

**Risco**: Se rate-limited, atacante pode esgotá-la

**Solução**: Criar proxy backend (Supabase Edge Function):
```typescript
// supabase/functions/tmdb-proxy/index.ts
import { serve } from "https://deno.land/std/http/server.ts"

serve(async (req) => {
  const { path, query } = await req.json()
  const tmdbKey = Deno.env.get("TMDB_API_KEY")
  
  const url = new URL(`https://api.themoviedb.org/3/${path}`)
  Object.entries(query).forEach(([k, v]) => url.searchParams.append(k, v))
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${tmdbKey}` }
  })
  return new Response(res.body, { status: res.status })
})
```

**Prazo**: 3 dias | **Criticidade**: 🟠 Recomendado, não crítico (key é pública)

---

### 🟠 **UPLOAD**: Falta de Validação de Arquivo em Attachments

**Problema** (em [addMovieModal.tsx](src/features/movies/components/AddMovieModal/AddMovieModal.tsx)):
```typescript
const handleFileChange = async (event) => {
  const file = event.target.files?.[0]
  // ❌ Sem validar tipo, tamanho, ou conteúdo
  const reader = new FileReader()
  reader.readAsDataURL(file) // Pode ser .exe, 10GB, etc.
}
```

**Risco**: Armazenar malware, DOS via upload gigante

**Solução**:
```typescript
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const handleFileChange = (event) => {
  const file = event.target.files?.[0]
  
  if (!file) return
  if (!ALLOWED_TYPES.includes(file.type)) 
    throw new Error("Only images allowed")
  if (file.size > MAX_SIZE) 
    throw new Error("File too large (max 5MB)")
  
  const reader = new FileReader()
  reader.readAsDataURL(file)
}
```

**Prazo**: 1 dia | **Criticidade**: 🟠 ANTES de launch

---

## 1.3 Vulnerabilidades Baixas (Risco Baixo 🟢)

### 🟢 **HEADERS**: Falta de Security Headers

**Problema**: Vercel não envia headers de segurança
```
❌ X-Frame-Options: não definido (clickjacking possível)
❌ X-Content-Type-Options: não definido (MIME sniffing)
❌ Content-Security-Policy: não definido (XSS)
❌ Strict-Transport-Security: não definido (SSL downgrade)
```

**Solução** (atualizar vercel.json):
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {"key": "X-Frame-Options", "value": "DENY"},
        {"key": "X-Content-Type-Options", "value": "nosniff"},
        {"key": "Content-Security-Policy", 
         "value": "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline';"},
        {"key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains"}
      ]
    }
  ]
}
```

**Prazo**: 1 dia | **Criticidade**: 🟢 Recomendado

---

## 1.4 Checklist de Testes de Segurança

### A. Testes Manuais (Pode fazer agora)

- [ ] Abrir DevTools → Network → Procurar por chaves API expostas
- [ ] DevTools → Application → LocalStorage → Verificar se JWT está acessível
- [ ] Tentar acessar `/reviews` de outro user via browser console:
  ```javascript
  const {data} = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', 'outro-id-qualquer')
  console.log(data) // Deve retornar vazio ou erro, NÃO dados reais
  ```
- [ ] Tentar deletar conta de outro user:
  ```javascript
  await supabase.rpc('delete_user') // Deve falhar se não é owner
  ```
- [ ] Tentar fazer upload de arquivo .exe
- [ ] Tentar fazer upload de arquivo 100MB
- [ ] Logout → verificar se JWT ainda funciona

### B. Testes Automatizados (Implementar)

```typescript
// security.test.ts
describe("Security", () => {
  it("should not allow user to read other user reviews", async () => {
    const user1 = await signUp("user1@test.com")
    const user2 = await signUp("user2@test.com")
    
    // Create review as user1
    const supabase1 = createClient(URL, ANON_KEY, { user: user1 })
    await supabase1.from("reviews").insert({ user_id: user1.id, rating: 5 })
    
    // Try to read as user2
    const supabase2 = createClient(URL, ANON_KEY, { user: user2 })
    const { data } = await supabase2
      .from("reviews")
      .select("*")
      .eq("user_id", user1.id)
    
    expect(data).toHaveLength(0) // ❌ Deve falhar com RLS
  })
  
  it("should not allow user to delete other user account", async () => {
    // Similar pattern
  })
})
```

**Prazo para teste**: 5 dias

---

# 2️⃣ **PILAR PERFORMANCE**

## 2.1 Capacidade de Usuários

### Estimativa por Plano Supabase

| Métrica | Free | Pro | Recomendação |
|---------|------|-----|--------------|
| **Usuários Simultâneos** | ~50 | 200+ | Free: 50, Pro: 200+ |
| **BD Size** | 500MB | 10GB | ~50KB/usuário → 10k users em 500MB |
| **Realtime Connections** | 200 | ilimitado | ⚠️ Limite crítico Free |
| **Storage** | 1GB | 100GB | OK com avatares |
| **Bandwidth** | 2GB/mês | 250GB/mês | OK para startup |

**Fórmula de Crescimento**:
```
Freemium: ~50 usuários simultâneos
     ↓ (upgrade em $25/mês)
Pro: 200+ usuários simultâneos
     ↓ (escala exponencial)
Dedicado: 1000+ com redundância
```

---

## 2.2 Testes de Carga

### A. Teste de Conexões Realtime (Crítico)

**Objetivo**: Verificar se 200 conexões realtime quebram

**Ferramentas**:
- k6 (load testing) ou Locust (Python)
- Simular subscriptions em `/notifications`

**Script (k6)**:
```javascript
import ws from 'k6/ws';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 50 },   // Ramp up
    { duration: '10m', target: 200 },  // Stay
    { duration: '5m', target: 0 },     // Ramp down
  ],
};

export default function () {
  const url = `wss://mdhacgiqtuqiounjrrov.supabase.co/realtime/v1?apikey=${__ENV.SUPABASE_KEY}`;
  
  const res = ws.connect(url, () => {
    ws.send(JSON.stringify({ type: "subscribe", topic: `realtime:notifications` }));
    ws.setInterval(() => {
      ws.ping();
    }, 30000);
  });
  
  check(res, { 'connected': (r) => r.status === 101 });
}
```

**Esperado**: Sem crashes até 150-180 conexões; falha em 200+

**Ação**: Se falhar antes de 150, ir para Pro imediatamente

---

### B. Teste de Query Performance

**Objetivo**: Verificar se queries complexas são lentas

**Queries a Testar**:
```typescript
// 1. Agregação de listas compartilhadas (complexa)
await supabase
  .from("list_reviews")
  .select("*, user:profiles(username), movie:tmdb_movies(title)")
  .eq("list_id", listId)
  .in("tmdb_id", Array(50).fill(0).map(() => Math.random())) // 50 filmes

// 2. Recomendações (scan de 1000+ reviews)
await supabase
  .from("reviews")
  .select("tmdb_id, rating")
  .eq("user_id", userId)
  .limit(1000)

// 3. Notificações com join
await supabase
  .from("notifications")
  .select("*, sender:profiles(username, avatar_url)")
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
```

**Ferramenta**: Supabase Dashboard → Query Performance Monitor

**Ação**: Se >1s de latência, adicionar índices

---

### C. Teste de Carga na API TMDB

**Objetivo**: Não ultrapassar rate limit (4 req/sec)

**Como Monitorar**:
```typescript
// Implementar throttle global
const tmdbClient = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
})

let lastRequest = 0
const MIN_INTERVAL = 250 // 4 req/sec = 250ms entre requests

const throttledGet = async (url: string, config?: any) => {
  const now = Date.now()
  const wait = Math.max(0, MIN_INTERVAL - (now - lastRequest))
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  lastRequest = Date.now()
  return tmdbClient.get(url, config)
}
```

**Métrica**: não deverá ser rejeitado por rate limit em uso normal

---

## 2.3 Checklist de Performance

- [ ] Rodar teste k6 com 200 usuários simultâneos → 0 crashes
- [ ] Rodar benchmark de queries do Supabase → todas <500ms
- [ ] Monitorar TMDB API usage (deve estar <1 req/sec em média)
- [ ] Testar importação Letterboxd com 500 filmes → <5min
- [ ] Build do Vite → <30s
- [ ] Lighthouse score → >90 em Performance

---

# 3️⃣ **PILAR CORRETUDE**

## 3.1 Test Coverage Mínimo Requerido

### Áreas Críticas

| Área | Status | Coverage | Requerido |
|------|--------|----------|-----------|
| **Auth** (signup/signin/reset) | ✅ Implementado | ? | 95%+ |
| **Reviews** (create/read/update) | ✅ Implementado | 70%+ | 90%+ |
| **Recomendações** | ✅ Implementado | 87%+ | 85%+ |
| **Listas** (compartilhadas) | ⚠️ Parcial | 60%? | 80%+ |
| **Importação** | ✅ Implementado | 80%+ | 85%+ |
| **Jogos** | ⚠️ Não claro | 50%? | 70%+ |
| **Notificações** | ⚠️ Não claro | 40%? | 70%+ |

**Comando para Rodar Coverage**:
```bash
npm run test -- --coverage --reporter=html
```

**Ação**: Aumentar coverage para 85%+ antes de launch

---

## 3.2 Testes Funcionais Críticos

```typescript
describe("E2E - Fluxos Críticos", () => {
  it("should allow user to signup, create review, and export", async () => {
    // 1. Signup
    const { user } = await signUp("novo@user.com", "senha123")
    
    // 2. Create review
    await createReview(user.id, { tmdb_id: 550, rating: 10 })
    
    // 3. Create list
    const list = await createList(user.id, { name: "Favs", type: "private" })
    
    // 4. Add to list
    await addMovieToList(list.id, 550)
    
    // 5. Export (CSV)
    const csv = await exportReviewsAsCSV(user.id)
    expect(csv).toContain("550") // TMDB ID
    expect(csv).toContain("10")    // Rating
  })
  
  it("should handle friendship flow: request -> accept -> share list", async () => {
    const u1 = await signUp("user1@test.com")
    const u2 = await signUp("user2@test.com")
    
    // Send request
    await sendFriendRequest(u1.id, u2.id)
    
    // Accept
    await acceptFriendRequest(u2.id, u1.id)
    
    // u1 shares list with u2
    const list = await createList(u1.id, { type: "partial_shared" })
    await addCollaborator(list.id, u2.id)
    
    // u2 should see list
    const lists = await getSharedListsFor(u2.id)
    expect(lists).toContain(list.id)
  })
  
  it("should handle game session: start -> answer questions -> finish", async () => {
    const user = await signUp("gamer@test.com")
    
    // Start
    const session = await startDailyMovieGame(user.id, "2025-01-15")
    
    // Play 5 rounds
    for (let i = 0; i < 5; i++) {
      const correct = Math.random() > 0.5
      await recordGameAttempt(session.id, correct, i)
    }
    
    // Finish
    const result = await finishGameSession(session.id)
    expect(result.correct_answers).toBeLessThanOrEqual(5)
  })
})
```

**Prazo**: 2-3 dias

---

## 3.3 Testes de Regressão

**Antes de cada deploy, rodar**:
```bash
npm run test # Todos os testes unitários
npm run build # Build sem erros
npm run lint # Sem warnings
```

---

# 4️⃣ **PILAR CONFORMIDADE**

## 4.1 LGPD (Lei Geral de Proteção de Dados - Brasil)

### Checkpoints Obrigatórios

- [ ] **Termo de Consentimento**: Adicionar ao primeiro login
  ```typescript
  // Após auth, antes de acessar app:
  if (!user.metadata.lgpd_consent) {
    showModal({
      title: "Consentimento para Processamento de Dados",
      text: `Coletamos seus e-mail e nome de usuário para funcionalidade da plataforma.
             Seus dados de review e listas são privados por padrão.
             Amigos só veem o que você compartilha explicitamente.
             Você pode deletar sua conta a qualquer momento.`,
      buttons: ["Recuso", "Concordo"]
    })
    if (consent) {
      await supabase.auth.updateUser({
        data: { lgpd_consent: true, lgpd_consent_date: new Date() }
      })
    }
  }
  ```

- [ ] **Direito ao Esquecimento**: Implementar delete_user RPC (já existe, validar)
  
- [ ] **Acesso a Dados**: Implementar export de dados pessoais
  ```typescript
  export async function exportPersonalData(userId: string) {
    const reviews = await supabase.from("reviews").select("*").eq("user_id", userId)
    const diary = await supabase.from("diary_entries").select("*").eq("user_id", userId)
    const lists = await supabase.from("lists").select("*").eq("owner_id", userId)
    
    return {
      user: { id: userId, email, username },
      reviews: reviews.data,
      diary: diary.data,
      lists: lists.data,
      exported_at: new Date()
    }
  }
  ```

- [ ] **Política de Privacidade**: Adicionar página `/privacy`
  - O que coletamos
  - Como armazenamos
  - Quem pode acessar
  - Direitos do usuário

- [ ] **Terceiros**: API TMDB
  - Documentar que usamos TMDB para dados de filmes
  - Link para política deles

---

## 4.2 Política de Retenção de Dados

```
Dados | Retenção | Como Deletar
------|----------|-------------
Email/Senha | Enquanto ativo | delete_user
Reviews | Enquanto ativo | delete_user (cascata)
Diários | Enquanto ativo | delete_user (cascata)
Listas | Enquanto ativo | delete_user (cascata)
Avatares | Enquanto ativo | delete_user (cascata)
Notificações | 30 dias | Automático (cronjob)
Game Sessions | 90 dias | Automático (cronjob)
Logs de API | 30 dias | Supabase auto-cleanup
```

---

# 5️⃣ **CHECKLIST PRÉ-LAUNCH FINAL**

## 🔴 CRÍTICO (Implementar before ANY launch)

- [ ] **RLS Policies** implementadas em todas tabelas sensíveis
  - [ ] reviews
  - [ ] diary_entries
  - [ ] lists
  - [ ] list_collaborators
  - [ ] friendships
  - [ ] notifications
  - [ ] game_sessions

- [ ] **Chaves removidas do Git**
  - [ ] `.env` removido do repo
  - [ ] Git history limpo (`git filter-branch`)
  - [ ] Novas chaves regeneradas no Supabase
  - [ ] Variáveis configuradas no Vercel

- [ ] **delete_user RPC** validado contra auth.uid()
  - [ ] Teste manual: tentar deletar outro user (deve falhar)
  - [ ] Code review com especialista

- [ ] **Upload de arquivo** validado (tipo + tamanho)

- [ ] **Rate limiting** no login (frontend + backend)

- [ ] **Testes de segurança** manuais (seção 1.4.A)
  - [ ] Tentar acessar dados de outro user → falha
  - [ ] Tentar deletar outro user → falha
  - [ ] Tentar upload exe → falha
  - [ ] DevTools: nenhuma chave API visível

---

## 🟠 ALTO (Implementar antes de users reais)

- [ ] Teste de carga k6 passando (200 usuários simultâneos)
- [ ] Coverage de testes em 85%+
- [ ] E2E tests passando (seção 3.2)
- [ ] Security headers no Vercel (X-Frame-Options, CSP, etc)
- [ ] LGPD modal de consentimento
- [ ] Página de privacidade
- [ ] Página de termos de serviço

---

## 🟡 MÉDIO (Implementar nas primeiras 2 semanas)

- [ ] Monitor de realtime connections (alerta em >150)
- [ ] Supabase upgrade para Pro (se >50 usuários)
- [ ] TMDB API proxy (Edge Function)
- [ ] Índices de performance no BD (list_reviews, etc)
- [ ] Analytics (Plausible ou Mixpanel)
- [ ] Backup daily do BD

---

## 🟢 BAIXO (Backlog)

- [ ] Rate limiting avançado (per-user quota)
- [ ] Cache de recomendações (Redis)
- [ ] API backend Node.js customizado
- [ ] Multi-language (i18n)
- [ ] Dark mode toggle

---

# 6️⃣ **PLANO DE DEPLOY POR FASE**

## Fase 1: Beta Privado (Semana 1)

**Capacidade**: ~20 beta testers
**Deploy**: Apenas com críticos solucionados

- ✅ RLS policies
- ✅ Chaves seguras  
- ✅ delete_user validado
- ❌ Não precisa: coverage 100%, LGPD modal

**Métricas a Monitorar**:
- Login success rate
- Realtime connection drops
- DB query latency

---

## Fase 2: Beta Público (Semana 2-3)

**Capacidade**: ~50 usuários
**Deploy**: Com todos altos solucionados

- ✅ Testes + coverage 85%+
- ✅ Security headers
- ✅ LGPD consentimento
- ✅ Teste de carga passando

**Métricas**:
- Users created / dia
- Realtime connections max
- Supabase BD size

---

## Fase 3: Launch Público (Semana 4+)

**Capacidade**: 50-200 usuários (depende de upgrade Pro)
**Deploy**: Com plano de escalabilidade

- ✅ Pro Supabase ($25/mês)
- ✅ TMDB proxy implementado
- ✅ Analytics
- ✅ Índices otimizados

---

# 7️⃣ **MONITORAMENTO PÓS-LAUNCH**

## Dashboards para Criar

### 1. Security
```
- Failed login attempts (alerta se >10/min por IP)
- Realtime connection drops
- API errors (5xx count)
- Unauthorized rate (RLS rejection)
```

### 2. Performance
```
- Query latency (p95, p99)
- Realtime subscription count (alerta em >180)
- Bandwidth usage (GB/dia)
- Storage growth (MB/dia)
```

### 3. Business
```
- New signups / dia
- Active users (DAU, MAU)
- Reviews created / dia
- Lists created / dia
```

### 4. Alertas
```
❌ Realtime: >180 conexões
❌ BD: >400MB (próximo do limit)
❌ API: error rate >1%
❌ Login: falhas >50/min
```

---

# ✅ **RESUMO EXECUTIVO**

## Tempo para Launch Seguro

| Atividade | Prazo |
|-----------|-------|
| RLS policies | 2 dias |
| Chaves seguras | 1 dia |
| delete_user fix | 1 dia |
| Upload validation | 1 dia |
| Testes segurança | 2 dias |
| Coverage 85%+ | 3 dias |
| Rate limiting | 1 dia |
| **TOTAL** | **~7-10 dias** |

## Investimento Mensal

```
Supabase Pro:   $25/mês (necessário em 2-3 semanas)
Vercel:          $0-20/mês (hobby até 100 users)
Analytics:       $0-100/mês
TOTAL:          $25-120/mês
```

## Recomendação Final

🚀 **Pronto para Beta Privado em 7 dias** se iniciar agora
✅ **Pronto para Launch Público em 3-4 semanas** com preparação completa

**Não recomendo launch sem:**
- ✅ RLS implementado
- ✅ Chaves seguras
- ✅ Testes de segurança passando

Qualquer dúvida, execute os testes de segurança da seção 1.4 para validar status atual!

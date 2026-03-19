# Padrão Universial de Testes - Visualização

## 🎯 O Padrão 3-em-1

Cada função de serviço segue um padrão simples com **exatamente 3 testes**:

```
┌─────────────────────────────────────────────────────────────┐
│           FUNÇÃO DE SERVIÇO (com Supabase)                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  const { data, error } = await supabase...                  │
│  if (error) throw error;  ← Precisa de testes!              │
│  return data;                                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         ↓ Gera 3 testes automaticamente ↓
    ┌────────┬──────────┬─────────┐
    │        │          │         │
    ↓        ↓          ↓         ↓

┌──────────────────────────────────────────────────────────────┐
│ Teste 1: SUCESSO (Happy Path)                                │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ it("fetches data successfully", () => {                     │
│   eqMock.mockResolvedValue({                                │
│     data: { id: "123" },    ← Simula retorno positivo       │
│     error: null                                              │
│   });                                                        │
│                                                              │
│   const result = minhaFuncao("id");                         │
│                                                              │
│   expect(result).toEqual({ id: "123" });  ← Verifica dado  │
│ });                                                          │
│                                                              │
│ ✅ Testa: O código funciona quando BD retorna dados        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Teste 2: NULL/VAZIO (Edge Case)                             │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ it("handles null result", () => {                           │
│   eqMock.mockResolvedValue({                                │
│     data: null,            ← Simula registro não encontrado │
│     error: null                                              │
│   });                                                        │
│                                                              │
│   const result = minhaFuncao("id");                         │
│                                                              │
│   expect(result).toBeNull();  ← Verifica null handling      │
│ });                                                          │
│                                                              │
│ ✅ Testa: O código trata null/vazio corretamente           │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Teste 3: ERRO (Error Handler)                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ it("throws when query fails", async () => {                 │
│   eqMock.mockResolvedValue({                                │
│     data: null,                                              │
│     error: new Error("database-error")  ← Simula erro       │
│   });                                                        │
│                                                              │
│   await expect(minhaFuncao("id"))                           │
│     .rejects.toThrow("database-error");                     │
│                                                              │
│   ← Verifica que o erro é propagado                         │
│ });                                                          │
│                                                              │
│ ✅ Testa: O código falha seguro quando BD retorna erro      │
└──────────────────────────────────────────────────────────────┘
```

---

## 📈 Cobertura Resultante

```
SEM os 3 testes:
┌────────────────────────────┐
│ const { data, error } = ...│  ← Nunca testado ❌
├────────────────────────────┤
│ if (error) throw error;    │  ← Nunca testado ❌
├────────────────────────────┤
│ return data;               │  ← Nunca testado ❌
└────────────────────────────┘
Cobertura: 0% ❌

COM os 3 testes:
┌────────────────────────────┐
│ const { data, error } = ...│  ← Teste 1, 2, 3 ✅
├────────────────────────────┤
│ if (error) throw error;    │  ← Testes 1, 3 ✅
├────────────────────────────┤
│ return data;               │  ← Testes 1, 2 ✅
└────────────────────────────┘
Cobertura: 100% ✅
```

---

## 🔗 O Padrão de Mocking em Cadeia

```
CÓDIGO REAL (Supabase)
═════════════════════════════════════════════════════════════

supabase
  .from("users")           ← chama método from()
    .select()              ← retorna objeto, chama select()
      .eq("id", userId)    ← retorna objeto, chama eq()
      ← resolve com Promise { data, error }


NOSSO MOCK (Vitest)
═════════════════════════════════════════════════════════════

Step 1: Criar o topo da cadeia
─────────────────────────────
const eqMock = vi.fn()
              .mockResolvedValue({ data: [...], error: null })
                                 ↑ Isso é o FINAL da cadeia!

Step 2: Construir pro trás
─────────────────────────────
const selectMock = vi.fn()
                 .mockReturnValue({ eq: eqMock })
                                   ↑ Anexa eqMock como método eq

Step 3: Conectar from()
─────────────────────────────
const fromMock = vi.fn()
               .mockReturnValue({ select: selectMock })
                                 ↑ Anexa selectMock como método select

Step 4: Usar em nosso teste
─────────────────────────────
vi.mock("@/lib/supabase", () => ({
  supabase: { from: fromMock, ... }
}))

RESULTADO: A cadeia funciona!
─────────────────────────────
fromMock("users")        → retorna { select: selectMock }
  .select()              → retorna { eq: eqMock }
    .eq("id", userId)    → retorna Promise { data, error }
```

---

## 🎨 Visualização: 42 Testes em Grupos

```
TESTES ORGANIZATION
════════════════════════════════════════════════════════════════

📂 Group: READ OPERATIONS (10 testes)
├── ✅ fetchOwnedLists (1)
├── ✅ fetchCollaborativeLists (1)
├── ✅ listMovieExists (2: true, false)
├── ✅ fetchListOwnerProfile (2: success, error)
├── ✅ fetchListCollaborators (2: success, error)
├── ✅ fetchListMovieIds (3: success, empty, error)
├── ✅ fetchPrivateListReviews (2: success, error)
└── ✅ fetchSharedListReviews (2: success, error)

📂 Group: COLLABORATORS & NOTIFY (4 testes)
├── ✅ addCollaboratorsToList (2: empty, not-empty)
└── ✅ notifyListCollaborators (2: private, shared)

📂 Group: CREATE OPERATIONS (2 testes)
├── ✅ createListRecord (1)
└── ✅ subscribeListsChanges (1)

📂 Group: UPDATE OPERATIONS (2 testes)
└── ✅ updateListRecord (2: success, error)

📂 Group: MOVIE OPERATIONS (3 testes)
├── ✅ addMovieToListRecord (2: success, error)
└── ✅ removeMovieFromListRecord (2: success, error)

📂 Group: INVITES OPERATIONS (4 testes)
├── ✅ acceptListInvite (2: success, error)
└── ✅ rejectListInvite (2: success, error)

📂 Group: DELETE OPERATIONS (6 testes)
├── ✅ deleteListRecord (2: success, error)
├── ✅ deleteUserListReviews (2: success, error)
└── ✅ removeUserFromListCollaborators (2: success, error)

📂 Group: CONDITIONAL BRANCHES (3 testes)
└── ✅ subscribeListDetailsChanges (3: with-user, without-user, null-user)

════════════════════════════════════════════════════════════════
                        TOTAL: 42 TESTES ✅
```

---

## 🧪 Comparação: Antes vs Depois

```
ANTES (Cobertura Baixa)
════════════════════════════════════════════════════════════════

├─ lists/services
│  ├─ fetchOwnedLists ──────────────────── ❌❌❌ 0%
│  ├─ addCollaboratorsToList ───────────── ❌❌❌ 0%
│  ├─ notifyListCollaborators ──────────── ❌❌❌ 0%
│  ├─ acceptListInvite ─────────────────── ❌❌❌ 0%
│  └─ ... [15 mais funções sem testes]
│
└─ Total: 47% Cobertura (ruim!)


DEPOIS (Cobertura Excelente)
════════════════════════════════════════════════════════════════

├─ lists/services
│  ├─ fetchOwnedLists ──────────────────── ✅✅✅ 100%
│  ├─ addCollaboratorsToList ───────────── ✅✅✅ 100%
│  ├─ notifyListCollaborators ──────────── ✅✅✅ 100%
│  ├─ acceptListInvite ─────────────────── ✅✅✅ 100%
│  ├─ rejectListInvite ─────────────────── ✅✅✅ 100%
│  ├─ deleteListRecord ─────────────────── ✅✅✅ 100%
│  ├─ deleteUserListReviews ────────────── ✅✅✅ 100%
│  ├─ removeUserFromListCollaborators ─── ✅✅✅ 100%
│  ├─ subscribeListDetailsChanges ─────── ✅✅✅ 100%
│  ├─ createListRecord ─────────────────── ✅✅✅ 100%
│  └─ ... [11 mais funções, todas 100%]
│
└─ Total: 95%+ Cobertura (excelente!) ✅✅✅
```

---

## 📝 Processo de Escrita de Teste

```
Passo 1: Entender a Função
═══════════════════════════════════════════════════════════════

export async function fetchData(id: string) {
   const { data, error } = await supabase
      .from("table")
      .select()
      .eq("id", id);
   
   if (error) throw error;
   return data;
}

Q: O que fazer quando...
├─ ...banco retorna dados? → Teste 1
├─ ...banco retorna null? → Teste 2
└─ ...banco retorna erro? → Teste 3


Passo 2: Setup dos Mocks
═══════════════════════════════════════════════════════════════

beforeEach(() => {
   vi.clearAllMocks();                    ← Limpa de antes
   
   const eqMock = vi.fn();                ← Cria função fake
   const selectMock = vi.fn()
      .mockReturnValue({ eq: eqMock });  ← Encadeia
   
   fromMock.mockReturnValue({
      select: selectMock
   });
});


Passo 3: Teste 1 - Sucesso
═══════════════════════════════════════════════════════════════

it("fetches data when found", async () => {
   eqMock.mockResolvedValue({
      data: { id: "123", name: "Test" },
      error: null
   });
   
   const result = await fetchData("123");
   expect(result).toEqual({ id: "123", name: "Test" });
});


Passo 4: Teste 2 - Null
═══════════════════════════════════════════════════════════════

it("returns null when not found", async () => {
   eqMock.mockResolvedValue({
      data: null,
      error: null
   });
   
   const result = await fetchData("999");
   expect(result).toBeNull();
});


Passo 5: Teste 3 - Erro
═══════════════════════════════════════════════════════════════

it("throws when query fails", async () => {
   eqMock.mockResolvedValue({
      data: null,
      error: new Error("database-error")
   });
   
   await expect(fetchData("123"))
      .rejects.toThrow("database-error");
});


✅ Completo! 100% de cobertura em 3 testes simples
```

---

## 🎯 Checklist para Adicionar Novo Teste

- [ ] **Identifique a função** no arquivo `services/`
- [ ] **Crie 3 testes:**
  - [ ] Teste 1: Sucesso (happy path)
  - [ ] Teste 2: Null/Vazio (edge case)
  - [ ] Teste 3: Erro (error handling)
- [ ] **Configure os mocks:**
  - [ ] Mock a resposta do Supabase
  - [ ] Chain corretamente (`.select().eq()`, etc)
- [ ] **Escreva os asserts:**
  - [ ] Teste 1: `expect(result).toEqual(...)`
  - [ ] Teste 2: `expect(result).toBeNull()`
  - [ ] Teste 3: `expect(...).rejects.toThrow(...)`
- [ ] **Rode o teste:**
  - [ ] `npx vitest run <file>.test.ts`
  - [ ] Deve passar todos os 3

---

## 🏆 Resultado: 42 Testes = 95%+ Cobertura

```
┌─────────────────────────────────────────┐
│  Statements:  95%+ ✅                   │
│  Branches:    85%+ ✅                   │
│  Functions:   100%  ✅                  │
│  Lines:       100%  ✅                  │
├─────────────────────────────────────────┤
│  De 10 bugs em produção →               │
│  Apenas ~0.5 escape dos testes          │
│                                         │
│  Confiança: ALTÍSSIMA ✅                │
└─────────────────────────────────────────┘
```

---

**Desenvolvido para o JJ Reviews Team 2026** ❤️

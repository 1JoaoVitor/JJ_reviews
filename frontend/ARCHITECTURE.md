# Arquitetura Frontend - JJ Reviews

Este documento define a arquitetura oficial do frontend com foco em FC/IS (Functional Core / Imperative Shell), organizacao por feature e qualidade continua.

## Objetivo

- Manter regras de negocio previsiveis e testaveis.
- Isolar side effects para reduzir regressao.
- Facilitar evolucao de features com padrao unico.

## Documentos Relacionados

- Playbook de novas features: FEATURE_PLAYBOOK.md
- Instrucoes de build mobile: apk-build-instructions.txt

## Stack Principal

- React + TypeScript + Vite
- Vitest + Testing Library
- Supabase (auth, banco, storage, realtime)
- Capacitor (Android)

## Principios de Arquitetura

1. Estrutura por feature
- Cada dominio fica isolado em `src/features/<feature>`.
- API publica da feature exposta somente por `index.ts`.

2. FC/IS como padrao obrigatorio
- Functional Core (`logic`): regras puras, sem IO.
- Imperative Shell (`services`, `hooks`, `components`): integra IO e UX.

3. Fronteiras claras
- `components`: render e interacao.
- `hooks`: orquestracao de estado e fluxo.
- `services`: IO externo (Supabase, APIs, storage, realtime).
- `logic`: transformacoes, validacoes e decisoes de negocio.

4. Acoplamento minimo
- Evitar import direto entre features.
- Compartilhamento apenas via `src/types`, `src/utils`, `src/lib`.

## Estrutura Recomendada

```text
src/features/<feature>/
  components/
  hooks/
  logic/
  services/
  index.ts
```

## Regras de Implementacao (FC/IS)

### Logic

- Deve ser deterministico e sem side effects.
- Nao usar cliente Supabase, fetch, localStorage, DOM ou window.
- Deve ter testes unitarios cobrindo branches relevantes.

### Services

- Toda chamada externa deve ficar aqui.
- Cada funcao deve ter contrato claro de entrada/saida.
- Erros de IO devem ser propagados de forma consistente.
- Testes obrigatorios: sucesso, retorno vazio/null e erro.

### Hooks

- Coordenam estado, fluxo assincorno e chamada de services/logic.
- Nao concentrar regra complexa no hook quando puder viver em `logic`.

### Components

- Sem chamada direta de Supabase/fetch/axios.
- Sem regra de negocio pesada no JSX.
- Devem consumir hooks e contratos da feature.

## Roteamento e Estado de Navegacao

- Rotas principais:
  - `/`
  - `/perfil/:username`
  - `/reset-password`
- Search params sao fonte de verdade para modais e modo de tela quando aplicavel.

## Politica de Testes

1. Unitarios de logic
- Foco em regras e branches.
- Rapidos e sem mock de framework sempre que possivel.

2. Unitarios de services
- Mock da borda externa (Supabase/API).
- Cobrir sucesso, erro e cenarios de ausencia de dados.

3. Integracao de UI
- Cobrir fluxos criticos de usuario.
- Incluir pelo menos um caminho negativo por fluxo principal.

4. Cobertura
- Escopo principal de cobertura: `logic`, `services` e hooks criticos.
- Ajustes de threshold devem ser graduais, com base em risco real.

## Checklist de PR (resumo)

- Regras de negocio em `logic`.
- Side effects em `services`.
- Hook como orquestrador, nao deposito de regra.
- Componente sem IO direto.
- Testes de logic + services + integracao essencial.
- Sem regressao no `test:ci`.

## Fluxo para Novas Features

O fluxo detalhado, com Definition of Done e checklist completo, esta em FEATURE_PLAYBOOK.md.
Esse playbook e obrigatorio para novas features.

## Guia de Evolucao da Arquitetura

- Antes de adicionar nova camada, validar se o caso cabe no contrato existente.
- Se um service crescer demais, separar por caso de uso.
- Se um hook acumular regras, extrair para `logic`.
- Se houver acoplamento entre features, criar contrato explicito no nivel de dominio.

## Criterio de Aceitacao Arquitetural

Uma alteracao e aceita quando:

- respeita FC/IS,
- mantem fronteiras claras,
- tem cobertura proporcional ao risco,
- e nao adiciona acoplamento desnecessario.

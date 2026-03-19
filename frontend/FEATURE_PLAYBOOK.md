# Playbook de Nova Feature (FC/IS)

Este guia define o fluxo padrao para criar novas features no frontend seguindo FC/IS.
Objetivo: manter isolamento de regras, previsibilidade de testes e baixo acoplamento.

## Fluxo Obrigatorio

1. Definir casos de uso
- Liste os fluxos felizes e os fluxos de erro da feature.
- Documente entradas/saidas esperadas por caso de uso.

2. Implementar camada logic (primeiro)
- Crie funcoes puras em `features/<feature>/logic`.
- Nao usar Supabase, DOM, Date.now sem injeção, ou side effects.
- Escreva testes cobrindo branches principais antes de subir para hook/componente.

3. Implementar camada services
- Centralize IO externo em `features/<feature>/services`.
- Cada funcao de service deve ter contrato claro de entrada/saida e tratamento de erro.
- Cobrir com testes: sucesso, vazio/null e erro.

4. Implementar hooks de orquestracao
- Hooks orquestram estado da tela, chamam logic/services e expoem handlers.
- Evitar regra de negocio complexa no hook; delegar para logic.
- Evitar acesso direto ao cliente externo no componente.

5. Implementar componentes
- Componentes ficam focados em render e interacao.
- Sem chamadas diretas de Supabase/fetch/axios.
- Usar somente API publica da feature (barrel `index.ts`).

6. Testes de integracao de UI
- Cobrir fluxos criticos do usuario e pelo menos 1 caminho negativo relevante.
- Mockar services na fronteira para validar comportamento da UI.

7. Revisao arquitetural
- Verificar imports entre features (evitar acoplamento cruzado).
- Confirmar contratos exportados no `index.ts` da feature.
- Garantir que naming e estrutura de pastas seguem o padrao do projeto.

8. Gate de merge
- Todos os testes da feature passando.
- Sem regressao no `test:ci`.
- Cobertura da feature adequada ao risco (logic + services obrigatorio).

## Estrutura Minima da Feature

```
features/<feature>/
  components/
  hooks/
  logic/
  services/
  index.ts
```

## Checklist de PR (copiar no PR)

- [ ] Regras de negocio estao em `logic` (funcoes puras)
- [ ] Side effects e IO estao em `services`
- [ ] Hook apenas orquestra estado e chamadas
- [ ] Componente nao acessa cliente externo diretamente
- [ ] Barrel `index.ts` atualizado com API publica
- [ ] Testes de logic cobrindo branches principais
- [ ] Testes de services cobrindo sucesso, vazio/null e erro
- [ ] Teste(s) de integracao para fluxo critico da UI
- [ ] `npm run test:ci` sem regressao

## Definicao de Pronto (DoD)

Uma feature e considerada pronta quando:
- a separacao FC/IS esta respeitada,
- os testes essenciais foram implementados,
- e o comportamento principal esta coberto em integracao.

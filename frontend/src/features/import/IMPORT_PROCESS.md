# Importacao Letterboxd -> JJ Reviews

Este documento explica, de ponta a ponta, como a feature de importacao funciona hoje: arquitetura, fluxo de dados, validacoes, transformacao, persistencia, UX e testes.

## 1. Objetivo da feature

Permitir que um usuario exporte dados do Letterboxd (ZIP com CSVs) e importe no JJ Reviews com seguranca e feedback claro.

Dados suportados:

- profile
- ratings
- reviews
- watched
- watchlist
- listas (arquivos de lista)

## 2. Onde a feature entra no app

- Rota publica da pagina: /import
- Componente de tela: src/features/import/components/ImportPage/ImportPage.tsx
- Atalho no perfil: src/features/profile/components/ProfilePage/ProfilePage.tsx

Mesmo sendo rota publica, a persistencia final so acontece com sessao ativa. Sem sessao, a tela mostra orientacao para login.

## 3. Arquitetura por camadas

### 3.1 Tipos e contratos

Arquivo: src/features/import/types/importTypes.ts

Define todos os contratos da feature:

- formatos de entrada (RatingData, ReviewData, ListData etc.)
- formatos processados (ProcessedImportData, ProcessedMovie, ProcessedList)
- modelo de issues (ValidationIssue, ValidationResult)
- configuracao (ImportSettings)
- saida de persistencia (ImportCompleteResult)

Esses tipos sao a base para evitar regressao e manter previsibilidade entre servicos.

### 3.2 Deteccao e extracao de ZIP

Arquivo: src/features/import/utils/zipParser.ts

Responsabilidades:

- abrir ZIP client-side com JSZip
- ignorar entradas de sistema e opcionais do Letterboxd
- detectar tipo de cada arquivo pelo nome + cabecalho
- validar cabecalho minimo
- montar sumario por tipo

Detalhes relevantes:

- Arquivos opcionais e pastas que nao entram no fluxo principal sao ignorados (ex.: comments.csv, diary.csv, deleted/, likes/, orphaned/).
- Arquivos nao CSV sao marcados como unknown valido para reduzir ruido.
- Se nao houver arquivos legiveis, o parser falha com erro de extracao.

### 3.3 Parsing e validacao de conteudo

Arquivo: src/features/import/services/importValidationService.ts

Responsabilidades:

- parse de CSV para estruturas tipadas
- validacao de campos obrigatorios e faixas
- validacao de listas
- validacao de matching TMDB (warnings de correspondencia)

Ponto importante de listas:

- O parser de listas cobre o formato real de export v7 do Letterboxd, incluindo o caso em que metadata e bloco de filmes aparecem no mesmo CSV logico.
- Ha fallback para mapear colunas quando o arquivo vem em estrutura menos previsivel.

### 3.4 Orquestracao do pipeline

Arquivo: src/features/import/services/importPipelineService.ts

Fluxo principal:

1. extractAndDetectZip(file)
2. parseImportCsvContent(...) para cada arquivo suportado
3. validateImportFiles(parsedData)
4. consolidacao de issues de deteccao + validacao
5. transformImportData(...) quando canProceed = true

Observacoes:

- Arquivos unknown nao entram no parse.
- Issues de deteccao invalidas sao convertidas para warning.
- Se nenhum arquivo reconhecido existir no ZIP, o pipeline adiciona warning explicito para orientar o usuario.

### 3.5 Transformacao para modelo do app

Arquivo: src/features/import/services/importTransformationService.ts

Responsabilidades:

- consolidar watched/watchlist/ratings/reviews em base unica de filmes
- fazer matching em lote no TMDB
- aplicar regras de status e deduplicacao
- converter nota conforme escala configurada
- montar ProcessedImportData com stats

Regras centrais:

- skipUnmatchedMovies = true remove filmes sem match do resultado final.
- skipUnmatchedMovies = false mantem filme sem tmdbId e marca matchWarning.
- status final do processamento:
	- success: sem unmatched
	- partial: com unmatched
	- error: sem filmes processados

### 3.6 Persistencia no banco

Arquivo: src/features/import/services/importPersistenceService.ts

Responsabilidades:

- salvar filmes como reviews/status pessoal
- criar listas
- inserir filmes nas listas
- contabilizar conflitos (sem match, duplicado, erro de insert)
- retornar estatisticas e erros amigaveis

Regra de negocio atual:

- listas importadas sao forçadas para private no momento da confirmacao na UI.

### 3.7 Hook de estado e execucao

Arquivo: src/features/import/hooks/useImportPipeline.ts

Responsabilidades:

- controlar isProcessing, result, error
- fazer merge de configuracoes default + override
- encapsular chamada de processImportZip

## 4. Fluxo da UI (ImportPage)

Arquivo: src/features/import/components/ImportPage/ImportPage.tsx

Sequencia de uso:

1. Usuario escolhe ZIP
2. Clica em Processar importacao
3. Tela mostra resumo de resultado
4. Se houver dados importaveis + validacao OK, usuario confirma salvamento
5. Persistencia executa e exibe estatisticas finais

UX e mensagens importantes:

- Botao Voltar com seta no canto esquerdo
- Escala de nota simplificada: sem seletor
- Aviso explicito de conversao automatica de nota (0-5 -> 0-10 x2)
- Explicacao clara sobre Ignorar filmes sem match
- Warning explicito quando ZIP nao contem arquivos reconhecidos

## 5. Decisoes de produto e tecnicas

1. Reduzir ruido de warning de arquivos extras
- Motivo: ZIP real do Letterboxd contem artefatos que nao devem assustar o usuario.

2. Manter matching por TMDB como parte da validacao/transformacao
- Motivo: garantir consistencia de IDs para persistencia.

3. Forcar listas privadas na importacao
- Motivo: evitar complexidade de colaboracao no fluxo inicial de migracao.

4. Mensagens em PT-BR e foco em entendimento
- Motivo: diminuir incerteza no processo de importacao.

## 6. Tratamento de erro e fallback

Erros bloqueantes:

- falha ao abrir ZIP
- erro de parse CSV irrecuperavel
- validacoes ERROR

Warnings nao bloqueantes:

- linhas invalidas
- filmes sem match
- arquivo detectado com problema de cabecalho
- nenhum arquivo reconhecido no ZIP

Comportamento quando nao ha dados importaveis:

- UI informa que o arquivo foi analisado, mas nao houve dados para importar.
- Warnings sao mostrados para orientar proximo passo.

## 7. Testes e cobertura

Suites principais:

- src/features/import/utils/__tests__/zipParser.test.ts
- src/features/import/services/__tests__/importValidationService.test.ts
- src/features/import/services/__tests__/importTransformationService.test.ts
- src/features/import/services/__tests__/importPipelineService.test.ts
- src/features/import/hooks/__tests__/useImportPipeline.test.ts
- src/features/import/services/__tests__/importPersistenceService.test.ts

Cenarios cobertos recentemente:

- lista Letterboxd v7 com bloco metadata + bloco de filmes
- comportamento de unknown sem warning desnecessario
- warning quando ZIP nao tem arquivos reconhecidos
- merge de configuracao no hook
- fluxos de persistencia com sucesso e parcial

## 8. Como evoluir daqui

Sugestoes seguras de evolucao:

1. Exportacao real de dados
- Implementar service de export e habilitar botao no perfil.

2. Melhorar observabilidade do matching
- Exibir taxa de match por arquivo e top causas de falha.

3. Modo simulacao detalhado
- Reativar dry-run como relatorio opcional (sem persistir).

4. Telemetria de import
- Medir tempo de cada etapa e pontos de abandono.

## 9. Resumo executivo

A feature foi estruturada como pipeline em camadas (detectar -> parsear -> validar -> transformar -> persistir), com tipagem forte e testes dedicados. O foco atual esta em robustez para ZIPs reais do Letterboxd, clareza de UX e seguranca na persistencia.

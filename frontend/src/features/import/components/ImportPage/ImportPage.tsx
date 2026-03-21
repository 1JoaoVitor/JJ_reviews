import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/features/auth";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay/LoadingOverlay";
import { persistImportedData } from "../../services/importPersistenceService";
import { RatingScale } from "../../types/importTypes";
import { useImportPipeline } from "../../hooks/useImportPipeline";
import type { ImportCompleteResult, ImportSettings, ProcessedImportData } from "../../types/importTypes";
import styles from "./ImportPage.module.css";

const defaultSettings: ImportSettings = {
  ratingScale: RatingScale.SCALE_0_TO_10,
  listTypeMap: {},
  skipUnmatchedMovies: false,
};

export function ImportPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [skipUnmatchedMovies, setSkipUnmatchedMovies] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<ImportCompleteResult | null>(null);
  const { isProcessing, result, error, runImport, reset } = useImportPipeline(defaultSettings);

  const summaryRows = useMemo(() => {
    if (!result) {
      return [] as Array<{ label: string; value: number | string }>;
    }

    return [
      {
        label: "Status do processamento",
        value:
          result.processedData?.status === "success"
            ? "sucesso"
            : result.processedData?.status === "partial"
              ? "parcial"
              : "erro",
      },
      { label: "Filmes processados", value: result.processedData?.stats.totalMovies || 0 },
      { label: "Filmes sem correspondência", value: result.processedData?.stats.unmatchedMovies || 0 },
      { label: "Listas", value: result.processedData?.stats.totalLists || 0 },
      { label: "Avisos", value: result.validation.warnings.length },
      { label: "Erros", value: result.validation.errors.length },
      { label: "Arquivos no ZIP", value: result.detected.files.length },
      {
        label: "Arquivos reconhecidos",
        value: result.detected.files.filter((file) => file.type !== "unknown").length,
      },
    ];
  }, [result]);

  const hasImportableData = useMemo(() => {
    if (!result?.processedData) {
      return false;
    }

    return result.processedData.stats.totalMovies > 0 || result.processedData.stats.totalLists > 0;
  }, [result]);

  const hasWarnings = (result?.validation.warnings.length || 0) > 0;
  const hasSavedImport = !!saveResult;
  const canCancelImport = !!selectedFile || !!result || !!saveError || !!saveResult || isProcessing || isSaving;
  const isPartialImport = result?.processedData?.status === "partial";
  const problematicMovies = useMemo(
    () => (result?.processedData?.movies || []).filter((movie) => !movie.tmdbId),
    [result]
  );
  const partialIssues = useMemo(
    () => [...(result?.validation.errors || []), ...(result?.validation.warnings || [])].slice(0, 8),
    [result]
  );

  const onExportPartialReport = () => {
    if (!result) {
      return;
    }

    const lines: string[] = ["tipo,item,detalhe"];

    for (const movie of problematicMovies) {
      const item = `${movie.name} (${movie.year})`;
      const detail = movie.matchWarning || "Sem correspondência automática";
      lines.push(`filme,"${item.replace(/"/g, '""')}","${detail.replace(/"/g, '""')}"`);
    }

    for (const issue of partialIssues) {
      lines.push(`validacao,"Importação parcial","${issue.replace(/"/g, '""')}"`);
    }

    const csvContent = `\uFEFF${lines.join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `import-parcial-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setSaveError(null);
    setSaveResult(null);
    reset();
  };

  const onProcess = async () => {
    if (!selectedFile) {
      return;
    }

    setSaveError(null);
    setSaveResult(null);
    await runImport(selectedFile, {
      ratingScale: RatingScale.SCALE_0_TO_10,
      skipUnmatchedMovies,
    });
  };

  const onCancelImport = () => {
    setSelectedFile(null);
    setSaveError(null);
    setSaveResult(null);
    reset();
  };

  const onConfirmImport = async () => {
    if (!result?.processedData || !session?.user?.id) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const processedDataToPersist: ProcessedImportData = {
        ...result.processedData,
        lists: result.processedData.lists.map((list) => ({
          ...list,
          type: "private" as const,
        })),
      };

      const completeResult = await persistImportedData({
        userId: session.user.id,
        processedData: processedDataToPersist,
      });

      setSaveResult(completeResult);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao salvar importacao no banco.";
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!session) {
    return (
      <section className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>Importar dados</h1>
          <p className={styles.subtitle}>Você precisa estar logado para importar o ZIP para o JJ Reviews.</p>
          <div className={styles.authActions}>
            <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
              <ArrowLeft size={16} /> Voltar
            </button>
            <button type="button" className={styles.loginBtn} onClick={() => navigate("/")}>
              Ir para inicio e entrar
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topActions}>
          <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Voltar
          </button>
        </div>

        <div className={styles.hero}>
          <h1 className={styles.title}>Importar dados</h1>
          <p className={styles.subtitle}>Faça upload de um arquivo ZIP com seus dados para validar, revisar e salvar com segurança.</p>
        </div>

        <div className={styles.importScopeCard}>
          <strong className={styles.settingsTitle}>O que será importado</strong>
          <ul className={styles.importScopeList}>
            <li>Listas (sempre criadas como privadas)</li>
            <li>Reviews (texto e recomendação, quando disponíveis)</li>
            <li>Watchlist</li>
            <li>Histórico de filmes assistidos (watched)</li>
            <li>Avaliações (ratings, convertidas de 0-5 para 0-10)</li>
            <li>Dados básicos de perfil disponíveis no export</li>
          </ul>
          <p className={styles.overwriteHint}>
            Atenção: na importação, os dados de filmes (status watched/watchlist, nota e review) do mesmo filme podem sobrescrever o que já existe na sua conta.
          </p>
        </div>

        <div className={styles.badgesInfoCard}>
          <strong className={styles.settingsTitle}>Sobre as badges de recomendação</strong>
          <p className={styles.badgeInfo}>
            Como o Letterboxd não possui badges de recomendação, o JJ Reviews irá <strong>converter automaticamente suas notas em badges</strong> durante a importação. Essas transformações são <strong>baseadas em intervalos</strong>, mas <strong>não são fixas</strong> — você pode editar cada filme depois para mudar sua recomendação.
          </p>
          <div className={styles.badgesGrid}>
            <div className={styles.badgeExample}>
              <span className={`${styles.badgePill} ${styles.badgeGreat}`}>Assista com certeza</span>
              <span className={styles.badgeRange}>Nota: 10 - 9</span>
            </div>
            <div className={styles.badgeExample}>
              <span className={`${styles.badgePill} ${styles.badgeGood}`}>Vale a pena assistir</span>
              <span className={styles.badgeRange}>Nota: 8.5 - 7.5</span>
            </div>
            <div className={styles.badgeExample}>
              <span className={`${styles.badgePill} ${styles.badgeOk}`}>Tem filmes melhores, mas é legal</span>
              <span className={styles.badgeRange}>Nota: 7 - 6</span>
            </div>
            <div className={styles.badgeExample}>
              <span className={`${styles.badgePill} ${styles.badgeBad}`}>Não tão bom</span>
              <span className={styles.badgeRange}>Nota: 5.5 - 4.5</span>
            </div>
            <div className={styles.badgeExample}>
              <span className={`${styles.badgePill} ${styles.badgeTerrible}`}>Não perca seu tempo</span>
              <span className={styles.badgeRange}>Nota: ≤ 4</span>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <input
            id="import-file-input"
            className={styles.hiddenInput}
            type="file"
            accept=".zip,application/zip"
            onChange={onFileChange}
            disabled={isProcessing || isSaving}
          />

          <label htmlFor="import-file-input" className={styles.filePickerBtn}>
            Escolher arquivo ZIP
          </label>

          <span className={styles.fileNamePill}>
            {selectedFile ? selectedFile.name : "Nenhum arquivo selecionado"}
          </span>

          <input
            className={styles.fileInput}
            type="file"
            accept=".zip,application/zip"
            onChange={onFileChange}
            disabled={isProcessing || isSaving}
          />

          <button
            className={styles.processBtn}
            type="button"
            onClick={onProcess}
            disabled={!selectedFile || isProcessing || isSaving}
          >
            {isProcessing ? "Processando..." : "Processar importação"}
          </button>

          {canCancelImport && (
            <button
              className={styles.cancelBtn}
              type="button"
              onClick={onCancelImport}
              disabled={isProcessing || isSaving}
            >
              Cancelar importação
            </button>
          )}
        </div>

        <div className={styles.settingsCard}>
          <strong className={styles.settingsTitle}>Configurações de importação</strong>
          <div className={styles.settingsGrid}>
            <label className={styles.checkLabel}>
              <input
                className={styles.checkboxInput}
                type="checkbox"
                checked={skipUnmatchedMovies}
                onChange={(event) => setSkipUnmatchedMovies(event.target.checked)}
                disabled={isProcessing || isSaving}
              />
              <span className={styles.checkboxMark} aria-hidden="true" />
              <span>Ignorar filmes sem match</span>
            </label>
            <p className={styles.settingHint}>
              Quando ativado, filmes sem correspondência na base de dados do JJ Reviews são ignorados no salvamento. Quando desativado, eles aparecem no resultado como conflito.
            </p>
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {saveError && <p className={styles.error}>{saveError}</p>}

        {result && (
          <div className={styles.card}>
            <strong>Resultado</strong>
            <ul className={styles.list}>
              {summaryRows.map((item) => (
                <li key={item.label}>
                  {item.label}: {String(item.value)}
                </li>
              ))}
            </ul>

            {hasWarnings && (
              <div className={styles.warningCard}>
                <strong>Problemas encontrados</strong>
                <ul className={styles.list}>
                  {result.validation.warnings.slice(0, 6).map((warning, index) => (
                    <li key={`${warning}-${index}`}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.validation.canProceed && hasImportableData ? (
              <p className={styles.ok}>Fluxo validado e transformado. Revise os dados e confirme para salvar no banco.</p>
            ) : result.validation.canProceed ? (
                <div>
                    <p></p>
                </div>
            ) : (
              <p className={styles.error}>Validacao bloqueou o processamento final.</p>
            )}

            {isPartialImport && (
              <div className={styles.partialCard}>
                <strong>Importação parcial detectada</strong>
                <p className={styles.partialText}>
                  Parte dos dados não será importada corretamente. Revise os itens abaixo antes de confirmar.
                </p>

                {problematicMovies.length > 0 && (
                  <>
                    <strong className={styles.partialSubtitle}>Filmes com problema de correspondência</strong>
                    <ul className={styles.list}>
                      {problematicMovies.slice(0, 12).map((movie) => (
                        <li key={`${movie.name}-${movie.year}`}>
                          {movie.name} ({movie.year}) - {movie.matchWarning || "Sem correspondência automática"}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {partialIssues.length > 0 && (
                  <>
                    <strong className={styles.partialSubtitle}>Avisos e erros da validação</strong>
                    <ul className={styles.list}>
                      {partialIssues.map((issue, index) => (
                        <li key={`${issue}-${index}`}>{issue}</li>
                      ))}
                    </ul>
                  </>
                )}

                {(problematicMovies.length > 0 || partialIssues.length > 0) && (
                  <button type="button" className={styles.partialExportBtn} onClick={onExportPartialReport}>
                    Baixar relatório CSV dos problemas
                  </button>
                )}
              </div>
            )}

            {result.validation.canProceed && result.processedData && (
              <>
                {result.processedData.lists.length > 0 && hasImportableData && (
                  <div className={styles.previewCard}>
                    <strong>Preview das listas</strong>
                    <ul className={styles.list}>
                      {result.processedData.lists.map((list) => (
                        <li key={list.id} className={styles.previewRow}>
                          <span>
                            {list.name} ({list.movies.length} filmes)
                          </span>
                          <span className={styles.privateTag}>Privada</span>
                        </li>
                      ))}
                    </ul>
                    <p className={styles.listModeHint}>
                      Todas as listas importadas serao criadas como privadas para evitar dependencias de colaboradores.
                    </p>
                  </div>
                )}

                <button
                  className={styles.confirmBtn}
                  type="button"
                  onClick={onConfirmImport}
                  disabled={isSaving || !hasImportableData || hasSavedImport}
                >
                  {isSaving ? "Salvando..." : hasSavedImport ? "Importação já confirmada" : "Confirmar e salvar"}
                </button>
              </>
            )}

            {saveResult && (
              <div className={styles.persistCard}>
                <strong>{saveResult.message}</strong>
                <ul className={styles.list}>
                  <li>Filmes importados: {saveResult.stats.moviesImported}</li>
                  <li>Listas criadas: {saveResult.stats.listsCreated}</li>
                  <li>Reviews adicionadas: {saveResult.stats.reviewsAdded}</li>
                  <li>Watched adicionados: {saveResult.stats.watchedAdded}</li>
                  <li>Watchlist adicionados: {saveResult.stats.watchlistAdded}</li>
                  <li>Conflitos: {saveResult.stats.conflicts}</li>
                  <li>Sem match: {saveResult.stats.unmatchedMovies}</li>
                </ul>
                {saveResult.errors && saveResult.errors.length > 0 && (
                  <p className={styles.error}>Erros: {saveResult.errors.join(" | ")}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {isSaving && <LoadingOverlay message="Salvando importação... Não feche a página, isso pode demorar um pouco." />}
    </section>
  );
}

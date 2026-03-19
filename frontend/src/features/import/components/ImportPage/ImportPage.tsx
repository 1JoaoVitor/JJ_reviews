import { useMemo, useState } from "react";
import { useAuth } from "@/features/auth";
import { RatingScale } from "../../types/importTypes";
import { useImportPipeline } from "../../hooks/useImportPipeline";
import type { ImportSettings } from "../../types/importTypes";
import styles from "./ImportPage.module.css";

const defaultSettings: ImportSettings = {
  ratingScale: RatingScale.SCALE_1_TO_1,
  listTypeMap: {},
  skipUnmatchedMovies: false,
};

export function ImportPage() {
  const { session } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { isProcessing, result, error, runImport, reset } = useImportPipeline(defaultSettings);

  const summaryRows = useMemo(() => {
    if (!result) {
      return [] as Array<{ label: string; value: number | string }>;
    }

    return [
      { label: "Status", value: result.processedData?.status || "error" },
      { label: "Filmes processados", value: result.processedData?.stats.totalMovies || 0 },
      { label: "Filmes sem match", value: result.processedData?.stats.unmatchedMovies || 0 },
      { label: "Listas", value: result.processedData?.stats.totalLists || 0 },
      { label: "Warnings", value: result.validation.warnings.length },
      { label: "Errors", value: result.validation.errors.length },
    ];
  }, [result]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    reset();
  };

  const onProcess = async () => {
    if (!selectedFile) {
      return;
    }

    await runImport(selectedFile);
  };

  if (!session) {
    return (
      <section className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>Importar dados</h1>
          <p className={styles.subtitle}>Você precisa estar logado para importar o ZIP do Letterboxd.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Importar dados do Letterboxd</h1>
        <p className={styles.subtitle}>Faça upload de um arquivo ZIP exportado do Letterboxd para validar e transformar seus dados.</p>

        <div className={styles.actions}>
          <input
            className={styles.fileInput}
            type="file"
            accept=".zip,application/zip"
            onChange={onFileChange}
            disabled={isProcessing}
          />

          <button
            className={styles.processBtn}
            type="button"
            onClick={onProcess}
            disabled={!selectedFile || isProcessing}
          >
            {isProcessing ? "Processando..." : "Processar importacao"}
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}

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
            {result.validation.canProceed ? (
              <p className={styles.ok}>Fluxo validado e transformado com sucesso.</p>
            ) : (
              <p className={styles.error}>Validacao bloqueou o processamento final.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

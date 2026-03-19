import { useCallback, useMemo, useState } from "react";
import { processImportZip } from "../services/importPipelineService";
import { RatingScale } from "../types/importTypes";
import type { ImportPipelineResult } from "../services/importPipelineService";
import type { ImportSettings } from "../types/importTypes";

const DEFAULT_IMPORT_SETTINGS: ImportSettings = {
  ratingScale: RatingScale.SCALE_1_TO_1,
  listTypeMap: {},
  skipUnmatchedMovies: false,
};

interface UseImportPipelineState {
  isProcessing: boolean;
  result: ImportPipelineResult | null;
  error: string | null;
}

export function useImportPipeline(initialSettings?: Partial<ImportSettings>) {
  const [state, setState] = useState<UseImportPipelineState>({
    isProcessing: false,
    result: null,
    error: null,
  });

  const settings: ImportSettings = useMemo(
    () => ({
      ...DEFAULT_IMPORT_SETTINGS,
      ...initialSettings,
      listTypeMap: {
        ...DEFAULT_IMPORT_SETTINGS.listTypeMap,
        ...(initialSettings?.listTypeMap || {}),
      },
    }),
    [initialSettings]
  );

  const runImport = useCallback(
    async (file: File, overrideSettings?: Partial<ImportSettings>) => {
      setState((prev) => ({ ...prev, isProcessing: true, error: null }));

      const mergedSettings: ImportSettings = {
        ...settings,
        ...overrideSettings,
        listTypeMap: {
          ...settings.listTypeMap,
          ...(overrideSettings?.listTypeMap || {}),
        },
      };

      try {
        const result = await processImportZip(file, mergedSettings);
        setState({
          isProcessing: false,
          result,
          error: null,
        });

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao processar arquivo de importacao.";

        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error: message,
        }));

        throw error;
      }
    },
    [settings]
  );

  const reset = useCallback(() => {
    setState({
      isProcessing: false,
      result: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    settings,
    runImport,
    reset,
  };
}

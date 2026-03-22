import type { ChangeEvent } from 'react';
import { useCallback, useState } from 'react';
import {
  createTextSourceFile,
  formatKnowledgeSourceFileIssues,
  formatKnowledgeSourceLargeFileWarning,
  formatKnowledgeSourceOverflowMessage,
  prepareKnowledgeSourceFiles,
  shouldWarnLargeKnowledgeSourceFile,
  validateKnowledgeSourceFile,
} from './knowledgeUpload.shared';
import type { KnowledgeTextInputValues } from './components/KnowledgeTextInputModal';
import { tp } from './knowledge.i18n';

export type UploadFlowStep = 'picker' | 'text';

export interface UploadKnowledgeSourceOptions {
  manageLoading?: boolean;
  notifySuccess?: boolean;
  notifyError?: boolean;
  refreshAfterUpload?: boolean;
  showLargeFileWarning?: boolean;
}

export interface UploadKnowledgeSourceResult {
  success: boolean;
  reason?: string;
}

interface KnowledgeFlowMessageApi {
  error: (content: string) => void;
  info: (content: string) => void;
  open: (config: {
    key: string;
    type: 'error' | 'loading' | 'success' | 'warning';
    content: string;
    duration: number;
  }) => void;
  success: (content: string) => void;
  warning: (content: string) => void;
}

interface UseKnowledgeUploadFlowOptions {
  message: KnowledgeFlowMessageApi;
  batchUploadMessageKey: string;
  formatBatchUploadProgress: (current: number, total: number) => string;
  formatBatchUploadSuccessMessage: (
    successCount: number,
    totalCount: number,
  ) => string;
  uploadDocument: (knowledgeId: string, file: File) => Promise<void>;
  refreshAfterUpload: (knowledgeId: string) => void;
  successMessage: string;
  uploadErrorMessage: string;
  emptyTargetMessage?: string;
  closeTextInputOnSubmit?: 'before' | 'success';
  getUploadUnavailableReason?: (knowledgeId: string) => string | null;
  extractErrorMessage?: (error: unknown, fallback: string) => string;
}

export const useKnowledgeUploadFlow = ({
  message,
  batchUploadMessageKey,
  formatBatchUploadProgress,
  formatBatchUploadSuccessMessage,
  uploadDocument,
  refreshAfterUpload,
  successMessage,
  uploadErrorMessage,
  emptyTargetMessage = tp('upload.emptyTarget'),
  closeTextInputOnSubmit = 'success',
  getUploadUnavailableReason,
  extractErrorMessage,
}: UseKnowledgeUploadFlowOptions) => {
  const [uploadFlowStep, setUploadFlowStep] = useState<UploadFlowStep | null>(
    null,
  );
  const [uploadTargetKnowledgeId, setUploadTargetKnowledgeId] = useState<
    string | null
  >(null);
  const [uploadingKnowledgeId, setUploadingKnowledgeId] = useState<
    string | null
  >(null);

  const closeUploadFlow = useCallback(() => {
    setUploadFlowStep(null);
    setUploadTargetKnowledgeId(null);
  }, []);

  const openUploadFlow = useCallback(
    (knowledgeId: string | null) => {
      if (!knowledgeId) {
        message.info(emptyTargetMessage);
        return;
      }

      const unavailableReason = getUploadUnavailableReason?.(knowledgeId);

      if (unavailableReason) {
        message.info(unavailableReason);
        return;
      }

      setUploadTargetKnowledgeId(knowledgeId);
      setUploadFlowStep('picker');
    },
    [emptyTargetMessage, getUploadUnavailableReason, message],
  );

  const openTextInput = useCallback(() => {
    setUploadFlowStep('text');
  }, []);

  const backToSourcePicker = useCallback(() => {
    setUploadFlowStep('picker');
  }, []);

  const uploadKnowledgeSource = useCallback(
    async (
      knowledgeId: string,
      file: File,
      options?: UploadKnowledgeSourceOptions,
    ): Promise<UploadKnowledgeSourceResult> => {
      const unavailableReason = getUploadUnavailableReason?.(knowledgeId);

      if (unavailableReason) {
        if (options?.notifyError !== false) {
          message.info(unavailableReason);
        }

        return {
          success: false,
          reason: unavailableReason,
        };
      }

      const validationError = validateKnowledgeSourceFile(file);

      if (validationError) {
        if (options?.notifyError !== false) {
          message.error(validationError);
        }

        return {
          success: false,
          reason: validationError,
        };
      }

      if (
        options?.showLargeFileWarning !== false &&
        shouldWarnLargeKnowledgeSourceFile(file)
      ) {
        message.warning(tp('upload.largeFileWarning'));
      }

      const manageLoading = options?.manageLoading !== false;

      if (manageLoading) {
        setUploadingKnowledgeId(knowledgeId);
      }

      try {
        await uploadDocument(knowledgeId, file);

        if (options?.notifySuccess !== false) {
          message.success(successMessage);
        }

        if (options?.refreshAfterUpload !== false) {
          refreshAfterUpload(knowledgeId);
        }

        return {
          success: true,
        };
      } catch (currentError) {
        const errorMessage = extractErrorMessage
          ? extractErrorMessage(currentError, uploadErrorMessage)
          : currentError instanceof Error && currentError.message
            ? currentError.message
            : uploadErrorMessage;

        if (options?.notifyError !== false) {
          message.error(errorMessage);
        }

        return {
          success: false,
          reason: errorMessage,
        };
      } finally {
        if (manageLoading) {
          setUploadingKnowledgeId(null);
        }
      }
    },
    [
      getUploadUnavailableReason,
      message,
      refreshAfterUpload,
      successMessage,
      uploadDocument,
      uploadErrorMessage,
      extractErrorMessage,
    ],
  );

  const handleSelectedFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || !uploadTargetKnowledgeId) {
        return;
      }

      const {
        acceptedFiles,
        fileIssues,
        overflowCount,
        largeFileCount,
      } = prepareKnowledgeSourceFiles(files);

      if (overflowCount > 0) {
        message.warning(formatKnowledgeSourceOverflowMessage(overflowCount));
      }

      if (fileIssues.length > 0) {
        message.warning(
          tp('upload.skippedFiles', {
            count: fileIssues.length,
            details: formatKnowledgeSourceFileIssues(fileIssues),
          }),
        );
      }

      if (acceptedFiles.length === 0) {
        return;
      }

      if (largeFileCount > 0) {
        message.warning(formatKnowledgeSourceLargeFileWarning(largeFileCount));
      }

      const knowledgeId = uploadTargetKnowledgeId;
      closeUploadFlow();

      if (acceptedFiles.length === 1) {
        await uploadKnowledgeSource(knowledgeId, acceptedFiles[0], {
          showLargeFileWarning: false,
        });
        return;
      }

      const failedFiles: Array<{ fileName: string; reason: string }> = [];
      let successCount = 0;

      setUploadingKnowledgeId(knowledgeId);

      try {
        for (const [index, file] of acceptedFiles.entries()) {
          message.open({
            key: batchUploadMessageKey,
            type: 'loading',
            content: formatBatchUploadProgress(index + 1, acceptedFiles.length),
            duration: 0,
          });

          const result = await uploadKnowledgeSource(knowledgeId, file, {
            manageLoading: false,
            notifySuccess: false,
            notifyError: false,
            refreshAfterUpload: false,
            showLargeFileWarning: false,
          });

          if (result.success) {
            successCount += 1;
            continue;
          }

          failedFiles.push({
            fileName: file.name,
            reason: result.reason ?? uploadErrorMessage,
          });
        }
      } finally {
        setUploadingKnowledgeId(null);
      }

      if (successCount > 0) {
        refreshAfterUpload(knowledgeId);
      }

      if (successCount > 0) {
        message.open({
          key: batchUploadMessageKey,
          type: failedFiles.length === 0 ? 'success' : 'warning',
          content: formatBatchUploadSuccessMessage(
            successCount,
            acceptedFiles.length,
          ),
          duration: 4,
        });
      } else {
        message.open({
          key: batchUploadMessageKey,
          type: 'error',
          content: tp('upload.uploadFailed'),
          duration: 4,
        });
      }

      if (failedFiles.length > 0) {
        message.error(
          tp('upload.failedFiles', {
            details: formatKnowledgeSourceFileIssues(failedFiles),
          }),
        );
      }
    },
    [
      batchUploadMessageKey,
      closeUploadFlow,
      formatBatchUploadProgress,
      formatBatchUploadSuccessMessage,
      message,
      refreshAfterUpload,
      uploadErrorMessage,
      uploadKnowledgeSource,
      uploadTargetKnowledgeId,
    ],
  );

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = '';

      if (files.length === 0) {
        return;
      }

      await handleSelectedFiles(files);
    },
    [handleSelectedFiles],
  );

  const submitTextSource = useCallback(
    async (values: KnowledgeTextInputValues) => {
      if (!uploadTargetKnowledgeId) {
        return;
      }

      const knowledgeId = uploadTargetKnowledgeId;

      if (closeTextInputOnSubmit === 'before') {
        closeUploadFlow();
      }

      const result = await uploadKnowledgeSource(
        knowledgeId,
        createTextSourceFile(values),
      );

      if (result.success && closeTextInputOnSubmit !== 'before') {
        closeUploadFlow();
      }
    },
    [
      closeTextInputOnSubmit,
      closeUploadFlow,
      uploadKnowledgeSource,
      uploadTargetKnowledgeId,
    ],
  );

  return {
    uploadFlowStep,
    uploadTargetKnowledgeId,
    uploadingKnowledgeId,
    textUploadSubmitting:
      uploadFlowStep === 'text' &&
      uploadTargetKnowledgeId !== null &&
      uploadingKnowledgeId === uploadTargetKnowledgeId,
    openUploadFlow,
    closeUploadFlow,
    openTextInput,
    backToSourcePicker,
    handleSelectedFiles,
    handleFileChange,
    submitTextSource,
    uploadKnowledgeSource,
  };
};

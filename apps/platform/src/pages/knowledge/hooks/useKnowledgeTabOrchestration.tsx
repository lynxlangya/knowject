import type {
  KnowledgeDetailResponse,
  KnowledgeDiagnosticsDocumentResponse,
  KnowledgeDiagnosticsResponse,
  KnowledgeDocumentResponse,
} from '@api/knowledge';
import type { TabsProps } from 'antd';
import { useTranslation } from 'react-i18next';
import { KnowledgeDocumentsTab } from '../components/KnowledgeDocumentsTab';
import { KnowledgeOpsTab } from '../components/KnowledgeOpsTab';
import { KnowledgeSearchTab } from '../components/KnowledgeSearchTab';

interface UseKnowledgeTabOrchestrationOptions {
  activeKnowledgeId: string | null;
  activeKnowledge: KnowledgeDetailResponse | null;
  activeDiagnosticsDocumentMap: ReadonlyMap<
    string,
    KnowledgeDiagnosticsDocumentResponse
  >;
  shouldPoll: boolean;
  pollingStopped: boolean;
  uploading: boolean;
  retryingDocumentId: string | null;
  isDocumentBusy: (documentId: string) => boolean;
  onUploadDocument: () => void;
  onRetryDocument: (document: KnowledgeDocumentResponse) => void;
  onDocumentMenuAction: (
    document: KnowledgeDocumentResponse,
    key: string,
  ) => void;
  activeDiagnostics: KnowledgeDiagnosticsResponse | null;
  diagnosticsLoading: boolean;
  diagnosticsError: string | null;
  knowledgeRebuildBlockedReason: string | null;
  rebuildingKnowledgeId: string | null;
  onRebuildKnowledge: () => Promise<void>;
  onReloadDiagnostics: () => void;
}

export const useKnowledgeTabOrchestration = ({
  activeKnowledgeId,
  activeKnowledge,
  activeDiagnosticsDocumentMap,
  shouldPoll,
  pollingStopped,
  uploading,
  retryingDocumentId,
  isDocumentBusy,
  onUploadDocument,
  onRetryDocument,
  onDocumentMenuAction,
  activeDiagnostics,
  diagnosticsLoading,
  diagnosticsError,
  knowledgeRebuildBlockedReason,
  rebuildingKnowledgeId,
  onRebuildKnowledge,
  onReloadDiagnostics,
}: UseKnowledgeTabOrchestrationOptions) => {
  const { t } = useTranslation('pages');
  const tabItems: TabsProps['items'] = activeKnowledge
    ? [
        {
          key: 'documents',
          label: t('knowledge.documents.listTitle'),
          children: (
            <KnowledgeDocumentsTab
              activeKnowledge={activeKnowledge}
              activeDiagnosticsDocumentMap={activeDiagnosticsDocumentMap}
              shouldPoll={shouldPoll}
              pollingStopped={pollingStopped}
              uploading={uploading}
              retryingDocumentId={retryingDocumentId}
              isDocumentBusy={isDocumentBusy}
              onUploadDocument={onUploadDocument}
              onRetryDocument={onRetryDocument}
              onDocumentMenuAction={onDocumentMenuAction}
            />
          ),
        },
        {
          key: 'ops',
          label: t('knowledge.ops.title'),
          children: (
            <KnowledgeOpsTab
              activeKnowledgeId={activeKnowledge.id}
              activeDiagnostics={activeDiagnostics}
              diagnosticsLoading={diagnosticsLoading}
              diagnosticsError={diagnosticsError}
              knowledgeRebuildBlockedReason={knowledgeRebuildBlockedReason}
              rebuildingKnowledgeId={rebuildingKnowledgeId}
              onRebuildKnowledge={onRebuildKnowledge}
              onReloadDiagnostics={onReloadDiagnostics}
            />
          ),
        },
        {
          key: 'search',
          label: t('knowledge.search.action'),
          children: <KnowledgeSearchTab knowledgeId={activeKnowledge.id} />,
        },
      ]
    : [];

  return {
    activeTabResetKey: activeKnowledgeId ?? 'none',
    tabItems,
  };
};

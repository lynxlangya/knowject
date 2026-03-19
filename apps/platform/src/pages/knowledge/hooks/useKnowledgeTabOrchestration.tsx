import type {
  KnowledgeDetailResponse,
  KnowledgeDiagnosticsDocumentResponse,
  KnowledgeDiagnosticsResponse,
  KnowledgeDocumentResponse,
} from '@api/knowledge';
import type { TabsProps } from 'antd';
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
  const tabItems: TabsProps['items'] = activeKnowledge
    ? [
        {
          key: 'documents',
          label: '文档',
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
          label: '运维',
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
          label: '检索',
          children: <KnowledgeSearchTab knowledgeId={activeKnowledge.id} />,
        },
      ]
    : [];

  return {
    activeTabResetKey: activeKnowledgeId ?? 'none',
    tabItems,
  };
};

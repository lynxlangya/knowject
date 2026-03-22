export const projectMessages = {
  nav: {
    aria: 'Project sections',
    overview: {
      label: 'Overview',
      description: 'Project summary and recent updates',
    },
    chat: {
      label: 'Chat',
      description: 'Project discussions and context',
    },
    resources: {
      label: 'Resources',
      description: 'Knowledge, skills, and agents in this project',
    },
    members: {
      label: 'Members',
      description: 'Participants and collaboration status',
    },
  },
  conversation: {
    active: 'Current thread',
    recent: 'Recently active',
    empty: 'No conversations in this project yet',
    renamePlaceholder: 'Enter thread title',
    openOrMenu: 'Left click to open, right click for more actions',
    roleAssistant: 'Assistant',
    roleUser: 'User',
    copyReply: 'Copy reply',
    star: 'Star',
    unstar: 'Remove star',
    retryReply: 'Retry reply',
    retryRequest: 'Retry request',
    editMessage: 'Edit message',
    copyMessage: 'Copy message',
    creatingDraft: 'Generating...',
    menuShare: 'Share',
    menuKnowledge: 'Save as knowledge',
    menuResources: 'Related resources',
    menuRename: 'Rename',
    editSubmit: 'Save and rerun',
    create: 'New conversation',
    title: 'Project chat',
    threadCount: '{{count}} threads',
    recentContext: 'Recent context',
    formalThread: 'Formal project threads',
    reloadConfig: 'Recheck configuration',
    toSettings: 'Go to settings',
    loadFailed: 'Failed to load project chat',
    configUnknown: 'Unable to confirm chat configuration',
    configHelp:
      '{{error}}. If sending fails later, go to Settings to check the configuration.',
    configHelpEmpty:
      '{{error}}. You can still create a thread first. If sending fails, go to Settings to check it.',
    emptyChat: 'No messages in this conversation',
    composerAria: 'Project message input',
    composerPlaceholder: 'Ask a project question',
    stop: 'Stop generating',
    sendAria: 'Send message',
    missingConversation: 'Conversation not found',
    missingConversationDescription:
      'The current chatId does not match any conversation. Re-select one from the left.',
    emptyStateDescription:
      'Choose a thread on the left, or create a new conversation to start sending messages.',
    exportFile: 'project-chat.md',
    exportFallbackTitle: 'Project chat',
    messageEmpty: 'Empty message',
    messageCount: '{{count}} messages',
    selectedCount: '{{count}} selected',
    railTitle: 'Message navigation',
    railBatchTitle: 'Bulk actions',
    railSelectionTitle: 'Batch selection context',
    railSelectionDescription:
      'Select messages below. Export and knowledge-draft actions stay available at the bottom.',
    railBack: 'Back to browse',
    railAll: 'All',
    railStarred: 'Starred',
    railSelect: 'Select',
    railSelectDisabled: 'Unavailable',
    railCollapse: 'Collapse message navigation',
    railExpand: 'Expand message navigation',
    browse: {
      label: 'All messages',
      description:
        'Click an item to jump to the message and star important ones directly.',
      emptyTitle: 'No messages in this conversation yet',
      emptyDescription:
        'Once messages are sent successfully, the index for this conversation will appear here.',
    },
    starred: {
      label: 'Starred messages',
      description:
        'Only keeps starred messages so key points are easy to revisit.',
      emptyTitle: 'No starred messages in this conversation yet',
      emptyDescription:
        'Star important messages first in the all-messages view.',
    },
    selection: {
      label: 'Select messages',
      description:
        'Click items to select or deselect them for Markdown export or knowledge drafting.',
      emptyTitle: 'No selectable messages right now',
      emptyDescription:
        'Pending user and draft assistant messages are excluded from shared selection.',
      footerTitle: 'Bulk actions',
      footerDescription:
        'Selected messages will enter export and knowledge-draft flows in current order.',
      export: 'Export Markdown',
      knowledge: 'Save as knowledge',
    },
    status: {
      streaming: 'Generating',
      reconciling: 'Syncing',
    },
    actions: {
      createFailed: 'Failed to create conversation. Please try again later.',
      renameRequired: 'Enter a conversation title',
      renameSuccess: 'Conversation title updated',
      renameFailed:
        'Failed to update conversation title. Please try again later.',
      keepOne: 'Keep at least one conversation thread',
      deleteTitle: 'Delete current thread',
      deleteContent:
        'Delete "{{title}}"? This action cannot be undone.',
      deleteConfirm: 'Delete',
      cancel: 'Cancel',
      deleteSuccess: '"{{title}}" deleted',
      deleteFailed:
        'Failed to delete conversation. Please try again later.',
      shareSoon: 'Thread sharing will be supported later.',
      knowledgeSoon:
        'Saving the current discussion as a knowledge entry will be supported later.',
      resourcesSoon:
        'Viewing related resources directly from the thread context will be supported later.',
    },
    userActions: {
      missingEdit: 'Target user message not found. Unable to edit.',
      missingRetry: 'Target user message not found. Unable to retry.',
      missingCopy: 'Target user message not found. Unable to copy.',
      copied: 'Message copied',
      copyFailed: 'Failed to copy message. Please try again later.',
      contentRequired: 'Enter message content',
      missingSave: 'Target user message not found. Unable to save.',
    },
    assistantActions: {
      starUnavailable:
        'The conversation is not ready yet. Unable to update message star status.',
      starTargetMissing: 'Target message not found. Unable to update star.',
      starUpdateFailed:
        'Failed to update message star status. Please try again later.',
      copied: 'Reply copied',
      copyFailed: 'Failed to copy reply. Please try again later.',
      missingCopy: 'Target assistant reply not found. Unable to copy.',
      retryUnavailable:
        'The conversation is not ready yet. Unable to retry this reply for now.',
      retryTargetMissing: 'Previous user message for retry was not found.',
      selectPersisted: 'Select at least one persisted message first.',
      knowledgeSaveFailed:
        'Failed to save knowledge draft. Please try again later.',
    },
    turn: {
      selectThread: 'Select or create a conversation thread first',
      messageRequired: 'Enter message content',
      targetMissing:
        'Target user message not found. Unable to continue this action.',
      streamEndedEarly: 'Project conversation stream ended before completion',
      sendFailed: 'Failed to send message. Please try again later.',
    },
  },
  resources: {
    pageTitle: 'Project resources',
    pageSubtitle: 'Knowledge, skills, and agents for this project',
    pageDescription:
      'This page shows the knowledge bases, skills, and agents already enabled for the current project. Knowledge is split into bound global knowledge and project-private knowledge. The former continues through global governance, while the latter can be created and uploaded directly here.',
    addKnowledge: 'Connect knowledge',
    addDefault: 'Add',
    uploadDocument: 'Upload document',
    editKnowledge: 'Edit knowledge base',
    rebuildAll: 'Rebuild all documents',
    deleteKnowledge: 'Delete knowledge base',
    toGlobal: 'Open global governance',
    unbind: 'Remove from project',
    moreActions: 'More actions: {{name}}',
    nextStep: 'The flow for adding {{title}} to this project will be connected here next.',
    alertGlobalKnowledge: 'Failed to load global knowledge metadata',
    alertProjectKnowledge: 'Failed to load project-private knowledge',
    alertSkills: 'Failed to load skill metadata',
    alertAgents: 'Failed to load agent metadata',
    connectGlobalKnowledge: 'Connect global knowledge',
    createProjectKnowledge: 'Create project-private knowledge',
    uploadTarget: 'Ready to upload to {{name}}',
    summary: {
      knowledge: 'Knowledge',
      skills: 'Skills',
      agents: 'Agents',
      layered: 'Resource layers',
      totalValue: '{{count}}',
      countValue: '{{count}} items',
      knowledgeHint:
        '{{global}} bound from global + {{project}} project-private',
      skillsHint: 'Workflow capabilities reusable in this project',
      agentsHint: 'Collaborative agents bound to this project',
      layeredHint: 'Global asset governance, project-side orchestration and consumption',
      layeredValue: '2 layers',
    },
    group: {
      knowledgeTitle: 'Knowledge',
      knowledgeDescription:
        'This project can both bind global knowledge bases and maintain project-private knowledge. Both participate as project collaboration context.',
      skillsTitle: 'Skills',
      skillsDescription:
        'Skills directly available in this project to reuse mature workflows. They still come from global skill assets.',
      agentsTitle: 'Agents',
      agentsDescription:
        'Agents already bound to this project for analysis, review, and execution collaboration. They still come from global agent assets.',
      sourceGlobal: 'Bound global',
      sourceProject: 'Project-private',
      indexIdle: 'Pending index',
      indexPending: 'Queued',
      indexProcessing: 'Processing',
      indexCompleted: 'Completed',
      indexFailed: 'Failed',
      owner: 'Maintainer: {{value}}',
      updatedAt: 'Updated: {{value}}',
      documentCount: 'Documents: {{count}}',
      usageCount: 'Projects using it: {{count}}',
      viewGlobal: 'View global {{title}}',
      sectionCount: '{{label}} · {{count}}',
      empty: 'No {{title}} connected to this project yet',
    },
    item: {
      unknownName: 'Unknown resource ({{id}})',
      unknownDescription:
        'This {{title}} is already bound to the current project, but full metadata is not available locally yet.',
      knowledgeFallbackName: 'Knowledge {{id}}',
      knowledgeFallbackDescription:
        'This knowledge base is already bound to the current project, but full metadata is not available locally yet.',
      notRecorded: 'Not recorded',
      unassigned: 'Unassigned',
      systemBuiltin: 'Built-in',
      importedPublic: 'Imported from public web',
      currentTeam: 'Current team',
    },
    documentActions: {
      retryError:
        'Failed to retry project knowledge document. Please try again later.',
      rebuildSuccess: 'Document rebuild queued',
      rebuildError:
        'Failed to rebuild project knowledge document. Please try again later.',
      rebuildAllSuccess: 'All document rebuild tasks queued',
      rebuildAllError:
        'Failed to rebuild project knowledge base. Please try again later.',
      deleteError:
        'Failed to delete project knowledge document. Please try again later.',
      deleteTitle: 'Delete document',
      deletePendingDescription:
        'This removes the document record and original file. If the background indexing task completes at the same time, the system will keep trying to clean up related vectors.',
      deleteDoneDescription:
        'This removes the document record, original file, and related vector records.',
    },
    access: {
      title: 'Connect knowledge',
      okGlobal: 'Bind to current project',
      cancel: 'Cancel',
      modeLabel: 'Access mode',
      modeDescription:
        'Connect globally governed knowledge bases to this project, or create a project-private knowledge base that belongs only to this project.',
      globalTitle: 'Connect global knowledge',
      globalDescription:
        'Reuse knowledge assets already governed by the team and view document content in this project in read-only mode.',
      globalHelper:
        '{{bound}} already bound, {{available}} more can still be connected',
      projectTitle: 'Create project-private knowledge',
      projectDescription:
        'Capture dedicated context for the current project and go directly into the upload-source flow after creation.',
      projectHelper:
        'Visible only inside this project. Documents can still be edited, uploaded, rebuilt, and deleted.',
      switchCurrent: 'Current selection',
      switchClick: 'Click to switch',
      globalPickerTitle: 'Choose global knowledge to connect',
      globalPickerDescription:
        'Project pages consume these documents in read-only mode. Editing, deletion, and operations still go back to the global knowledge governance page.',
      openGlobal: 'Open global knowledge',
      searchPlaceholder: 'Search global knowledge names or descriptions',
      batchTag: 'Batch bind supported',
      selectedCount: '{{count}} selected this time',
      availableCount: '{{count}} still available to connect',
      loading: 'Loading available global knowledge...',
      empty: 'No additional global knowledge is available to bind right now.',
      emptyFiltered:
        'No matching global knowledge. Try a different keyword.',
      openGlobalPage: 'Open global knowledge page',
      noDescription: 'No description yet',
      selected: 'Selected',
      selectable: 'Available',
      documentCount: 'Documents: {{count}}',
      chunkCount: 'Chunks: {{count}}',
      maintainer: 'Maintainer: {{value}}',
      defaultCreateTitle:
        'Create a private knowledge base for the current project',
      defaultCreateDescription:
        'After creation, the upload-source flow starts immediately. Project-private knowledge is consumed only inside the current project and does not appear in the global knowledge list.',
      formName: 'Knowledge base name',
      formNameRequired: 'Enter a knowledge base name',
      formNamePlaceholder: 'Example: Project execution playbook',
      formDescription: 'Description',
      formDescriptionPlaceholder:
        'Describe the content boundary, maintenance ownership, and usage scenarios of this project-private knowledge.',
      createContinueHint:
        'After creation, the upload-source panel opens directly so you can continue importing documents.',
      footerHint:
        'Global knowledge suits cross-project reuse. Project-private knowledge suits execution playbooks, meeting notes, milestone materials, and context captured for the current project.',
      createSubmitDefault: 'Create and continue upload',
      createEmptySubmit: 'Create empty knowledge base',
    },
    draft: {
      title: 'Generate project knowledge draft',
      close: 'Close',
      submit: 'Save to project knowledge base',
      knowledgeLabel: 'Project-private knowledge base',
      knowledgePlaceholder: 'Select a project-private knowledge base',
      knowledgeRequired: 'Select a project-private knowledge base',
      loading: 'Loading project-private knowledge bases...',
      loadFailed: 'Failed to load project-private knowledge bases',
      empty:
        'This project has no project-private knowledge base yet. Create an empty one first.',
      create: 'Create project-private knowledge base',
      documentTitle: 'Document title',
      documentTitlePlaceholder: 'Title used when uploading the Markdown document',
      markdownLabel: 'Markdown content',
      markdownPlaceholder:
        'The Markdown content to be uploaded will be saved here.',
      saved: 'Project knowledge draft saved to the selected private knowledge base',
      createSuccess: 'Project-private knowledge base created',
      createFailed:
        'Failed to create project knowledge base. Please try again later.',
      saveFailed:
        'Failed to save knowledge draft. Please try again later.',
    },
    metadata: {
      title: 'Edit project knowledge base',
      description:
        'Update the name and description of the current project-private knowledge base without affecting global knowledge assets.',
      name: 'Knowledge base name',
      nameRequired: 'Enter a knowledge base name',
      namePlaceholder: 'Example: Project execution playbook',
      descriptionLabel: 'Description',
      descriptionPlaceholder:
        'Describe the content boundary, maintenance ownership, and usage scenarios of this project-private knowledge.',
    },
    detail: {
      refresh: 'Refresh',
      openGlobal: 'Open global governance',
      unbind: 'Remove from project',
      upload: 'Upload document',
      edit: 'Edit knowledge base',
      rebuild: 'Rebuild all documents',
      delete: 'Delete knowledge base',
      previewSoon: '"{{name}}" preview will be available soon',
      downloadSoon: '"{{name}}" download will be available soon',
      documentActions: 'Document actions: {{name}}',
      uploadAt: 'Uploaded at {{value}}',
      latestIndex: 'Latest index {{value}}',
      failed: 'Processing failed',
      missingStorage: 'Original file missing',
      staleProcessing: 'Processing stuck',
      tooltipFormat: 'Format: {{value}}',
      tooltipUploadAt: 'Uploaded at: {{value}}',
      tooltipLatestIndex: 'Latest index: {{value}}',
      tooltipChunkCount: 'Chunk count: {{value}}',
      diagnosticsTitle: 'Document diagnostics',
      diagnosticsRefresh: 'Refresh diagnostics',
      diagnosticsEmpty: 'No document diagnostics available right now.',
      diagnosticsMissingStorage: 'Original file missing',
      diagnosticsStale: 'Processing stuck',
      diagnosticsLatestIndex: 'Latest index:',
      diagnosticsUpdatedAt: 'Updated at: {{value}}',
      documentsTab: 'Documents',
      opsTab: 'Operations',
      searchTab: 'Search',
      empty: 'Select a knowledge base to view details.',
      noOps: 'No operational info is available right now.',
      abnormalDocs: 'Abnormal documents',
      abnormalDocsHint: 'Failed / original file missing / processing stuck',
      collectionAbnormal: 'Collection status abnormal',
      indexerDegraded: 'Indexer returned degraded information',
    },
    upload: {
      progress: 'Uploading project documents {{current}}/{{total}}',
      successAll:
        '{{count}} file(s) uploaded. They are now entering the project indexing queue.',
      successPartial:
        '{{success}}/{{total}} file(s) uploaded. They are now entering the project indexing queue.',
      successSingle:
        'Document uploaded. It is now entering the project indexing queue.',
      failed:
        'Failed to upload project knowledge document. Please try again later.',
    },
  },
};

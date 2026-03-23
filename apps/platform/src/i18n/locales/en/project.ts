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
  layout: {
    missingRouteTitle: 'Missing project route',
    missingRouteDescription:
      'No projectId was detected. Return to home and choose a project again.',
    backHome: 'Back to home',
    loadFailedTitle: 'Failed to load project list',
    missingProjectTitle: 'Project not found or already deleted',
    loadFailedDescription:
      'The latest project list could not be synced from the backend. Please try again later.',
    missingProjectDescription:
      'Re-select a project from My Projects in the left sidebar.',
    reload: 'Reload',
  },
  overview: {
    partialLoad: 'Some project context failed to load',
    conversationsEyebrow: 'Project chat',
    recentCount: 'Recent {{count}}',
    recentTitle: 'Recent conversations',
    recentDescription: 'Jump back into the latest discussions quickly.',
    viewAll: 'View all',
    recentActive: 'Recently active',
    emptyConversations: 'No conversations yet',
    resourcesTitle: 'Recently connected resources',
    resourcesDescription:
      'Shows both globally bound assets and project-private knowledge so you can jump back into the current context quickly.',
    openResources: 'Open resources',
    emptyResources: 'No connected resources yet',
    quickActionsEyebrow: 'Quick actions',
    quickActionsTitle: 'Choose the next step from project overview',
    quickActionsDescription:
      'Review project status first, then jump to chat, resources, or members to reduce context switching.',
    continueChat: 'Continue chat',
    addResources: 'Add resources',
    viewMembers: 'View members',
  },
  header: {
    activeMembers: 'Active members',
    knowledge: 'Knowledge',
    skills: 'Skills',
    agents: 'Agents',
    conversations: 'Conversations',
  },
  members: {
    roleAdmin: 'Admin',
    roleMember: 'Member',
    pageEyebrow: 'Member management',
    pageTitle: 'Formal member roster for this project',
    pageDescription:
      'This page shows the formal backend project membership and supports the current minimum loop: search existing users by username or name, add them in batches, update `admin / member` roles, and remove members.',
    summaryProjectMembersLabel: 'Project members',
    summaryProjectMembersHint:
      'Members that have already joined the formal backend project.',
    summaryAdminsLabel: 'Admins',
    summaryAdminsHint:
      'Members with project-level update and member-management permissions.',
    summaryRegularMembersLabel: 'Regular members',
    summaryRegularMembersHint:
      'Members with project access but without management permissions.',
    summaryMyRoleLabel: 'My role',
    summaryMyRoleHint:
      'Based on the formal role of the current signed-in account in this project.',
    countValue: '{{count}}',
    formTitle: 'Add existing users',
    formDescription:
      'Only already-registered users can be added to the current project. Invitation tokens, email, and external notification flows are intentionally out of scope.',
    usersLabel: 'Users',
    usersRequired: 'Select at least one user to add',
    usersPlaceholder: 'Search by username or name, for example: langya / 琅邪',
    usersLoading: 'Searching...',
    usersEmpty: 'No addable users found',
    usersIdle: 'Enter a username or name to start searching',
    roleLabel: 'Project role',
    roleRequired: 'Select a project role',
    addSubmit: 'Add members',
    noManageTitle: 'Current account is not a project admin',
    noManageDescription:
      'You can view the formal member roster, but cannot add members, change roles, or remove members.',
    listEyebrow: 'Formal member list',
    listTitle: 'Members already joined to this project',
    listProjectLabel: 'Project: {{name}}',
    empty: 'This project has no formal members yet',
    currentAccount: 'Current account',
    joinedAt: 'Joined: {{value}}',
    removeTitle: 'Remove member',
    removeDescription:
      'Remove {{name}} from the current project?',
    removeConfirm: 'Remove',
    cancel: 'Cancel',
    feedback: {
      loadCandidatesFailed:
        'Failed to load addable members. Please try again later.',
      selectAtLeastOne: 'Select at least one user who can join this project',
      addFailureItem: '{{username}}: {{message}}',
      addFailureFallback: 'Failed to add member',
      addSuccessSingle: 'Member added to project',
      addSuccessMultiple: '{{count}} members added',
      addPartial:
        '{{success}} members added and {{failed}} failed: {{message}}',
      addFailed: 'Failed to add members. Please try again later.',
      updateRoleSuccess: 'Member role updated',
      updateRoleFailed:
        'Failed to update member role. Please try again later.',
      selfRemoved: 'You have left the current project',
      removeSuccess: 'Member removed from project',
      removeFailed:
        'Failed to remove member. Please try again later.',
    },
  },
  snapshot: {
    defaultSummary:
      'Focus on knowledge capture, collaboration progress, and AI capability access for the current project.',
  },
  chatSettings: {
    unavailableTitle: 'No available chat model is configured',
    unavailableDescription:
      'Save and test an LLM API key from Settings first so project chat can generate assistant replies.',
    providerUnsupportedTitle:
      'The current LLM provider does not support project chat',
    streamUnsupportedTitle:
      'The current LLM provider does not support streaming project chat',
    upstreamErrorTitle: 'Project chat model request failed',
    loadFailed: 'Failed to read chat configuration. Please try again later.',
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
    refreshFailed: 'Failed to refresh project chat. Please try again later.',
    sourceDistance: 'distance {{value}}',
    sources: 'Sources',
    references: 'References',
    evidence: 'Evidence',
    evidenceSource: 'Source {{index}}',
    viewSources: 'View sources',
    collapseSources: 'Collapse',
    externalImageLabel: 'External image',
    externalImageBlocked: 'External image loading blocked',
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
      defaultDocumentTitle: 'Project chat knowledge draft',
      defaultKnowledgeDescription:
        'Project chat knowledge draft organized from "{{title}}"',
      missingKnowledge: 'Select a project-private knowledge base first',
      invalidDocument: 'Complete the document title and Markdown content first',
      saved: 'Project knowledge draft saved to the selected private knowledge base',
      createSuccess: 'Project-private knowledge base created',
      createFailed:
        'Failed to create project knowledge base. Please try again later.',
      saveFailed:
        'Failed to save knowledge draft. Please try again later.',
    },
    mutations: {
      projectMissing: 'Project not found or already deleted',
      bindingUpdateFailed:
        'Unable to update project resource bindings right now. Please try again later.',
      bindGlobalSuccess: '{{count}} global knowledge base(s) connected to the project',
      bindGlobalFailed:
        'Failed to connect global knowledge. Please try again later.',
      updateSuccess: 'Project knowledge base updated',
      updateFailed:
        'Failed to update project knowledge base. Please try again later.',
      unbindTitle: 'Remove global knowledge binding',
      unbindDescription:
        'After removal, "{{name}}" will no longer participate in this project context, but its original global content will remain unchanged.',
      unbindConfirm: 'Remove binding',
      unbindSuccess: '"{{name}}" removed from the project',
      unbindFailed:
        'Failed to remove global knowledge binding. Please try again later.',
      deleteTitle: 'Delete project knowledge base',
      deleteDescription:
        'Deleting "{{name}}" removes knowledge metadata, original files, and related vectors. This cannot be undone.',
      deleteConfirm: 'Delete',
      deleteSuccess: 'Project knowledge base deleted',
      deleteFailed:
        'Failed to delete project knowledge base. Please try again later.',
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

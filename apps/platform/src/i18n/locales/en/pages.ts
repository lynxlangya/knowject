export const pagesMessages = {
  home: {
    title: 'Home',
    subtitle:
      'Choose a project from My Projects on the left to enter overview, chat, resources, and members.',
    empty: 'No project is open yet. Enter one from the project list on the left.',
  },
  notFound: {
    subtitle: 'The page does not exist or has moved.',
    backHome: 'Back to home',
  },
  analytics: {
    title: 'Analytics',
    description:
      'The analytics module is under construction. This route is currently a placeholder and will later connect project health and collaboration metrics.',
  },
  members: {
    title: 'Members',
    subtitle:
      'This view aggregates basic member info, participating projects, collaboration snapshots, and permission summaries from the projects visible to your current account.',
    empty: 'There are no visible collaborators yet.',
    reload: 'Reload',
    invite: 'Invite members',
    inviteHint:
      'For now, ask members to complete sign-up first, then add existing users from the project members page.',
    rolesAndPermissions: 'Roles and permissions',
    rolesAndPermissionsHint:
      'Organization-level roles and permission matrices will be added in a later phase.',
    visibleMembers: 'Visible members',
    summary: {
      collaborators: 'Collaborators',
      crossProject: 'Cross-project collaborators',
      projectAdmins: 'Project admins',
      blocked: 'Blocked members',
      collaboratorsHint:
        'Collaborators aggregated from projects visible to the current account.',
      crossProjectHint:
        'Members participating in two or more visible projects.',
      projectAdminsHint:
        'Members with admin permission in at least one visible project.',
      blockedHint:
        'Members whose current collaboration snapshot contains blocked status.',
    },
    filters: {
      title: 'Member filters',
      summary: '{{total}} members in total, {{filteredTotal}} after filters.',
      queryPlaceholder: 'Search by name, username, or project',
      allStatus: 'All statuses',
      allPermissions: 'All permissions',
      adminOnly: 'Has admin permissions',
      memberOnly: 'Collaborator only',
      allProjects: 'All projects',
      sortByActivity: 'Most recently active',
      sortByProjects: 'Most projects first',
      sortByJoined: 'Most recently joined',
    },
    directory: {
      empty: 'No members match the current filters',
      me: 'Me',
      projectsCount: '{{count}} projects',
    },
    status: {
      active: 'Active',
      syncing: 'Syncing',
      blocked: 'Blocked',
      idle: 'Idle',
    },
    accessRole: {
      admin: 'Project admin',
      member: 'Project member',
    },
    collaborationRole: {
      owner: 'Owner',
      product: 'Product',
      design: 'Design',
      frontend: 'Frontend',
      backend: 'Backend',
      marketing: 'Marketing',
    },
    focus: {
      noVisibleProject:
        'This account has not joined any visible projects yet. Add members from the project members page first.',
      adminProjects:
        'Currently participating in {{visibleProjectCount}} visible projects, with admin permission in {{adminProjectCount}} of them.',
      memberProjects:
        'Currently participating in {{visibleProjectCount}} visible projects, mostly as a collaborator.',
      projectFallback:
        'Currently joined {{projectName}}. Detailed collaboration snapshots for this project will be added later.',
    },
    assets: {
      unknownName: 'Unknown asset ({{id}})',
      unknownDescription:
        'This {{typeLabel}} is bound to a project visible to the current member, but complete metadata has not been loaded locally yet.',
      notRecorded: 'Not recorded',
      unspecifiedOwner: 'Unspecified',
      system: 'Built-in',
      imported: 'Imported',
      team: 'Current team',
      knowledge: 'Knowledge',
      skills: 'Skills',
      agents: 'Agents',
      count: '{{count}} item',
      count_other: '{{count}} items',
      emptyGroup: 'No assets of this type are linked to the currently visible projects.',
    },
    detail: {
      selectPrompt: 'Select a member to view details',
      currentAccount: 'Current account',
      primaryRole: 'Primary collaboration role: {{role}}',
      visibleProjects: 'Visible projects: {{count}}',
      adminProjects: 'Admin projects: {{count}}',
      firstCollaboration: 'First collaboration',
      latestCollaboration: 'Latest collaboration',
      assetsSummary: 'Knowledge / Skills / Agents',
      projectStatusBreakdown: 'Project status breakdown',
      overview: 'Overview',
      currentFocus: 'Current focus',
      noResponsibilityTags: 'No responsibility tags yet.',
      recentActivity: 'Recent activity',
      activityType: 'Type: {{type}} · {{time}}',
      noRecentActivity:
        'Detailed collaboration activity is not available yet. Use the latest project update time as the current signal.',
      projectsTab: 'Projects',
      projectDescriptionFallback: 'This project does not have an additional description yet.',
      knowledgeCount: 'Knowledge',
      skillCount: 'Skills',
      agentCount: 'Agents',
      itemCount: '{{count}} item',
      itemCount_other: '{{count}} items',
      joinedAt: 'Joined: {{time}}',
      updatedAt: 'Updated: {{time}}',
      latestAction: 'Latest action: {{summary}}',
      latestActionFallback: 'Collaboration activity pending',
      assetsTab: 'Assets',
      permissionsTab: 'Permissions',
      permissionSummary: 'Permission summary',
      manageableProjects: 'Manageable projects',
      collaboratorProjects: 'Collaborator projects',
      permissionSummaryHint:
        'Only permissions within projects visible to you are shown for now. Organization-wide roles and permission matrices will be added later.',
      accessScope: 'Project access scope',
      noVisiblePermissions: 'No visible project permissions right now',
      joinedIn: 'Joined on {{time}}',
      adminImpact:
        'This member currently has admin permission in {{count}} visible projects. Pay extra attention to member configuration and permission changes.',
    },
    date: {
      empty: '—',
    },
  },
  settings: {
    unavailable: 'Settings data is temporarily unavailable',
    reload: 'Reload',
    title: 'Settings center',
    subtitle:
      'Manage embedding models, chat models, indexing parameters, and workspace profile in one place. For this phase the settings APIs are open to all signed-in users; access can be tightened when workspace admin roles are introduced.',
    openKnowledge: 'Open knowledge management',
    refresh: 'Refresh config',
    tabs: {
      ai: 'AI models',
      indexing: 'Indexing',
      workspace: 'Workspace',
      permissions: 'Members and permissions',
      soon: 'Coming soon',
    },
    permissions: {
      title: 'Member permissions are coming soon',
      description:
        'For now, manage members from the members page. In this phase the settings APIs still behave as “signed-in users can access”; permission controls will be tightened when workspace admin roles are introduced.',
      openMembers: 'Open members page',
    },
    sources: {
      database: 'Database config',
      environment: 'Environment fallback',
    },
    providers: {
      aliyun: 'Alibaba Bailian',
      zhipu: 'Zhipu',
      zhipuGlm: 'Zhipu GLM',
      custom: 'Custom',
    },
    fields: {
      provider: 'Provider',
      baseUrl: 'Base URL',
      model: 'Model name',
      apiKey: 'API key',
      chunkSize: 'Chunk size',
      chunkOverlap: 'Chunk overlap',
      indexerTimeout: 'Indexer timeout (ms)',
      supportedTypes: 'Supported file types',
      workspaceName: 'Workspace name',
      workspaceDescription: 'Workspace description',
      logoUpload: 'Logo upload',
    },
    actions: {
      testConnection: 'Test connection',
      saveEmbedding: 'Save embedding model',
      saveLlm: 'Save chat model',
      testIndexing: 'Test indexing path',
      saveIndexing: 'Save indexing params',
      saveWorkspace: 'Save workspace info',
      openKnowledge: 'Open knowledge management',
      openMembers: 'Open members page',
      comingSoon: 'Coming soon',
    },
    alerts: {
      envConfig: 'Currently using environment variable config',
      envEmbeddingDescription:
        'If you want to persist the embedding model as workspace config, enter a new API key. Keys from environment variables are not migrated automatically.',
      envLlmDescription:
        'If you want to persist the LLM config as workspace config, enter a new API key. Keys from environment variables are not migrated automatically.',
      embeddingRebuild:
        'The embedding model has changed. Existing knowledge bases need a full rebuild.',
      embeddingRebuildDraft:
        'The new provider/model only affects later indexing jobs.',
      embeddingServicePending: 'The new model service is waiting for validation',
      embeddingServiceKeyRequired:
        'Switched to a new model service. Enter the API key again.',
      embeddingServicePendingDescription:
        'Test the connection first to confirm the new config works before saving.',
      embeddingServiceKeyRequiredDescription:
        'After switching provider or base URL, the previously saved key is not reused.',
      embeddingPreSaveRebuild:
        'The new config passed testing. Existing knowledge bases will need a rebuild after saving.',
      embeddingPreSaveRebuildDescription:
        'The new provider/model only becomes effective after you save.',
      llmRuntimeTitle:
        'Current LLM settings directly affect project chat.',
      llmRuntimeDescription:
        'After saving and passing testing, project pages will use the current config directly to generate assistant replies. This phase does not add another chat runtime.',
      llmServicePending: 'The new model service is waiting for validation',
      llmServiceKeyRequired:
        'Switched to a new model service. Enter the API key again.',
      llmServicePendingDescription:
        'Test the connection first to confirm the new config works before saving.',
      llmServiceKeyRequiredDescription:
        'After switching provider or base URL, the previously saved key is not reused.',
      indexingEnvDescription:
        'Until indexing parameters are saved from the settings page, the knowledge path keeps using environment variables as defaults.',
      indexingRebuildTitle:
        'Chunk strategy changed. Existing knowledge bases need reindexing.',
      indexingRebuildDescription:
        'The new chunk parameters only affect later indexing jobs.',
      workspaceDescription:
        'Workspace copy directly affects branding and future settings explanations. Logo upload is still a placeholder in this phase.',
      workspaceLogoDescription:
        'This phase only keeps a placeholder. Real file storage and cropping will be connected later.',
      permissionsDescription:
        'For now, manage members from the members page. In this phase the settings APIs still behave as “signed-in users can access”; permission controls will be tightened later.',
      indexingTestHint:
        'The test validates Node-to-Python-indexer and Chroma connectivity, but does not prove that unsaved chunk drafts have been picked up by the running Python service.',
      llmProtocolHint:
        'Online testing and project chat currently both use the compatible `/chat/completions` protocol. If a provider offers multiple endpoints, use the compatible base URL.',
      saveKeyHint:
        'Saving only writes to the database and never writes back the plain-text key.',
      markdownAlias:
        '`.markdown` remains a parsing alias for Markdown and is not exposed as a separate setting.',
      chunkOverlapHint:
        'Higher overlap improves semantic continuity across chunks, but also increases index size.',
      indexerTimeoutHint:
        'This only affects how long Node waits for the Python indexer request. It is not the global timeout for the whole vector path.',
    },
    feedback: {
      success: 'Connection test passed',
      successWithLatency:
        'The service responded normally, with round-trip latency around {{latencyMs}}ms.',
      successNoLatency: 'The service responded normally.',
      failed: 'Connection test failed',
      remoteFailed: 'The remote service returned a failed result.',
      indexingSuccess: 'Indexing path test passed',
      indexingFailed: 'Indexing path test failed',
      indexingLatency:
        'Round-trip between Node and the indexer is about {{latencyMs}}ms',
      indexerDegraded:
        'The Python indexer is reachable, but the path is degraded.',
      indexerUnavailable:
        'The Python indexer diagnostics cannot be completed right now.',
      indexingRemoteFailed: 'The indexing path returned a failed result.',
      serviceLabel: 'Service {{service}}',
      chromaReachable: 'Chroma reachable',
      chromaUnreachable: 'Chroma unreachable',
      supportsFormats: 'Supports {{formats}}',
      runtimeChunk: 'Runtime chunk {{chunkSize}} / {{chunkOverlap}}',
      embeddingProvider: 'Embedding {{provider}}',
    },
    keyStatus: {
      newKeyRequired: 'Re-enter key required',
      newKeyTested: 'New key tested',
      newKeyPending: 'New key pending test',
      configuredKey: 'Configured key {{hint}}',
      unsavedKey: 'No saved key',
      currentDraftPassed: 'The current draft passed testing',
      currentDraftFailed:
        'The current draft failed testing. Check the key, base URL, and model name.',
      currentDraftPending: 'The current draft has not been tested yet.',
      lastTested:
        'Last tested: {{time}}, status {{status}}',
      statusOk: 'passed',
      statusFailed: 'failed',
      statusUnknown: 'not recorded',
      enterNewApiKey: 'Enter a new API key',
      configuredMask: 'Configured ({{hint}})',
    },
    summary: {
      embeddingModel: 'Embedding model',
      embeddingManaged: 'Managed by workspace settings',
      embeddingEnvironment: 'Still using environment fallback',
      chatModel: 'Chat model',
      chatManaged: 'Saved in database',
      chatEnvironment: 'Still using environment fallback',
      chunkStrategy: 'Chunk strategy',
      accessStage: 'Access stage',
      signedInAccess: 'Signed-in users can access',
      accessHint: 'Workspace permission model will be added later',
      chunkHint: 'Chunk Size / Chunk Overlap',
    },
    validation: {
      completeEmbedding: 'Complete the embedding Base URL and model name first.',
      newServiceApiKey:
        'You switched to a new model service. Enter a new API key again.',
      envApiKey:
        'The current config still uses an environment variable key. Enter a new API key if you want to save it as workspace config.',
      embeddingSavedRebuild:
        'Embedding model config saved. Existing knowledge bases need a rebuild.',
      embeddingSaved: 'Embedding model config saved.',
      embeddingSaveFailed:
        'Failed to save embedding model config. Try again later.',
      completeLlm: 'Complete the chat model Base URL and model name first.',
      llmSaved: 'Chat model config saved.',
      llmSaveFailed:
        'Failed to save chat model config. Try again later.',
      chunkOverlap: 'Chunk overlap must be smaller than chunk size.',
      supportedTypes: 'Keep at least one indexable file type.',
      indexingSaved: 'Indexing params saved.',
      indexingSaveFailed: 'Failed to save indexing params. Try again later.',
      workspaceName: 'Enter the workspace name.',
      workspaceDescription:
        'Workspace description must not exceed 200 characters.',
      workspaceSaved: 'Workspace info saved.',
      workspaceSaveFailed:
        'Failed to save workspace info. Try again later.',
      testApiKeyNewService:
        'You switched to a new model service. Enter a new API key before testing.',
      testApiKey:
        'Enter a new API key before testing.',
      embeddingTestFailed: 'Embedding model connection test failed',
      llmTestFailed: 'Chat model connection test failed',
      indexingTestFailed: 'Indexing path test failed',
    },
    workspace: {
      placeholderName: '知项 · Knowject',
      placeholderDescription: 'Let project knowledge truly work for the team.',
    },
  },
  assets: {
    eyebrow: 'Global asset control center',
    globalTag: 'Global asset',
    create: 'Create asset',
    importToProject: 'Add to project',
    createPending: 'Global asset creation will be connected here in a later phase.',
    importPending:
      'Project selection and resource import will be connected here in a later phase.',
    owner: 'Owner: {{value}}',
    updatedAt: 'Updated: {{value}}',
    usageCount: 'Projects using this: {{count}}',
  },
  knowledge: {
    subtitle:
      'Index global documents in one place so skills and agents can reuse them.',
    sourceType: {
      global_docs: 'global_docs · Global documents',
      global_code: 'global_code · Global code (reserved)',
    },
    sourceMeta: {
      global_docs: 'Global documents',
      global_code: 'Global code',
    },
    indexStatus: {
      idle: 'Pending indexing',
      pending: 'Queued',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
    },
    documentStatus: {
      pending: 'Queued',
      processing: 'Processing',
      completed: 'Completed',
      failed: 'Failed',
    },
    rebuildTooltip:
      'Clean and rebuild all document vectors under the current knowledge base.',
    notRecorded: 'Not recorded',
    initialsFallback: 'KN',
    rebuildBlocked: {
      noSelection: 'Select a knowledge base first',
      noDocuments: 'The current knowledge base has no documents to rebuild',
      processing:
        'Some documents are still queued or processing, so full rebuild is unavailable',
    },
    stats: {
      documentCount: 'Documents',
      chunkCount: 'Chunks',
      updatedAt: 'Updated',
      knowledgeCount: 'Knowledge bases',
      knowledgeCountValue: '{{count}}',
      knowledgeCountHint:
        'Global knowledge collections currently under governance.',
      totalDocuments: 'Documents total',
      totalDocumentsValue: '{{count}}',
      totalDocumentsHint:
        'Original document volume already uploaded into knowledge bases.',
      totalChunks: 'Chunks total',
      totalChunksValue: '{{count}}',
      totalChunksHint:
        'Directly reflects the current retrieval and vector index volume.',
      attention: 'Indexes needing attention',
      attentionValue: '{{count}}',
      attentionHintNone:
        'There are no queued, processing, or failed knowledge bases right now.',
      attentionHintProcessing:
        '{{processingCount}} knowledge bases are still queued or processing.',
      attentionHintMixed:
        '{{failedCount}} failed, {{processingCount}} queued or processing.',
    },
    documentActions: {
      preview: 'Preview',
      download: 'Download',
      refresh: 'Refresh status',
      delete: 'Delete document',
      retry: 'Retry indexing',
      rebuild: 'Rebuild index',
    },
    batch: {
      progress: 'Uploading documents {{current}}/{{total}}',
      successAll: '{{count}} files uploaded and queued for indexing',
      successPartial:
        '{{successCount}}/{{totalCount}} files uploaded and queued for indexing',
      previewPending: '"{{fileName}}" preview will be available later',
      downloadPending: '"{{fileName}}" download will be available later',
    },
    upload: {
      tooltip:
        'Supports .md /.markdown /.txt /.pdf /.docx /.xlsx uploads (not .doc /.xls). PDF currently supports digital-text PDFs only, not OCR or scans. Single file limit 50 MB, up to 10 files per batch; files above 20 MB are better uploaded in smaller themed groups.',
      invalidType:
        'Only md, markdown, txt, pdf, docx, and xlsx files are supported (doc and xls are not supported)',
      maxSize: 'File size must not exceed 50 MB',
      overflow:
        'A single batch supports up to {{max}} files. Ignored {{overflowCount}} extra files',
      largeFileOne:
        '1 file is larger than 20 MB. Split by topic for faster and more stable indexing',
      largeFileMany:
        '{{largeFileCount}} files are larger than 20 MB. Split by topic for faster and more stable indexing',
      issueOverflow:
        '{{preview}}; additionally, check {{count}} more files one by one',
      textFileNamePrefix: 'text-source',
      emptyTarget: 'Select a knowledge base first',
      largeFileWarning:
        'The file is larger than 20 MB. Split by topic for faster and more stable indexing',
      skippedFiles:
        'Skipped {{count}} files: {{details}}',
      uploadFailed: 'The selected files failed to upload. Please try again later',
      failedFiles: 'Files that failed to upload: {{details}}',
      success: 'The document was uploaded and queued for indexing',
      error: 'Uploading the document failed. Please try again later',
      sourceUnavailable:
        'global_code currently keeps only a reserved namespace and does not support real imports yet',
      sourcePickerTitle: 'Add source',
      sourcePickerDropTitle: 'Drop documents here',
      sourcePickerDropDescription:
        'Supports .md, .markdown, .txt, .pdf, .docx, and .xlsx (not .doc or .xls). PDF currently supports digital-text PDFs only; OCR or scanned files are not supported. Single file limit 50 MB, up to {{max}} files per batch; files above 20 MB are better split before upload.',
      uploadFilesLabel: 'Upload files',
      uploadFilesDescription:
        'Choose documents from local files. Up to {{max}} files per batch, uploaded one by one through the queue.',
      textInputLabel: 'Paste text',
      textInputDescription:
        'Paste or type text directly and save it as a text file automatically.',
      textModalTitle: 'Add text source',
      textModalDescription:
        'Paste or type text here, and it will be saved into the current knowledge base as a file.',
      textTitleLabel: 'Title (optional)',
      textTitlePlaceholder: 'For example: Team onboarding guide',
      textContentLabel: 'Text content',
      textContentRequired: 'Enter text content',
      textContentPlaceholder:
        'Paste or type the content to write into the knowledge base here',
      back: 'Back',
      save: 'Save',
    },
    list: {
      title: 'Knowledge bases',
      count: '{{count}} total',
      empty: 'No formal knowledge base yet. Create one first and then upload documents.',
      createFirst: 'Create the first knowledge base',
      compactMeta: '{{count}} docs · updated {{updatedAt}}',
    },
    detailHeader: {
      descriptionFallback: 'No description yet.',
      uploadDisabled: 'global_code does not support document upload yet.',
      upload: 'Upload document',
      edit: 'Edit',
      deleteTitle: 'Delete knowledge base',
      deleteDescription:
        'This deletes Mongo metadata, source files, and the related Chroma vector records.',
      delete: 'Delete',
      cancel: 'Cancel',
    },
    documents: {
      tooltipFormat: 'Format: {{value}}',
      tooltipIndexedAt: 'Indexed: {{value}}',
      tooltipChunkCount: 'Chunks: {{count}}',
      missingStorage: 'Source file missing',
      staleProcessing: 'Processing stalled',
      moreActions: 'More actions: {{fileName}}',
      uploadedAt: 'Uploaded {{uploadedAt}} · indexed {{indexedAt}}',
      failedTitle: 'Processing failed',
      retry: 'Retry',
      pollingStopped:
        'Auto refresh reached the limit for this round. Refresh manually to continue monitoring.',
      pollingActive:
        'Pending documents detected. The page will use minimal polling to update index status.',
      listTitle: 'Documents',
      listCount: '{{count}} total',
      emptyDocs:
        'This knowledge base has no documents yet. Upload a .md or .txt file to start indexing.',
      emptyCode: 'global_code does not have a real code import entry yet.',
      uploadFirst: 'Upload the first document',
    },
    search: {
      placeholder:
        'Enter a description to verify whether this knowledge base can find related content',
      action: 'Search',
      hint:
        'After entering a query, the 5 most relevant knowledge chunks and their relevance scores will be returned',
      failed: 'Search failed. Please try again later',
      empty:
        'No related content found. Check whether the documents have finished indexing',
      unnamedSource: 'Untitled document',
      similarity: 'Relevance {{score}}',
    },
    ops: {
      title: 'Index operations',
      description:
        'Inspect the current collection, indexer, and document health snapshot, and trigger the smallest rebuild from here.',
      rebuildAll: 'Rebuild all documents',
      reloadDiagnostics: 'Refresh diagnostics',
      unavailable: 'Diagnostics are temporarily unavailable',
      diagnosticsLoadFailed:
        'Loading knowledge base diagnostics failed. Please try again later',
      pendingDocuments: 'Pending documents',
      failedDocuments: 'Failed documents',
      missingStorage: 'Missing source files',
      staleProcessing: 'Stalled processing',
      indexerOk: 'Healthy',
      indexerDegraded: 'Degraded',
      collectionDegraded: 'Collection check is degraded',
      indexerDegradedTitle: 'Indexer runtime is degraded',
      manualAttention: 'Manual intervention is needed for some documents',
      manualAttentionDescription:
        '{{failed}} failed, {{missingStorage}} missing source files, {{staleProcessing}} stalled.',
      healthyTitle: 'No blocking risks detected',
      healthyDescription:
        'Indexer {{service}} returned the latest diagnostics. The current target collection is {{collection}}.',
    },
    management: {
      title: 'Knowledge',
      reload: 'Reload',
      headerTitle: 'Global knowledge bases',
      create: 'Create knowledge base',
      refreshAria: 'Refresh status',
      listLoadFailed:
        'Loading the knowledge base list failed. Please try again later',
      emptyDetail: 'Select a knowledge base from the left to inspect documents and status.',
      retryDetail: 'Retry loading details',
      detailLoadFailed:
        'Loading the knowledge base details failed. Please try again later',
      detailUnavailable:
        'Details for "{{name}}" are temporarily unavailable. Please try again later.',
      detailPrompt: 'Select a knowledge base from the left to inspect details.',
      form: {
        name: 'Knowledge base name',
        nameRequired: 'Enter a knowledge base name',
        namePlaceholder: 'For example: Product spec library',
        sourceType: 'Source type',
        description: 'Description',
        descriptionPlaceholder:
          'Describe the responsibility, content scope, and maintenance boundary of this knowledge base.',
        createTitle: 'Create knowledge base',
        editTitle: 'Edit knowledge base',
      },
    },
    crud: {
      created: 'Knowledge base created',
      noEditable: 'There is no editable knowledge base right now',
      updated: 'Knowledge base updated',
      createFailed: 'Creating the knowledge base failed. Please try again later',
      updateFailed: 'Updating the knowledge base failed. Please try again later',
      noDeletable: 'There is no deletable knowledge base right now',
      deleted: 'Knowledge base deleted',
      deleteFailed: 'Deleting the knowledge base failed. Please try again later',
    },
    modal: {
      deleteDocumentTitle: 'Delete document',
      deleteDocumentDescriptionDone:
        'This deletes the document record and source file. If the background indexing task finishes at the same time, the system will still try to clean up the related vectors.',
      deleteDocumentDescriptionDefault:
        'This deletes the document record, source file, and related vector records.',
      delete: 'Delete',
      cancel: 'Cancel',
    },
    actionFeedback: {
      retryQueued: 'The document has been queued for re-indexing',
      retryRequeued: 'The document has re-entered the indexing queue',
      retryFailed: 'Re-indexing failed. Please try again later',
      retryQueueFailed: 'Retrying indexing failed. Please try again later',
      rebuildDocumentQueued: 'The document has been queued for rebuild',
      rebuildDocumentFailed:
        'Rebuilding the document index failed. Please try again later',
      rebuildKnowledgeQueued: 'The knowledge base has been queued for rebuild',
      rebuildKnowledgeFailed:
        'Rebuilding the knowledge base failed. Please try again later',
      deleteDocumentSuccess: 'The document has been deleted',
      deleteDocumentFailed:
        'Deleting the document failed. Please try again later',
    },
  },
  skills: {
    title: 'Skills',
    subtitle:
      'Govern reusable team method assets, bind them into projects, and reuse them in conversations.',
    create: 'Create skill',
    reload: 'Refresh catalog',
    retry: 'Retry',
    emptyAll: 'There are no skills yet. Create one method asset first.',
    emptyFiltered: 'There are no skills in this group right now',
    readOnlyTag: 'Read only',
    moreActions: 'More actions: {{name}}',
    updatedAt: 'Updated {{value}}',
    owner: 'Owner',
    ownerFallback: 'No owner recorded yet.',
    action: {
      readonly: 'Preset skill, view only',
      view: 'View',
      edit: 'Edit',
      activate: 'Mark active',
      moveToDraft: 'Move to draft',
      deprecate: 'Deprecate',
      archive: 'Archive',
      delete: 'Delete',
    },
    tabs: {
      editor: 'Editor',
      preview: 'Preview',
    },
    source: {
      preset: 'Preset',
      team: 'Team',
    },
    status: {
      title: 'Method asset status',
      draftBadge: 'Draft',
      activeBadge: 'Active',
      deprecatedBadge: 'Deprecated',
      archivedBadge: 'Archived',
      option: {
        draft: 'draft · Draft',
        active: 'active · Active',
        deprecated: 'deprecated · Deprecated',
        archived: 'archived · Archived',
      },
    },
    category: {
      documentation_architecture: 'Documentation / Architecture',
      engineering_execution: 'Engineering Execution',
      governance_capture: 'Governance / Capture',
    },
    summary: {
      total: 'Skills total',
      totalValue: '{{count}}',
      totalHint: 'Skill assets currently governed in the catalog.',
      active: 'Active',
      activeValue: '{{count}}',
      activeHintNone: 'There are no remaining drafts right now.',
      activeHintDrafts: '{{count}} method assets are still in draft.',
      preset: 'Preset',
      presetValue: '{{count}}',
      presetHint: 'Core methods maintained by Knowject.',
      team: 'Team',
      teamValue: '{{count}}',
      teamHint: 'Team-authored method assets.',
    },
    filters: {
      all: 'All',
      active: 'Active',
      draft: 'Draft',
      deprecated: 'Deprecated',
      archived: 'Archived',
      preset: 'Preset',
      team: 'Team',
    },
    editor: {
      createTitle: 'Create skill',
      editTitle: 'Edit skill',
      createDraft: 'Create draft',
      save: 'Save changes',
      cancel: 'Cancel',
      intro:
        'A skill is a structured method asset. Define the goal, workflow, output contract, and project notes here; the preview tab renders the generated SKILL.md view.',
      invalid: 'The skill cannot be saved yet',
      valid: 'Structured definition is ready to save',
      validationPreview: 'Resolve the required fields before using this method asset',
      fields: {
        name: 'Name',
        owner: 'Owner',
        description: 'Description',
        category: 'Category',
      },
      placeholders: {
        name: 'For example: Implementation readiness check',
        owner: 'For example: Knowject Core or Team Infra',
        description:
          'Summarize the team problem this method asset is designed to solve.',
      },
      waitingName: 'Waiting for name',
      waitingDescription: 'Waiting for description',
      waitingOwner: 'Waiting for owner',
      waitingBody: 'The generated SKILL.md preview will appear here.',
      validation: {
        required: '{{field}} is required',
      },
    },
    feedback: {
      loadFailed: 'Loading the skills catalog failed. Please try again later',
      detailLoadFailed: 'Loading the skill details failed. Please try again later',
      definitionInvalid: 'Complete the required structured fields first',
      createdDraft: 'Skill draft created',
      saved: 'Skill saved',
      saveFailed: 'Saving the skill failed. Please try again later',
      statusUpdated: '"{{name}}" updated to {{status}}',
      statusUpdateFailed: 'Updating the skill status failed. Please try again later',
      deleteTitle: 'Delete "{{name}}"',
      deleteDescription:
        'After deletion, this method asset is removed from the global catalog and can no longer be bound to new projects.',
      deleteConfirm: 'Delete',
      deleted: '"{{name}}" deleted',
    },
    preview: {
      title: 'Generated preview',
      owner: 'Owner',
      waitingList: 'Add content in the editor to see a preview summary.',
    },
    viewer: {
      title: 'View skill',
      source: 'Source',
      status: 'Status',
      category: 'Category',
    },
    definition: {
      previewEmpty: 'No content yet.',
      goal: {
        label: 'Goal',
        placeholder: 'State the final outcome this method asset should produce.',
      },
      triggerScenarios: {
        label: 'Trigger scenarios',
        add: 'Add scenario',
        placeholder: 'Describe when this method asset should be used.',
      },
      requiredContext: {
        label: 'Required context',
        add: 'Add context item',
        placeholder: 'List the documents, code, or facts required before running it.',
      },
      workflow: {
        label: 'Workflow',
        add: 'Add workflow step',
        placeholder: 'Describe one stable execution step.',
      },
      outputContract: {
        label: 'Output contract',
        add: 'Add output',
        placeholder: 'Describe what should be delivered at the end.',
      },
      guardrails: {
        label: 'Guardrails',
        add: 'Add guardrail',
        placeholder: 'State a boundary or thing this method asset must not do.',
      },
      artifacts: {
        label: 'Artifacts',
        add: 'Add artifact',
        placeholder: 'List the asset or document produced by this workflow.',
      },
      projectBindingNotes: {
        label: 'Project binding notes',
        add: 'Add project note',
        placeholder: 'Capture project-specific usage notes or preferred sources.',
      },
      followupQuestionsStrategy: {
        label: 'Follow-up questions strategy',
        options: {
          none: 'none · No follow-up questions',
          optional: 'optional · Ask only when needed',
          required: 'required · Ask before proceeding',
        },
      },
    },
  },
  agents: {
    title: 'Agents',
    subtitle: 'Reuse roles and workflows, then bind them inside projects.',
    modelHint:
      'Models are fixed by the server. Bound resources are validated for existence.',
    create: 'Create agent',
    reload: 'Refresh catalog',
    retry: 'Retry',
    status: {
      active: 'Active',
      disabled: 'Disabled',
    },
    sidebar: {
      title: 'Groups and positioning',
      count: '{{count}} total',
      browse: 'Browse groups',
      list: 'Agent list',
      empty: 'There are no agents in this group right now.',
      updatedAt: 'Updated {{value}}',
    },
    detail: {
      emptyAll: 'There is no global agent config yet',
      createFirst: 'Create the first agent',
      emptyFiltered: 'There are no agents in this group right now',
      descriptionFallback: 'No agent description yet.',
      moreActions: 'More actions: {{name}}',
      prompt: 'Prompt',
      boundKnowledge: 'Knowledge: {{count}}',
      boundSkills: 'Skills: {{count}}',
      updatedAt: 'Updated: {{value}}',
    },
    form: {
      createTitle: 'Create agent',
      editTitle: 'Edit agent',
      create: 'Create agent',
      save: 'Save changes',
      cancel: 'Cancel',
      intro:
        'The model is currently fixed to server-default on the server. This page maintains only prompt, status, and resource bindings.',
      name: 'Agent name',
      nameRequired: 'Enter an agent name',
      namePlaceholder: 'For example: Code review assistant',
      description: 'Description',
      descriptionPlaceholder:
        'Describe the responsibility, boundaries, and usage scenarios of this agent.',
      systemPrompt: 'System Prompt',
      promptRequired: 'Enter System Prompt',
      promptPlaceholder:
        'For example: You are a strict but pragmatic code review assistant. Prioritize regression risks, testing gaps, and maintainability concerns.',
      status: 'Status',
      active: 'active · Active',
      disabled: 'disabled · Disabled',
      knowledge: 'Bound knowledge bases',
      skills: 'Bound skills',
      optional: 'Optional',
      noKnowledge: 'No knowledge base available',
      noSkills: 'No skill available',
    },
    summary: {
      total: 'Agents total',
      totalValue: '{{count}}',
      totalHint: 'Global agent configs currently in the catalog.',
      active: 'Active',
      activeValue: '{{count}}',
      activeHintNone: 'There are no disabled agents right now.',
      activeHintDisabled: '{{count}} agents are currently disabled.',
      knowledge: 'Knowledge connected',
      knowledgeValue: '{{count}}',
      knowledgeHintNone: 'No agents are connected to knowledge yet.',
      knowledgeHintSome: '{{count}} knowledge bindings in total.',
      skills: 'Skills connected',
      skillsValue: '{{count}}',
      skillsHintNone: 'No agents are connected to skills yet.',
      skillsHintSome: '{{count}} skill bindings in total.',
    },
    filters: {
      all: 'All',
      recent: 'Recently used',
      active: 'Active',
      disabled: 'Disabled',
    },
    actions: {
      edit: 'Edit config',
      disable: 'Disable',
      enable: 'Enable',
      delete: 'Delete',
    },
    feedback: {
      loadFailed: 'Loading the agents catalog failed. Please try again later',
      updated: 'Agent updated',
      created: 'Agent created',
      saveFailed: 'Saving the agent failed. Please try again later',
      disabled: 'Agent disabled',
      enabled: 'Agent enabled',
      updateStatusFailed:
        'Updating the agent status failed. Please try again later',
      deleted: 'Agent deleted',
      deleteFailed: 'Deleting the agent failed. Please try again later',
      deleteTitle: 'Delete agent',
      deleteDescription:
        'This deletes the agent config, but does not remove already bound knowledge bases or skill assets.',
      deleteConfirm: 'Delete',
      optionalUnknownSkill: 'Unknown skill ({{id}})',
      optionalGlobalCode: '{{name}} · global_code (reserved)',
      optionalPresetSkill: '{{name}} · Preset method asset',
      optionalTeamSkill: '{{name}} · Team method asset',
      promptFallback: 'No prompt yet.',
    },
  },
};

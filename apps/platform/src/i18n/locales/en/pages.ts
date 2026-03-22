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
};

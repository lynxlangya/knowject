import type { SupportedLocale } from './locale.js';
import { DEFAULT_LOCALE } from './locale.js';

const FALLBACK_ERROR_LOCALE: SupportedLocale = 'zh-CN';

export const messages = {
  en: {
    'api.success': 'Request succeeded',
    'api.created': 'Created successfully',
    'api.validation.invalidJson': 'Request body must be valid JSON',
    'api.validation.failed': 'Validation failed',
    'api.internalError': 'Service temporarily unavailable',
    'api.notFound': 'Requested endpoint does not exist',
    'validation.required.username': 'Username is required',
    'validation.required.password': 'Password is required',
    'validation.required.query': 'Query is required',
    'validation.required.generic': 'Field is required',
    'validation.required.agentName': 'Agent name is required',
    'validation.required.systemPrompt': 'System prompt is required',
    'validation.required.projectName': 'Project name is required',
    'validation.required.knowledgeName': 'Knowledge base name is required',
    'validation.required.conversationTitle': 'Conversation title is required',
    'validation.required.messageContent': 'Message content is required',
    'validation.required.skillMarkdown': 'SKILL.md content is required',
    'validation.required.markdownUrl': 'Raw Markdown URL is required',
    'validation.required.githubRepository': 'GitHub repository is required',
    'validation.string': 'Must be a string',
    'validation.object': 'Request body must be an object',
    'validation.stringArray': 'Must be an array of strings',
    'validation.boolean': 'Must be a boolean',
    'validation.integer': 'Must be an integer',
    'validation.range': 'Value is out of allowed range',
    'validation.atLeastOneField': 'At least one updatable field is required',
    'validation.nonEmptyString': 'Field cannot be empty',
    'validation.url.invalid': 'URL format is invalid',
    'validation.url.httpsOnly': 'Only HTTPS URLs are supported',
    'validation.url.authUnsupported':
      'URLs with embedded credentials are not supported',
    'validation.provider.invalid': 'Provider is invalid',
    'validation.apiKey.string': 'API key must be a string',
    'validation.supportedTypes.stringArray':
      'supportedTypes must be an array of strings',
    'validation.supportedTypes.nonEmpty':
      'supportedTypes must keep at least one file type',
    'validation.supportedTypes.allowed':
      'supportedTypes only supports md, txt, pdf, docx, and xlsx',
    'validation.workspaceDescription.maxLength':
      'Description must not exceed 200 characters',
    'validation.chunkOverlap.lessThanChunkSize':
      'chunkOverlap must be smaller than chunkSize',
    'validation.agent.status.invalid':
      'status must be active or disabled',
    'validation.knowledgeBindings.unregistered':
      'Contains unregistered knowledge bindings',
    'validation.projectRole.invalid':
      'role must be admin or member',
    'validation.starred.boolean': 'starred must be a boolean',
    'validation.clientRequestId.required':
      'Streaming messages must include clientRequestId',
    'validation.projectConversation.replayTarget.invalid':
      'targetUserMessageId must point to a user message in this conversation',
    'validation.knowledge.sourceType.invalid':
      'sourceType must be global_docs or global_code',
    'validation.knowledge.projectSourceType.unsupported':
      'Project knowledge only supports global_docs',
    'validation.topK.range':
      'topK must be an integer between 1 and 10',
    'validation.skills.lifecycleStatus.invalid':
      'lifecycleStatus is invalid',
    'validation.skillMarkdown.string':
      'skillMarkdown must be a string',
    'validation.skillMarkdown.frontmatter.parse':
      'SKILL.md frontmatter could not be parsed',
    'validation.skillMarkdown.empty': 'SKILL.md cannot be empty',
    'validation.skillMarkdown.frontmatter.required':
      'SKILL.md must include frontmatter',
    'validation.skillMarkdown.frontmatter.unclosed':
      'SKILL.md frontmatter is not closed',
    'validation.skillMarkdown.frontmatter.nameRequired':
      'SKILL.md frontmatter must include a name',
    'validation.skillMarkdown.frontmatter.descriptionRequired':
      'SKILL.md frontmatter must include a description',
    'validation.skillBundlePath.invalid':
      'Skill bundle file path is invalid',
    'validation.skills.sourceFilter.invalid':
      'source filter is invalid',
    'validation.skills.lifecycleFilter.invalid':
      'lifecycleStatus filter is invalid',
    'validation.skills.bindableFilter.invalid':
      'bindable filter is invalid',
    'validation.skills.import.repository.invalid':
      'repository format is invalid',
    'validation.skills.import.githubUrl.invalid':
      'GitHub URL is invalid',
    'validation.skills.import.mode.invalid': 'mode is invalid',
    'validation.skills.import.trustedRawUrlOnly':
      'Only trusted raw Markdown URLs are supported',
    'agents.notFound': 'Agent does not exist',
    'knowledge.upload.tooLarge': 'Uploaded file exceeds the allowed size limit',
    'knowledge.upload.invalidRequest':
      'Upload request is invalid; use the file field and upload only one file',
    'knowledge.upload.fileRequired': 'Please upload a file',
    'knowledge.vectorDeleteFailed':
      'Knowledge vector cleanup failed; deletion was stopped',
    'knowledge.document.vectorDeleteFailed':
      'Document vector cleanup failed; deletion was stopped',
    'knowledge.notFound': 'Knowledge base does not exist',
    'knowledge.document.notFound': 'Document does not exist',
    'knowledge.upload.unsupportedType':
      'Only md, markdown, txt, pdf, docx, and xlsx files are supported',
    'knowledge.upload.emptyFile':
      'Uploaded file is empty; please check the file and try again',
    'knowledge.upload.sourceTypeUnsupported':
      'This knowledge source type does not support document upload',
    'knowledge.document.retryConflict':
      'Document is already being indexed; refresh and try again later',
    'knowledge.rebuild.conflict':
      'Knowledge base still has documents being indexed; try again later',
    'knowledge.rebuild.empty':
      'No documents are available for rebuild in this knowledge base',
    'knowledge.namespace.rebuilding':
      'The current namespace is rebuilding; try again later',
    'knowledge.namespace.rebuildRequired':
      'The embedding model changed; run a full knowledge rebuild first',
    'knowledge.namespace.legacyRebuildRequired':
      'The index is missing model version metadata; run a full rebuild first',
    'knowledge.document.duplicateVersion':
      'A document with the same content already exists',
    'knowledge.search.diagnosticsFailed':
      'Chroma diagnostics failed',
    'knowledge.search.chroma.unavailable':
      'Chroma is not configured; knowledge indexing and search are unavailable',
    'knowledge.search.chroma.requestFailed': 'Chroma request failed',
    'knowledge.search.indexer.healthFailed':
      'Python indexer health check failed',
    'knowledge.search.indexer.requestFailed':
      'Python indexer request failed',
    'knowledge.search.embedding.unavailable':
      'Embedding API key is not configured; knowledge indexing and search are unavailable',
    'knowledge.search.embedding.aliyun.failed':
      'Aliyun embedding request failed',
    'knowledge.search.embedding.zhipu.failed':
      'Zhipu embedding request failed',
    'knowledge.search.embedding.voyage.failed':
      'Voyage embedding request failed',
    'knowledge.search.embedding.custom.failed':
      'Compatible embedding request failed',
    'knowledge.search.embedding.openai.failed':
      'OpenAI embedding request failed',
    'knowledge.search.embedding.responseInvalid':
      'Embedding response format is invalid',
    'knowledge.search.embedding.missingEmbedding':
      'Embedding response is missing embedding data',
    'memberships.userNotFound': 'Target user does not exist',
    'memberships.memberNotFound': 'Project member does not exist',
    'memberships.memberAlreadyExists':
      'The user is already a member of this project',
    'memberships.lastAdminRequired':
      'At least one admin must remain in the project',
    'project.notFound':
      'Project does not exist or is not visible to the current user',
    'project.forbidden':
      'Current user does not have admin permission for this project',
    'project.member.unknownName': 'Unknown member',
    'project.conversation.notFound': 'Project conversation does not exist',
    'project.conversation.message.notFound':
      'Project conversation message does not exist',
    'project.conversation.defaultIntro':
      'This is the project conversation entry for "{projectName}". The formal backend read path is already enabled; real message writes, knowledge retrieval, and context persistence will be connected here next.',
    'project.conversation.defaultTitle': '{projectName} project context',
    'project.conversation.emptyPreview':
      'There are no messages in this conversation yet.',
    'project.conversation.lastThreadForbidden':
      'At least one conversation thread must remain in the project',
    'project.conversation.streamingUnavailable':
      'Project conversation streaming is temporarily unavailable',
    'project.conversation.llmUnavailable':
      'No available conversation model is configured yet',
    'project.conversation.providerUnsupported':
      'The current LLM provider does not support project conversation',
    'project.conversation.streamUnsupported':
      'The current LLM provider does not support streaming project conversation',
    'project.conversation.generationFailed':
      'Project conversation generation failed; try again later',
    'project.conversation.streamFailed':
      'Project conversation streaming failed; try again later',
    'project.conversation.timeout':
      'Project conversation streaming timed out before new content arrived',
    'project.conversation.emptyResponse':
      'The project conversation model returned empty content',
    'project.conversation.responseBodyMissing':
      'Project conversation streaming returned no response body',
    'project.conversation.invalidStreamFormat':
      'Project conversation streaming returned an invalid response format',
    'settings.llmTestProvider.unsupported':
      'The current provider does not support online testing',
    'settings.apiKey.required':
      'API key is missing; enter or save it before testing',
    'settings.apiKey.reentryRequired':
      'Re-enter a new API key after changing the provider or base URL',
    'skills.notFound': 'Skill does not exist',
    'skills.systemReadonly':
      'Built-in system skills cannot be edited or deleted',
    'skills.slugConflict': 'Skill slug already exists',
    'skills.inUse': 'Skill is still bound and cannot be changed right now',
    'skills.inUse.projectBindingUnit': '{count} project(s)',
    'skills.inUse.agentBindingUnit': '{count} agent(s)',
    'skills.inUse.action.delete': 'delete',
    'skills.inUse.action.unpublish': 'revert to draft',
    'skills.inUse.message':
      'Skill is bound by {usage} and cannot be {action} right now',
    'skills.import.fetch.invalidUrl': 'Remote URL is invalid',
    'skills.import.fetch.httpsOnly': 'Remote resources only support HTTPS',
    'skills.import.fetch.authUnsupported':
      'Remote URLs with embedded credentials are not supported',
    'skills.import.fetch.hostNotAllowed':
      'The remote host is not in the allowlist',
    'skills.import.fetch.githubFailed': 'GitHub import failed',
    'skills.import.fetch.invalidJson': 'GitHub did not return valid JSON',
    'skills.import.fetch.resourceDownloadFailed':
      'Skill resource download failed',
    'skills.import.fetch.directoryExpected':
      'GitHub path must point to a Skill directory or SKILL.md file',
    'skills.import.limit.exceeded': 'Imported resource exceeds the size limit',
    'skills.import.limit.maxFiles':
      'Skill bundle file count exceeds the limit',
    'skills.import.limit.singleFile':
      'A Skill bundle file exceeds the single-file limit',
    'skills.import.limit.totalBytes':
      'Skill bundle total size exceeds the limit',
    'skills.import.fetch.missingEntry':
      'SKILL.md was not found under the GitHub path',
    'skills.import.fetch.htmlUnsupported':
      'URL import only supports raw Markdown text, not HTML pages',
    'secureTransport.required':
      'Authentication and authorization requests must use HTTPS in production',
  },
  'zh-CN': {
    'api.success': '请求成功',
    'api.created': '创建成功',
    'api.validation.invalidJson': '请求体不是合法 JSON',
    'api.validation.failed': '字段校验失败',
    'api.internalError': '服务暂时不可用',
    'api.notFound': '请求的接口不存在',
    'validation.required.username': '请输入用户名',
    'validation.required.password': '请输入密码',
    'validation.required.query': 'query 为必填项',
    'validation.required.generic': '字段为必填项',
    'validation.required.agentName': '请输入智能体名称',
    'validation.required.systemPrompt': '请输入 systemPrompt',
    'validation.required.projectName': '请输入项目名称',
    'validation.required.knowledgeName': '请输入知识库名称',
    'validation.required.conversationTitle': '请输入对话标题',
    'validation.required.messageContent': '请输入消息内容',
    'validation.required.skillMarkdown': '请填写 SKILL.md 内容',
    'validation.required.markdownUrl': '请输入原始 Markdown URL',
    'validation.required.githubRepository': '请输入 GitHub 仓库信息',
    'validation.string': '必须为字符串',
    'validation.object': '请求体必须为对象',
    'validation.stringArray': '必须为字符串数组',
    'validation.boolean': '必须为布尔值',
    'validation.integer': '必须为整数',
    'validation.range': '超出允许范围',
    'validation.atLeastOneField': '至少需要提供一个可更新字段',
    'validation.nonEmptyString': '不能为空',
    'validation.url.invalid': 'URL 格式不合法',
    'validation.url.httpsOnly': '仅支持 HTTPS',
    'validation.url.authUnsupported': '不支持携带认证信息',
    'validation.provider.invalid': 'provider 不合法',
    'validation.apiKey.string': 'apiKey 必须为字符串',
    'validation.supportedTypes.stringArray': 'supportedTypes 必须为字符串数组',
    'validation.supportedTypes.nonEmpty':
      'supportedTypes 至少需要保留一种文件类型',
    'validation.supportedTypes.allowed':
      'supportedTypes 只支持 md、txt、pdf、docx、xlsx',
    'validation.workspaceDescription.maxLength':
      'description 长度不能超过 200',
    'validation.chunkOverlap.lessThanChunkSize':
      'chunkOverlap 必须小于 chunkSize',
    'validation.agent.status.invalid': 'status 只能为 active 或 disabled',
    'validation.knowledgeBindings.unregistered': '存在未注册的知识库绑定',
    'validation.projectRole.invalid': 'role 必须为 admin 或 member',
    'validation.starred.boolean': 'starred 必须为布尔值',
    'validation.clientRequestId.required':
      '流式消息必须携带 clientRequestId',
    'validation.projectConversation.replayTarget.invalid':
      'targetUserMessageId 必须指向当前会话中的用户消息',
    'validation.knowledge.sourceType.invalid':
      'sourceType 只能为 global_docs 或 global_code',
    'validation.knowledge.projectSourceType.unsupported':
      '当前项目知识只支持 global_docs',
    'validation.topK.range': 'topK 必须是 1 到 10 之间的整数',
    'validation.skills.lifecycleStatus.invalid':
      'lifecycleStatus 不合法',
    'validation.skillMarkdown.string': 'skillMarkdown 必须为字符串',
    'validation.skillMarkdown.frontmatter.parse':
      'SKILL.md frontmatter 解析失败',
    'validation.skillMarkdown.empty': 'SKILL.md 不能为空',
    'validation.skillMarkdown.frontmatter.required':
      'SKILL.md 必须包含 frontmatter',
    'validation.skillMarkdown.frontmatter.unclosed':
      'SKILL.md frontmatter 未闭合',
    'validation.skillMarkdown.frontmatter.nameRequired':
      'SKILL.md frontmatter 缺少 name',
    'validation.skillMarkdown.frontmatter.descriptionRequired':
      'SKILL.md frontmatter 缺少 description',
    'validation.skillBundlePath.invalid': 'Skill bundle 文件路径不合法',
    'validation.skills.sourceFilter.invalid': 'source 过滤条件不合法',
    'validation.skills.lifecycleFilter.invalid':
      'lifecycleStatus 过滤条件不合法',
    'validation.skills.bindableFilter.invalid':
      'bindable 过滤条件不合法',
    'validation.skills.import.repository.invalid':
      'repository 格式不合法',
    'validation.skills.import.githubUrl.invalid': 'GitHub URL 不合法',
    'validation.skills.import.mode.invalid': 'mode 不合法',
    'validation.skills.import.trustedRawUrlOnly':
      'URL 导入仅支持受信任的原始文件地址',
    'agents.notFound': '智能体不存在',
    'knowledge.upload.tooLarge': '上传文件不能超过限制大小',
    'knowledge.upload.invalidRequest':
      '上传请求不合法，请确认字段名为 file 且只上传一个文件',
    'knowledge.upload.fileRequired': '请上传文件',
    'knowledge.vectorDeleteFailed':
      '知识库向量清理失败，已停止删除，请稍后重试',
    'knowledge.document.vectorDeleteFailed':
      '文档向量清理失败，已停止删除，请稍后重试',
    'knowledge.notFound': '知识库不存在',
    'knowledge.document.notFound': '文档不存在',
    'knowledge.upload.unsupportedType':
      '当前只支持上传 md、markdown、txt、pdf、docx、xlsx 文件',
    'knowledge.upload.emptyFile': '上传文件内容为空，请检查后重试',
    'knowledge.upload.sourceTypeUnsupported':
      '当前知识库类型暂不支持上传文档',
    'knowledge.document.retryConflict': '文档已在索引中，请稍后刷新状态',
    'knowledge.rebuild.conflict': '知识库存在正在索引的文档，请稍后再试',
    'knowledge.rebuild.empty': '当前知识库暂无可重建文档',
    'knowledge.namespace.rebuilding': '当前命名空间正在重建，请稍后再试',
    'knowledge.namespace.rebuildRequired':
      '当前向量模型已变更，请先执行知识库全量重建',
    'knowledge.namespace.legacyRebuildRequired':
      '当前索引缺少模型版本元数据，请先执行一次知识库全量重建',
    'knowledge.document.duplicateVersion':
      '相同内容的文档已存在，请直接重试或重建现有文档',
    'knowledge.search.diagnosticsFailed': 'Chroma 诊断失败',
    'knowledge.search.chroma.unavailable':
      'Chroma 未配置，当前无法执行知识索引和检索',
    'knowledge.search.chroma.requestFailed': 'Chroma 请求失败',
    'knowledge.search.indexer.healthFailed': 'Python indexer 健康检查失败',
    'knowledge.search.indexer.requestFailed': 'Python indexer 请求失败',
    'knowledge.search.embedding.unavailable':
      'Embedding API Key 未配置，当前无法执行知识索引和检索',
    'knowledge.search.embedding.aliyun.failed': '阿里云 embedding 请求失败',
    'knowledge.search.embedding.zhipu.failed': '智谱 embedding 请求失败',
    'knowledge.search.embedding.voyage.failed': 'Voyage embedding 请求失败',
    'knowledge.search.embedding.custom.failed': '兼容 embedding 请求失败',
    'knowledge.search.embedding.openai.failed': 'OpenAI embedding 请求失败',
    'knowledge.search.embedding.responseInvalid': 'embedding 响应格式不合法',
    'knowledge.search.embedding.missingEmbedding':
      'embedding 响应缺少 embedding 字段',
    'memberships.userNotFound': '目标用户不存在',
    'memberships.memberNotFound': '项目成员不存在',
    'memberships.memberAlreadyExists': '该用户已在当前项目中',
    'memberships.lastAdminRequired': '项目至少需要保留一位 admin',
    'project.notFound': '项目不存在或当前用户不可见',
    'project.forbidden': '当前用户没有该项目的管理权限',
    'project.member.unknownName': '未知成员',
    'project.conversation.notFound': '项目对话不存在',
    'project.conversation.message.notFound': '项目对话消息不存在',
    'project.conversation.defaultIntro':
      '这里是「{projectName}」的项目对话入口。当前已经切到正式后端读链路，后续会在这里接入真实消息写入、知识检索与上下文沉淀。',
    'project.conversation.defaultTitle': '{projectName} 项目上下文',
    'project.conversation.emptyPreview': '当前对话暂无消息。',
    'project.conversation.lastThreadForbidden': '项目至少保留一个对话线程',
    'project.conversation.streamingUnavailable':
      '当前项目对话流式能力暂不可用',
    'project.conversation.llmUnavailable':
      '当前未配置可用的对话模型，请先完成 LLM 设置',
    'project.conversation.providerUnsupported':
      '当前 LLM Provider 暂不支持项目对话',
    'project.conversation.streamUnsupported':
      '当前 LLM Provider 暂不支持流式项目对话',
    'project.conversation.generationFailed':
      '项目对话生成失败，请稍后重试',
    'project.conversation.streamFailed':
      '项目对话流式生成失败，请稍后重试',
    'project.conversation.timeout':
      '项目对话流式生成超时，请稍后重试',
    'project.conversation.emptyResponse': '项目对话模型返回了空内容',
    'project.conversation.responseBodyMissing':
      '项目对话流式生成未返回响应体',
    'project.conversation.invalidStreamFormat':
      '项目对话流式响应格式非法',
    'settings.llmTestProvider.unsupported': '当前 provider 暂不支持在线测试',
    'settings.apiKey.required': 'API Key 未配置，请先输入或保存后再测试',
    'settings.apiKey.reentryRequired':
      '切换 Provider 或 Base URL 后，请重新输入新的 API Key',
    'skills.notFound': 'Skill 不存在',
    'skills.systemReadonly': '系统内置 Skill 不可编辑或删除',
    'skills.slugConflict': 'Skill slug 已存在',
    'skills.inUse': 'Skill 已被绑定，暂不可操作',
    'skills.inUse.projectBindingUnit': '{count} 个项目',
    'skills.inUse.agentBindingUnit': '{count} 个智能体',
    'skills.inUse.action.delete': '删除',
    'skills.inUse.action.unpublish': '回退为草稿',
    'skills.inUse.message': 'Skill 已被{usage}绑定，暂不可{action}',
    'skills.import.fetch.invalidUrl': '远程 URL 不合法',
    'skills.import.fetch.httpsOnly': '远程资源仅支持 HTTPS',
    'skills.import.fetch.authUnsupported': '远程 URL 不支持携带认证信息',
    'skills.import.fetch.hostNotAllowed': '远程主机不在允许列表内',
    'skills.import.fetch.githubFailed': 'GitHub 导入失败',
    'skills.import.fetch.invalidJson': 'GitHub 返回不是有效 JSON',
    'skills.import.fetch.resourceDownloadFailed': 'Skill 资源下载失败',
    'skills.import.fetch.directoryExpected':
      'GitHub 路径必须指向 Skill 目录或 SKILL.md 文件',
    'skills.import.limit.exceeded': '导入资源超过大小上限',
    'skills.import.limit.maxFiles': 'Skill bundle 文件数超过上限',
    'skills.import.limit.singleFile': 'Skill bundle 单文件超过上限',
    'skills.import.limit.totalBytes': 'Skill bundle 总大小超过上限',
    'skills.import.fetch.missingEntry': 'GitHub 路径下未找到 SKILL.md',
    'skills.import.fetch.htmlUnsupported':
      'URL 导入只支持原始 Markdown 文本，不支持网页地址',
    'secureTransport.required':
      '生产环境中的认证与鉴权请求必须通过 HTTPS 发送',
  },
} as const;

export type MessageKey = keyof typeof messages.en;

export const getMessage = (
  key: MessageKey | undefined,
  locale: SupportedLocale,
): string | undefined => {
  if (!key) {
    return undefined;
  }

  return messages[locale]?.[key] ?? messages[DEFAULT_LOCALE]?.[key];
};

export const getFallbackMessage = (key: MessageKey): string => {
  return messages[FALLBACK_ERROR_LOCALE][key];
};

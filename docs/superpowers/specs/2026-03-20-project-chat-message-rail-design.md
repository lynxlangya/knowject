# Project Chat Message Rail Design

- Date: 2026-03-20
- Status: Approved for planning
- Scope: `apps/platform` project chat page, `apps/api` project conversation module

## Summary

This spec adds a right-side message rail to the project chat page so users can quickly navigate, star, export, and turn selected messages into project knowledge drafts without changing the existing chat-first layout.

The rail is a hover-expanded, current-conversation-only interaction layer:

- Default state shows only a subtle right-side rail line.
- Hover expands a message directory for the current conversation.
- Top-right rail actions are `star`, `export`, and `turn into knowledge`.
- Starred view filters only starred messages in the current conversation.
- Export and knowledge creation share one selection mode.
- Knowledge creation opens a drawer for draft confirmation before writing to project knowledge.

## Goals

- Pull the chat reading area slightly toward the center without adding a permanent right sidebar.
- Provide a lightweight message directory for the current conversation.
- Persist message star state as formal backend data.
- Keep export and knowledge capture useful in MVP without adding a large new backend domain.
- Preserve current conversation list ordering and current streaming contract.

## Non-Goals

- No project-wide starred-message aggregate view.
- No message tags, notes, color labels, or category systems.
- No append-to-existing-knowledge flow in MVP.
- No backend export job or file management system.
- No SSE event changes for message metadata updates.
- No second thread-management panel on the right side.

## Approved Product Decisions

### Message granularity

The right rail operates on individual messages, not turns and not conversation threads.

### Star scope

Only messages can be starred in MVP.

- No thread-level starring.
- Starred view filters within the current conversation only.

### Rail presentation

The right rail uses the Hover Rail approach.

- Default: collapsed, visible only as a subtle line on the right edge of the chat area.
- Hover: expands temporarily to show the message directory.
- Selection mode: rail becomes temporarily pinned open so checkbox interaction is stable.

### Selection model

Export and knowledge creation share one selection mode.

- Users can select any persisted `user` or `assistant` message.
- Output order follows message `createdAt` ascending.

### Knowledge creation model

MVP generates a knowledge draft first, then asks for confirmation in a drawer.

- The drawer allows editing before save.
- Confirm save creates a new project-private knowledge base and uploads one markdown document.

### Export model

MVP exports one merged markdown file for all selected messages.

## Existing Context

Current project chat boundaries already exist:

- [ProjectChatPage.tsx](/Users/langya/Documents/CodeHub/ai/knowject/apps/platform/src/pages/project/ProjectChatPage.tsx) is the orchestration layer.
- [useProjectConversationDetail.ts](/Users/langya/Documents/CodeHub/ai/knowject/apps/platform/src/pages/project/useProjectConversationDetail.ts) owns detail loading and reconcile.
- [useProjectConversationTurn.ts](/Users/langya/Documents/CodeHub/ai/knowject/apps/platform/src/pages/project/useProjectConversationTurn.ts) owns send/stream/reconcile flow.
- [projects.router.ts](/Users/langya/Documents/CodeHub/ai/knowject/apps/api/src/modules/projects/projects.router.ts) already exposes conversation list/detail/create/update/delete and sync/stream message endpoints.
- [knowledge.ts](/Users/langya/Documents/CodeHub/ai/knowject/apps/platform/src/api/knowledge.ts) already supports creating project knowledge and uploading knowledge documents.

This feature should extend the existing boundaries rather than introduce a new cross-cutting asset runtime.

## UX Model

## Rail States

The right rail has five explicit UI states:

1. `collapsed`
2. `browse`
3. `starred`
4. `selection`
5. `knowledge-draft-drawer`

### `collapsed`

- Show a subtle right-edge line inside the chat reading area.
- Do not consume permanent width.

### `browse`

- Triggered by hover on the rail hit area.
- Shows current conversation messages in time order.
- Each row shows role cue, truncated content, time, and star affordance.

### `starred`

- Entered by the top star icon.
- Filters the rail list to starred messages in the current conversation only.
- Empty state should explain that no messages are starred yet.

### `selection`

- Entered by either top export icon or top knowledge icon.
- List rows switch to checkbox affordance.
- Star control remains available on rows.
- Bottom action bar shows:
  - `Export Markdown`
  - `Generate Knowledge Draft`
  - `Cancel`
- Rail remains pinned open in this state.

### `knowledge-draft-drawer`

- Opened from selection mode after at least one message is selected.
- Closing the drawer returns to selection mode and keeps the current selection.
- Successful submission exits selection mode and clears the selection.

## Interaction Rules

- Hover-only behavior applies to browse and starred states.
- Selection mode and knowledge draft drawer pin the rail open until the user exits.
- Clicking a rail item scrolls the main chat view to that message.
- Draft assistant content and unpersisted pending messages are not selectable and are not star-capable.
- While streaming is in progress, export and knowledge actions are disabled.
- Star toggling is allowed only on persisted messages.

## Responsive Rule

Desktop pointer devices use hover expansion.

For touch or narrow-screen layouts, the same rail content should degrade to a temporary drawer triggered by a visible icon button. This preserves reachability without changing the core desktop design.

## Architecture

## Frontend Units

### 1. `ProjectConversationMessageRail`

New presentational component for the right-side rail.

Responsibilities:

- Render collapsed rail line and expanded panel shell
- Render top action icons
- Render message directory rows
- Render selection footer actions
- Emit row click, star toggle, checkbox toggle, mode change, and close events

Non-responsibilities:

- No direct API calls
- No markdown generation
- No knowledge persistence

### 2. `useProjectConversationMessageRail`

New page-level interaction hook.

Responsibilities:

- Manage `hovered`, `expanded`, `mode`, and `selectedMessageIds`
- Derive selectable rail items from conversation detail
- Exclude draft/pending messages from action sets
- Keep selection state stable across drawer open/close

### 3. `useProjectConversationMessageActions`

New side-effect hook for message-level actions.

Responsibilities:

- Toggle message star state
- Export selected messages as one markdown file
- Build the initial knowledge draft payload from selected messages and conversation metadata

### 4. `ProjectKnowledgeDraftDrawer`

New drawer component for knowledge confirmation.

Responsibilities:

- Show selected-message origin summary
- Edit knowledge name, optional description, document title, and markdown body
- Submit save flow

Default field population:

- `knowledgeName`: `对话沉淀：{conversation.title}`
- `knowledgeDescription`: optional, default empty
- `documentTitle`: `{conversation.title} · 对话摘录 · {YYYY-MM-DD HH:mm}`
- `markdownContent`: generated from the shared markdown formatter and selected messages

Save flow:

1. `createProjectKnowledge`
2. `uploadProjectKnowledgeDocument`

## Existing Page Integration

[ProjectChatPage.tsx](/Users/langya/Documents/CodeHub/ai/knowject/apps/platform/src/pages/project/ProjectChatPage.tsx) remains the orchestration layer and should assemble:

- existing left conversation list
- existing central bubble list and composer
- new right message rail
- new knowledge draft drawer

The page should not absorb the rail's internal state machine directly; that state belongs in the new rail hook.

## Backend Contract

## Data Model

Extend `ProjectConversationMessageDocument` in [projects.types.ts](/Users/langya/Documents/CodeHub/ai/knowject/apps/api/src/modules/projects/projects.types.ts):

```ts
interface ProjectConversationMessageDocument {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  clientRequestId?: string;
  sources?: ProjectConversationSourceDocument[];
  starredAt?: Date;
  starredBy?: string;
}
```

Extend `ProjectConversationMessageResponse` in both frontend and backend contracts:

```ts
interface ProjectConversationMessageResponse {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  sources?: ProjectConversationSourceResponse[];
  starred: boolean;
  starredAt?: string | null;
  starredBy?: string | null;
}
```

`starred` is a derived boolean:

- `true` when `starredAt` exists
- `false` otherwise

## API

Add a message-level patch route under the existing projects module:

`PATCH /api/projects/:projectId/conversations/:conversationId/messages/:messageId`

Request body:

```json
{
  "starred": true
}
```

Supported MVP mutation:

- Set or unset the shared star state for a persisted message

Recommended response:

```ts
interface ProjectConversationMessageEnvelope {
  message: ProjectConversationMessageResponse;
}
```

Reason:

- Frontend only needs to patch the target message in current detail state.
- Returning full conversation detail is unnecessary payload for this action.

## Backend Rules

- Message star updates must require the same project membership checks as other conversation actions.
- Updating star state must not change conversation `updatedAt`.
- Message star updates must not change conversation list ordering semantics.
- No SSE event changes.
- No batch star endpoint in MVP.

## Frontend Data Flow

## Star toggle

1. Rail row star button clicked
2. Frontend performs optimistic update on the target message
3. Frontend calls message patch endpoint
4. Success: reconcile message metadata from response
5. Failure: rollback optimistic change and show lightweight error feedback

## Export markdown

1. User enters selection mode
2. User selects one or more persisted messages
3. Frontend builds one merged markdown file in ascending message order
4. Frontend downloads the file locally

No backend export endpoint is required.

## Generate knowledge draft

1. User enters selection mode
2. User selects one or more persisted messages
3. Frontend builds initial markdown draft
4. Drawer opens with editable fields:
   - `knowledgeName`
   - `knowledgeDescription`
   - `documentTitle`
   - `markdownContent`
5. Submit creates a new project-private knowledge base with `sourceType: 'global_docs'`
6. Submit uploads one markdown document into that new knowledge base
7. Success shows confirmation and a shortcut to project resources

Upload file naming rule:

- Use `documentTitle` to derive the uploaded filename
- Normalize to a safe markdown filename and append `.md`

## Draft Markdown Template

Export markdown and knowledge-draft markdown must use the same formatter.

Minimum structure:

- Title block
- Project and conversation metadata
- Generation timestamp
- Selected messages in chronological order
- Clear role markers for `user` and `assistant`

Knowledge draft may additionally prepend a short summary stub, but it must still be built from the same formatter foundation to avoid drift between export output and saved knowledge content.

## Error Handling

## Star toggle failure

- Roll back optimistic state
- Show non-blocking error message

## Empty selection

- `Export Markdown` and `Generate Knowledge Draft` remain disabled until at least one message is selected

## Streaming guard

- While streaming is active, export and knowledge entry actions are disabled
- Draft assistant output is not selectable
- Unpersisted pending user message is not selectable

## Knowledge save partial failure

If knowledge base creation succeeds but markdown upload fails:

- Do not auto-delete the newly created knowledge base
- Keep drawer content intact
- Show explicit status: knowledge base created, document upload failed
- Offer retry upload
- Offer navigation to project resources

This is safer than hidden rollback and aligns with diagnosable write behavior.

## Hover stability

- Use a small enter/leave debounce so the rail does not flicker when pointer crosses the gap between line and panel

## Testing

## Frontend

- Hook tests for `browse -> starred -> selection -> drawer -> selection/cancel`
- Hook tests for exclusion of pending/draft messages from action sets
- Formatter tests for deterministic markdown output and chronological ordering
- Component tests for:
  - star toggle affordance
  - checkbox mode
  - disabled actions on empty selection
  - disabled export/knowledge actions during streaming

## Backend

- Route validation for missing or invalid `messageId`
- Membership/auth coverage for message patch
- Successful star and unstar mutation
- Response serialization for `starred`, `starredAt`, `starredBy`
- Regression test that conversation `updatedAt` and list ordering do not change after star mutation

## Integration Validation

Minimum end-to-end scenario:

1. Open project conversation with persisted messages
2. Star one message
3. Switch rail to starred mode and verify filtering
4. Enter selection mode
5. Export selected messages as markdown
6. Generate knowledge draft
7. Confirm save and verify new project knowledge plus markdown document exist

## Alternatives Considered

### A. Message-level patch endpoint

Chosen.

Why:

- Clean contract boundary
- Correct granularity
- Low coupling with conversation title/update semantics

### B. Reuse conversation PATCH and send full conversation payload

Rejected.

Why:

- Blurs title update and message metadata responsibilities
- Raises overwrite and concurrency risk
- Creates poor extension path for future metadata

### C. Build a full message asset domain now

Rejected for MVP.

Why:

- Too much upfront abstraction
- Expands scope far beyond starred metadata and local markdown generation

## Risks

- Hover-only interaction can feel fragile if the hit area is too thin or debounce is poor.
- Message-level metadata patch adds a new nested write path in the projects repository.
- Knowledge creation is a two-step write and needs clear failure messaging.

## Rollout Notes

- Keep the feature scoped to current-conversation context in MVP.
- Do not change the existing thread list, send flow, or streaming protocol.
- Prefer minimal API surface: one message patch endpoint only.

## Planning Readiness

This spec is ready for implementation planning.

The planning phase should break work into at least:

1. backend message metadata contract and route
2. frontend rail state and UI shell
3. markdown export and knowledge draft flow
4. tests and integration verification

# MCP Tool Risk Taxonomy

Use one risk label per tool candidate. When uncertain, choose the higher-risk label and require confirmation.

## Risk Levels

| Risk level | Meaning | Confirmation |
|---|---|---|
| `read_only` | Reads non-sensitive data and has no side effects. | Usually not required, unless data sensitivity is unclear. |
| `low_write` | Creates or updates low-impact project data with a clear undo path. | Required when user-visible state changes. |
| `destructive` | Deletes, archives, resets, overwrites, bulk updates, or triggers irreversible work. | Always required. |
| `external_side_effect` | Sends messages, provisions resources, calls third-party systems, charges money, or notifies users. | Always required. |
| `sensitive_data` | Reads or writes private, credential-like, regulated, tenant-sensitive, or personally sensitive data. | Always required. |

## Confirmation Gates

Require confirmation for:

- destructive operations
- external side effects
- sensitive data access
- bulk operations
- tenant-crossing operations
- unclear endpoint behavior

The confirmation prompt should name the tool, affected resource, source endpoint, and risk reason.

## Selection Guidance

- Prefer `read_only` tools for Day-1 implementation candidates.
- Keep write tools in the design plan only until auth, audit logging, tests, and rollback behavior are clear.
- Do not design tools for auth/session endpoints unless the user explicitly asks and the risk report labels them high risk.
- Never hide uncertainty by using a lower risk label.

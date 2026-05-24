# MCP Tool Design Contract

Day-1 output is design-artifact only and repo-local.

```text
knowject/tools/
  README.md
  mcp-tools.plan.md
  mcp-tools.schema.json
  tool-risk-report.md
```

## `mcp-tools.schema.json`

Use this machine-readable shape:

```json
{
  "version": "0.1",
  "project": {
    "name": "<from knowject/context.yaml project.name>",
    "generated_at": "YYYY-MM-DD",
    "source_summary": {
      "mode": "context-openapi | context-express | endpoint-inventory | explicit-endpoints",
      "refs": [
        {
          "path": "api-inventory/users.json",
          "note": "knowject-read-api endpoint inventory"
        }
      ]
    }
  },
  "tools": [
    {
      "tool_name": "list_users",
      "description": "List users visible to the current project member.",
      "source_endpoint": {
        "method": "GET",
        "path": "/users",
        "source": "apps/api/src/modules/users/users.routes.ts:7"
      },
      "input_schema": {
        "type": "object",
        "properties": {},
        "required": []
      },
      "output_shape_notes": "Returns a list shape defined by the source API.",
      "risk_level": "read_only",
      "requires_confirmation": false,
      "auth_scope_notes": "Requires normal project member read scope.",
      "audit_log_notes": "Standard request logging is sufficient.",
      "rollback_notes": "No rollback needed for read-only tool."
    }
  ]
}
```

## Required Tool Fields

Every tool candidate requires:

- `tool_name`
- `description`
- `source_endpoint`
- `input_schema`
- `output_shape_notes`
- `risk_level`
- `requires_confirmation`
- `auth_scope_notes`
- `audit_log_notes`
- `rollback_notes`

`source_endpoint` must include at least `method`, `path`, and `source`.

## README Template

Use this content when creating `knowject/tools/README.md`:

```markdown
# knowject/tools/

This folder stores MCP tool design artifacts produced by `knowject-mcp-tool-designer`.

- `mcp-tools.plan.md` explains the candidate tools and implementation notes.
- `mcp-tools.schema.json` is the machine-readable tool candidate file.
- `tool-risk-report.md` records risk labels, confirmation gates, auth notes, audit notes, and rollback notes.
- These files are design artifacts only. They do not implement an MCP server or runtime handlers.
- Do not store secrets, tokens, API keys, DB URLs, cookies, auth headers, base URLs, or environment-specific values here.

Review diffs before committing tool design updates.
```

## Markdown Artifact Requirements

`mcp-tools.plan.md` should include:

- source summary
- candidate tool table
- per-tool implementation notes
- skipped endpoints
- explicit Day-1 non-goals

`tool-risk-report.md` should include:

- risk summary by level
- confirmation gates
- sensitive-data concerns
- auth scope notes
- audit and rollback notes

Do not claim the tools are implemented or safe to run without implementation review.

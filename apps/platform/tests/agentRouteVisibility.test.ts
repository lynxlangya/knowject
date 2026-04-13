import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("global agents page stays hidden behind a dedicated navigation flag", () => {
  const featuresSource = readFileSync(
    new URL("../src/app/navigation/features.ts", import.meta.url),
    "utf8",
  );
  const menuSource = readFileSync(
    new URL("../src/app/navigation/menu.tsx", import.meta.url),
    "utf8",
  );
  const routesSource = readFileSync(
    new URL("../src/app/navigation/routes.tsx", import.meta.url),
    "utf8",
  );
  const resourcesPageSource = readFileSync(
    new URL("../src/pages/project/ProjectResourcesPage.tsx", import.meta.url),
    "utf8",
  );
  const resourceGroupSource = readFileSync(
    new URL(
      "../src/pages/project/components/ProjectResourceGroup.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(featuresSource, /export const AGENTS_FEATURE_ENABLED = false;/);
  assert.match(
    featuresSource,
    /export const AGENTS_GLOBAL_PAGE_ENABLED = AGENTS_FEATURE_ENABLED;/,
  );
  assert.match(menuSource, /if \(AGENTS_GLOBAL_PAGE_ENABLED\) \{/);
  assert.match(menuSource, /key: PATHS\.agents/);
  assert.match(
    routesSource,
    /path: PATHS\.agents,[\s\S]*<Navigate to=\{PATHS\.home\} replace \/>/,
  );
  assert.match(resourceGroupSource, /showOpenGlobal = true/);
  assert.match(
    resourceGroupSource,
    /\{showOpenGlobal \? \([\s\S]*<Tooltip[\s\S]*onClick=\{onOpenGlobal\}/,
  );
  assert.match(
    resourcesPageSource,
    /showOpenGlobal=\{[\s\S]*group\.key !== "agents" \|\| AGENTS_GLOBAL_PAGE_ENABLED[\s\S]*\}/,
  );
});

test("v1 keeps agent project surfaces hidden while preserving the underlying model", () => {
  const featuresSource = readFileSync(
    new URL("../src/app/navigation/features.ts", import.meta.url),
    "utf8",
  );
  const siderSource = readFileSync(
    new URL("../src/app/layouts/components/AppSider.tsx", import.meta.url),
    "utf8",
  );
  const formSource = readFileSync(
    new URL(
      "../src/app/layouts/components/ProjectFormModal.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const optionsSource = readFileSync(
    new URL("../src/app/project/useProjectResourceOptions.ts", import.meta.url),
    "utf8",
  );
  const routeRedirectSource = readFileSync(
    new URL("../src/app/navigation/routeRedirects.tsx", import.meta.url),
    "utf8",
  );
  const catalogsSource = readFileSync(
    new URL("../src/pages/project/useGlobalAssetCatalogs.ts", import.meta.url),
    "utf8",
  );
  const resourceSummarySource = readFileSync(
    new URL(
      "../src/pages/project/adapters/projectResourceSummary.adapter.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const memberPanelSource = readFileSync(
    new URL(
      "../src/pages/members/components/MemberDetailPanel.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    featuresSource,
    /export const AGENTS_PROJECT_BINDING_ENABLED = AGENTS_FEATURE_ENABLED;/,
  );
  assert.match(
    siderSource,
    /agentIds: AGENTS_PROJECT_BINDING_ENABLED[\s\S]*editingProject\?\.agentIds \?\? \[\]/,
  );
  assert.match(
    formSource,
    /\{AGENTS_PROJECT_BINDING_ENABLED \? \([\s\S]*name="agentIds"[\s\S]*\) : null\}/,
  );
  assert.match(
    optionsSource,
    /AGENTS_PROJECT_BINDING_ENABLED\s*\?\s*listAgents\(\)\s*:\s*Promise\.resolve\(\{ items: \[\] \}\)/,
  );
  assert.match(
    routeRedirectSource,
    /if \(focus === "agents" && !AGENTS_FEATURE_ENABLED\)/,
  );
  assert.match(
    catalogsSource,
    /AGENTS_FEATURE_ENABLED \? listAgents\(\) : Promise\.resolve\(\{ items: \[\] \}\)/,
  );
  assert.doesNotMatch(resourceSummarySource, /resources\.summary\.agents/);
  assert.match(
    memberPanelSource,
    /AGENTS_FEATURE_ENABLED\s*\?\s*\["knowledge", "skills", "agents"\]\s*:\s*\["knowledge", "skills"\]/,
  );
});

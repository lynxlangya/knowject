import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("skills page wires creation modal without restoring legacy editor/view drawers", () => {
  const pageSource = readFileSync(
    new URL("../src/pages/skills/SkillsManagementPage.tsx", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /PlusOutlined/);
  assert.match(pageSource, /SkillCreationModal/);
  assert.match(pageSource, /skills\.create/);
  assert.doesNotMatch(pageSource, /SkillEditorModal/);
  assert.doesNotMatch(pageSource, /SkillViewerDrawer/);
  assert.doesNotMatch(pageSource, /useSkillEditor/);
  assert.doesNotMatch(pageSource, /useSkillViewer/);
});

test("skills list state only loads team skills for the live page", () => {
  const source = readFileSync(
    new URL("../src/pages/skills/hooks/useSkillsListState.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /await listSkills\(\{ source: "team" \}\)/);
});

test("skill detail pane removes view and edit actions from the live surface", () => {
  const source = readFileSync(
    new URL(
      "../src/pages/skills/components/SkillDetailPane.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.doesNotMatch(source, /EyeOutlined/);
  assert.doesNotMatch(source, /EditOutlined/);
  assert.doesNotMatch(source, /key: 'view'/);
  assert.doesNotMatch(source, /key: 'edit'/);
  assert.doesNotMatch(source, /SOURCE_META/);
});

test("skill creation flow uses async job modal, cards, and drawer", () => {
  const modalSource = readFileSync(
    new URL(
      "../src/pages/skills/components/SkillCreationModal.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const jobsHookSource = readFileSync(
    new URL(
      "../src/pages/skills/hooks/useSkillCreationJobs.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const drawerSource = readFileSync(
    new URL(
      "../src/pages/skills/components/SkillCreationDraftDrawer.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(modalSource, /submitCreateJob/);
  assert.match(modalSource, /skills\.creation\.jobs\.feedback\.submitFailed/);
  assert.match(jobsHookSource, /createSkillCreationJob/);
  assert.match(jobsHookSource, /listSkillCreationJobs/);
  assert.match(jobsHookSource, /getSkillCreationJob/);
  assert.match(drawerSource, /refineSkillCreationJob/);
  assert.match(drawerSource, /saveSkillCreationJob/);
  assert.match(drawerSource, /handleUndoOptimize/);
  assert.match(drawerSource, /syncSkillCreationDraftFrontmatter/);
  assert.match(drawerSource, /lastOptimizationSnapshot/);
});

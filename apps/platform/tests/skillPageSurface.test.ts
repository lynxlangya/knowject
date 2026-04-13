import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("skills page no longer wires create or view drawers", () => {
  const pageSource = readFileSync(
    new URL("../src/pages/skills/SkillsManagementPage.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(pageSource, /PlusOutlined/);
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

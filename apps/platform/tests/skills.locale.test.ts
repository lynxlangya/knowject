import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { pagesMessages as pagesMessagesEn } from "../src/i18n/locales/en/pages";
import { pagesMessages as pagesMessagesZhCN } from "../src/i18n/locales/zh-CN/pages";

const files = [
  "../src/pages/skills/SkillsManagementPage.tsx",
  "../src/pages/skills/components/SkillDetailPane.tsx",
  "../src/pages/skills/components/SkillEditorModal.tsx",
  "../src/pages/skills/components/SkillDefinitionListField.tsx",
  "../src/pages/skills/constants/skillsManagement.constants.ts",
  "../src/pages/skills/hooks/useSkillCatalogActions.ts",
  "../src/pages/skills/hooks/useSkillEditor.ts",
  "../src/pages/skills/hooks/useSkillsListState.ts",
  "../src/pages/skills/skillDefinition.ts",
  "../src/pages/skills/skills.i18n.ts",
] as const;

test("pages locale resources expose mirrored skills section", () => {
  const enPages = pagesMessagesEn as Record<string, unknown>;
  const zhPages = pagesMessagesZhCN as Record<string, unknown>;
  const enSkills = enPages.skills as Record<string, unknown> | undefined;
  const zhSkills = zhPages.skills as Record<string, unknown> | undefined;

  assert.ok(enSkills);
  assert.ok(zhSkills);
  assert.deepEqual(Object.keys(enSkills), Object.keys(zhSkills));
});

test("skills locale resources reflect structured method-asset vocabulary", () => {
  const enPages = pagesMessagesEn as Record<string, unknown>;
  const zhPages = pagesMessagesZhCN as Record<string, unknown>;
  const enSkills = enPages.skills as Record<string, unknown>;
  const zhSkills = zhPages.skills as Record<string, unknown>;
  const enAction = enSkills.action as Record<string, unknown>;
  const zhAction = zhSkills.action as Record<string, unknown>;
  const enSource = enSkills.source as Record<string, unknown>;
  const zhSource = zhSkills.source as Record<string, unknown>;
  const enStatus = enSkills.status as Record<string, unknown>;
  const zhStatus = zhSkills.status as Record<string, unknown>;
  const enDefinition = enSkills.definition as Record<string, unknown>;
  const zhDefinition = zhSkills.definition as Record<string, unknown>;

  assert.ok(enStatus);
  assert.ok(zhStatus);
  assert.ok(enDefinition);
  assert.ok(zhDefinition);
  assert.ok(!("import" in enSkills));
  assert.ok(!("import" in zhSkills));
  assert.ok(!("importFlow" in enSkills));
  assert.ok(!("importFlow" in zhSkills));
  assert.ok(!("publish" in enAction));
  assert.ok(!("publish" in zhAction));
  assert.equal(enSource.preset, "Preset");
  assert.equal(zhSource.preset, "预置");
  assert.equal(enSource.team, "Team");
  assert.equal(zhSource.team, "团队");
});

test("skills locale resources freeze conversation authoring copy", () => {
  const enPages = pagesMessagesEn as Record<string, unknown>;
  const zhPages = pagesMessagesZhCN as Record<string, unknown>;
  const enSkills = enPages.skills as Record<string, unknown>;
  const zhSkills = zhPages.skills as Record<string, unknown>;
  const enAuthoring = enSkills.authoring as Record<string, unknown>;
  const zhAuthoring = zhSkills.authoring as Record<string, unknown>;
  const enScope = enAuthoring.scope as Record<string, unknown>;
  const zhScope = zhAuthoring.scope as Record<string, unknown>;
  const enInference = enAuthoring.inference as Record<string, unknown>;
  const zhInference = zhAuthoring.inference as Record<string, unknown>;
  const enActions = enAuthoring.actions as Record<string, unknown>;
  const zhActions = zhAuthoring.actions as Record<string, unknown>;

  assert.ok(enAuthoring);
  assert.ok(zhAuthoring);
  assert.ok(enScope);
  assert.ok(zhScope);
  assert.ok(enInference);
  assert.ok(zhInference);
  assert.ok(enActions);
  assert.ok(zhActions);

  assert.equal(
    zhAuthoring.intro,
    "直接描述这个 Skill 想解决什么问题，我会在对话里逐步收敛范围并整理草稿。",
  );
  assert.equal(
    enAuthoring.intro,
    "Describe the problem this Skill should solve, and the conversation will gradually narrow the scope and draft.",
  );
  assert.equal(zhActions.confirmDraft, "确认并填充 Skill");
  assert.equal(enActions.confirmDraft, "Confirm and fill Skill");
  assert.equal(zhActions.reset, "重置");
  assert.equal(enActions.reset, "Reset");
  assert.equal(zhScope.title, "可选：校正这个 Skill 的目标场景和参考范围");
  assert.equal(
    enScope.title,
    "Optional: adjust the target scenario and reference scope for this Skill",
  );
  assert.equal(zhInference.title, "系统推断中...");
  assert.equal(enInference.title, "Inferring...");
  assert.equal(zhInference.summary, "当前摘要");
  assert.equal(enInference.summary, "Current summary");
  assert.equal(zhInference.emptyCategory, "当前分类推断中...");
  assert.equal(
    enInference.emptyCategory,
    "Current category still inferring...",
  );
  assert.equal(zhInference.emptyTargets, "当前范围推断中...");
  assert.equal(enInference.emptyTargets, "Current scope still inferring...");
});

test("skills contract and governance docs mention the live authoring turn flow", () => {
  const contractSource = readFileSync(
    new URL("../../../docs/contracts/skills-contract.md", import.meta.url),
    "utf8",
  );
  const governanceSource = readFileSync(
    new URL("../../../docs/current/skills-governance.md", import.meta.url),
    "utf8",
  );

  assert.match(contractSource, /POST \/api\/skills\/authoring\/turns/);
  assert.match(contractSource, /POST \/api\/skills\/authoring\/turns\/stream/);
  assert.match(
    contractSource,
    /scope\?: \{ scenario: SkillCategory; targets: string\[\] \} \| null/,
  );
  assert.match(contractSource, /currentStructuredDraft/);
  assert.match(contractSource, /currentInference/);
  assert.match(contractSource, /humanOverrides/);
  assert.match(contractSource, /ack` 仅表示 stream 已建立/);

  assert.match(governanceSource, /conversation/);
  assert.match(governanceSource, /structuredDraft/);
  assert.match(governanceSource, /authoring\/turns\/stream/);
  assert.match(governanceSource, /currentInference/);
  assert.match(governanceSource, /humanOverrides/);
  assert.match(governanceSource, /ack.*连接已建立/);
  assert.match(governanceSource, /直接开始对话/);
  assert.match(governanceSource, /POST \/api\/skills/);
});

for (const file of files) {
  test(`${file} resolves user-facing copy from skills i18n`, () => {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");

    assert.match(source, /useTranslation\(|i18n\.t\(|\btp\(/);
  });
}

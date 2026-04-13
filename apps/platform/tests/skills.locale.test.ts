import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { pagesMessages as pagesMessagesEn } from "../src/i18n/locales/en/pages";
import { pagesMessages as pagesMessagesZhCN } from "../src/i18n/locales/zh-CN/pages";

const files = [
  "../src/pages/skills/SkillsManagementPage.tsx",
  "../src/pages/skills/components/SkillDetailPane.tsx",
  "../src/pages/skills/constants/skillsManagement.constants.ts",
  "../src/pages/skills/hooks/useSkillCatalogActions.ts",
  "../src/pages/skills/hooks/useSkillsListState.ts",
  "../src/pages/skills/skills.i18n.ts",
  "../src/pages/skills/utils/skillFilter.ts",
  "../src/pages/skills/utils/skillSummary.ts",
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
  assert.ok(!("source" in enSkills));
  assert.ok(!("source" in zhSkills));
});

test("skills locale resources keep mirrored cleanup-ready keys after removing drawers", () => {
  const enPages = pagesMessagesEn as Record<string, unknown>;
  const zhPages = pagesMessagesZhCN as Record<string, unknown>;
  const enSkills = enPages.skills as Record<string, unknown>;
  const zhSkills = zhPages.skills as Record<string, unknown>;
  const enAction = enSkills.action as Record<string, unknown>;
  const zhAction = zhSkills.action as Record<string, unknown>;
  const enSummary = enSkills.summary as Record<string, unknown>;
  const zhSummary = zhSkills.summary as Record<string, unknown>;
  const enFilters = enSkills.filters as Record<string, unknown>;
  const zhFilters = zhSkills.filters as Record<string, unknown>;

  assert.ok(enAction);
  assert.ok(zhAction);
  assert.ok(enSummary);
  assert.ok(zhSummary);
  assert.ok(enFilters);
  assert.ok(zhFilters);

  assert.equal(zhAction.delete, "删除");
  assert.equal(enAction.delete, "Delete");
  assert.equal(zhSummary.total, "技能总数");
  assert.equal(enSummary.total, "Skills total");
  assert.equal(zhFilters.active, "启用中");
  assert.equal(enFilters.active, "Active");
});

test("skills contract and governance docs no longer describe live create drawers or authoring flow on the page", () => {
  const contractSource = readFileSync(
    new URL("../../../docs/contracts/skills-contract.md", import.meta.url),
    "utf8",
  );
  const governanceSource = readFileSync(
    new URL("../../../docs/current/skills-governance.md", import.meta.url),
    "utf8",
  );

  assert.match(contractSource, /GET \/api\/skills/);
  assert.match(contractSource, /PATCH \/api\/skills\/:skillId/);
  assert.match(contractSource, /POST \/api\/skills/);
  assert.match(governanceSource, /\/skills/);
  assert.match(governanceSource, /POST \/api\/skills/);
  assert.match(governanceSource, /不再暴露：/);
  assert.match(governanceSource, /conversation-first authoring/);
  assert.match(governanceSource, /查看抽屉/);
});

for (const file of files) {
  test(`${file} resolves user-facing copy from skills i18n`, () => {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");

    assert.match(source, /useTranslation\(|i18n\.t\(|\btp\(/);
  });
}

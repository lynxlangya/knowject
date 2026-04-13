import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTHORING_SUMMARY_ITEM_LIMIT,
  buildAuthoringSummaryItems,
} from "../src/pages/skills/utils/authoringSummary";

test("buildAuthoringSummaryItems keeps only the latest four pipe-delimited items", () => {
  const items = buildAuthoringSummaryItems(
    "目标已明确 | 分类偏向研发执行 | 范围锁定 skills 页面 | 需要输出结构化草稿 | 需要补充预览联动",
  );

  assert.deepEqual(items, [
    "分类偏向研发执行",
    "范围锁定 skills 页面",
    "需要输出结构化草稿",
    "需要补充预览联动",
  ]);
  assert.equal(items.length, AUTHORING_SUMMARY_ITEM_LIMIT);
});

test("buildAuthoringSummaryItems strips numbering and bullet prefixes", () => {
  const items = buildAuthoringSummaryItems(`
    1. 收敛 Skill 目标
    2. 明确适用范围
    3. 补充输出约束
  `);

  assert.deepEqual(items, ["收敛 Skill 目标", "明确适用范围", "补充输出约束"]);
});

test("buildAuthoringSummaryItems returns empty list for blank summary", () => {
  assert.deepEqual(buildAuthoringSummaryItems("   "), []);
});

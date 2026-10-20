import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const appConfig = JSON.parse(readFileSync(join(root, "app.json"), "utf8"));
const projectConfig = JSON.parse(
  readFileSync(join(root, "project.config.json"), "utf8"),
);

assert.equal(projectConfig.compileType, "miniprogram");
assert.equal(projectConfig.miniprogramRoot, "./");
for (const folder of ["assets", "docs", "tests", "scripts", "writing-workspace", "image-cards", ".workbuddy", "node_modules"]) {
  assert.ok(projectConfig.packOptions?.ignore.some((item) => item.type === "folder" && item.value === folder));
}
readFileSync(join(root, "images/share-entry.png"));
readFileSync(join(root, "images/share-celebration.png"));
readFileSync(join(root, "images/share-habits.png"));
assert.deepEqual(appConfig.pages, [
  "pages/habits/habits",
  "pages/journal/journal",
  "pages/home/home",
  "pages/decision/decision",
  "pages/decision-result/decision-result",
  "pages/decision-check/decision-check",
  "pages/about/about",
  "pages/calculator/calculator",
  "pages/result/result",
  "pages/breakeven/breakeven",
]);
assert.deepEqual(appConfig.tabBar.list.map((item) => item.pagePath), ["pages/habits/habits", "pages/home/home"]);
for (const item of appConfig.tabBar.list) {
  readFileSync(join(root, item.iconPath));
  readFileSync(join(root, item.selectedIconPath));
}

for (const page of appConfig.pages) {
  for (const extension of ["js", "json", "wxml", "wxss"]) {
    readFileSync(join(root, `${page}.${extension}`));
  }
  JSON.parse(readFileSync(join(root, `${page}.json`), "utf8"));
}

const sourceFiles = [
  ...appConfig.pages.map((page) => `${page}.js`),
  "pages/calculator/calculator.js",
  "pages/result/result.js",
  "pages/breakeven/breakeven.js",
  "utils/share.js",
  "utils/offer-analysis.js",
  "utils/offer-validation.js",
];
const forbidden = /\b(window|document|navigator|localStorage)\b/;
sourceFiles.forEach((file) => {
  const source = readFileSync(join(root, file), "utf8");
  assert.equal(forbidden.test(source), false, `${file} contains a web-only API`);
});

const calculatorTemplate = readFileSync(
  join(root, "pages/calculator/calculator.wxml"),
  "utf8",
);
const homeTemplate = readFileSync(join(root, "pages/home/home.wxml"), "utf8");
assert.match(homeTemplate, /class="offer-entry"/);
assert.match(homeTemplate, /data-id="offer"/);
assert.match(homeTemplate, /item.entryTitle/);
const scenarios = readFileSync(join(root, "utils/decision-data.js"), "utf8");
for (const title of ["租房与通勤", "空窗期预算", "学习投入", "消费选择", "换城市生活", "副业尝试"]) assert.ok(scenarios.includes(title));
assert.doesNotMatch(homeTemplate, /<br\s*\//);
assert.match(calculatorTemplate, /aria-label=/);
assert.match(calculatorTemplate, /field-error/);
assert.match(calculatorTemplate, /field-input-salary/);
assert.match(calculatorTemplate, /五险一金/);
assert.match(calculatorTemplate, /toggleBenefits/);
assert.doesNotMatch(calculatorTemplate, /preset-list|selectPreset/);

const resultTemplate = readFileSync(
  join(root, "pages/result/result.wxml"),
  "utf8",
);
assert.match(resultTemplate, /open-type="share"/);
assert.match(resultTemplate, /分享给朋友/);
assert.match(resultTemplate, /公司公积金年缴会计入综合价值和综合时薪/);

const breakEvenTemplate = readFileSync(
  join(root, "pages/breakeven/breakeven.wxml"),
  "utf8",
);
assert.match(breakEvenTemplate, /<slider/);
assert.match(breakEvenTemplate, /bindchanging="changeBonus"/);
assert.match(breakEvenTemplate, /bindchanging="changeWeeklyHours"/);
assert.doesNotMatch(breakEvenTemplate, /bindtap="recalculateScenario"/);
assert.match(breakEvenTemplate, /只改变假设，不改原始数据/);

console.log("Mini program structure check passed.");

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
assert.deepEqual(appConfig.pages, [
  "pages/calculator/calculator",
  "pages/result/result",
]);

for (const page of appConfig.pages) {
  for (const extension of ["js", "json", "wxml", "wxss"]) {
    readFileSync(join(root, `${page}.${extension}`));
  }
  JSON.parse(readFileSync(join(root, `${page}.json`), "utf8"));
}

const sourceFiles = [
  "pages/calculator/calculator.js",
  "pages/result/result.js",
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
assert.match(calculatorTemplate, /aria-label=/);
assert.match(calculatorTemplate, /field-error/);

console.log("Mini program structure check passed.");

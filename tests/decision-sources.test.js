const assert = require("node:assert/strict");
const test = require("node:test");
const { SOURCES, METHOD_NOTES, CONTENT_NOTICE, PRIVACY_SECTIONS, getPublicSourceUrl } = require("../utils/decision-sources");

test("bundled reference distinguishes source verification from policy review", () => {
  assert.equal(SOURCES.length, 1);
  const source = SOURCES[0];
  assert.equal(source.author, "eternity4719");
  assert.match(source.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(source.licenseName, /CC BY 4.0/);
  assert.match(source.adaptation, /重新设计/);
  assert.match(source.reviewScope, /不代表逐条验证/);
  assert.match(source.versionLabel, /可能更新/);
  assert.match(CONTENT_NOTICE, /填写提醒/);
  assert.match(CONTENT_NOTICE, /不冒充研究结论/);
});

test("each scenario has a model explanation rather than a universal recommendation", () => {
  assert.deepEqual(METHOD_NOTES.map((note) => note.id), ["habits", "offer", "rent", "budget"]);
  assert.match(METHOD_NOTES[0].body, /空白睡眠不按零小时/);
  assert.match(METHOD_NOTES[1].body, /不是税后到账收入/);
  assert.match(METHOD_NOTES[2].body, /未计押金/);
  assert.match(METHOD_NOTES[3].body, /向下保留一位小数/);
});

test("public source links cannot contain caller supplied URLs or private values", () => {
  for (const id of ["project", "article", "license"]) {
    const url = new URL(getPublicSourceUrl(id));
    assert.equal(url.protocol, "https:");
    assert.equal(url.search, "");
    assert.equal(url.username, "");
    assert.equal(url.password, "");
  }
  for (const invalid of ["https://example.com/private", "project?salary=25000", "__proto__", "constructor", null, undefined]) {
    assert.equal(getPublicSourceUrl(invalid), null);
  }
});

test("privacy copy states device limitations without promising encryption or recovery", () => {
  const text = PRIVACY_SECTIONS.map((section) => section.body).join("\n");
  assert.match(text, /不是加密保险箱/);
  assert.match(text, /没有云端备份/);
  assert.match(text, /当前场景/);
  assert.match(text, /三个场景/);
  assert.match(text, /平台自身/);
  assert.match(text, /不携带个人输入/);
});

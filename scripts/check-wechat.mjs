import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const resources = "/Applications/wechatwebdevtools.app/Contents/Resources";
const compilerDir = process.env.WECHAT_COMPILER_DIR || [
  join(resources, "app.asar.unpacked/node_modules/wcc-exec"),
  join(resources, "package.nw/node_modules/wcc-exec"),
].find((dir) => existsSync(join(dir, "wcc"))) || join(resources, "package.nw/node_modules/wcc-exec");
for (const name of ["wcc", "wcsc"]) {
  if (!existsSync(join(compilerDir, name))) throw new Error(`缺少微信编译器 ${name}；请配置 WECHAT_COMPILER_DIR`);
}
const pages = JSON.parse(readFileSync("app.json", "utf8")).pages;
function compile(name, files) {
  const result = spawnSync(join(compilerDir, name), files, { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${name}: ${result.error?.message || result.stderr || result.stdout}`);
}
for (const page of pages) compile("wcc", [`${page}.wxml`]);
compile("wcsc", ["app.wxss", ...pages.map((page) => `${page}.wxss`), "styles/decision.wxss"]);
console.log(`微信原生编译通过：${pages.length} 个 WXML 页面及全部 WXSS。`);

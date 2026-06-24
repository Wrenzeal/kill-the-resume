import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("./popup.js", import.meta.url), "utf8");
const injected = source.replace(
  /init\(\)\.catch\(\(error\) => setStatus\(`初始化失败：\$\{error\.message\}`\)\);/,
  "",
).replace(
  /saveButton\.addEventListener[\s\S]*?form\.addEventListener\("submit",[\s\S]*?\n\}\);\n/,
  "",
);

function runWithDocument(documentStub) {
  const sandbox = {
    console,
    URL,
    window: {
      location: { href: documentStub.url, hostname: new URL(documentStub.url).hostname },
      getSelection: () => ({ toString: () => documentStub.selection || "" }),
    },
    document: documentStub,
    chrome: {
      storage: { local: { get: async () => ({}), set: async () => {} } },
      tabs: { query: async () => [] },
      scripting: { executeScript: async () => [] },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(injected, sandbox, { filename: "popup.js" });
  return vm.runInContext("extractCurrentJobPosting()", sandbox);
}

function createDocument({ url, title, h1, salary, bodyText }) {
  const canonical = { href: url };
  const elements = new Map([
    ['link[rel="canonical"]', canonical],
    ["h1", { innerText: h1, textContent: h1 }],
    [".salary", { innerText: salary, textContent: salary }],
    ["[class*='salary']", { innerText: salary, textContent: salary }],
    ["body", { innerText: bodyText, textContent: bodyText }],
  ]);
  return {
    url,
    title,
    body: { innerText: bodyText, textContent: bodyText },
    querySelector(selector) {
      return elements.get(selector) || null;
    },
    querySelectorAll(selector) {
      const element = elements.get(selector);
      return element ? [element] : [];
    },
  };
}

const boss = runWithDocument(createDocument({
  url: "https://www.zhipin.com/job_detail/test.html",
  title: "后端工程师_Boss直聘",
  h1: "后端工程师",
  salary: "薪资ï¿½ï¿½ï¿½",
  bodyText: "后端工程师\n薪资：20 - 35 K · 14薪\n岗位职责：负责 Go 服务开发。",
}));
assert.equal(boss.posting.salary, "20-35K×14薪");

const generic = runWithDocument(createDocument({
  url: "https://example.com/jobs/1",
  title: "Senior Backend Engineer",
  h1: "Senior Backend Engineer",
  salary: "",
  bodyText: "Compensation: 80 to 120 USD/year\nRemote role.",
}));
assert.equal(generic.posting.salary, "80-120USD/year");

console.log("popup salary parsing regression passed");

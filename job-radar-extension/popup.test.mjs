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

function createDocument({ url, title, h1, salary, bodyText, selectors = {}, selectorLists = {} }) {
  const canonical = { href: url };
  const element = (value) => ({ innerText: value, textContent: value });
  const elements = new Map([
    ['link[rel="canonical"]', canonical],
    ["h1", element(h1)],
    [".salary", element(salary)],
    ["[class*='salary']", element(salary)],
    ["body", element(bodyText)],
    ...Object.entries(selectors).map(([selector, value]) => [selector, element(value)]),
  ]);
  const lists = new Map(Object.entries(selectorLists).map(([selector, values]) => [selector, values.map(element)]));
  return {
    url,
    title,
    body: element(bodyText),
    querySelector(selector) {
      return elements.get(selector) || lists.get(selector)?.[0] || null;
    },
    querySelectorAll(selector) {
      if (lists.has(selector)) return lists.get(selector);
      const matched = elements.get(selector);
      return matched ? [matched] : [];
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
assert.deepEqual(Array.from(boss.posting.criteria.keywords), ["后端", "Backend"]);
assert.deepEqual(Array.from(boss.posting.criteria.requiredSkills), ["Golang"]);


const bossWithCriteria = runWithDocument(createDocument({
  url: "https://www.zhipin.com/job_detail/backend.html",
  title: "Golang后端开发工程师_Boss直聘",
  h1: "Golang后端开发工程师",
  salary: "25-40K·15薪",
  bodyText: "职位要求：熟悉 Go、Redis、MySQL、Docker，有微服务经验。",
  selectors: {
    ".job-address": "天津·南开区·金融街",
  },
  selectorLists: {
    ".job-tags span": ["Golang", "MySQL", "Redis", "Docker", "微服务"],
  },
}));
assert.deepEqual(Array.from(bossWithCriteria.posting.criteria.keywords), ["后端", "Backend", "Golang"]);
assert.deepEqual(Array.from(bossWithCriteria.posting.criteria.locations), ["天津"]);
assert.deepEqual(Array.from(bossWithCriteria.posting.criteria.requiredSkills), ["Golang", "MySQL", "Redis", "Docker", "微服务"]);

const generic = runWithDocument(createDocument({
  url: "https://example.com/jobs/1",
  title: "Senior Backend Engineer",
  h1: "Senior Backend Engineer",
  salary: "",
  bodyText: "Compensation: 80 to 120 USD/year\nRemote role.",
}));
assert.equal(generic.posting.salary, "80-120USD/year");

console.log("popup parsing regression passed");

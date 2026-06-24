const DEFAULT_API_BASE_URL = "https://api.killer.wrenzeal.top/api/v1";
const STORAGE_KEYS = [
  "apiBaseUrl",
  "token",
  "keywords",
  "criteriaLocations",
  "requiredSkills",
  "excludeKeywords",
];

const fields = {
  apiBaseUrl: document.querySelector("#apiBaseUrl"),
  token: document.querySelector("#token"),
  sourceName: document.querySelector("#sourceName"),
  sourceUrl: document.querySelector("#sourceUrl"),
  title: document.querySelector("#title"),
  companyName: document.querySelector("#companyName"),
  companyNature: document.querySelector("#companyNature"),
  location: document.querySelector("#location"),
  salary: document.querySelector("#salary"),
  rawText: document.querySelector("#rawText"),
  keywords: document.querySelector("#keywords"),
  criteriaLocations: document.querySelector("#criteriaLocations"),
  requiredSkills: document.querySelector("#requiredSkills"),
  excludeKeywords: document.querySelector("#excludeKeywords"),
};

const statusEl = document.querySelector("#status");
const form = document.querySelector("#collector-form");
const saveButton = document.querySelector("#save-settings");
const autoFillButton = document.querySelector("#auto-fill-page");
const sendButton = document.querySelector("#send");

init().catch((error) => setStatus(`初始化失败：${error.message}`));

async function init() {
  const saved = await chrome.storage.local.get(STORAGE_KEYS);
  fields.apiBaseUrl.value = saved.apiBaseUrl || DEFAULT_API_BASE_URL;
  fields.token.value = saved.token || "";
  fields.keywords.value = saved.keywords || "";
  fields.criteriaLocations.value = saved.criteriaLocations || "";
  fields.requiredSkills.value = saved.requiredSkills || "";
  fields.excludeKeywords.value = saved.excludeKeywords || "";

  await autoFillFromActivePage({ force: false });
}

saveButton.addEventListener("click", async () => {
  await saveSettings();
  setStatus("设置已保存。", "ok");
});

autoFillButton.addEventListener("click", async () => {
  autoFillButton.disabled = true;
  autoFillButton.textContent = "Reading...";
  try {
    await autoFillFromActivePage({ force: true });
  } finally {
    autoFillButton.disabled = false;
    autoFillButton.textContent = "Re-read Page";
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("");

  const apiBaseUrl = normalizeApiBaseUrl(fields.apiBaseUrl.value || DEFAULT_API_BASE_URL);
  const token = fields.token.value.trim();
  const sourceUrl = fields.sourceUrl.value.trim();
  if (!token) {
    setStatus("请先填写插件 Token（ktrp_ 开头，可在 Kill The Resume 的 /job-radar 页面生成）。");
    return;
  }
  if (!sourceUrl) {
    setStatus("原始链接不能为空。");
    return;
  }

  const criteria = {
    keywords: splitTokens(fields.keywords.value),
    locations: splitTokens(fields.criteriaLocations.value),
    companyNatures: [],
    requiredSkills: splitTokens(fields.requiredSkills.value),
    excludeKeywords: splitTokens(fields.excludeKeywords.value),
    minScore: 0,
  };

  const payload = {
    sourceName: fields.sourceName.value.trim(),
    sourceUrl,
    title: fields.title.value.trim(),
    companyName: fields.companyName.value.trim(),
    companyNature: fields.companyNature.value.trim(),
    location: fields.location.value.trim(),
    salary: fields.salary.value.trim(),
    description: fields.rawText.value.trim(),
    rawText: fields.rawText.value.trim(),
    criteria,
  };

  sendButton.disabled = true;
  sendButton.textContent = "Sending...";
  try {
    await saveSettings();
    const response = await fetch(`${apiBaseUrl}/job-radar/import`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(body?.error?.message || `HTTP ${response.status}`);
    }
    setStatus(`已写入机会雷达：${body?.job?.matchPercent ?? "?"}% match`, "ok");
  } catch (error) {
    setStatus(`导入失败：${error.message}`);
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = "Send";
  }
});

async function autoFillFromActivePage({ force }) {
  const tab = await getActiveTab();
  if (!tab?.id) {
    if (tab?.url) {
      setFieldValue("sourceUrl", tab.url, { force });
      setFieldValue("sourceName", inferSourceName(tab.url), { force });
    }
    if (tab?.title) {
      setFieldValue("title", cleanupTitle(tab.title), { force });
    }
    setStatus("未找到当前标签页。", "warn");
    return;
  }

  const page = await readActivePage(tab.id).catch((error) => ({ error: error.message }));
  if (page?.posting) {
    applyPosting(page.posting, { force });
    setStatus(formatAutoFillStatus(page), page.parser?.confidence >= 0.45 ? "ok" : "warn");
    return;
  }

  if (tab?.url) {
    setFieldValue("sourceUrl", tab.url, { force });
    setFieldValue("sourceName", inferSourceName(tab.url), { force });
  }
  if (tab?.title) {
    setFieldValue("title", cleanupTitle(tab.title), { force });
  }
  if (page?.error) {
    setStatus(`无法读取当前页面：${page.error}`, "warn");
    return;
  }
  setStatus("当前页面没有识别到岗位信息；可以手动粘贴岗位正文。", "warn");
}

function applyPosting(posting, { force }) {
  setFieldValue("sourceName", posting.sourceName, { force });
  setFieldValue("sourceUrl", posting.sourceUrl, { force });
  setFieldValue("title", posting.title, { force });
  setFieldValue("companyName", posting.companyName, { force });
  setFieldValue("companyNature", posting.companyNature, { force });
  setFieldValue("location", posting.location, { force });
  setFieldValue("salary", posting.salary, { force });
  setFieldValue("rawText", posting.rawText, { force });
}

function setFieldValue(field, value, { force }) {
  const normalized = String(value || "").trim();
  if (!normalized) return;
  if (force || !fields[field].value.trim()) {
    fields[field].value = normalized;
  }
}

async function saveSettings() {
  await chrome.storage.local.set({
    apiBaseUrl: normalizeApiBaseUrl(fields.apiBaseUrl.value || DEFAULT_API_BASE_URL),
    token: fields.token.value.trim(),
    keywords: fields.keywords.value.trim(),
    criteriaLocations: fields.criteriaLocations.value.trim(),
    requiredSkills: fields.requiredSkills.value.trim(),
    excludeKeywords: fields.excludeKeywords.value.trim(),
  });
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function readActivePage(tabId) {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    func: extractCurrentJobPosting,
  });
  return injection?.result || null;
}

function extractCurrentJobPosting() {
  const MAX_TEXT_LENGTH = 12000;
  const selectedText = cleanText(String(window.getSelection?.().toString() || ""));
  const canonical = document.querySelector('link[rel="canonical"]')?.href || window.location.href;
  const hostname = safeHostname(canonical || window.location.href);
  const sourceName = inferSourceName(canonical || window.location.href);
  const pageTitle = document.title || "";
  const adapter = pickAdapter(hostname);
  const parsed = adapter.parse({ canonical, hostname, pageTitle, selectedText, sourceName });
  const rawText = selectedText || parsed.rawText || getPageText();
  const title = cleanTitle(parsed.title || pickMeta("og:title") || pickText(["h1", "title"]) || pageTitle);
  const salary = cleanText(parsed.salary || findSalary(`${title}\n${rawText}`));
  const location = cleanText(parsed.location || findLocation(rawText));
  const posting = {
    sourceName,
    sourceUrl: canonical || window.location.href,
    title,
    companyName: cleanText(parsed.companyName),
    companyNature: cleanText(parsed.companyNature),
    location,
    salary,
    rawText: cleanText(rawText).slice(0, MAX_TEXT_LENGTH),
  };
  const fields = Object.entries(posting)
    .filter(([key, value]) => key !== "sourceUrl" && key !== "sourceName" && String(value || "").trim())
    .map(([key]) => key);
  const confidence = Math.min(1, Math.round((fields.length / 6) * 100) / 100);

  return {
    canonical: posting.sourceUrl,
    selectedText,
    title: pageTitle,
    posting,
    parser: {
      adapter: adapter.name,
      confidence,
      fields,
    },
  };

  function pickAdapter(currentHostname) {
    const adapters = [
      { name: "Boss直聘", match: /(^|\.)zhipin\.com$|(^|\.)kanzhun\.com$/.test(currentHostname), parse: parseBoss },
      { name: "猎聘", match: /(^|\.)liepin\.com$/.test(currentHostname), parse: parseLiepin },
      { name: "通用网页", match: true, parse: parseGeneric },
    ];
    return adapters.find((item) => item.match) || adapters.at(-1);
  }

  function parseBoss(context) {
    const title = pickText([
      ".job-banner .name h1",
      ".job-primary .name h1",
      ".job-info .name h1",
      ".job-title",
      ".name h1",
      "h1",
    ]);
    const salary = pickText([
      ".job-banner .salary",
      ".job-primary .salary",
      ".job-salary",
      ".salary",
      "[class*='salary']",
    ]);
    const companyName = pickText([
      ".company-info .name",
      ".company-info h3",
      ".job-company .name",
      ".sider-company .company-info a",
      ".company-name",
      "a[href*='/gongsi/']",
      "a[href*='/gongsir/']",
    ]);
    const companyNature = collectTexts([
      ".company-info .tag-list span",
      ".company-tag-list span",
      ".company-info p",
      ".level-list li",
      ".job-tags span",
    ], 8).join(", ");
    const location = pickText([
      ".job-address",
      ".job-location",
      ".location-address",
      ".text-city",
      ".job-primary .info-primary p",
      ".job-banner .info-primary p",
      "[class*='address']",
    ]);
    const rawText = context.selectedText || joinSectionTexts([
      ".job-detail",
      ".job-detail-section",
      ".detail-content",
      ".job-sec",
      ".job-description",
      ".job-detail-container",
      ".detail-box",
      "main",
    ]);

    return { title, salary, companyName, companyNature, location, rawText };
  }

  function parseLiepin(context) {
    const title = pickText([".job-title", ".name h1", "h1"]);
    const salary = pickText([".salary", ".job-salary", "[class*='salary']"]);
    const companyName = pickText([".company-name", ".company-info .name", "a[href*='/company/']"]);
    const companyNature = collectTexts([".company-tag span", ".company-tags span", ".labels span", ".tag-list span"], 8).join(", ");
    const location = pickText([".basic-infor span", ".job-address", ".location", "[class*='location']"]);
    const rawText = context.selectedText || joinSectionTexts([".job-intro-container", ".content", ".job-detail", "main"]);

    return { title, salary, companyName, companyNature, location, rawText };
  }

  function parseGeneric(context) {
    const rawText = context.selectedText || joinSectionTexts(["article", "main", "[role='main']", "body"]);
    return {
      title: pickText(["h1", "[class*='job-title']", "[class*='position-title']"]) || cleanTitle(context.pageTitle),
      salary: findSalary(`${context.pageTitle}\n${rawText}`),
      companyName: pickMeta("og:site_name") || pickText(["[class*='company']", "[class*='employer']"]),
      companyNature: collectTexts(["[class*='tag']", "[class*='label']"], 6).join(", "),
      location: findLocation(rawText),
      rawText,
    };
  }

  function pickText(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const text = cleanText(element?.innerText || element?.textContent || "");
      if (text) return text;
    }
    return "";
  }

  function collectTexts(selectors, limit) {
    const values = [];
    for (const selector of selectors) {
      for (const element of Array.from(document.querySelectorAll(selector))) {
        const text = cleanText(element.innerText || element.textContent || "");
        if (text && text.length <= 80 && !values.includes(text)) values.push(text);
        if (values.length >= limit) return values;
      }
    }
    return values;
  }

  function joinSectionTexts(selectors) {
    const values = [];
    for (const selector of selectors) {
      for (const element of Array.from(document.querySelectorAll(selector))) {
        const text = cleanText(element.innerText || element.textContent || "");
        if (text && text.length > 30 && !values.includes(text)) values.push(text);
        if (values.join("\n\n").length >= MAX_TEXT_LENGTH) return values.join("\n\n").slice(0, MAX_TEXT_LENGTH);
      }
      if (values.length) break;
    }
    return values.join("\n\n").slice(0, MAX_TEXT_LENGTH);
  }

  function getPageText() {
    const mainText = cleanText(document.querySelector("main")?.innerText || "");
    const bodyText = cleanText(document.body?.innerText || "");
    return (mainText || bodyText).slice(0, MAX_TEXT_LENGTH);
  }

  function pickMeta(name) {
    return cleanText(
      document.querySelector(`meta[property='${name}']`)?.content ||
      document.querySelector(`meta[name='${name}']`)?.content ||
      "",
    );
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function cleanTitle(value) {
    return cleanText(value)
      .replace(/[-_|｜].*?(招聘|直聘|猎聘|LinkedIn|拉勾|智联|前程无忧).*$/i, "")
      .replace(/\s*\d+(?:\.\d+)?\s*[-~—到]\s*\d+(?:\.\d+)?\s*[kK千万].*$/, "")
      .slice(0, 160);
  }

  function findSalary(text) {
    const match = cleanText(text).match(/(?:\d+(?:\.\d+)?\s*[-~—到]\s*)?\d+(?:\.\d+)?\s*(?:[kK]|千|万)(?:\s*[-~—到]\s*\d+(?:\.\d+)?\s*(?:[kK]|千|万))?(?:[·xX×*]\s*\d+薪?)?|薪资面议|面议/);
    return match?.[0] || "";
  }

  function findLocation(text) {
    const normalized = cleanText(text);
    const match = normalized.match(/(北京|上海|天津|重庆|深圳|广州|杭州|成都|南京|苏州|武汉|西安|长沙|郑州|青岛|济南|合肥|厦门|福州|宁波|无锡|佛山|东莞|珠海|远程|Remote)(?:[·\-/ ][\u4e00-\u9fa5A-Za-z0-9]+)?/i);
    return match?.[0] || "";
  }

  function safeHostname(url) {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return window.location.hostname.toLowerCase();
    }
  }

  function inferSourceName(url) {
    try {
      const currentHostname = new URL(url).hostname.toLowerCase();
      if (currentHostname.includes("zhipin")) return "Boss直聘";
      if (currentHostname.includes("liepin")) return "猎聘";
      if (currentHostname.includes("zhaopin")) return "智联招聘";
      if (currentHostname.includes("lagou")) return "拉勾";
      if (currentHostname.includes("51job")) return "前程无忧";
      if (currentHostname.includes("linkedin")) return "LinkedIn";
      return currentHostname.replace(/^www\./, "");
    } catch {
      return "招聘网站";
    }
  }
}

function inferSourceName(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes("zhipin")) return "Boss直聘";
    if (hostname.includes("liepin")) return "猎聘";
    if (hostname.includes("zhaopin")) return "智联招聘";
    if (hostname.includes("lagou")) return "拉勾";
    if (hostname.includes("51job")) return "前程无忧";
    if (hostname.includes("linkedin")) return "LinkedIn";
    return hostname.replace(/^www\./, "");
  } catch {
    return "招聘网站";
  }
}

function cleanupTitle(title) {
  return String(title || "")
    .replace(/[-_|｜].*?(招聘|直聘|猎聘|LinkedIn|拉勾|智联|前程无忧).*$/i, "")
    .trim()
    .slice(0, 160);
}

function normalizeApiBaseUrl(value) {
  return String(value || DEFAULT_API_BASE_URL).trim().replace(/\/+$/, "");
}

function splitTokens(value) {
  return String(value || "")
    .split(/[，,、;；|\n\r]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatAutoFillStatus(page) {
  const adapter = page.parser?.adapter || "通用网页";
  const fields = page.parser?.fields || [];
  if (!fields.length) {
    return `${adapter} 解析完成，但字段命中较少；请检查并手动补充。`;
  }
  return `${adapter} 自动解析完成：${fields.join(", ")}。请确认后发送。`;
}

function setStatus(message, tone = "error") {
  statusEl.textContent = message;
  statusEl.style.color = tone === "ok" ? "var(--green)" : tone === "warn" ? "var(--orange)" : "#f87171";
}

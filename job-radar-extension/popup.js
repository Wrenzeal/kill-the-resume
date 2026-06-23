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

  const tab = await getActiveTab();
  if (tab?.url) {
    fields.sourceUrl.value = tab.url;
    fields.sourceName.value = inferSourceName(tab.url);
  }
  if (tab?.title) {
    fields.title.value = cleanupTitle(tab.title);
  }

  const page = tab?.id ? await readActivePage(tab.id).catch(() => null) : null;
  if (page?.canonical) {
    fields.sourceUrl.value = page.canonical;
    fields.sourceName.value = inferSourceName(page.canonical);
  }
  if (page?.title && !fields.title.value) {
    fields.title.value = cleanupTitle(page.title);
  }
  if (page?.selectedText || page?.pageText) {
    fields.rawText.value = page.selectedText || page.pageText;
  }
}

saveButton.addEventListener("click", async () => {
  await saveSettings();
  setStatus("设置已保存。", "ok");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("");

  const apiBaseUrl = normalizeApiBaseUrl(fields.apiBaseUrl.value || DEFAULT_API_BASE_URL);
  const token = fields.token.value.trim();
  const sourceUrl = fields.sourceUrl.value.trim();
  if (!token) {
    setStatus("请先填写插件 Token（ktrp_ 开头，可在 Kill The Resume 账号面板生成）。");
    return;
  }
  if (!sourceUrl) {
    setStatus("原始链接不能为空。");
    return;
  }

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
    criteria: {
      keywords: splitTokens(fields.keywords.value),
      locations: splitTokens(fields.criteriaLocations.value || fields.location.value),
      companyNatures: splitTokens(fields.companyNature.value),
      requiredSkills: splitTokens(fields.requiredSkills.value),
      excludeKeywords: splitTokens(fields.excludeKeywords.value),
      minScore: 0,
    },
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
    func: () => {
      const selectedText = String(window.getSelection?.().toString() || "").trim();
      const canonical = document.querySelector('link[rel="canonical"]')?.href || window.location.href;
      const mainText = document.querySelector("main")?.innerText || "";
      const bodyText = document.body?.innerText || "";
      const pageText = (selectedText || mainText || bodyText).replace(/\n{3,}/g, "\n\n").trim().slice(0, 12000);
      return { canonical, pageText, selectedText, title: document.title };
    },
  });
  return injection?.result || null;
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
    .replace(/[-_|｜].*?(招聘|直聘|猎聘|LinkedIn).*$/i, "")
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

function setStatus(message, tone = "error") {
  statusEl.textContent = message;
  statusEl.style.color = tone === "ok" ? "var(--green)" : "var(--orange)";
}

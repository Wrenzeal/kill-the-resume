const DAY_MS = 24 * 60 * 60 * 1000;

export type JobFreshnessStatus = "hot" | "normal" | "stale" | "expired";

export const mockJobRadarSnapshotAt = "2026-06-22T12:00:00.000Z";

export interface JobRadarSearchCriteria {
  keywords: string[];
  locations: string[];
  companyNatures: string[];
  requiredSkills: string[];
  excludeKeywords: string[];
  minScore: number;
}

export interface JobPosting {
  id: string;
  sourceName: string;
  sourceJobId: string;
  sourceUrl: string;
  title: string;
  companyName: string;
  companyNature: string;
  location: string;
  salary: string;
  responsibilities: string[];
  requirements: string[];
  description: string;
  rawText?: string;
  postedAt: string;
  firstSeenAt: string;
  lastSeenAt: string;
  fetchedAt: string;
  expiresAt?: string;
}

export interface JobMatchResult extends Omit<JobPosting, "expiresAt"> {
  expiresAt: string;
  matchPercent: number;
  matchTags: string[];
  warningTags: string[];
  freshnessStatus: JobFreshnessStatus;
  freshnessLabel: string;
  freshnessRank: number;
  sortScore: number;
}

export const jobFreshnessPolicy = {
  hotWithinDays: 7,
  normalWithinDays: 30,
  staleWithinDays: 45,
  deleteAfterDays: 60,
} as const;

export const freshnessLabels: Record<JobFreshnessStatus, string> = {
  hot: "热点岗位",
  normal: "一般岗位",
  stale: "临期岗位",
  expired: "过期岗位",
};

const freshnessRanks: Record<JobFreshnessStatus, number> = {
  hot: 4,
  normal: 3,
  stale: 2,
  expired: 0,
};

const defaultCriteria: JobRadarSearchCriteria = {
  keywords: [],
  locations: [],
  companyNatures: [],
  requiredSkills: [],
  excludeKeywords: [],
  minScore: 0,
};

export function parseJobRadarInput(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) {
    return dedupeTokens(value);
  }

  return dedupeTokens(String(value ?? "").split(/[\n,，、;；|]+/));
}

export function normalizeJobRadarCriteria(criteria: Partial<JobRadarSearchCriteria>): JobRadarSearchCriteria {
  const minScore = typeof criteria.minScore === "number" && Number.isFinite(criteria.minScore)
    ? criteria.minScore
    : defaultCriteria.minScore;

  return {
    keywords: parseJobRadarInput(criteria.keywords),
    locations: parseJobRadarInput(criteria.locations),
    companyNatures: parseJobRadarInput(criteria.companyNatures),
    requiredSkills: parseJobRadarInput(criteria.requiredSkills),
    excludeKeywords: parseJobRadarInput(criteria.excludeKeywords),
    minScore: clamp(minScore, 0, 100),
  };
}

export function createDefaultJobRadarCriteria(): JobRadarSearchCriteria {
  return {
    keywords: ["前端", "React", "Next.js"],
    locations: ["上海", "远程"],
    companyNatures: ["外企", "创业公司", "非外包"],
    requiredSkills: ["TypeScript", "Node.js", "PostgreSQL"],
    excludeKeywords: ["外包", "驻场", "销售"],
    minScore: 45,
  };
}

export function createMockJobPostings(now = new Date()): JobPosting[] {
  const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY_MS).toISOString();

  const postings: Array<Omit<JobPosting, "expiresAt"> & { expiresAt?: string }> = [
    {
      id: "mock-zhipin-frontend-platform",
      sourceName: "Mock · BOSS直聘",
      sourceJobId: "mock-zhipin-10001",
      sourceUrl: "https://www.zhipin.com/web/geek/job?query=前端平台工程师&city=101020100",
      title: "高级前端平台工程师 React / Next.js",
      companyName: "云栖未来科技",
      companyNature: "创业公司 / 非外包 / A轮",
      location: "上海 · 徐汇 · 可远程",
      salary: "28k-45k · 14薪",
      responsibilities: [
        "建设面向 B 端用户的低代码工作台与组件系统，沉淀跨业务前端平台能力。",
        "负责 Next.js SSR、React 状态管理、前端性能指标与工程化质量门禁。",
        "和后端协作梳理 Node.js BFF、PostgreSQL 数据查询与权限边界。",
      ],
      requirements: [
        "熟悉 TypeScript、React、Next.js 与现代前端工程化。",
        "理解接口缓存、首屏性能优化、可访问性和组件设计系统。",
        "有 Node.js、PostgreSQL 或全栈协作经验优先。",
      ],
      description: "核心研发岗位，非外包，技术栈包含 TypeScript / React / Next.js / Node.js / PostgreSQL。",
      postedAt: at(2),
      firstSeenAt: at(2),
      lastSeenAt: at(0),
      fetchedAt: at(0),
    },
    {
      id: "mock-lagou-fullstack-ai",
      sourceName: "Mock · 拉勾",
      sourceJobId: "mock-lagou-23018",
      sourceUrl: "https://www.lagou.com/wn/jobs?kd=全栈工程师%20AI",
      title: "AI 产品全栈工程师",
      companyName: "矩阵简历实验室",
      companyNature: "早期创业公司 / 非外包",
      location: "杭州 · 远程混合",
      salary: "25k-40k",
      responsibilities: [
        "从 0 到 1 建设 AI 简历分析、岗位推荐与用户增长工具链。",
        "负责 React 前端、Node.js 服务、PostgreSQL 数据模型和异步任务队列。",
        "和产品共同定义搜索、匹配度、标签解释与用户反馈闭环。",
      ],
      requirements: [
        "TypeScript 基础扎实，能独立设计 React 页面与 API 数据契约。",
        "熟悉 Node.js、PostgreSQL、队列任务或爬虫数据清洗。",
        "对招聘、简历、搜索推荐或 AI Agent 场景有兴趣。",
      ],
      description: "机会雷达方向原型岗位，强调 AI、搜索推荐、TypeScript、React、Node.js。",
      postedAt: at(5),
      firstSeenAt: at(5),
      lastSeenAt: at(0),
      fetchedAt: at(0),
    },
    {
      id: "mock-liepin-frontend-architect",
      sourceName: "Mock · 猎聘",
      sourceJobId: "mock-liepin-90421",
      sourceUrl: "https://www.liepin.com/zhaopin/?key=前端架构师",
      title: "前端架构师 / Design System",
      companyName: "北辰数据智能",
      companyNature: "外企 / 非外包",
      location: "北京 · 朝阳",
      salary: "35k-55k · 15薪",
      responsibilities: [
        "主导企业级 Design System、微前端框架与大型单页应用性能治理。",
        "制定 React、TypeScript、测试、发布和可观测性工程规范。",
        "推进跨地区团队的组件资产复用、设计协作和研发效能度量。",
      ],
      requirements: [
        "8 年以上前端经验，熟悉 React、TypeScript、构建系统和浏览器机制。",
        "有大型 B 端系统架构、组件库、国际化或可访问性经验。",
        "具备后端接口设计、Node.js BFF 或数据建模经验优先。",
      ],
      description: "外企核心技术岗，偏前端架构、React、TypeScript、Design System。",
      postedAt: at(12),
      firstSeenAt: at(12),
      lastSeenAt: at(1),
      fetchedAt: at(0),
    },
    {
      id: "mock-linkedin-remote-saas",
      sourceName: "Mock · LinkedIn",
      sourceJobId: "mock-linkedin-remote-77",
      sourceUrl: "https://www.linkedin.com/jobs/search/?keywords=Frontend%20Engineer%20React%20Remote",
      title: "Remote Frontend Engineer, Growth Console",
      companyName: "Northstar SaaS",
      companyNature: "外企 / SaaS / 非外包",
      location: "远程 · APAC",
      salary: "USD 70k-95k",
      responsibilities: [
        "Build growth analytics consoles with React, TypeScript, and server rendered routes.",
        "Own dashboard performance, experiment surfaces, and design-system quality gates.",
        "Collaborate with backend engineers on event schemas, SQL metrics, and API contracts.",
      ],
      requirements: [
        "Strong React and TypeScript experience in production SaaS products.",
        "Comfortable with Next.js, accessibility, automated tests, and product analytics.",
        "SQL or PostgreSQL experience is a plus.",
      ],
      description: "Remote APAC frontend role focused on React, TypeScript, Next.js and SaaS dashboards.",
      postedAt: at(21),
      firstSeenAt: at(21),
      lastSeenAt: at(2),
      fetchedAt: at(0),
    },
    {
      id: "mock-kanzhun-backend-platform",
      sourceName: "Mock · 看准网",
      sourceJobId: "mock-kanzhun-1888",
      sourceUrl: "https://www.kanzhun.com/search?query=Node.js%20PostgreSQL",
      title: "Node.js 后端平台工程师",
      companyName: "栈道科技",
      companyNature: "民营公司 / 非外包",
      location: "深圳 · 南山",
      salary: "24k-38k",
      responsibilities: [
        "负责 Node.js API、PostgreSQL 表结构、缓存和后台任务。",
        "支撑招聘数据采集、清洗、去重和搜索索引写入。",
        "和前端协作优化 React 管理后台与数据可视化体验。",
      ],
      requirements: [
        "熟悉 Node.js、TypeScript、PostgreSQL、Redis 或消息队列。",
        "理解 API 安全、数据一致性和任务调度。",
        "有搜索、推荐、爬虫或招聘数据经验优先。",
      ],
      description: "偏后端与数据平台，包含 Node.js / TypeScript / PostgreSQL，前端相关度中等。",
      postedAt: at(29),
      firstSeenAt: at(29),
      lastSeenAt: at(3),
      fetchedAt: at(0),
    },
    {
      id: "mock-51job-product-frontend",
      sourceName: "Mock · 前程无忧",
      sourceJobId: "mock-51job-77881",
      sourceUrl: "https://search.51job.com/list/000000,000000,0000,00,9,99,React,2,1.html",
      title: "中高级前端开发工程师",
      companyName: "海岚智能制造",
      companyNature: "上市公司 / 自研团队",
      location: "苏州 · 工业园区",
      salary: "18k-30k · 13薪",
      responsibilities: [
        "负责内部生产计划、供应链可视化与报表系统前端开发。",
        "维护 React 组件库、权限路由、表格性能和图表交互。",
        "参与接口联调、需求评审和线上故障排查。",
      ],
      requirements: [
        "熟悉 JavaScript、TypeScript、React、Webpack 或 Vite。",
        "了解后端接口、SQL 查询或 Node.js 工具脚本。",
        "有制造业、供应链或大屏项目经验优先。",
      ],
      description: "自研前端岗位，React / TypeScript 命中，地点与企业性质可能不完全匹配。",
      postedAt: at(39),
      firstSeenAt: at(39),
      lastSeenAt: at(8),
      fetchedAt: at(0),
    },
    {
      id: "mock-risk-outsource-onsite",
      sourceName: "Mock · 综合招聘源",
      sourceJobId: "mock-risk-4412",
      sourceUrl: "https://www.zhipin.com/web/geek/job?query=React%20驻场",
      title: "React 前端开发（客户现场）",
      companyName: "锐风交付中心",
      companyNature: "外包服务商",
      location: "上海 · 浦东 · 驻场",
      salary: "16k-24k",
      responsibilities: [
        "根据客户排期完成业务页面开发、缺陷修复和交付文档。",
        "参与驻场支持、需求沟通和项目验收。",
      ],
      requirements: [
        "熟悉 React、TypeScript、常见 UI 组件库。",
        "接受外包项目和客户现场工作节奏。",
      ],
      description: "命中 React 与上海，但包含外包、驻场等风险关键词。",
      postedAt: at(4),
      firstSeenAt: at(4),
      lastSeenAt: at(0),
      fetchedAt: at(0),
    },
    {
      id: "mock-expired-react-admin",
      sourceName: "Mock · 历史缓存",
      sourceJobId: "mock-expired-9901",
      sourceUrl: "https://www.lagou.com/wn/jobs?kd=React%20Admin",
      title: "React 管理后台工程师（历史岗位）",
      companyName: "过期信号样本",
      companyNature: "创业公司 / 非外包",
      location: "上海",
      salary: "20k-32k",
      responsibilities: ["负责 React 管理后台页面和组件维护。"],
      requirements: ["TypeScript、React、Next.js。"],
      description: "用于验证过期岗位过滤，页面默认不展示。",
      postedAt: at(52),
      firstSeenAt: at(52),
      lastSeenAt: at(20),
      fetchedAt: at(0),
    },
  ];

  return postings.map((job) => ({ ...job, expiresAt: job.expiresAt ?? getJobDisplayExpiresAt(job) }));
}

export function getFreshnessStatus(job: Pick<JobPosting, "postedAt" | "firstSeenAt">, now = new Date()): JobFreshnessStatus {
  const ageDays = getJobAgeDays(job, now);

  if (ageDays <= jobFreshnessPolicy.hotWithinDays) {
    return "hot";
  }

  if (ageDays <= jobFreshnessPolicy.normalWithinDays) {
    return "normal";
  }

  if (ageDays <= jobFreshnessPolicy.staleWithinDays) {
    return "stale";
  }

  return "expired";
}

export function getJobDisplayExpiresAt(job: Pick<JobPosting, "postedAt" | "firstSeenAt">) {
  return new Date(getJobSignalTime(job).getTime() + jobFreshnessPolicy.staleWithinDays * DAY_MS).toISOString();
}

export function getJobAgeDays(job: Pick<JobPosting, "postedAt" | "firstSeenAt">, now = new Date()) {
  const ageMs = now.getTime() - getJobSignalTime(job).getTime();
  return Math.max(0, Math.floor(ageMs / DAY_MS));
}

export function scoreJobPosting(job: JobPosting, rawCriteria: Partial<JobRadarSearchCriteria>, now = new Date()): JobMatchResult {
  const criteria = normalizeJobRadarCriteria(rawCriteria);
  const text = buildSearchText(job);
  const riskText = buildRiskText(job);
  const freshnessStatus = getFreshnessStatus(job, now);
  const freshnessRank = freshnessRanks[freshnessStatus];

  const keywordMatches = collectMatches(criteria.keywords, text);
  const skillMatches = collectMatches(criteria.requiredSkills, text);
  const locationMatches = collectMatches(criteria.locations, job.location);
  const natureMatches = collectMatches(criteria.companyNatures, `${job.companyNature} ${job.companyName} ${job.description}`);
  const excludeMatches = collectMatches(criteria.excludeKeywords, riskText);

  const activeBuckets = [
    { weight: 38, active: criteria.keywords.length > 0, ratio: ratio(keywordMatches.length, criteria.keywords.length) },
    { weight: 32, active: criteria.requiredSkills.length > 0, ratio: ratio(skillMatches.length, criteria.requiredSkills.length) },
    { weight: 16, active: criteria.locations.length > 0, ratio: locationMatches.length > 0 ? 1 : 0 },
    { weight: 14, active: criteria.companyNatures.length > 0, ratio: natureMatches.length > 0 ? 1 : 0 },
  ];
  const activeWeight = activeBuckets.filter((bucket) => bucket.active).reduce((total, bucket) => total + bucket.weight, 0);
  const weightedScore = activeWeight > 0
    ? activeBuckets.reduce((total, bucket) => total + (bucket.active ? bucket.weight * bucket.ratio : 0), 0) / activeWeight * 100
    : 100;
  const titleBonus = keywordMatches.some((token) => includesToken(job.title, token)) ? 5 : 0;
  const penalty = Math.min(45, excludeMatches.length * 18);
  const matchPercent = Math.round(clamp(weightedScore + titleBonus - penalty, 0, 100));

  const matchTags = unique([
    ...keywordMatches.map((token) => `关键词:${token}`),
    ...skillMatches.map((token) => `技能:${token}`),
    ...locationMatches.map((token) => `地点:${token}`),
    ...natureMatches.map((token) => `企业:${token}`),
  ]);

  const warningTags = unique([
    ...excludeMatches.map((token) => `排除:${token}`),
    ...(criteria.locations.length > 0 && locationMatches.length === 0 ? ["地点未命中"] : []),
    ...(criteria.requiredSkills.length > 0 && skillMatches.length === 0 ? ["技能弱匹配"] : []),
    ...(job.salary.trim() ? [] : ["薪资未知"]),
  ]);

  return {
    ...job,
    expiresAt: job.expiresAt ?? getJobDisplayExpiresAt(job),
    matchPercent,
    matchTags,
    warningTags,
    freshnessStatus,
    freshnessLabel: freshnessLabels[freshnessStatus],
    freshnessRank,
    sortScore: matchPercent + freshnessRank * 2,
  };
}

export function searchJobPostings(jobs: JobPosting[], rawCriteria: Partial<JobRadarSearchCriteria>, now = new Date()) {
  const criteria = normalizeJobRadarCriteria(rawCriteria);

  return jobs
    .map((job) => scoreJobPosting(job, criteria, now))
    .filter((job) => job.freshnessStatus !== "expired")
    .filter((job) => job.matchPercent >= criteria.minScore)
    .sort((a, b) => {
      if (b.sortScore !== a.sortScore) {
        return b.sortScore - a.sortScore;
      }
      if (b.matchPercent !== a.matchPercent) {
        return b.matchPercent - a.matchPercent;
      }
      return getJobSignalTime(b).getTime() - getJobSignalTime(a).getTime();
    });
}

function getJobSignalTime(job: Pick<JobPosting, "postedAt" | "firstSeenAt">) {
  const postedTime = Date.parse(job.postedAt || job.firstSeenAt);
  const firstSeenTime = Date.parse(job.firstSeenAt || job.postedAt);
  const time = Number.isFinite(postedTime) ? postedTime : firstSeenTime;

  return new Date(Number.isFinite(time) ? time : Date.now());
}

function buildSearchText(job: JobPosting) {
  return [
    job.title,
    job.companyName,
    job.companyNature,
    job.location,
    job.salary,
    job.description,
    job.responsibilities.join("\n"),
    job.requirements.join("\n"),
    job.rawText,
  ].filter(Boolean).join("\n");
}

function buildRiskText(job: JobPosting) {
  return normalizeText(buildSearchText(job))
    .replaceAll("非外包", "")
    .replaceAll("不外包", "")
    .replaceAll("无外包", "")
    .replaceAll("不是外包", "");
}

function collectMatches(tokens: string[], text: string) {
  return tokens.filter((token) => includesToken(text, token));
}

function includesToken(text: string, token: string) {
  const normalizedToken = normalizeText(token);

  if (!normalizedToken) {
    return false;
  }

  return normalizeText(text).includes(normalizedToken);
}

function normalizeText(value: string | undefined) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

function dedupeTokens(tokens: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const token of tokens) {
    const trimmed = token.trim();
    const key = normalizeText(trimmed);

    if (!trimmed || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function ratio(hitCount: number, totalCount: number) {
  return totalCount > 0 ? clamp(hitCount / totalCount, 0, 1) : 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

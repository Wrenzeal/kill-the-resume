const DAY_MS = 24 * 60 * 60 * 1000;

export type JobFreshnessStatus = "hot" | "normal" | "stale" | "expired";
export type JobRadarLanguage = "zh-CN" | "en-US";
export type JobMatchTagKind = "keyword" | "skill" | "location" | "company" | "risk" | "gap";
export type JobMatchTagCode = "location-missing" | "skill-weak" | "salary-missing";

export interface JobMatchTag {
  kind: JobMatchTagKind;
  label: string;
  code?: JobMatchTagCode;
}

export interface JobScoreBreakdown {
  keyword: number;
  skill: number;
  location: number;
  company: number;
  titleBonus: number;
  riskPenalty: number;
  freshnessRank: number;
  final: number;
}

export type JobWorkflowStatus = "new" | "saved" | "applying" | "applied" | "archived" | "rejected";

export interface JobWorkflowState {
  status: JobWorkflowStatus;
  note: string;
  priority: number;
  nextActionAt?: string;
  updatedAt: string;
}

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
  matchTags: JobMatchTag[];
  warningTags: JobMatchTag[];
  freshnessStatus: JobFreshnessStatus;
  freshnessLabel: string;
  freshnessRank: number;
  sortScore: number;
  scoreBreakdown: JobScoreBreakdown;
  state?: JobWorkflowState;
}

export const jobFreshnessPolicy = {
  hotWithinDays: 7,
  normalWithinDays: 30,
  staleWithinDays: 45,
  deleteAfterDays: 60,
} as const;

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

export function createDefaultJobRadarCriteria(language: JobRadarLanguage = "zh-CN"): JobRadarSearchCriteria {
  if (isEnglishRadarLanguage(language)) {
    return {
      keywords: ["Frontend", "React", "Next.js"],
      locations: ["Shanghai", "Remote"],
      companyNatures: ["Foreign Company", "Startup", "Non-outsourcing"],
      requiredSkills: ["TypeScript", "Node.js", "PostgreSQL"],
      excludeKeywords: ["Outsourcing", "Onsite", "Sales"],
      minScore: 45,
    };
  }

  return {
    keywords: ["前端", "React", "Next.js"],
    locations: ["上海", "远程"],
    companyNatures: ["外企", "创业公司", "非外包"],
    requiredSkills: ["TypeScript", "Node.js", "PostgreSQL"],
    excludeKeywords: ["外包", "驻场", "销售"],
    minScore: 45,
  };
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
  const scoreBreakdown: JobScoreBreakdown = {
    keyword: Math.round(ratio(keywordMatches.length, criteria.keywords.length) * 100),
    skill: Math.round(ratio(skillMatches.length, criteria.requiredSkills.length) * 100),
    location: locationMatches.length > 0 ? 100 : 0,
    company: natureMatches.length > 0 ? 100 : 0,
    titleBonus,
    riskPenalty: penalty,
    freshnessRank,
    final: matchPercent,
  };

  const matchTags = uniqueTags([
    ...keywordMatches.map((token) => createTag("keyword", token)),
    ...skillMatches.map((token) => createTag("skill", token)),
    ...locationMatches.map((token) => createTag("location", token)),
    ...natureMatches.map((token) => createTag("company", token)),
  ]);

  const warningTags = uniqueTags([
    ...excludeMatches.map((token) => createTag("risk", token)),
    ...(criteria.locations.length > 0 && locationMatches.length === 0 ? [createTag("gap", "地点未命中", "location-missing")] : []),
    ...(criteria.requiredSkills.length > 0 && skillMatches.length === 0 ? [createTag("gap", "技能弱匹配", "skill-weak")] : []),
    ...(job.salary.trim() ? [] : [createTag("gap", "薪资未知", "salary-missing")]),
  ]);

  return {
    ...job,
    expiresAt: job.expiresAt ?? getJobDisplayExpiresAt(job),
    matchPercent,
    matchTags,
    warningTags,
    freshnessStatus,
    freshnessLabel: freshnessStatus,
    freshnessRank,
    sortScore: matchPercent + freshnessRank * 2,
    scoreBreakdown,
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


function isEnglishRadarLanguage(language: JobRadarLanguage) {
  return language === "en-US";
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
    .replaceAll("不是外包", "")
    .replaceAll("non-outsourcing", "")
    .replaceAll("non outsourcing", "")
    .replaceAll("not outsourcing", "");
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

function uniqueTags(tags: JobMatchTag[]) {
  const seen = new Set<string>();
  const result: JobMatchTag[] = [];

  for (const tag of tags) {
    const key = `${tag.kind}:${normalizeText(tag.label)}:${tag.code ?? ""}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(tag);
  }

  return result;
}

function createTag(kind: JobMatchTagKind, label: string, code?: JobMatchTagCode): JobMatchTag {
  return { kind, label, code };
}

function ratio(hitCount: number, totalCount: number) {
  return totalCount > 0 ? clamp(hitCount / totalCount, 0, 1) : 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

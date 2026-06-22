import test from "node:test";
import assert from "node:assert/strict";
import { buildJobRadarJobsPath, resolveApiBaseUrlForEnvironment } from "@/lib/api";
import { formatWebsiteDisplay, formatWebsiteHref } from "@/lib/contact-display";
import { coerceDateRange, formatDateRange, normalizeMonthValue } from "@/lib/date-range";
import { markdownToBulletItems, markdownToPlainText, parseMarkdownBlocks } from "@/lib/markdown";
import { createDefaultJobRadarCriteria, getFreshnessStatus, searchJobPostings, scoreJobPosting, type JobPosting } from "@/lib/job-radar";
import { defaultSkillLabels, joinSkillTags, normalizeSkillMatrix, normalizeSkillMatrixForPersistence, skillCategoriesFromFields, splitSkillTags } from "@/lib/skills";
import { normalizeResumeDraft, normalizeResumeDraftForPersistence } from "@/lib/resume-normalize";
import { initialResumeDraft } from "@/lib/resume-defaults";
import type { ResumeDraft } from "@/types/resume";


test("job radar API path encodes manual criteria and refresh flag for backend search", () => {
  const criteria = {
    keywords: ["Frontend", "React"],
    locations: ["Shanghai", "Remote"],
    companyNatures: ["Startup", "Non-outsourcing"],
    requiredSkills: ["TypeScript", "PostgreSQL"],
    excludeKeywords: ["Outsourcing", "Onsite"],
    minScore: 45,
  };

  assert.equal(
    buildJobRadarJobsPath(criteria),
    "/job-radar/jobs?keywords=Frontend&keywords=React&locations=Shanghai&locations=Remote&companyNatures=Startup&companyNatures=Non-outsourcing&requiredSkills=TypeScript&requiredSkills=PostgreSQL&excludeKeywords=Outsourcing&excludeKeywords=Onsite&minScore=45",
  );
  assert.equal(
    buildJobRadarJobsPath(criteria, { refresh: true }),
    "/job-radar/jobs?keywords=Frontend&keywords=React&locations=Shanghai&locations=Remote&companyNatures=Startup&companyNatures=Non-outsourcing&requiredSkills=TypeScript&requiredSkills=PostgreSQL&excludeKeywords=Outsourcing&excludeKeywords=Onsite&minScore=45&refresh=1",
  );
});

test("API base URL resolves for local, remote HTTP, and direct HTTPS production API", () => {
  assert.equal(resolveApiBaseUrlForEnvironment({ isBrowser: false }), "https://api.killer.wrenzeal.top/api/v1");
  assert.equal(
    resolveApiBaseUrlForEnvironment({ isBrowser: true, pageHostname: "localhost", pageProtocol: "http:" }),
    "http://127.0.0.1:19304/api/v1",
  );
  assert.equal(
    resolveApiBaseUrlForEnvironment({ isBrowser: true, pageHostname: "38.246.253.179", pageProtocol: "http:" }),
    "http://38.246.253.179:19304/api/v1",
  );
  assert.equal(
    resolveApiBaseUrlForEnvironment({ isBrowser: true, pageHostname: "kill-the-resume.vercel.app", pageProtocol: "https:" }),
    "https://api.killer.wrenzeal.top/api/v1",
  );
  assert.equal(
    resolveApiBaseUrlForEnvironment({
      explicitApiBaseUrl: "http://127.0.0.1:19304/api/v1",
      isBrowser: true,
      pageHostname: "kill-the-resume.vercel.app",
      pageProtocol: "https:",
    }),
    "https://api.killer.wrenzeal.top/api/v1",
  );
  assert.equal(
    resolveApiBaseUrlForEnvironment({
      explicitApiBaseUrl: "/api/v1",
      isBrowser: true,
      pageHostname: "killer.wrenzeal.top",
      pageProtocol: "https:",
    }),
    "https://api.killer.wrenzeal.top/api/v1",
  );
  assert.equal(
    resolveApiBaseUrlForEnvironment({
      explicitApiBaseUrl: "https://api.example.com/api/v1/",
      isBrowser: true,
      pageHostname: "kill-the-resume.vercel.app",
      pageProtocol: "https:",
    }),
    "https://api.example.com/api/v1",
  );
});

test("website display stays compact while href targets an external URL", () => {
  assert.equal(formatWebsiteDisplay(" https://www.Example.dev/path/ "), "Example.dev/path");
  assert.equal(formatWebsiteDisplay("https://example.dev///"), "example.dev");
  assert.equal(formatWebsiteHref("example.dev"), "https://example.dev/");
  assert.equal(formatWebsiteHref("//example.dev/profile"), "https://example.dev/profile");
  assert.equal(formatWebsiteHref("https://example.dev/a?x=1#top"), "https://example.dev/a?x=1#top");
  assert.equal(formatWebsiteHref("javascript:alert(1)"), "");
});

test("markdown parsing preserves ordered and unordered list semantics", () => {
  const blocks = parseMarkdownBlocks("## Impact\n1. **Alpha**\n2. Beta\n- Gamma");
  assert.deepEqual(
    blocks.map((block) => ({ type: block.type, text: block.text, ordered: block.ordered, order: block.order })),
    [
      { type: "heading", text: "Impact", ordered: undefined, order: undefined },
      { type: "bullet", text: "Alpha", ordered: true, order: 1 },
      { type: "bullet", text: "Beta", ordered: true, order: 2 },
      { type: "bullet", text: "Gamma", ordered: false, order: undefined },
    ],
  );
  assert.deepEqual(markdownToBulletItems("1. Alpha\n2. Beta\n- Gamma"), ["1. Alpha", "2. Beta", "Gamma"]);
  assert.equal(markdownToPlainText("1. Alpha\n2. Beta\n- Gamma"), "1. Alpha\n2. Beta\nGamma");
});

test("legacy date range strings normalize to structured month ranges", () => {
  assert.equal(normalizeMonthValue("2024年1月"), "2024-01");
  assert.deepEqual(coerceDateRange("2024.1 - 至今"), { start: "2024-01", end: "", isPresent: true });
  assert.deepEqual(coerceDateRange("2020/09 - 2024/6"), { start: "2020-09", end: "2024-06", isPresent: false });
  assert.equal(formatDateRange("2024.1 - present", "en-US"), "2024.01 — Present");
});

test("skill labels preserve editing empties but persistence fills defaults", () => {
  const editing = normalizeSkillMatrix({ labels: { languages: "" } as never, customCategories: [{ id: "custom", label: "", content: "Go; go, TypeScript", visible: true }] });
  assert.equal(editing.labels.languages, "");
  assert.equal(editing.customCategories[0]?.label, "");

  const persisted = normalizeSkillMatrixForPersistence(editing);
  assert.equal(persisted.labels.languages, defaultSkillLabels.languages);
  assert.equal(persisted.customCategories[0]?.label, "自定义技能 1");
  assert.deepEqual(splitSkillTags("Go; go, TypeScript，React、react"), ["Go", "TypeScript", "React"]);
  assert.equal(joinSkillTags([" Go ", "", "TypeScript"]), "Go\nTypeScript");
});

test("skill category projection follows visible field order plus visible custom categories", () => {
  const skills = normalizeSkillMatrix({
    labels: { languages: "Lang", frontend: "FE" } as never,
    languages: "TypeScript",
    frontend: "React",
    customCategories: [
      { id: "custom-visible", label: "Ops", content: "Docker", visible: true },
      { id: "custom-hidden", label: "Hidden", content: "Nope", visible: false },
    ],
  });
  const categories = skillCategoriesFromFields(skills, [
    { id: "frontend", visible: true },
    { id: "languages", visible: false },
    { id: "tools", visible: true },
  ]);

  assert.deepEqual(categories.map((category) => ({ id: category.id, label: category.label, content: category.content, custom: category.custom })), [
    { id: "frontend", label: "FE", content: "React", custom: false },
    { id: "tools", label: defaultSkillLabels.tools, content: initialResumeDraft.skills.tools, custom: false },
    { id: "custom-visible", label: "Ops", content: "Docker", custom: true },
  ]);
});

test("resume normalization keeps export last and separates editing from persistence normalization", () => {
  const draft = structuredClone(initialResumeDraft) as ResumeDraft;
  draft.skills.labels.languages = "";
  draft.projects[0]!.period = "2024.1 - 至今" as never;
  draft.layout.modules = [
    { id: "export", visible: false },
    { id: "identity", visible: true },
  ];

  const editing = normalizeResumeDraft(draft);
  assert.deepEqual(editing.projects[0]!.period, { start: "2024-01", end: "", isPresent: true });
  assert.equal(editing.skills.labels.languages, "");
  assert.equal(editing.layout.modules.at(-1)?.id, "export");

  const persisted = normalizeResumeDraftForPersistence(draft);
  assert.equal(persisted.skills.labels.languages, defaultSkillLabels.languages);
  assert.equal(persisted.layout.modules.at(-1)?.id, "export");
});

import { projectIdentityContact, projectSkillSection } from "@/lib/resume-projection";

test("shared projection drives identity contact rules for preview and PDF", () => {
  const draft = structuredClone(initialResumeDraft) as ResumeDraft;
  draft.identity.email = " user@example.com ";
  draft.identity.location = " 上海 / Remote ";
  draft.identity.website = "example.dev/profile";
  draft.identity.photo = "data:image/png;base64,AAAA";

  const projected = projectIdentityContact(draft);
  assert.deepEqual(projected, {
    email: "user@example.com",
    location: "上海 / Remote",
    photo: "data:image/png;base64,AAAA",
    websiteDisplay: "example.dev/profile",
    websiteHref: "https://example.dev/profile",
    hasContact: true,
  });
});

test("shared projection exposes skill display mode, columns, and categories", () => {
  const draft = structuredClone(initialResumeDraft) as ResumeDraft;
  draft.skills.displayMode = "tags";
  draft.skills.columnMode = "one";
  draft.skills.customCategories = [{ id: "ops", label: "Ops", content: "Docker", visible: true }];
  draft.layout.fields.skills = [
    { id: "tools", visible: true },
    { id: "languages", visible: false },
    { id: "frontend", visible: true },
    { id: "backend", visible: false },
  ];

  const projected = projectSkillSection(draft);
  assert.equal(projected.displayMode, "tags");
  assert.equal(projected.columnMode, "one");
  assert.equal(projected.columnCount, 1);
  assert.deepEqual(projected.categories.map((category) => category.id), ["tools", "frontend", "ops"]);
});


test("job radar English mode uses localized default criteria without CJK text", () => {
  const criteria = createDefaultJobRadarCriteria("en-US");
  const visibleValues = [
    ...criteria.keywords,
    ...criteria.locations,
    ...criteria.companyNatures,
    ...criteria.requiredSkills,
    ...criteria.excludeKeywords,
  ];

  assert.deepEqual(criteria.keywords, ["Frontend", "React", "Next.js"]);
  assert.deepEqual(criteria.locations, ["Shanghai", "Remote"]);
  assert.ok(visibleValues.every((value) => !containsCjk(value)), visibleValues.filter(containsCjk).join("\n"));
});

test("job radar freshness policy marks hot, normal, stale, and expired postings", () => {
  const now = new Date("2026-06-22T00:00:00.000Z");
  const signal = (daysAgo: number) => ({
    postedAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    firstSeenAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
  });

  assert.equal(getFreshnessStatus(signal(3), now), "hot");
  assert.equal(getFreshnessStatus(signal(15), now), "normal");
  assert.equal(getFreshnessStatus(signal(40), now), "stale");
  assert.equal(getFreshnessStatus(signal(50), now), "expired");
});

test("job radar filters expired postings, ranks by match percent, and preserves source URLs", () => {
  const now = new Date("2026-06-22T00:00:00.000Z");
  const jobs: JobPosting[] = [
    makeJobPosting({
      id: "strong",
      title: "高级前端工程师 React Next.js",
      companyNature: "外企 / 非外包",
      location: "上海 · 远程",
      responsibilities: ["建设 React 控制台与 Next.js SSR 页面。"],
      requirements: ["TypeScript、Node.js、PostgreSQL。"],
      sourceUrl: "https://example.com/jobs/strong",
      postedAt: "2026-06-20T00:00:00.000Z",
    }),
    makeJobPosting({
      id: "weak",
      title: "后端平台工程师",
      companyNature: "民营公司",
      location: "深圳",
      responsibilities: ["维护 Java 服务。"],
      requirements: ["Java、MySQL。"],
      sourceUrl: "https://example.com/jobs/weak",
      postedAt: "2026-06-19T00:00:00.000Z",
    }),
    makeJobPosting({
      id: "expired",
      title: "React 前端工程师",
      companyNature: "外企 / 非外包",
      location: "上海",
      responsibilities: ["React、Next.js。"],
      requirements: ["TypeScript。"],
      sourceUrl: "https://example.com/jobs/expired",
      postedAt: "2026-04-20T00:00:00.000Z",
    }),
  ];

  const results = searchJobPostings(jobs, {
    keywords: ["前端", "React", "Next.js"],
    locations: ["上海", "远程"],
    companyNatures: ["外企", "非外包"],
    requiredSkills: ["TypeScript", "Node.js", "PostgreSQL"],
    excludeKeywords: ["外包", "驻场"],
    minScore: 10,
  }, now);

  assert.deepEqual(results.map((job) => job.id), ["strong"]);
  assert.equal(results[0]?.sourceUrl, "https://example.com/jobs/strong");
  assert.equal(results[0]?.freshnessStatus, "hot");
  assert.ok(results[0]!.matchPercent >= 80);
  assert.ok(results[0]!.matchTags.some((tag) => tag.kind === "keyword" && tag.label === "React"));
  assert.ok(results[0]!.matchTags.some((tag) => tag.kind === "skill" && tag.label === "TypeScript"));
});

test("job radar warning tags capture excluded keywords and lower risky matches", () => {
  const now = new Date("2026-06-22T00:00:00.000Z");
  const safe = makeJobPosting({
    id: "safe",
    title: "React 前端开发",
    companyNature: "自研团队 / 非外包",
    location: "上海",
    responsibilities: ["React 和 TypeScript 产品研发。"],
    requirements: ["React、TypeScript。"],
    description: "自研产品岗位。",
    postedAt: "2026-06-21T00:00:00.000Z",
  });
  const risky = makeJobPosting({
    id: "risky",
    title: "React 前端开发 驻场",
    companyNature: "外包服务商",
    location: "上海",
    responsibilities: ["React 和 TypeScript 页面交付，客户现场驻场。"],
    requirements: ["接受外包项目。"],
    description: "外包驻场岗位。",
    postedAt: "2026-06-21T00:00:00.000Z",
  });
  const criteria = {
    keywords: ["React", "前端"],
    locations: ["上海"],
    companyNatures: ["自研"],
    requiredSkills: ["TypeScript"],
    excludeKeywords: ["外包", "驻场"],
    minScore: 0,
  };

  const safeScore = scoreJobPosting(safe, criteria, now);
  const riskyScore = scoreJobPosting(risky, criteria, now);

  assert.ok(riskyScore.warningTags.some((tag) => tag.kind === "risk" && tag.label === "外包"));
  assert.ok(riskyScore.warningTags.some((tag) => tag.kind === "risk" && tag.label === "驻场"));
  assert.ok(riskyScore.warningTags.every((tag) => !tag.label.includes(":")));
  assert.ok(safeScore.matchPercent > riskyScore.matchPercent);
});

function makeJobPosting(overrides: Partial<JobPosting>): JobPosting {
  const postedAt = overrides.postedAt ?? "2026-06-20T00:00:00.000Z";

  return {
    id: "job",
    sourceName: "Test Source",
    sourceJobId: "source-1",
    sourceUrl: "https://example.com/jobs/1",
    title: "前端工程师",
    companyName: "测试公司",
    companyNature: "自研团队",
    location: "上海",
    salary: "20k-30k",
    responsibilities: ["建设产品。"],
    requirements: ["TypeScript。"],
    description: "",
    postedAt,
    firstSeenAt: postedAt,
    lastSeenAt: postedAt,
    fetchedAt: postedAt,
    ...overrides,
  };
}
function containsCjk(value: string) {
  return /[\u3400-\u9fff]/u.test(value);
}

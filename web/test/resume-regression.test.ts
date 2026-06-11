import test from "node:test";
import assert from "node:assert/strict";
import { formatWebsiteDisplay, formatWebsiteHref } from "@/lib/contact-display";
import { coerceDateRange, formatDateRange, normalizeMonthValue } from "@/lib/date-range";
import { markdownToBulletItems, markdownToPlainText, parseMarkdownBlocks } from "@/lib/markdown";
import { defaultSkillLabels, joinSkillTags, normalizeSkillMatrix, normalizeSkillMatrixForPersistence, skillCategoriesFromFields, splitSkillTags } from "@/lib/skills";
import { normalizeResumeDraft, normalizeResumeDraftForPersistence } from "@/lib/resume-normalize";
import { initialResumeDraft } from "@/lib/resume-defaults";
import type { ResumeDraft } from "@/types/resume";

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

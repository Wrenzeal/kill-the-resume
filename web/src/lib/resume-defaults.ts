import { createDateRange } from "@/lib/date-range";
import { defaultResumeTheme } from "@/lib/resume-theme";
import { defaultSkillMatrix } from "@/lib/skills";
import { defaultFieldLayout, defaultModuleLayout } from "@/lib/resume-layout";
import type { EducationExperience, ProjectExperience, ResumeDraft, WorkExperience } from "@/types/resume";

export function createProjectExperience(index: number): ProjectExperience {
  return {
    id: `project-${Date.now()}-${index}`,
    codename: `New Project ${index}`,
    role: "Project Owner",
    stack: "TypeScript / Next.js",
    period: createDateRange("2026-01", "", true),
    signal: "Problem: 说明项目要解决的业务/工程问题。\nDecision: 说明你做出的关键架构或实现取舍。",
    impact: "Impact: 补充可量化结果，例如性能、收入、效率或用户增长。",
    status: "stable",
  };
}

export function createWorkExperience(index: number): WorkExperience {
  return {
    id: `work-${Date.now()}-${index}`,
    company: `Company ${index}`,
    role: "Frontend Engineer",
    period: createDateRange("2024-01", "2026-12"),
    location: "远程",
    summary: "概述岗位职责、业务范围和跨团队协作。",
    bullets: "补充一个可量化成果\n补充一个技术治理成果",
  };
}

export function createEducationExperience(index: number): EducationExperience {
  return {
    id: `education-${Date.now()}-${index}`,
    school: `School ${index}`,
    degree: "Computer Science",
    period: createDateRange("2018-09", "2022-06"),
    detail: "补充课程、荣誉、研究方向或证书。",
  };
}

export const initialResumeDraft: ResumeDraft = {
  theme: defaultResumeTheme,
  identity: {
    name: "你的姓名",
    title: "未来感前端工程师",
    callsign: "138 0000 0000",
    email: "you@example.com",
    location: "上海 / 远程",
    website: "https://example.dev",
    summary: "把复杂业务产品拆成可维护的数据模型、交互协议和可验证的交付链路，偏好用 TypeScript/Go 构建可长期演进的生产系统。",
    highlights: "定位：Full-stack Engineer / Go + React + Product Systems\n代表成果：构建 JSON 驱动简历编辑器与矢量 PDF 导出链路\n工程证据：账号系统、PostgreSQL 持久化、插件导入、真实岗位雷达\n匹配方向：后端平台 / 前端基础设施 / 开发者工具",
    photo: "",
  },
  projects: [
    {
      id: "project-core-01",
      codename: "Project: Resume Override",
      role: "Lead Interface Engineer",
      stack: "Next.js 16 / TypeScript / Tailwind CSS / Zustand",
      period: createDateRange("2026-01", "", true),
      signal: "Problem: 传统简历编辑依赖手工排版，结构化数据、实时预览和 PDF 导出经常割裂。\nDecision: 用 Resume JSON 作为唯一数据源，抽象共享纸张布局计划，同时驱动右侧预览和矢量 PDF。",
      impact: "Impact: 将新增模块、字段显隐、技能分类和照片统一纳入预览/PDF 投影，减少导出错位和内容丢失。",
      status: "stable",
    },
  ],
  work: [
    {
      id: "work-core-01",
      company: "Orbit Systems Lab",
      role: "Senior Frontend Architect",
      period: createDateRange("2024-01", "2026-12"),
      location: "远程",
      summary: "负责核心控制台、组件系统和前端性能治理，连接产品策略与工程落地。",
      bullets: "将关键页面交互延迟降低 38%\n沉淀跨团队设计系统与可复用表单协议\n建立前端可观测性与发布质量门禁",
    },
  ],
  skills: defaultSkillMatrix,
  education: [
    {
      id: "education-core-01",
      school: "示例科技大学",
      degree: "计算机科学 / 软件工程",
      period: createDateRange("2018-09", "2022-06"),
      detail: "主修数据结构、操作系统、人机交互与分布式系统。",
    },
  ],
  customModules: [],
  exportProtocol: {
    targetRole: "Frontend Architect / Full-stack Engineer",
    pageSize: "A4",
    densityMode: "adaptive-compress",
    notes: "后续接入 PDF 导出、模板策略与后端持久化。",
  },
  layout: {
    modules: defaultModuleLayout,
    fields: defaultFieldLayout,
  },
};

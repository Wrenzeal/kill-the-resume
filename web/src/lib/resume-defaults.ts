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
    signal: "描述项目目标、技术挑战和你的核心贡献。",
    impact: "补充可量化结果，例如性能、收入、效率或用户增长。",
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
    summary: "专注于高性能前端架构、设计系统和数据驱动交互，把复杂产品打造成高效率、强反馈的操作界面。",
    photo: "",
  },
  projects: [
    {
      id: "project-core-01",
      codename: "Project: Resume Override",
      role: "Lead Interface Engineer",
      stack: "Next.js 16 / TypeScript / Tailwind CSS / Zustand",
      period: createDateRange("2026-01", "", true),
      signal: "构建 JSON 驱动的战术简历控制台，实现实时 A4 渲染与键盘优先编辑回路。",
      impact: "把简历制作从文档调格式转化为结构化数据操作，并提供即时版面密度反馈。",
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

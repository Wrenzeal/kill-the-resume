import type { Metadata } from "next";
import { JobRadarConsole } from "@/components/job-radar/JobRadarConsole";

export const metadata: Metadata = {
  title: "机会雷达 | Kill The Resume",
  description: "用岗位信号、匹配百分比和关键词标签筛选适合你的真实招聘机会。",
};

export default function JobRadarPage() {
  return <JobRadarConsole />;
}

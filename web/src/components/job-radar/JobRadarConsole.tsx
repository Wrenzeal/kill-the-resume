"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LanguageToggle } from "@/components/editor/LanguageToggle";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/css";
import type { Language, TranslationKey } from "@/lib/i18n";
import {
  createDefaultJobRadarCriteria,
  createMockJobPostings,
  getFreshnessStatus,
  jobFreshnessPolicy,
  mockJobRadarSnapshotAt,
  parseJobRadarInput,
  searchJobPostings,
  type JobMatchTag,
  type JobMatchResult,
} from "@/lib/job-radar";

type RadarForm = {
  keywords: string;
  locations: string;
  companyNatures: string;
  requiredSkills: string;
  excludeKeywords: string;
  minScore: number;
};


function toRadarForm(criteria: ReturnType<typeof createDefaultJobRadarCriteria>): RadarForm {
  return {
    keywords: criteria.keywords.join(", "),
    locations: criteria.locations.join(", "),
    companyNatures: criteria.companyNatures.join(", "),
    requiredSkills: criteria.requiredSkills.join(", "),
    excludeKeywords: criteria.excludeKeywords.join(", "),
    minScore: criteria.minScore,
  };
}

const freshnessTone: Record<JobMatchResult["freshnessStatus"], string> = {
  hot: "border-[rgba(57,255,136,0.5)] bg-[rgba(57,255,136,0.1)] text-[var(--cyber-green)]",
  normal: "border-[rgba(88,230,255,0.42)] bg-[rgba(88,230,255,0.1)] text-[var(--trace-cyan)]",
  stale: "border-[rgba(255,138,61,0.42)] bg-[rgba(255,138,61,0.1)] text-[var(--warning-orange)]",
  expired: "border-slate-600 bg-slate-900 text-slate-500",
};

const freshnessLabelKeys: Record<JobMatchResult["freshnessStatus"], TranslationKey> = {
  hot: "radar.freshnessHot",
  normal: "radar.freshnessNormal",
  stale: "radar.freshnessStale",
  expired: "radar.freshnessExpired",
};

const tagLabelKeys: Record<JobMatchTag["kind"], TranslationKey> = {
  keyword: "radar.legendKeyword",
  skill: "radar.legendSkill",
  location: "radar.legendLocation",
  company: "radar.legendCompany",
  risk: "radar.legendRisk",
  gap: "radar.legendGap",
};

const gapTagLabelKeys: Record<NonNullable<JobMatchTag["code"]>, TranslationKey> = {
  "location-missing": "radar.gapLocationMissing",
  "skill-weak": "radar.gapSkillWeak",
  "salary-missing": "radar.gapSalaryMissing",
};

const tagTone: Record<JobMatchTag["kind"], string> = {
  keyword: "border-[rgba(88,230,255,0.34)] bg-[rgba(88,230,255,0.08)] text-[var(--trace-cyan)]",
  skill: "border-[rgba(57,255,136,0.34)] bg-[rgba(57,255,136,0.08)] text-[var(--cyber-green)]",
  location: "border-[rgba(129,140,248,0.38)] bg-[rgba(129,140,248,0.09)] text-indigo-300",
  company: "border-[rgba(250,204,21,0.34)] bg-[rgba(250,204,21,0.08)] text-yellow-300",
  risk: "border-[rgba(248,113,113,0.42)] bg-[rgba(248,113,113,0.09)] text-red-300",
  gap: "border-[rgba(255,138,61,0.34)] bg-[rgba(255,138,61,0.08)] text-[var(--warning-orange)]",
};

export function JobRadarConsole() {
  const { language } = useI18n();

  return <JobRadarConsoleContent key={language} language={language} />;
}

function JobRadarConsoleContent({ language }: { language: Language }) {
  const { t } = useI18n();
  const now = useMemo(() => new Date(mockJobRadarSnapshotAt), []);
  const jobs = useMemo(() => createMockJobPostings(now, language), [language, now]);
  const defaultCriteria = useMemo(() => createDefaultJobRadarCriteria(language), [language]);
  const [form, setForm] = useState<RadarForm>(() => toRadarForm(defaultCriteria));
  const criteria = useMemo(() => ({
    keywords: parseJobRadarInput(form.keywords),
    locations: parseJobRadarInput(form.locations),
    companyNatures: parseJobRadarInput(form.companyNatures),
    requiredSkills: parseJobRadarInput(form.requiredSkills),
    excludeKeywords: parseJobRadarInput(form.excludeKeywords),
    minScore: form.minScore,
  }), [form]);
  const results = useMemo(() => searchJobPostings(jobs, criteria, now), [criteria, jobs, now]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const selected = results.find((job) => job.id === selectedId) ?? results[0];
  const expiredCount = useMemo(() => jobs.filter((job) => getFreshnessStatus(job, now) === "expired").length, [jobs, now]);
  const policyText = fillTemplate(t("radar.policyText"), {
    hot: jobFreshnessPolicy.hotWithinDays,
    normal: jobFreshnessPolicy.normalWithinDays,
    stale: jobFreshnessPolicy.staleWithinDays,
  });

  const updateField = (field: keyof RadarForm) => (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const value = field === "minScore" ? Number(event.target.value) : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <main className="tactical-grid min-h-screen text-slate-100">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 px-5 py-5 lg:px-6">
        <header className="tactical-panel scanline relative overflow-hidden px-5 py-4">
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[12px] uppercase tracking-[0.42em] text-[var(--cyber-green)]">
                opportunity_radar / job_signal_console
              </p>
              <h1 className="mt-3 font-mono text-3xl font-black uppercase tracking-[-0.05em] md:text-5xl">
                {t("radar.title")}
              </h1>
              <p className="mt-3 max-w-3xl text-[14px] leading-7 text-slate-400 md:text-[15px]">
                {t("radar.description")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <LanguageToggle compact />
              <Link className="border border-slate-700 px-3 py-2 font-mono text-[12px] uppercase tracking-[0.24em] text-slate-300 transition hover:border-[var(--trace-cyan)] hover:text-[var(--trace-cyan)]" href="/">
                {t("radar.backHome")}
              </Link>
              <Link className="border border-[rgba(57,255,136,0.45)] px-3 py-2 font-mono text-[12px] uppercase tracking-[0.24em] text-[var(--cyber-green)] transition hover:bg-[rgba(57,255,136,0.08)]" href="/editor">
                {t("radar.editorConsole")}
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-4 xl:grid-cols-[340px_minmax(460px,1fr)_390px]">
          <aside className="tactical-panel h-fit p-4 xl:sticky xl:top-5">
            <PanelTitle eyebrow="manual_signal_input" title={t("radar.searchTitle")} />
            <div className="mt-4 space-y-4">
              <RadarTextarea label={t("radar.keywords")} value={form.keywords} onChange={updateField("keywords")} placeholder={t("radar.placeholderKeywords")} />
              <RadarTextarea label={t("radar.locations")} value={form.locations} onChange={updateField("locations")} placeholder={t("radar.placeholderLocations")} rows={2} />
              <RadarTextarea label={t("radar.companyNature")} value={form.companyNatures} onChange={updateField("companyNatures")} placeholder={t("radar.placeholderCompanyNature")} rows={2} />
              <RadarTextarea label={t("radar.skills")} value={form.requiredSkills} onChange={updateField("requiredSkills")} placeholder={t("radar.placeholderSkills")} />
              <RadarTextarea label={t("radar.exclude")} value={form.excludeKeywords} onChange={updateField("excludeKeywords")} placeholder={t("radar.placeholderExclude")} rows={2} />

              <label className="block">
                <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">{t("radar.minScore")}</span>
                <div className="mt-2 tactical-field px-3 py-3">
                  <input className="tactical-input accent-[var(--cyber-green)]" max={100} min={0} onChange={updateField("minScore")} type="range" value={form.minScore} />
                  <div className="mt-2 flex items-center justify-between font-mono text-[12px] text-slate-400">
                    <span>{t("radar.threshold")}</span>
                    <input className="w-20 bg-transparent text-right text-[var(--cyber-green)] outline-none" max={100} min={0} onChange={updateField("minScore")} type="number" value={form.minScore} />
                  </div>
                </div>
              </label>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center font-mono text-[11px] uppercase tracking-[0.16em]">
              <MetricBox label={t("radar.metricSignals")} value={jobs.length} />
              <MetricBox label={t("radar.metricExpired")} value={expiredCount} tone="warning" />
              <MetricBox label={t("radar.metricMatched")} value={results.length} tone="green" />
            </div>
            <p className="mt-4 text-[12px] leading-6 text-slate-500">
              {policyText}
            </p>
          </aside>

          <section className="tactical-panel min-h-[680px] p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <PanelTitle eyebrow="ranked_opportunity_feed" title={t("radar.matchesTitle")} />
              <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-slate-500">{t("radar.sortHint")}</p>
            </div>
            <TagLegend />

            <div className="tactical-scrollbar mt-4 max-h-[calc(100vh-190px)] min-h-[560px] space-y-3 overflow-y-auto pr-2">
              {results.length ? results.map((job) => (
                <JobCard key={job.id} job={job} selected={job.id === selected?.id} onSelect={() => setSelectedId(job.id)} />
              )) : (
                <div className="flex min-h-[420px] items-center justify-center border border-dashed border-slate-700 text-center">
                  <div>
                    <p className="font-mono text-[13px] uppercase tracking-[0.3em] text-slate-500">no_signal</p>
                    <p className="mt-3 text-sm text-slate-400">{t("radar.noSignal")}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="tactical-panel h-fit p-4 xl:sticky xl:top-5">
            <PanelTitle eyebrow="source_trace_detail" title={t("radar.detailTitle")} />
            {selected ? <JobDetail job={selected} language={language} /> : (
              <p className="mt-8 text-sm leading-7 text-slate-500">{t("radar.emptyDetail")}</p>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}

function PanelTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--trace-cyan)]">{eyebrow}</p>
      <h2 className="mt-1 font-mono text-xl font-black uppercase tracking-[-0.04em]">{title}</h2>
    </div>
  );
}

function RadarTextarea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">{label}</span>
      <div className="mt-2 tactical-field px-3 py-2">
        <textarea className="tactical-input text-[14px] leading-6" onChange={onChange} placeholder={placeholder} rows={rows} value={value} />
      </div>
    </label>
  );
}

function MetricBox({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "green" | "warning" }) {
  return (
    <div className={cn(
      "border px-2 py-3",
      tone === "green" && "border-[rgba(57,255,136,0.35)] bg-[rgba(57,255,136,0.06)] text-[var(--cyber-green)]",
      tone === "warning" && "border-[rgba(255,138,61,0.35)] bg-[rgba(255,138,61,0.06)] text-[var(--warning-orange)]",
      tone === "default" && "border-slate-800 bg-slate-950/45 text-slate-300",
    )}>
      <div className="text-lg font-black">{value}</div>
      <div className="mt-1 text-[9px] text-slate-500">{label}</div>
    </div>
  );
}

function JobCard({ job, selected, onSelect }: { job: JobMatchResult; selected: boolean; onSelect: () => void }) {
  const { t } = useI18n();

  return (
    <article className={cn(
      "border bg-slate-950/45 p-4 transition",
      selected ? "border-[rgba(57,255,136,0.58)] shadow-[0_0_28px_rgba(57,255,136,0.12)]" : "border-slate-800 hover:border-slate-600",
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a className="font-mono text-lg font-black leading-tight text-slate-100 underline-offset-4 transition hover:text-[var(--cyber-green)] hover:underline" href={job.sourceUrl} rel="noopener noreferrer" target="_blank">
            {job.title}
          </a>
          <p className="mt-2 text-sm text-slate-400">{job.companyName} · {job.location} · {job.salary}</p>
        </div>
        <div className="shrink-0 text-right font-mono">
          <div className="text-3xl font-black text-[var(--cyber-green)]">{job.matchPercent}%</div>
          <div className={cn("mt-1 border px-2 py-1 text-[10px] uppercase tracking-[0.18em]", freshnessTone[job.freshnessStatus])}>{t(freshnessLabelKeys[job.freshnessStatus])}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {job.matchTags.slice(0, 8).map((tag) => <Tag key={tagKey(tag)} tag={tag} />)}
        {job.warningTags.slice(0, 4).map((tag) => <Tag key={tagKey(tag)} tag={tag} />)}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">{job.sourceName} / {job.sourceJobId}</p>
        <div className="flex items-center gap-2">
          <button className="border border-slate-700 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-300 transition hover:border-[var(--trace-cyan)] hover:text-[var(--trace-cyan)]" onClick={onSelect} type="button">
            {t("radar.viewDetail")}
          </button>
          <a className="border border-[rgba(88,230,255,0.36)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--trace-cyan)] transition hover:bg-[rgba(88,230,255,0.08)]" href={job.sourceUrl} rel="noopener noreferrer" target="_blank">
            {t("radar.sourceLinkShort")} ↗
          </a>
        </div>
      </div>
    </article>
  );
}

function JobDetail({ job, language }: { job: JobMatchResult; language: string }) {
  const { t } = useI18n();

  return (
    <div className="mt-4 space-y-5">
      <div className="border border-slate-800 bg-slate-950/45 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <a className="font-mono text-xl font-black leading-tight text-slate-100 underline-offset-4 transition hover:text-[var(--cyber-green)] hover:underline" href={job.sourceUrl} rel="noopener noreferrer" target="_blank">
              {job.title}
            </a>
            <p className="mt-2 text-sm leading-6 text-slate-400">{job.companyName} · {job.companyNature}</p>
          </div>
          <div className="font-mono text-3xl font-black text-[var(--cyber-green)]">{job.matchPercent}%</div>
        </div>
        <a className="mt-4 inline-flex border border-[rgba(57,255,136,0.42)] px-4 py-2 font-mono text-[12px] uppercase tracking-[0.2em] text-[var(--cyber-green)] transition hover:bg-[rgba(57,255,136,0.08)]" href={job.sourceUrl} rel="noopener noreferrer" target="_blank">
          {t("radar.openSource")} ↗
        </a>
      </div>

      <div className="grid grid-cols-2 gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400">
        <InfoBox label={t("radar.locationMeta")} value={job.location} />
        <InfoBox label={t("radar.salaryMeta")} value={job.salary} />
        <InfoBox label={t("radar.postedMeta")} value={formatDate(job.postedAt, language)} />
        <InfoBox label={t("radar.expiresMeta")} value={formatDate(job.expiresAt, language)} />
      </div>

      <section>
        <h3 className="font-mono text-[12px] uppercase tracking-[0.24em] text-[var(--trace-cyan)]">{t("radar.tagsTitle")}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {job.matchTags.map((tag) => <Tag key={tagKey(tag)} tag={tag} />)}
          {job.warningTags.map((tag) => <Tag key={tagKey(tag)} tag={tag} />)}
        </div>
      </section>

      <DetailList title={t("radar.responsibilities")} items={job.responsibilities} />
      <DetailList title={t("radar.requirements")} items={job.requirements} />

      <section className="border border-slate-800 bg-slate-950/45 p-3">
        <h3 className="font-mono text-[12px] uppercase tracking-[0.24em] text-[var(--trace-cyan)]">source_trace</h3>
        <p className="mt-2 break-all text-[12px] leading-6 text-slate-500">{job.sourceName} / {job.sourceJobId}</p>
      </section>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-slate-800 bg-slate-950/45 p-3">
      <div className="text-[9px] text-slate-600">{label}</div>
      <div className="mt-1 normal-case tracking-normal text-slate-200">{value}</div>
    </div>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3 className="font-mono text-[12px] uppercase tracking-[0.24em] text-[var(--trace-cyan)]">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-400">
        {items.map((item) => <li className="border-l border-slate-800 pl-3" key={item}>{item}</li>)}
      </ul>
    </section>
  );
}

function TagLegend() {
  const { t } = useI18n();
  const kinds: Array<JobMatchTag["kind"]> = ["keyword", "skill", "location", "company", "risk", "gap"];

  return (
    <div className="mt-4 border border-slate-800 bg-slate-950/45 p-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">{t("radar.legendTitle")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {kinds.map((kind) => (
          <span className={cn("border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]", tagTone[kind])} key={kind}>
            {t(tagLabelKeys[kind])}
          </span>
        ))}
      </div>
    </div>
  );
}

function Tag({ tag }: { tag: JobMatchTag }) {
  const { t } = useI18n();
  const label = tag.code ? t(gapTagLabelKeys[tag.code]) : tag.label;

  return (
    <span className={cn(
      "border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]",
      tagTone[tag.kind],
    )}>
      {label}
    </span>
  );
}

function tagKey(tag: JobMatchTag) {
  return `${tag.kind}:${tag.label}:${tag.code ?? ""}`;
}

function fillTemplate(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)), template);
}

function formatDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language, { month: "2-digit", day: "2-digit" }).format(new Date(value));
}

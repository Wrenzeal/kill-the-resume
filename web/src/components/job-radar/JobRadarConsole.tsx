"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LanguageToggle } from "@/components/editor/LanguageToggle";
import { useI18n } from "@/hooks/useI18n";
import { ApiError, apiClient, type JobRadarPluginTokenMeta, type JobRadarResponse } from "@/lib/api";
import { cn } from "@/lib/css";
import type { Language, TranslationKey } from "@/lib/i18n";
import {
  createDefaultJobRadarCriteria,
  jobFreshnessPolicy,
  normalizeJobRadarCriteria,
  parseJobRadarInput,
  type JobMatchTag,
  type JobMatchResult,
  type JobRadarSearchCriteria,
} from "@/lib/job-radar";
import { useCloudStore } from "@/store/cloud-store";

type RadarForm = {
  keywords: string;
  locations: string;
  companyNatures: string;
  requiredSkills: string;
  excludeKeywords: string;
  minScore: number;
};

type ImportForm = {
  sourceName: string;
  sourceUrl: string;
  title: string;
  companyName: string;
  companyNature: string;
  location: string;
  salary: string;
  rawText: string;
};

const emptyImportForm: ImportForm = {
  sourceName: "",
  sourceUrl: "",
  title: "",
  companyName: "",
  companyNature: "",
  location: "",
  salary: "",
  rawText: "",
};

function toRadarForm(criteria: JobRadarSearchCriteria): RadarForm {
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

function optionalTime(value: string | undefined, fallback: string, language: string) {
  return value ? formatDateTime(value, language) : fallback;
}

function pluginTokenState(token: JobRadarPluginTokenMeta, now = Date.now()) {
  if (token.revokedAt) return "revoked";
  if (token.expiresAt && new Date(token.expiresAt).getTime() <= now) return "expired";
  return "active";
}

type PreferenceStatus = "anonymous" | "loading" | "ready" | "restored" | "saved" | "error";

type PreferenceLoadState = {
  token: string | null;
  status: PreferenceStatus;
};

const preferenceStatusKeys: Record<PreferenceStatus, TranslationKey> = {
  anonymous: "radar.preferenceLoginHint",
  loading: "radar.preferenceLoading",
  ready: "radar.preferenceReady",
  restored: "radar.preferenceRestored",
  saved: "radar.preferenceSaved",
  error: "radar.preferenceError",
};

export function JobRadarConsole() {
  const { language } = useI18n();
  const token = useCloudStore((state) => state.token);
  const user = useCloudStore((state) => state.user);
  const clearAuth = useCloudStore((state) => state.clearAuth);
  const sessionKey = token ? `auth:${user?.id ?? "session"}` : "guest";

  return <JobRadarConsoleContent clearAuth={clearAuth} key={`${language}:${sessionKey}`} language={language} token={token} userEmail={user?.email ?? null} />;
}

function JobRadarConsoleContent({ clearAuth, language, token, userEmail }: { clearAuth: () => void; language: Language; token: string | null; userEmail: string | null }) {
  const { t } = useI18n();
  const defaultCriteria = useMemo(() => createDefaultJobRadarCriteria(language), [language]);
  const [form, setForm] = useState<RadarForm>(() => toRadarForm(defaultCriteria));
  const [feed, setFeed] = useState<JobRadarResponse | null>(null);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importForm, setImportForm] = useState<ImportForm>(emptyImportForm);
  const [importStatus, setImportStatus] = useState("");
  const [pluginTokens, setPluginTokens] = useState<JobRadarPluginTokenMeta[]>([]);
  const [pluginTokenName, setPluginTokenName] = useState("Job Radar Collector");
  const [pluginTokenExpiresInDays, setPluginTokenExpiresInDays] = useState("90");
  const [issuedPluginToken, setIssuedPluginToken] = useState("");
  const [pluginTokenCopied, setPluginTokenCopied] = useState(false);
  const [pluginTokenStatus, setPluginTokenStatus] = useState("");
  const [isPluginTokenBusy, setIsPluginTokenBusy] = useState(false);
  const [preferenceLoad, setPreferenceLoad] = useState<PreferenceLoadState>(() => ({
    token: token ?? null,
    status: token ? "loading" : "anonymous",
  }));
  const forceRefreshRef = useRef(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const preferenceStatus = token
    ? (preferenceLoad.token === token ? preferenceLoad.status : "loading")
    : "anonymous";
  const preferenceReady = !token || (preferenceLoad.token === token && preferenceLoad.status !== "loading");
  const preferenceLoadFailedRef = useRef(false);
  const userEditedRef = useRef(false);
  const criteria = useMemo(() => ({
    keywords: parseJobRadarInput(form.keywords),
    locations: parseJobRadarInput(form.locations),
    companyNatures: parseJobRadarInput(form.companyNatures),
    requiredSkills: parseJobRadarInput(form.requiredSkills),
    excludeKeywords: parseJobRadarInput(form.excludeKeywords),
    minScore: form.minScore,
  }), [form]);

  useEffect(() => {
    const controller = new AbortController();

    if (!token) {
      return () => controller.abort();
    }

    apiClient.getJobRadarPreference(token, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }
        if (response.criteria) {
          preferenceLoadFailedRef.current = false;
          setForm(toRadarForm(normalizeJobRadarCriteria(response.criteria)));
          setPreferenceLoad({ token, status: "restored" });
        } else {
          preferenceLoadFailedRef.current = false;
          setForm(toRadarForm(defaultCriteria));
          setPreferenceLoad({ token, status: "ready" });
        }
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }
        preferenceLoadFailedRef.current = true;
        setForm(toRadarForm(defaultCriteria));
        setPreferenceLoad({ token, status: "error" });
      });

    return () => controller.abort();
  }, [defaultCriteria, token]);

  useEffect(() => {
    const controller = new AbortController();

    if (!token) {
      return () => controller.abort();
    }

    apiClient.listJobRadarPluginTokens(token, controller.signal)
      .then((payload) => {
        if (controller.signal.aborted) return;
        setPluginTokens(payload.tokens);
        setPluginTokenStatus(t("radar.pluginTokenReady"));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          clearAuth();
          setPluginTokenStatus(t("radar.pluginTokenSessionExpired"));
          return;
        }
        setPluginTokenStatus(error instanceof Error ? error.message : t("radar.pluginTokenLoadError"));
      });

    return () => controller.abort();
  }, [clearAuth, t, token]);

  useEffect(() => {
    if (!preferenceReady) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const forceRefresh = forceRefreshRef.current;
      forceRefreshRef.current = false;
      setIsLoadingFeed(true);
      if (token && (!preferenceLoadFailedRef.current || userEditedRef.current)) {
        void apiClient.saveJobRadarPreference(token, criteria, controller.signal)
          .then(() => {
            if (!controller.signal.aborted) {
              preferenceLoadFailedRef.current = false;
              userEditedRef.current = false;
              setPreferenceLoad({ token, status: "saved" });
            }
          })
          .catch(() => {
            if (!controller.signal.aborted) {
              setPreferenceLoad({ token, status: "error" });
            }
          });
      }
      apiClient.listJobRadarJobs(criteria, controller.signal, { refresh: forceRefresh })
        .then((response) => {
          setFeed(response);
          setFeedError(response.meta.syncError ?? "");
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) {
            return;
          }
          setFeed(null);
          setFeedError(error instanceof Error ? error.message : "job radar backend unavailable");
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoadingFeed(false);
          }
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [criteria, preferenceReady, refreshNonce, token]);

  const results = feed?.jobs ?? [];
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const selected = results.find((job) => job.id === selectedId) ?? results[0];
  const signalCount = feed?.meta.cachedCount ?? 0;
  const expiredCount = feed?.meta.expiredCount ?? 0;
  const policy = feed?.policy ?? jobFreshnessPolicy;
  const policyText = fillTemplate(t("radar.policyText"), {
    hot: policy.hotWithinDays,
    normal: policy.normalWithinDays,
    stale: policy.staleWithinDays,
  });
  const sourceStatus = fillTemplate(t("radar.dataSourceBackend"), { source: feed?.meta.sourceName || "Remotive" });
  const sourceWarning = feedError ? fillTemplate(t("radar.syncWarning"), { message: feedError }) : "";
  const sourceSearchScope = feed?.meta.searchQuery ? fillTemplate(t("radar.searchScope"), { query: feed.meta.searchQuery }) : "";
  const sourceCacheStatus = feed ? t(feed.meta.cacheHit ? "radar.cacheHit" : "radar.cacheSynced") : "";
  const sourceRefreshResult = feed?.meta.forceRefresh && feed.meta.syncedAt
    ? fillTemplate(t("radar.refreshResult"), { fetched: feed.meta.fetchedCount, linked: feed.meta.linkedCount })
    : "";
  const sourceLastSyncAt = feed?.meta.syncedAt ?? feed?.meta.lastSyncedAt;
  const sourceLastSync = sourceLastSyncAt ? fillTemplate(t("radar.lastSync"), { time: formatDateTime(sourceLastSyncAt, language) }) : "";
  const preferenceStatusText = t(preferenceStatusKeys[preferenceStatus]);
  const visiblePluginTokenStatus = token ? pluginTokenStatus || t("radar.pluginTokenLoading") : t("radar.pluginTokenLoginRequired");

  const updateField = (field: keyof RadarForm) => (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const value = field === "minScore" ? Number(event.target.value) : event.target.value;
    userEditedRef.current = true;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const refreshSource = () => {
    forceRefreshRef.current = true;
    setRefreshNonce((current) => current + 1);
  };

  const openImportDialog = () => {
    setImportStatus(token ? "" : t("radar.importLoginRequired"));
    setIsImportOpen(true);
  };

  const closeImportDialog = () => {
    if (!isImporting) {
      setIsImportOpen(false);
    }
  };

  const updateImportField = (field: keyof ImportForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setImportForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const submitImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setImportStatus(t("radar.importLoginRequired"));
      return;
    }
    const sourceUrl = importForm.sourceUrl.trim();
    if (!sourceUrl) {
      setImportStatus(t("radar.importSourceUrlRequired"));
      return;
    }

    setIsImporting(true);
    setImportStatus("");
    try {
      const response = await apiClient.importJobRadarPosting(token, {
        sourceName: importForm.sourceName.trim(),
        sourceUrl,
        title: importForm.title.trim(),
        companyName: importForm.companyName.trim(),
        companyNature: importForm.companyNature.trim(),
        location: importForm.location.trim(),
        salary: importForm.salary.trim(),
        description: importForm.rawText.trim(),
        rawText: importForm.rawText.trim(),
        criteria,
      });
      setSelectedId(response.job.id);
      setFeed((current) => {
        if (!current) {
          return current;
        }
        const jobs = [response.job, ...current.jobs.filter((job) => job.id !== response.job.id)];
        return {
          ...current,
          jobs,
          meta: {
            ...current.meta,
            cachedCount: Math.max(current.meta.cachedCount, jobs.length),
            searchFingerprint: response.meta.searchFingerprint,
            searchQuery: response.meta.searchQuery,
          },
        };
      });
      setImportForm(emptyImportForm);
      setImportStatus(t("radar.importSuccess"));
      setIsImportOpen(false);
      setRefreshNonce((current) => current + 1);
    } catch (error) {
      setImportStatus(fillTemplate(t("radar.importError"), {
        message: error instanceof Error ? error.message : "unknown error",
      }));
    } finally {
      setIsImporting(false);
    }
  };

  const refreshPluginTokens = async () => {
    if (!token) {
      setPluginTokenStatus(t("radar.pluginTokenLoginRequired"));
      return;
    }

    setIsPluginTokenBusy(true);
    setPluginTokenStatus(t("radar.pluginTokenLoading"));
    try {
      const payload = await apiClient.listJobRadarPluginTokens(token);
      setPluginTokens(payload.tokens);
      setPluginTokenStatus(t("radar.pluginTokenReady"));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuth();
        setPluginTokenStatus(t("radar.pluginTokenSessionExpired"));
        return;
      }
      setPluginTokenStatus(error instanceof Error ? error.message : t("radar.pluginTokenLoadError"));
    } finally {
      setIsPluginTokenBusy(false);
    }
  };

  const copyIssuedPluginToken = async (value = issuedPluginToken) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setPluginTokenCopied(true);
      setPluginTokenStatus(t("radar.pluginTokenCopied"));
      window.setTimeout(() => setPluginTokenCopied(false), 1800);
    } catch {
      setPluginTokenCopied(false);
      setPluginTokenStatus(t("radar.pluginTokenManualCopy"));
    }
  };

  const createPluginToken = async () => {
    if (!token) {
      setPluginTokenStatus(t("radar.pluginTokenLoginRequired"));
      return;
    }

    const parsedDays = Number.parseInt(pluginTokenExpiresInDays, 10);
    const expiresInDays = Number.isFinite(parsedDays) ? Math.min(365, Math.max(1, parsedDays)) : 90;
    setIsPluginTokenBusy(true);
    setPluginTokenStatus(t("radar.pluginTokenCreating"));

    try {
      const payload = await apiClient.createJobRadarPluginToken(token, {
        name: pluginTokenName,
        expiresInDays,
      });
      setIssuedPluginToken(payload.token);
      setPluginTokens((current) => [payload.meta, ...current]);
      setPluginTokenStatus(t("radar.pluginTokenCreated"));
      void copyIssuedPluginToken(payload.token);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuth();
        setPluginTokenStatus(t("radar.pluginTokenSessionExpired"));
        return;
      }
      setPluginTokenStatus(error instanceof Error ? error.message : t("radar.pluginTokenLoadError"));
    } finally {
      setIsPluginTokenBusy(false);
    }
  };

  const revokePluginToken = async (tokenId: string) => {
    if (!token) return;
    setIsPluginTokenBusy(true);
    setPluginTokenStatus(t("radar.pluginTokenRevoking"));
    try {
      await apiClient.revokeJobRadarPluginToken(token, tokenId);
      const payload = await apiClient.listJobRadarPluginTokens(token);
      setPluginTokens(payload.tokens);
      setPluginTokenStatus(t("radar.pluginTokenRevokeSuccess"));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuth();
        setPluginTokenStatus(t("radar.pluginTokenSessionExpired"));
        return;
      }
      setPluginTokenStatus(error instanceof Error ? error.message : t("radar.pluginTokenLoadError"));
    } finally {
      setIsPluginTokenBusy(false);
    }
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

        <section className="tactical-panel border-[rgba(88,230,255,0.22)] bg-[rgba(2,6,23,0.38)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--trace-cyan)]">browser_extension_token</p>
              <h2 className="mt-1 font-mono text-xl font-black uppercase tracking-[-0.04em] text-white">{t("radar.pluginTokenTitle")}</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">{t("radar.pluginTokenDescription")}</p>
              {userEmail ? <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">{fillTemplate(t("radar.pluginTokenSignedIn"), { email: userEmail })}</p> : null}
            </div>
            <button type="button" onClick={refreshPluginTokens} disabled={isPluginTokenBusy || !token} className="border border-[rgba(88,230,255,0.35)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--trace-cyan)] transition hover:bg-[rgba(88,230,255,0.08)] disabled:cursor-not-allowed disabled:opacity-50">
              {t("radar.pluginTokenRefresh")}
            </button>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[1.4fr_0.65fr_auto]">
            <label className="tactical-field block px-3 py-2">
              <span className="relative z-10 block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{t("radar.pluginTokenName")}</span>
              <input className="tactical-input mt-1 text-[15px]" value={pluginTokenName} onChange={(event) => setPluginTokenName(event.target.value)} placeholder={t("radar.pluginTokenNamePlaceholder")} disabled={!token} />
            </label>
            <label className="tactical-field block px-3 py-2">
              <span className="relative z-10 block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{t("radar.pluginTokenExpiresDays")}</span>
              <input className="tactical-input mt-1 text-[15px]" inputMode="numeric" value={pluginTokenExpiresInDays} onChange={(event) => setPluginTokenExpiresInDays(event.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="90" disabled={!token} />
            </label>
            <button type="button" onClick={createPluginToken} disabled={isPluginTokenBusy || !token} className="border border-[rgba(57,255,136,0.55)] bg-[rgba(57,255,136,0.08)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--cyber-green)] transition hover:bg-[rgba(57,255,136,0.14)] disabled:cursor-not-allowed disabled:opacity-50">
              {t("radar.pluginTokenCreate")}
            </button>
          </div>

          {issuedPluginToken ? (
            <div className="mt-4 border border-[rgba(57,255,136,0.28)] bg-[rgba(57,255,136,0.06)] p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--cyber-green)]">{t("radar.pluginTokenOneTime")}</p>
              <div className="mt-2 flex flex-col gap-2 md:flex-row">
                <input className="tactical-input min-w-0 flex-1 font-mono text-[12px]" value={issuedPluginToken} readOnly onFocus={(event) => event.currentTarget.select()} />
                <button type="button" onClick={() => copyIssuedPluginToken()} className="border border-[rgba(57,255,136,0.45)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--cyber-green)] transition hover:bg-[rgba(57,255,136,0.1)]">
                  {pluginTokenCopied ? t("radar.pluginTokenCopiedShort") : t("radar.pluginTokenCopy")}
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {pluginTokens.length === 0 ? (
              <div className="border border-dashed border-[rgba(125,139,153,0.24)] px-4 py-5 text-sm text-slate-500">{token ? t("radar.pluginTokenEmpty") : t("radar.pluginTokenLoginRequired")}</div>
            ) : (
              pluginTokens.map((pluginToken) => {
                const state = pluginTokenState(pluginToken);
                return (
                  <article key={pluginToken.id} className="border border-[rgba(125,139,153,0.18)] bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[13px] uppercase tracking-[0.1em] text-slate-100">{pluginToken.name}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{t("radar.pluginTokenExpires")}: {optionalTime(pluginToken.expiresAt, t("radar.pluginTokenNever"), language)}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{t("radar.pluginTokenLastUsed")}: {optionalTime(pluginToken.lastUsedAt, t("radar.pluginTokenNever"), language)}</p>
                      </div>
                      <span className={cn("inline-flex shrink-0 items-center whitespace-nowrap border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em]", state === "active" && "border-[rgba(57,255,136,0.35)] text-[var(--cyber-green)]", state === "expired" && "border-[rgba(255,138,61,0.35)] text-[var(--warning-orange)]", state === "revoked" && "border-red-400/30 text-red-300")}>
                        {t(state === "active" ? "radar.pluginTokenActive" : state === "expired" ? "radar.pluginTokenExpired" : "radar.pluginTokenRevoked")}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => revokePluginToken(pluginToken.id)} disabled={isPluginTokenBusy || state === "revoked"} className="border border-red-400/30 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50">
                        {t("radar.pluginTokenRevoke")}
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
          {visiblePluginTokenStatus ? <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">{visiblePluginTokenStatus}</p> : null}
        </section>

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
              <MetricBox label={t("radar.metricSignals")} value={signalCount} />
              <MetricBox label={t("radar.metricExpired")} value={expiredCount} tone="warning" />
              <MetricBox label={t("radar.metricMatched")} value={results.length} tone="green" />
            </div>
            <div className="mt-4 space-y-2 text-[12px] leading-6 text-slate-500">
              <p>{policyText}</p>
              <p className={cn("font-mono uppercase tracking-[0.16em]", !feed && feedError ? "text-[var(--warning-orange)]" : "text-slate-400")}>{sourceStatus}</p>
              {sourceSearchScope ? <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-400">{sourceSearchScope}</p> : null}
              {sourceCacheStatus ? <p className={cn("font-mono text-[11px] uppercase tracking-[0.14em]", feed?.meta.cacheHit ? "text-slate-500" : "text-[var(--cyber-green)]")}>{sourceCacheStatus}</p> : null}
              {sourceRefreshResult ? <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--cyber-green)]">{sourceRefreshResult}</p> : null}
              {sourceLastSync ? <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">{sourceLastSync}</p> : null}
              {preferenceStatusText ? <p className={cn(
                "font-mono text-[11px] uppercase tracking-[0.14em]",
                preferenceStatus === "error" && "text-[var(--warning-orange)]",
                preferenceStatus === "loading" && "text-[var(--trace-cyan)]",
                preferenceStatus === "restored" && "text-[var(--trace-cyan)]",
                preferenceStatus === "saved" && "text-[var(--cyber-green)]",
                (preferenceStatus === "anonymous" || preferenceStatus === "ready") && "text-slate-500",
              )}>{preferenceStatusText}</p> : null}
              {isLoadingFeed ? <p className="text-[var(--trace-cyan)]">{t("radar.loadingSignals")}</p> : null}
              {sourceWarning ? <p className="text-[var(--warning-orange)]">{sourceWarning}</p> : null}
              <button className="mt-2 w-full border border-[rgba(88,230,255,0.36)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--trace-cyan)] transition hover:bg-[rgba(88,230,255,0.08)] disabled:cursor-not-allowed disabled:opacity-50" disabled={isLoadingFeed} onClick={refreshSource} type="button">
                {isLoadingFeed ? t("radar.refreshingSource") : t("radar.refreshSource")}
              </button>
              <button className="w-full border border-[rgba(57,255,136,0.42)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--cyber-green)] transition hover:bg-[rgba(57,255,136,0.08)]" onClick={openImportDialog} type="button">
                {t("radar.importJob")}
              </button>
            </div>
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
      {isImportOpen ? (
        <ImportDialog
          form={importForm}
          isImporting={isImporting}
          status={importStatus}
          onChange={updateImportField}
          onClose={closeImportDialog}
          onSubmit={submitImport}
        />
      ) : null}
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

function RadarInput({ label, value, onChange, placeholder, required = false }: {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">{label}</span>
      <div className="mt-2 tactical-field px-3 py-2">
        <input className="tactical-input text-[14px]" onChange={onChange} placeholder={placeholder} required={required} value={value} />
      </div>
    </label>
  );
}

function ImportDialog({ form, isImporting, status, onChange, onClose, onSubmit }: {
  form: ImportForm;
  isImporting: boolean;
  status: string;
  onChange: (field: keyof ImportForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <form className="tactical-panel tactical-scrollbar max-h-[92vh] w-full max-w-3xl overflow-y-auto p-5 shadow-[0_0_48px_rgba(57,255,136,0.16)]" onSubmit={onSubmit}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PanelTitle eyebrow="manual_job_import" title={t("radar.importTitle")} />
          <button className="border border-slate-700 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400 transition hover:border-[var(--warning-orange)] hover:text-[var(--warning-orange)] disabled:cursor-not-allowed disabled:opacity-50" disabled={isImporting} onClick={onClose} type="button">
            {t("radar.importCancel")}
          </button>
        </div>
        <p className="mt-3 text-sm leading-7 text-slate-400">{t("radar.importDescription")}</p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <RadarInput label={t("radar.importSourceName")} onChange={onChange("sourceName")} placeholder={t("radar.importSourceNamePlaceholder")} value={form.sourceName} />
          <RadarInput label={t("radar.importSourceUrl")} onChange={onChange("sourceUrl") as (event: React.ChangeEvent<HTMLInputElement>) => void} placeholder={t("radar.importSourceUrlPlaceholder")} required value={form.sourceUrl} />
          <RadarInput label={t("radar.importJobTitle")} onChange={onChange("title")} placeholder={t("radar.importJobTitlePlaceholder")} value={form.title} />
          <RadarInput label={t("radar.importCompany")} onChange={onChange("companyName")} placeholder={t("radar.importCompanyPlaceholder")} value={form.companyName} />
          <RadarInput label={t("radar.importCompanyNature")} onChange={onChange("companyNature")} placeholder={t("radar.importCompanyNaturePlaceholder")} value={form.companyNature} />
          <RadarInput label={t("radar.importLocation")} onChange={onChange("location")} placeholder={t("radar.importLocationPlaceholder")} value={form.location} />
          <RadarInput label={t("radar.importSalary")} onChange={onChange("salary")} placeholder={t("radar.importSalaryPlaceholder")} value={form.salary} />
        </div>

        <div className="mt-4">
          <RadarTextarea label={t("radar.importRawText")} onChange={onChange("rawText") as (event: React.ChangeEvent<HTMLTextAreaElement>) => void} placeholder={t("radar.importRawTextPlaceholder")} rows={8} value={form.rawText} />
        </div>

        {status ? <p className="mt-4 border border-slate-800 bg-slate-950/55 px-3 py-2 text-sm leading-6 text-[var(--warning-orange)]">{status}</p> : null}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <button className="border border-slate-700 px-4 py-2 font-mono text-[12px] uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50" disabled={isImporting} onClick={onClose} type="button">
            {t("radar.importCancel")}
          </button>
          <button className="border border-[rgba(57,255,136,0.52)] px-4 py-2 font-mono text-[12px] uppercase tracking-[0.2em] text-[var(--cyber-green)] transition hover:bg-[rgba(57,255,136,0.08)] disabled:cursor-not-allowed disabled:opacity-50" disabled={isImporting} type="submit">
            {isImporting ? t("radar.importSubmitting") : t("radar.importSubmit")}
          </button>
        </div>
      </form>
    </div>
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

function formatDateTime(value: string, language: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(language, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

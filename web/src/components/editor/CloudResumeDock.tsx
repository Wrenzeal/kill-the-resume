"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiClient } from "@/lib/api";
import { initialResumeDraft } from "@/lib/resume-defaults";
import { normalizeResumeDraftForPersistence } from "@/lib/resume-normalize";
import {
  readActiveCloudResumeSession,
  useCloudStore,
  writeActiveCloudResumeSession,
} from "@/store/cloud-store";
import { useEditorStore } from "@/store/editor-store";
import { useI18n } from "@/hooks/useI18n";

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString(undefined, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function draftTitle(name: string, targetRole: string) {
  const normalizedName = name.trim() || "Untitled Operator";
  const normalizedRole = targetRole.trim() || "Resume Draft";
  return `${normalizedName} · ${normalizedRole}`;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function hasExpectedAudience(value: unknown) {
  if (typeof value === "string") return value === "kill-the-resume-web";
  if (Array.isArray(value)) return value.includes("kill-the-resume-web");
  return false;
}

function isStoredTokenUsable(token: string) {
  const payload = decodeJwtPayload(token);
  const exp = typeof payload?.exp === "number" ? payload.exp : Number(payload?.exp);

  return (
    Boolean(payload) &&
    Number.isFinite(exp) &&
    exp * 1000 > Date.now() + 30_000 &&
    payload?.iss === "kill-the-resume" &&
    hasExpectedAudience(payload?.aud)
  );
}

export function CloudResumeDock() {
  const { t } = useI18n();
  const draft = useEditorStore((state) => state.draft);
  const replaceDraft = useEditorStore((state) => state.replaceDraft);
  const token = useCloudStore((state) => state.token);
  const user = useCloudStore((state) => state.user);
  const resumes = useCloudStore((state) => state.resumes);
  const currentResumeId = useCloudStore((state) => state.currentResumeId);
  const status = useCloudStore((state) => state.status);
  const message = useCloudStore((state) => state.message);
  const setAuth = useCloudStore((state) => state.setAuth);
  const clearAuth = useCloudStore((state) => state.clearAuth);
  const setResumes = useCloudStore((state) => state.setResumes);
  const setCurrentResumeId = useCloudStore((state) => state.setCurrentResumeId);
  const setStatus = useCloudStore((state) => state.setStatus);

  const [email, setEmail] = useState("dev@example.com");
  const [password, setPassword] = useState("password8246");
  const [displayName, setDisplayName] = useState("Dev Operator");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const autoRefreshedTokenRef = useRef<string | null>(null);
  const restoredSessionRef = useRef<string | null>(null);

  const hasCurrentResume = Boolean(currentResumeId);

  const handleClearAuth = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  const handleAuthorizedRequestError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        autoRefreshedTokenRef.current = null;
        handleClearAuth();
        setStatus("error", t("cloud.sessionExpired"));
        return true;
      }

      return false;
    },
    [handleClearAuth, setStatus, t],
  );

  const refreshResumes = useCallback(async () => {
    if (!token) return;
    setStatus("busy", t("cloud.statusLoading"));
    try {
      const payload = await apiClient.listResumes(token);
      setResumes(payload.resumes);

      const activeResumeId = useCloudStore.getState().currentResumeId;
      if (activeResumeId && !payload.resumes.some((resume) => resume.id === activeResumeId)) {
        setCurrentResumeId(null);
      }
      setStatus("synced", t("cloud.statusSynced"));
    } catch (error) {
      if (handleAuthorizedRequestError(error)) return;
      setStatus("error", error instanceof Error ? error.message : t("cloud.statusError"));
    }
  }, [handleAuthorizedRequestError, setCurrentResumeId, setResumes, setStatus, t, token]);

  useEffect(() => {
    if (!token) return;

    if (!user || !isStoredTokenUsable(token)) {
      autoRefreshedTokenRef.current = null;
      clearAuth();
      setStatus("error", t("cloud.sessionExpired"));
      return;
    }

    const storedSession = readActiveCloudResumeSession(user.id);
    if (!currentResumeId && storedSession && restoredSessionRef.current !== storedSession.resumeId) {
      restoredSessionRef.current = storedSession.resumeId;
      replaceDraft(storedSession.draft);
      setCurrentResumeId(storedSession.resumeId);
      setStatus("synced", t("cloud.statusRestored"));
    }

    if (autoRefreshedTokenRef.current === token) return;
    autoRefreshedTokenRef.current = token;
    void refreshResumes();
  }, [clearAuth, currentResumeId, refreshResumes, replaceDraft, setCurrentResumeId, setStatus, t, token, user]);


  useEffect(() => {
    if (!user || !currentResumeId) return;

    writeActiveCloudResumeSession({
      userId: user.id,
      resumeId: currentResumeId,
      draft,
    });
  }, [currentResumeId, draft, user]);

  const handleAuth = async () => {
    setStatus("busy", authMode === "login" ? t("cloud.statusLogin") : t("cloud.statusRegister"));
    try {
      const payload =
        authMode === "login"
          ? await apiClient.login({ email, password })
          : await apiClient.register({ email, password, displayName });
      autoRefreshedTokenRef.current = payload.token;
      setAuth(payload.token, payload.user);
      const list = await apiClient.listResumes(payload.token);
      setResumes(list.resumes);
      setStatus("synced", t("cloud.statusSynced"));
    } catch (error) {
      setStatus("error", error instanceof Error ? error.message : t("cloud.statusError"));
    }
  };

  const persistResume = async (mode: "current" | "new") => {
    if (!token) {
      setStatus("error", t("cloud.needLogin"));
      return;
    }

    const title = draftTitle(draft.identity.name, draft.exportProtocol.targetRole || draft.identity.title);
    const targetRole = draft.exportProtocol.targetRole || draft.identity.title;
    const shouldUpdateCurrent = mode === "current" && currentResumeId;
    const content = normalizeResumeDraftForPersistence(draft);
    setStatus("busy", t("cloud.statusSaving"));

    try {
      const payload = shouldUpdateCurrent
        ? await apiClient.updateResume(token, currentResumeId, { title, targetRole, content })
        : await apiClient.createResume(token, { title, targetRole, content });
      setCurrentResumeId(payload.resume.id);
      if (user) {
        writeActiveCloudResumeSession({
          userId: user.id,
          resumeId: payload.resume.id,
          draft: payload.resume.content,
        });
      }
      const list = await apiClient.listResumes(token);
      setResumes(list.resumes);
      setStatus("synced", shouldUpdateCurrent ? t("cloud.statusSaved") : t("cloud.statusCreated"));
    } catch (error) {
      if (handleAuthorizedRequestError(error)) return;
      if (mode === "current" && error instanceof ApiError && error.status === 404) {
        setCurrentResumeId(null);
        setStatus("error", t("cloud.resumeMissing"));
        return;
      }
      setStatus("error", error instanceof Error ? error.message : t("cloud.statusError"));
    }
  };

  const saveResume = () => persistResume("current");
  const createNewResume = () => persistResume("new");

  const createDefaultResume = () => {
    restoredSessionRef.current = null;
    setCurrentResumeId(null);
    replaceDraft(structuredClone(initialResumeDraft));
    setStatus("synced", t("cloud.statusDefaultCreated"));
  };

  const loadResume = async (resumeId: string) => {
    if (!token) return;
    setStatus("busy", t("cloud.statusLoading"));
    try {
      const payload = await apiClient.getResume(token, resumeId);
      replaceDraft(payload.resume.content);
      setCurrentResumeId(payload.resume.id);
      if (user) {
        writeActiveCloudResumeSession({
          userId: user.id,
          resumeId: payload.resume.id,
          draft: payload.resume.content,
        });
      }
      setStatus("synced", t("cloud.statusLoaded"));
    } catch (error) {
      if (handleAuthorizedRequestError(error)) return;
      setStatus("error", error instanceof Error ? error.message : t("cloud.statusError"));
    }
  };

  const deleteResume = async (resumeId: string) => {
    if (!token) return;
    setStatus("busy", t("cloud.statusDeleting"));
    try {
      await apiClient.deleteResume(token, resumeId);
      if (currentResumeId === resumeId) {
        setCurrentResumeId(null);
      }
      const list = await apiClient.listResumes(token);
      setResumes(list.resumes);
      setStatus("synced", t("cloud.statusDeleted"));
    } catch (error) {
      if (handleAuthorizedRequestError(error)) return;
      setStatus("error", error instanceof Error ? error.message : t("cloud.statusError"));
    }
  };

  return (
    <section className="tactical-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.36em] text-[var(--trace-cyan)]">{t("cloud.eyebrow")}</p>
          <h2 className="mt-2 font-mono text-xl font-black uppercase tracking-[-0.04em] text-white">{t("cloud.title")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            {t("cloud.description")}
          </p>
        </div>
        <div className="border border-[rgba(57,255,136,0.25)] bg-[rgba(57,255,136,0.06)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--cyber-green)]">
          {status === "busy" ? t("cloud.statusBusy") : status === "error" ? t("cloud.statusError") : user ? t("cloud.statusOnline") : t("cloud.statusOffline")}
        </div>
      </div>

      {!user ? (
        <div className="mt-5 grid gap-3 xl:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="tactical-field block px-3 py-2">
            <span className="relative z-10 block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{t("cloud.email")}</span>
            <input className="tactical-input mt-1 text-[15px]" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="tactical-field block px-3 py-2">
            <span className="relative z-10 block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{t("cloud.password")}</span>
            <input className="tactical-input mt-1 text-[15px]" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <label className="tactical-field block px-3 py-2">
            <span className="relative z-10 block font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">{t("cloud.displayName")}</span>
            <input className="tactical-input mt-1 text-[15px]" value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={authMode === "login"} />
          </label>
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
              className="border border-[rgba(125,139,153,0.24)] px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400 transition hover:border-[rgba(88,230,255,0.4)] hover:text-[var(--trace-cyan)]"
            >
              {authMode === "login" ? t("cloud.switchRegister") : t("cloud.switchLogin")}
            </button>
            <button
              type="button"
              onClick={handleAuth}
              disabled={status === "busy"}
              className="border border-[rgba(57,255,136,0.5)] bg-[rgba(57,255,136,0.08)] px-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--cyber-green)] transition hover:bg-[rgba(57,255,136,0.14)] disabled:cursor-wait disabled:opacity-60"
            >
              {authMode === "login" ? t("cloud.login") : t("cloud.register")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border border-[rgba(125,139,153,0.16)] bg-black/20 px-4 py-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">{t("cloud.currentUser")}</p>
              <p className="mt-1 truncate text-[15px] text-slate-200">{user.displayName} · {user.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={saveResume} disabled={status === "busy"} className="border border-[rgba(57,255,136,0.55)] bg-[rgba(57,255,136,0.08)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--cyber-green)] transition hover:bg-[rgba(57,255,136,0.14)] disabled:cursor-wait disabled:opacity-60">
                {hasCurrentResume ? t("cloud.save") : t("cloud.createSave")}
              </button>
              {hasCurrentResume ? (
                <button type="button" onClick={createNewResume} disabled={status === "busy"} className="border border-[rgba(88,230,255,0.35)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--trace-cyan)] transition hover:bg-[rgba(88,230,255,0.08)] disabled:cursor-wait disabled:opacity-60">
                  {t("cloud.saveAsNew")}
                </button>
              ) : null}
              <button type="button" onClick={createDefaultResume} disabled={status === "busy"} className="border border-[rgba(255,138,61,0.35)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--warning-orange)] transition hover:bg-[rgba(255,138,61,0.08)] disabled:cursor-wait disabled:opacity-60">
                {t("cloud.newDefault")}
              </button>
              <button type="button" onClick={refreshResumes} disabled={status === "busy"} className="border border-[rgba(88,230,255,0.35)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--trace-cyan)] transition hover:bg-[rgba(88,230,255,0.08)] disabled:cursor-wait disabled:opacity-60">
                {t("cloud.refresh")}
              </button>
              <button type="button" onClick={handleClearAuth} className="border border-[rgba(255,138,61,0.35)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--warning-orange)] transition hover:bg-[rgba(255,138,61,0.08)]">
                {t("cloud.logout")}
              </button>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {resumes.length === 0 ? (
              <div className="border border-dashed border-[rgba(125,139,153,0.24)] px-4 py-5 text-sm text-slate-500">{t("cloud.empty")}</div>
            ) : (
              resumes.map((resume) => (
                <article key={resume.id} className="border border-[rgba(125,139,153,0.18)] bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[13px] uppercase tracking-[0.1em] text-slate-100">{resume.title}</p>
                      <p className="mt-1 truncate text-[11px] text-slate-500">{resume.targetRole || t("cloud.noTargetRole")} · {formatTime(resume.updatedAt)}</p>
                    </div>
                    {resume.id === currentResumeId ? (
                      <span className="inline-flex shrink-0 items-center whitespace-nowrap border border-[rgba(57,255,136,0.35)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cyber-green)]">{t("cloud.active")}</span>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => loadResume(resume.id)} className="border border-[rgba(88,230,255,0.35)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--trace-cyan)] transition hover:bg-[rgba(88,230,255,0.08)]">
                      {t("cloud.load")}
                    </button>
                    <button type="button" onClick={() => deleteResume(resume.id)} className="border border-red-400/30 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-red-300 transition hover:bg-red-500/10">
                      {t("cloud.delete")}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-[rgba(125,139,153,0.14)] pt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
        {message || t("cloud.messageIdle")}
      </div>
    </section>
  );
}

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ApiResumeListItem, ApiUser } from "@/lib/api";
import type { ResumeDraft } from "@/types/resume";

export type ActiveCloudResumeSession = {
  userId: string;
  resumeId: string;
  draft: ResumeDraft;
  updatedAt?: number;
};

const activeResumeSessionKey = "kill-the-resume-active-cloud-resume";

function browserSessionStorage() {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readActiveCloudResumeSession(userId?: string | null) {
  const storage = browserSessionStorage();
  if (!storage) return null;

  try {
    const parsed = JSON.parse(storage.getItem(activeResumeSessionKey) ?? "null") as Partial<ActiveCloudResumeSession> | null;
    if (!parsed?.resumeId || !parsed.userId || !parsed.draft) return null;
    if (userId && parsed.userId !== userId) return null;

    return {
      userId: parsed.userId,
      resumeId: parsed.resumeId,
      draft: parsed.draft as ResumeDraft,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    } satisfies Required<ActiveCloudResumeSession>;
  } catch {
    storage.removeItem(activeResumeSessionKey);
    return null;
  }
}

export function writeActiveCloudResumeSession(session: ActiveCloudResumeSession) {
  const storage = browserSessionStorage();
  if (!storage) return;

  try {
    storage.setItem(activeResumeSessionKey, JSON.stringify({ ...session, updatedAt: session.updatedAt ?? Date.now() }));
  } catch {
    // Session restore is best-effort; cloud persistence remains authoritative when storage is unavailable/quota-limited.
  }
}

export function clearActiveCloudResumeSession() {
  browserSessionStorage()?.removeItem(activeResumeSessionKey);
}

type CloudStatus = "idle" | "busy" | "synced" | "error";

type CloudStore = {
  token: string | null;
  user: ApiUser | null;
  currentResumeId: string | null;
  resumes: ApiResumeListItem[];
  status: CloudStatus;
  message: string;
  setAuth: (token: string, user: ApiUser) => void;
  clearAuth: () => void;
  setCurrentResumeId: (id: string | null) => void;
  setResumes: (resumes: ApiResumeListItem[]) => void;
  setStatus: (status: CloudStatus, message?: string) => void;
};

export const useCloudStore = create<CloudStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      currentResumeId: null,
      resumes: [],
      status: "idle",
      message: "",
      setAuth: (token, user) => set({ token, user, status: "synced", message: "" }),
      clearAuth: () => {
        clearActiveCloudResumeSession();
        set({ token: null, user: null, currentResumeId: null, resumes: [], status: "idle", message: "" });
      },
      setCurrentResumeId: (currentResumeId) => {
        if (!currentResumeId) clearActiveCloudResumeSession();
        set({ currentResumeId });
      },
      setResumes: (resumes) => set({ resumes }),
      setStatus: (status, message = "") => set({ status, message }),
    }),
    {
      name: "kill-the-resume-cloud-session",
      partialize: (state) => ({ token: state.token, user: state.user }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<CloudStore> | undefined;

        return {
          ...currentState,
          token: persisted?.token ?? null,
          user: persisted?.user ?? null,
        };
      },
    },
  ),
);

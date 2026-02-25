"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";

import { getBackendHealth } from "@/lib/api/ledgerClient";

export type BackendStatus = "waking" | "ready" | "error";

type NoticeKind = BackendStatus | null;

type BackendStatusContextValue = {
  status: BackendStatus;
  ensureBackendReadyForUserAction: () => Promise<void>;
};

const HEALTH_CHECK_TIMEOUT_MS = 15_000;
const WAKE_RETRY_INTERVAL_MS = 30_000;
const WAKE_MAX_WAIT_MS = 5 * 60_000;
const READY_FLASH_MS = 1_500;

const BackendStatusContext = createContext<BackendStatusContextValue | null>(null);

type Waiter = {
  resolve: () => void;
  reject: (error: BackendUnavailableError) => void;
};

type NoticeState = {
  kind: NoticeKind;
  message: string;
};

export class BackendUnavailableError extends Error {
  constructor(message = "Backend unavailable. Please try again later.") {
    super(message);
    this.name = "BackendUnavailableError";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function BackendStatusBadge({ notice }: { notice: NoticeState | null }) {
  if (!notice) {
    return null;
  }

  const sharedClassName =
    "fixed right-4 top-20 z-50 inline-flex max-w-sm items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-xl backdrop-blur-md";

  if (notice.kind === "waking") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`${sharedClassName} border-amber-400/35 bg-amber-400/10 text-amber-100`}
      >
        <Loader2 className="size-3.5 animate-spin" />
        <span>{notice.message}</span>
      </div>
    );
  }

  if (notice.kind === "error") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`${sharedClassName} border-rose-500/40 bg-rose-500/10 text-rose-100`}
      >
        <TriangleAlert className="size-3.5" />
        <span>{notice.message}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${sharedClassName} border-emerald-500/35 bg-emerald-500/10 text-emerald-100`}
    >
      <CheckCircle2 className="size-3.5" />
      <span>{notice.message}</span>
    </div>
  );
}

export function BackendStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<BackendStatus>("waking");
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const statusRef = useRef<BackendStatus>("waking");
  const waitersRef = useRef<Waiter[]>([]);
  const hideNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakePromiseRef = useRef<Promise<void> | null>(null);
  const errorMessageRef = useRef<string>("Backend unavailable. Please try again later.");

  const clearHideNoticeTimer = useCallback(() => {
    if (hideNoticeTimeoutRef.current) {
      clearTimeout(hideNoticeTimeoutRef.current);
      hideNoticeTimeoutRef.current = null;
    }
  }, []);

  const setBackendStatus = useCallback((nextStatus: BackendStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const rejectWaiters = useCallback((message?: string) => {
    if (waitersRef.current.length === 0) {
      return;
    }

    const error = new BackendUnavailableError(
      message ?? errorMessageRef.current ?? "Backend unavailable. Please try again later.",
    );
    const waiters = waitersRef.current;
    waitersRef.current = [];
    for (const waiter of waiters) {
      waiter.reject(error);
    }
  }, []);

  const resolveWaiters = useCallback(() => {
    if (waitersRef.current.length === 0) {
      return;
    }

    const waiters = waitersRef.current;
    waitersRef.current = [];
    for (const waiter of waiters) {
      waiter.resolve();
    }
  }, []);

  const showWakingNotice = useCallback(() => {
    clearHideNoticeTimer();
    setNotice((current) => {
      if (current?.kind === "waking") {
        return current;
      }

      return {
        kind: "waking",
        message: "⏳ Backend is starting up, please wait…",
      };
    });
  }, [clearHideNoticeTimer]);

  const showErrorNotice = useCallback(
    (message?: string) => {
      clearHideNoticeTimer();
      setNotice({
        kind: "error",
        message: message ?? "⚠️ Backend unavailable. Please try again later.",
      });
    },
    [clearHideNoticeTimer],
  );

  const flashReadyNotice = useCallback(() => {
    clearHideNoticeTimer();
    setNotice({
      kind: "ready",
      message: "✅ Backend ready",
    });

    hideNoticeTimeoutRef.current = setTimeout(() => {
      setNotice(null);
      hideNoticeTimeoutRef.current = null;
    }, READY_FLASH_MS);
  }, [clearHideNoticeTimer]);

  const runWakeCheck = useCallback(async () => {
    if (statusRef.current === "ready") {
      return;
    }

    if (wakePromiseRef.current) {
      return wakePromiseRef.current;
    }

    wakePromiseRef.current = (async () => {
      const startedAt = Date.now();
      try {
        while (Date.now() - startedAt < WAKE_MAX_WAIT_MS) {
          const attemptStartedAt = Date.now();
          try {
            const response = await getBackendHealth(HEALTH_CHECK_TIMEOUT_MS);
            if (response.status === "ok") {
              setBackendStatus("ready");
              return;
            }
          } catch (error) {
            if (error instanceof Error && error.message.trim()) {
              errorMessageRef.current = `⚠️ ${error.message}`;
            }
          }

          const remainingMs = WAKE_MAX_WAIT_MS - (Date.now() - startedAt);
          if (remainingMs <= 0) {
            break;
          }

          const elapsedSinceAttemptStart = Date.now() - attemptStartedAt;
          const nextDelayMs = Math.min(
            Math.max(0, WAKE_RETRY_INTERVAL_MS - elapsedSinceAttemptStart),
            remainingMs,
          );
          if (nextDelayMs > 0) {
            await delay(nextDelayMs);
          }
        }

        errorMessageRef.current =
          "⚠️ Backend is still unavailable after waiting up to 5 minutes. Please try again later.";
        setBackendStatus("error");
      } catch (error) {
        if (error instanceof Error && error.message.trim()) {
          errorMessageRef.current = `⚠️ ${error.message}`;
        }
        setBackendStatus("error");
      } finally {
        wakePromiseRef.current = null;
      }
    })();

    return wakePromiseRef.current;
  }, [setBackendStatus]);

  const waitForBackendReady = useCallback(() => {
    if (statusRef.current === "ready") {
      return Promise.resolve();
    }

    if (statusRef.current === "error") {
      return Promise.reject(
        new BackendUnavailableError(errorMessageRef.current),
      );
    }

    return new Promise<void>((resolve, reject) => {
      waitersRef.current.push({ resolve, reject });
    });
  }, []);

  const ensureBackendReadyForUserAction = useCallback(async () => {
    if (statusRef.current === "ready") {
      return;
    }

    if (statusRef.current === "error") {
      showErrorNotice();
      throw new BackendUnavailableError(errorMessageRef.current);
    }

    showWakingNotice();
    void runWakeCheck();

    try {
      await waitForBackendReady();
    } catch (error) {
      showErrorNotice();
      if (error instanceof BackendUnavailableError) {
        throw error;
      }

      throw new BackendUnavailableError();
    }
  }, [runWakeCheck, showErrorNotice, showWakingNotice, waitForBackendReady]);

  useEffect(() => {
    void runWakeCheck();
  }, [runWakeCheck]);

  useEffect(() => {
    if (status !== "ready") {
      return;
    }

    resolveWaiters();
    if (notice?.kind === "waking" || notice?.kind === "error") {
      flashReadyNotice();
    }
  }, [flashReadyNotice, notice?.kind, resolveWaiters, status]);

  useEffect(() => {
    if (status !== "error") {
      return;
    }

    rejectWaiters(errorMessageRef.current);
  }, [rejectWaiters, status]);

  useEffect(() => {
    return () => {
      clearHideNoticeTimer();
      rejectWaiters("Backend unavailable. Please try again later.");
    };
  }, [clearHideNoticeTimer, rejectWaiters]);

  return (
    <BackendStatusContext.Provider value={{ status, ensureBackendReadyForUserAction }}>
      {children}
      <BackendStatusBadge notice={notice} />
    </BackendStatusContext.Provider>
  );
}

export function useBackendStatus() {
  const context = useContext(BackendStatusContext);
  if (!context) {
    throw new Error("useBackendStatus must be used within BackendStatusProvider.");
  }

  return context;
}

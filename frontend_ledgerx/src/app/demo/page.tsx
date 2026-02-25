"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Loader2, RefreshCw, Wallet } from "lucide-react";
import { toast } from "sonner";

import { RecentTransactionsTable } from "@/components/RecentTransactionsTable";
import { TransferForm } from "@/components/TransferForm";
import {
  BackendUnavailableError,
  useBackendStatus,
} from "@/components/providers/BackendStatusProvider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  LedgerApiError,
  executeTransfer,
  getAccount,
  getRecentTransactions,
  resetSystem,
} from "@/lib/api/ledgerClient";
import type { Account, SpringPage, Transaction } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const ACCOUNT_A_NUMBER =
  process.env.NEXT_PUBLIC_LEDGERX_ACCOUNT_A ??
  process.env.NEXT_PUBLIC_ACCOUNT_A ??
  "ACC-A-001";
const ACCOUNT_B_NUMBER =
  process.env.NEXT_PUBLIC_LEDGERX_ACCOUNT_B ??
  process.env.NEXT_PUBLIC_ACCOUNT_B ??
  "ACC-B-001";
const POLL_INTERVAL_MS = 2_000;
const TRANSACTIONS_PAGE_SIZE = 12;
const DEFAULT_CURRENCY = "USD";
const STRESS_TRANSFER_AMOUNT = 1;

type WalletKey = "A" | "B";
type FlashDirection = "up" | "down" | null;

function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof LedgerApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected request error.";
}

function AccountBalanceCard({
  title,
  account,
  flash,
  loading,
}: {
  title: string;
  account: Account | null;
  flash: FlashDirection;
  loading: boolean;
}) {
  const currency = account?.currency ?? DEFAULT_CURRENCY;
  const balanceValue = account ? toNumber(account.balance) : 0;

  return (
    <Card className="relative overflow-hidden">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        animate={
          flash
            ? { opacity: [0, 0.24, 0] }
            : {
                opacity: 0,
              }
        }
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{
          backgroundColor:
            flash === "up"
              ? "rgba(16,185,129,0.22)"
              : flash === "down"
                ? "rgba(244,63,94,0.20)"
                : "transparent",
        }}
      />
      <CardHeader className="pb-3">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="size-4 text-cyan-300" />
          {account?.accountNumber ?? "Loading wallet..."}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={account ? `${account.id}-${balanceValue}` : "loading-balance"}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.2 }}
            className={cn(
              "text-3xl font-semibold tracking-tight tabular-nums",
              flash === "up" && "text-emerald-300",
              flash === "down" && "text-rose-300",
            )}
          >
            {loading ? "..." : formatMoney(balanceValue, currency)}
          </motion.p>
        </AnimatePresence>
        <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
          Live balance feed
        </p>
      </CardContent>
    </Card>
  );
}

export default function DemoPage() {
  const { status: backendStatus, ensureBackendReadyForUserAction } = useBackendStatus();
  const [wallets, setWallets] = useState<{ A: Account | null; B: Account | null }>({
    A: null,
    B: null,
  });
  const [flashState, setFlashState] = useState<Record<WalletKey, FlashDirection>>({
    A: null,
    B: null,
  });
  const [transactionsPage, setTransactionsPage] = useState<SpringPage<Transaction> | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(0);
  const [manualAmount, setManualAmount] = useState("25.00");
  const [concurrency, setConcurrency] = useState(50);
  const [isDirectionSwapped, setIsDirectionSwapped] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isStressRunning, setIsStressRunning] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [lastPolledAt, setLastPolledAt] = useState<Date | null>(null);

  const previousBalancesRef = useRef<Record<WalletKey, number | null>>({
    A: null,
    B: null,
  });
  const flashTimeoutRef = useRef<Record<WalletKey, ReturnType<typeof setTimeout> | null>>({
    A: null,
    B: null,
  });
  const pollingLockRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const fromAccountNumber = isDirectionSwapped ? ACCOUNT_B_NUMBER : ACCOUNT_A_NUMBER;
  const toAccountNumber = isDirectionSwapped ? ACCOUNT_A_NUMBER : ACCOUNT_B_NUMBER;
  const isBackendReady = backendStatus === "ready";
  const activeCurrency = isDirectionSwapped
    ? wallets.B?.currency ?? wallets.A?.currency ?? DEFAULT_CURRENCY
    : wallets.A?.currency ?? wallets.B?.currency ?? DEFAULT_CURRENCY;

  const applyWalletUpdate = useCallback((key: WalletKey, nextAccount: Account) => {
    const nextBalance = toNumber(nextAccount.balance);
    const previous = previousBalancesRef.current[key];

    if (previous !== null && nextBalance !== previous) {
      const direction: FlashDirection = nextBalance > previous ? "up" : "down";
      setFlashState((current) => ({ ...current, [key]: direction }));

      const existingTimer = flashTimeoutRef.current[key];
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      flashTimeoutRef.current[key] = setTimeout(() => {
        setFlashState((current) => ({ ...current, [key]: null }));
      }, 700);
    }

    previousBalancesRef.current[key] = nextBalance;
    setWallets((current) => ({ ...current, [key]: nextAccount }));
  }, []);

  const fetchWallets = useCallback(async () => {
    const [accountA, accountB] = await Promise.all([
      getAccount(ACCOUNT_A_NUMBER),
      getAccount(ACCOUNT_B_NUMBER),
    ]);

    applyWalletUpdate("A", accountA);
    applyWalletUpdate("B", accountB);
  }, [applyWalletUpdate]);

  const fetchRecentLedger = useCallback(async (page: number) => {
    const result = await getRecentTransactions(page, TRANSACTIONS_PAGE_SIZE);
    setTransactionsPage(result);
  }, []);

  const refreshDashboard = useCallback(
    async (notifyOnError = false, force = false, page = currentPage) => {
      if (pollingLockRef.current && !force) {
        return;
      }

      pollingLockRef.current = true;
      try {
        const [walletsResult, txResult] = await Promise.allSettled([
          fetchWallets(),
          fetchRecentLedger(page),
        ]);

        const failures: string[] = [];
        if (walletsResult.status === "rejected") {
          failures.push(getErrorMessage(walletsResult.reason));
        }
        if (txResult.status === "rejected") {
          failures.push(getErrorMessage(txResult.reason));
        }

        if (failures.length > 0) {
          const message = failures[0];
          setLiveError(message);
          if (notifyOnError) {
            toast.error("Live feed issue", {
              description: message,
            });
          }
        } else {
          setLiveError(null);
        }

        setLastPolledAt(new Date());
      } finally {
        setIsInitialLoading(false);
        pollingLockRef.current = false;
      }
    },
    [currentPage, fetchRecentLedger, fetchWallets],
  );

  useEffect(() => {
    if (backendStatus === "waking") {
      return;
    }

    if (backendStatus === "error") {
      setIsInitialLoading(false);
      setLiveError("Backend unavailable. Please try again later.");
      return;
    }

    const shouldNotifyOnError = !hasLoadedRef.current;
    hasLoadedRef.current = true;
    void refreshDashboard(shouldNotifyOnError, true, currentPage);

    const intervalId = window.setInterval(() => {
      void refreshDashboard(false, false, currentPage);
    }, POLL_INTERVAL_MS);
    const flashTimeouts = flashTimeoutRef.current;

    return () => {
      clearInterval(intervalId);

      const timers = Object.values(flashTimeouts);
      for (const timer of timers) {
        if (timer) {
          clearTimeout(timer);
        }
      }
    };
  }, [backendStatus, currentPage, refreshDashboard]);

  async function handleManualTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amountValue = Number(manualAmount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast.error("Invalid amount", {
        description: "Enter a transfer amount greater than 0.",
      });
      return;
    }

    setIsSending(true);
    try {
      await ensureBackendReadyForUserAction();

      const transaction = await executeTransfer({
        fromAccount: fromAccountNumber,
        toAccount: toAccountNumber,
        amount: amountValue,
        currency: activeCurrency,
      });

      toast.success("Transfer completed", {
        description: `Transaction ${transaction.id.slice(0, 8)} processed successfully.`,
      });

      void refreshDashboard(false);
    } catch (error) {
      if (error instanceof LedgerApiError && error.status === 409) {
        toast.error("Conflict detected", { description: error.message });
      } else if (error instanceof LedgerApiError && error.status === 422) {
        toast.error("Insufficient funds", { description: error.message });
      } else if (error instanceof BackendUnavailableError) {
        return;
      } else {
        toast.error("Transfer failed", { description: getErrorMessage(error) });
      }
    } finally {
      setIsSending(false);
    }
  }

  async function handleStressTest() {
    setIsStressRunning(true);

    const startedAt = performance.now();
    const requestPayload = {
      fromAccount: fromAccountNumber,
      toAccount: toAccountNumber,
      amount: STRESS_TRANSFER_AMOUNT,
      currency: activeCurrency,
    };

    try {
      await ensureBackendReadyForUserAction();

      const batch = Array.from({ length: concurrency }, () =>
        executeTransfer(requestPayload)
          .then(() => ({ ok: true as const }))
          .catch((error: unknown) => ({ ok: false as const, error })),
      );

      const results = await Promise.all(batch);
      const durationMs = Math.round(performance.now() - startedAt);

      let success = 0;
      let conflicts = 0;
      let insufficient = 0;
      let otherErrors = 0;

      for (const result of results) {
        if (result.ok) {
          success += 1;
          continue;
        }

        if (result.error instanceof LedgerApiError && result.error.status === 409) {
          conflicts += 1;
        } else if (
          result.error instanceof LedgerApiError &&
          result.error.status === 422
        ) {
          insufficient += 1;
        } else {
          otherErrors += 1;
        }
      }

      const summary = `${success}/${concurrency} succeeded in ${durationMs}ms. ${conflicts} conflicts, ${insufficient} insufficient funds${
        otherErrors > 0 ? `, ${otherErrors} other errors` : ""
      }.`;

      if (success === concurrency) {
        toast.success("Concurrency simulation complete", {
          description: summary,
        });
      } else {
        toast("Concurrency simulation complete", {
          description: summary,
        });
      }

      void refreshDashboard(false);
    } catch (error) {
      if (error instanceof BackendUnavailableError) {
        return;
      }

      toast.error("Stress test failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsStressRunning(false);
    }
  }

  async function handleResetSystem() {
    setIsResetting(true);
    try {
      await ensureBackendReadyForUserAction();

      await resetSystem();
      toast.success("Demo reset completed", {
        description: "System state has been reset. Refreshing live data...",
      });
      setCurrentPage(0);
      await refreshDashboard(false, true, 0);
    } catch (error) {
      if (error instanceof BackendUnavailableError) {
        return;
      }

      toast.error("Reset failed", {
        description: getErrorMessage(error),
      });
    } finally {
      setIsResetting(false);
    }
  }

  function handlePreviousPage() {
    void (async () => {
      try {
        await ensureBackendReadyForUserAction();
      } catch (error) {
        if (error instanceof BackendUnavailableError) {
          return;
        }

        toast.error("Unable to load page", {
          description: getErrorMessage(error),
        });
        return;
      }

      setCurrentPage((previous) => Math.max(previous - 1, 0));
    })();
  }

  function handleNextPage() {
    void (async () => {
      try {
        await ensureBackendReadyForUserAction();
      } catch (error) {
        if (error instanceof BackendUnavailableError) {
          return;
        }

        toast.error("Unable to load page", {
          description: getErrorMessage(error),
        });
        return;
      }

      setCurrentPage((previous) => {
        const totalPages = transactionsPage?.totalPages ?? 0;
        if (totalPages <= 0) {
          return previous;
        }

        return Math.min(previous + 1, totalPages - 1);
      });
    })();
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Demo Console
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              High-Concurrency Transfer Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Polling every 2 seconds for wallets and transactions.
              {lastPolledAt
                ? ` Last sync: ${lastPolledAt.toLocaleTimeString("en-US")}.`
                : ""}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleResetSystem}
            disabled={!isBackendReady || isResetting}
            className="self-start"
          >
            <RefreshCw className={cn("size-4", isResetting && "animate-spin")} />
            Reset Demo
          </Button>
        </div>

        {liveError ? (
          <p className="inline-flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground/90">
            <AlertTriangle className="size-3.5" />
            {liveError}
          </p>
        ) : null}
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <AccountBalanceCard
          title="Account A"
          account={wallets.A}
          flash={flashState.A}
          loading={isInitialLoading && !wallets.A}
        />
        <AccountBalanceCard
          title="Account B"
          account={wallets.B}
          flash={flashState.B}
          loading={isInitialLoading && !wallets.B}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TransferForm
          fromAccount={fromAccountNumber}
          toAccount={toAccountNumber}
          amount={manualAmount}
          isBackendReady={isBackendReady}
          isSubmitting={isSending}
          onAmountChange={setManualAmount}
          onSwapDirection={() => setIsDirectionSwapped((current) => !current)}
          onSubmit={handleManualTransfer}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-300" />
              Simulate Concurrency
            </CardTitle>
            <CardDescription>
              Fire simultaneous transfer requests using Promise.all().
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Concurrent requests</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {concurrency}
                </span>
              </div>
              <Slider
                min={10}
                max={100}
                step={1}
                value={[concurrency]}
                disabled={!isBackendReady || isStressRunning}
                onValueChange={(value) => setConcurrency(value[0] ?? 10)}
              />
              <p className="text-xs text-muted-foreground">
                Each request transfers
                {" "}
                {formatMoney(STRESS_TRANSFER_AMOUNT, activeCurrency)}
                {" "}
                from
                {" "}
                <span className="font-medium text-foreground">{fromAccountNumber}</span>
                {" "}
                to
                {" "}
                <span className="font-medium text-foreground">{toAccountNumber}</span>
                .
              </p>
            </div>
            <Button
              type="button"
              onClick={handleStressTest}
              disabled={!isBackendReady || isStressRunning}
              className="w-full bg-amber-400 font-semibold text-amber-950 hover:bg-amber-300"
            >
              {isStressRunning ? <Loader2 className="size-4 animate-spin" /> : null}
              Fire Concurrent Requests
            </Button>
          </CardContent>
        </Card>
      </section>

      <RecentTransactionsTable
        pageData={transactionsPage}
        isLoading={isInitialLoading}
        currentPage={currentPage}
        interactionsDisabled={!isBackendReady}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
      />
    </div>
  );
}

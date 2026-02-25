import Link from "next/link"
import { ArrowRight, Network, ShieldCheck, WalletCards } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="space-y-4 lg:space-y-5">
      <div className="grid items-stretch gap-4 md:grid-cols-[1.55fr_1fr] xl:grid-cols-[1.7fr_1.02fr]">
        <section className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card/45 px-5 py-8 shadow-2xl shadow-black/20 sm:px-8 sm:py-10 lg:px-7 lg:py-7 xl:px-8">
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />

          <div className="relative flex h-full max-w-none flex-col gap-5">
            <div className="inline-flex w-fit items-center rounded-full border border-border/80 bg-background/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <span className="bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                LedgerX
              </span>
              <span className="mx-2 text-border">/</span>
              High-Concurrency Transactional Engine
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl xl:text-6xl">
                <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300 bg-clip-text text-transparent">
                  Money moves correctly. Every time. Under any load.
                </span>
              </h1>
              <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
                LedgerX is a financial transaction engine built around one
                guarantee: no race condition, retry, or system failure will ever
                corrupt a balance or duplicate a transfer.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="group">
                <Link href="/demo">
                  Run the Demo
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/architecture">Read the Architecture</Link>
              </Button>
            </div>
          </div>
        </section>

        <aside className="h-full rounded-3xl border border-border/70 bg-card/45 p-5 shadow-2xl shadow-black/10 sm:p-6 lg:p-5 xl:p-6 2xl:p-7">
          <p className="inline-flex items-center rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground">
            Creator
          </p>
          <p className="mt-4 text-sm font-semibold tracking-wide text-foreground sm:text-base">
            Artem Moshnin · Full-Stack Software & ML Engineer
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            I built LedgerX because financial backends are where most junior
            engineers prove they don&apos;t understand concurrency.
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground sm:text-[15px]">
            <li className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-cyan-300" />
              <span>Deterministic pessimistic locking</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-sky-300" />
              <span>Idempotent API design</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-indigo-300" />
              <span>Double-entry accounting</span>
            </li>
          </ul>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Together, they ensure that 100 simultaneous transfers to the same
            account produce exactly the right balance - every time.
          </p>
          <div className="mt-4 rounded-xl border border-border/70 bg-background/55 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Validated with k6
            </p>
            <p className="mt-2 text-sm font-medium text-foreground sm:text-base">
              500+ TPS · 100% success rate · zero integrity violations
            </p>
          </div>
        </aside>
      </div>

      <section className="rounded-3xl border border-border/70 bg-card/35 p-4 shadow-xl shadow-black/10 sm:p-5">
        <div className="mb-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Core Guarantees
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-background/55 p-4">
            <div className="mb-2 inline-flex rounded-md bg-secondary p-2 text-secondary-foreground">
              <ShieldCheck className="size-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              ACID Compliance Under Concurrent Load
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Pessimistic row-level locking with deterministic acquisition order
              prevents deadlocks. Every transfer either commits fully or rolls
              back completely - no partial states, no phantom reads.
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/55 p-4">
            <div className="mb-2 inline-flex rounded-md bg-secondary p-2 text-secondary-foreground">
              <Network className="size-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Idempotent API Design
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Every transfer requires an Idempotency-Key. Duplicate network
              retries return the cached result. In-flight duplicates are
              rejected with a 409. Double-charging is architecturally
              impossible.
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/55 p-4">
            <div className="mb-2 inline-flex rounded-md bg-secondary p-2 text-secondary-foreground">
              <WalletCards className="size-4" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Immutable Double-Entry Accounting
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Every successful transfer generates exactly two ledger entries -
              one debit, one credit - bound to a parent transaction record.
              Balances can be reconstructed deterministically at any point in
              time.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

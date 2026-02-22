import Link from "next/link";
import { ArrowRight, Network, ShieldCheck, WalletCards } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-border/70 bg-card/45 px-6 py-14 shadow-2xl shadow-black/20 sm:px-10 sm:py-20">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="relative mx-auto flex max-w-4xl flex-col gap-10">
        <div className="inline-flex w-fit items-center rounded-full border border-border/80 bg-background/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span className="bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-transparent">
            LedgerX
          </span>
          <span className="mx-2 text-border">/</span>
          Enterprise FinTech Infrastructure
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-balance sm:text-6xl">
            <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300 bg-clip-text text-transparent">
              High-Concurrency Payment Engine.
            </span>
          </h1>
          <p className="max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            Built for deterministic money movement with strict ACID compliance,
            optimistic and pessimistic locking, and immutable double-entry
            accounting at scale.
          </p>
          <p className="inline-flex w-fit items-center rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground">
            Artem Moshnin · Lead Software Engineer
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

        <div className="grid gap-4 pt-2 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-background/55 p-4">
            <div className="mb-2 inline-flex rounded-md bg-secondary p-2 text-secondary-foreground">
              <ShieldCheck className="size-4" />
            </div>
            <p className="text-sm text-muted-foreground">
              Strong consistency safeguards with transactional guarantees.
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/55 p-4">
            <div className="mb-2 inline-flex rounded-md bg-secondary p-2 text-secondary-foreground">
              <Network className="size-4" />
            </div>
            <p className="text-sm text-muted-foreground">
              Concurrent transfer orchestration designed for throughput.
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/55 p-4">
            <div className="mb-2 inline-flex rounded-md bg-secondary p-2 text-secondary-foreground">
              <WalletCards className="size-4" />
            </div>
            <p className="text-sm text-muted-foreground">
              Auditable ledger entries with immutable accounting trails.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

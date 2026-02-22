import { CodeBlock } from "@/components/ui/code-block";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tableOfContents = [
  { id: "chapter-1", label: "1. The Problem Space" },
  { id: "chapter-2", label: "2. Immutable Double-Entry Accounting" },
  { id: "chapter-3", label: "3. Concurrency & The Deadlock Problem" },
  { id: "chapter-4", label: "4. Distributed Systems & Idempotency" },
  { id: "chapter-5", label: "5. Transaction Boundaries & Audit Compliance" },
  { id: "chapter-6", label: "6. Interview FAQ" },
];

const pessimisticQuerySnippet = `public interface AccountRepository extends JpaRepository<Account, UUID> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("""
    select a
    from Account a
    where a.accountNumber = :accountNumber
    """)
  Optional<Account> findByAccountNumberForUpdate(
      @Param("accountNumber") String accountNumber
  );
}`;

const deterministicLockOrderSnippet = `List<String> orderedAccountNumbers =
    Stream.of(fromAccountNum, toAccountNum)
        .sorted() // deterministic lock order
        .toList();

Account firstLocked = accountRepository
    .findByAccountNumberForUpdate(orderedAccountNumbers.get(0))
    .orElseThrow(...);

Account secondLocked = accountRepository
    .findByAccountNumberForUpdate(orderedAccountNumbers.get(1))
    .orElseThrow(...);`;

const ledgerWriteSnippet = `@Transactional
public Transaction processTransfer(
    String fromAccount,
    String toAccount,
    BigDecimal amount,
    String currency,
    String idempotencyKey
) {
  Transaction tx = transactionRepository.save(
      Transaction.pending(idempotencyKey)
  );

  ledgerEntryRepository.save(LedgerEntry.debit(tx, fromAccount, amount, currency));
  ledgerEntryRepository.save(LedgerEntry.credit(tx, toAccount, amount, currency));

  tx.markCompleted();
  return tx;
}`;

const schemaSnippet = `transactions
------------
id (uuid, pk)
idempotency_key (unique)
status (PENDING | COMPLETED | FAILED)
created_at

ledger_entries
--------------
id (uuid, pk)
transaction_id (fk -> transactions.id)
account_id (fk -> accounts.id)
direction (DEBIT | CREDIT)
amount
currency
created_at`;

const idempotencySnippet = `@PostMapping("/api/v1/transfers")
public Transaction transfer(
    @RequestHeader("Idempotency-Key") String key,
    @Valid @RequestBody TransferRequestDTO request
) {
  return transactionRepository.findByIdempotencyKey(key)
      .filter(existing -> existing.getStatus() == TransactionStatus.COMPLETED)
      .orElseGet(() -> transferService.processTransfer(
          request.fromAccount(),
          request.toAccount(),
          request.amount(),
          request.currency(),
          key
      ));
}`;

const afterCommitSnippet = `@Component
@RequiredArgsConstructor
public class TransferAuditListener {

  private final AuditLogRepository auditLogRepository;

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void onTransferCommitted(TransferCommittedEvent event) {
    auditLogRepository.save(AuditLog.from(event));
  }
}`;

export default function ArchitecturePage() {
  return (
    <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-4">
          <Card className="bg-card/55">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-[0.14em] text-muted-foreground">
                Table of Contents
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <nav className="space-y-1">
                {tableOfContents.map((entry) => (
                  <a
                    key={entry.id}
                    href={`#${entry.id}`}
                    className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {entry.label}
                  </a>
                ))}
              </nav>
            </CardContent>
          </Card>

          <Card className="border-cyan-500/20 bg-cyan-500/5">
            <CardContent className="p-4">
              <p className="text-xs leading-6 text-cyan-100/90">
                Built and documented by <strong>Artem Moshnin</strong>, Lead Software
                Engineer at LedgerX.
              </p>
            </CardContent>
          </Card>
        </div>
      </aside>

      <main className="space-y-6">
        <Card className="overflow-hidden border-border/70 bg-card/45">
          <CardHeader className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              LedgerX Architecture Book
            </p>
            <CardTitle className="text-3xl leading-tight tracking-tight sm:text-4xl">
              Engineering LedgerX: Deterministic Money Movement Under High Concurrency
            </CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              This page is intentionally written as a deep technical field guide. It
              explains not only what I built, but why each architectural decision was
              made for financial correctness, operability, and scale.
            </CardDescription>
          </CardHeader>
        </Card>

        <section id="chapter-1">
          <Card>
            <CardHeader>
              <CardTitle>Chapter 1: The Problem Space (Moving Money is Hard)</CardTitle>
              <CardDescription>
                The naive implementation works in local demos and fails in production.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                The first instinct in a payment system is simple: read a balance,
                subtract an amount, and write it back. That appears correct under
                single-threaded traffic. Under concurrent load, it is a correctness
                disaster. Two requests can read the same starting balance and both
                succeed, producing lost updates and accidental overspending.
              </p>

              <Tabs defaultValue="naive" className="w-full">
                <TabsList>
                  <TabsTrigger value="naive">Naive Flow</TabsTrigger>
                  <TabsTrigger value="failure">Failure Modes</TabsTrigger>
                  <TabsTrigger value="target">Engineering Target</TabsTrigger>
                </TabsList>
                <TabsContent value="naive" className="space-y-3">
                  <p className="text-sm leading-7 text-muted-foreground">
                    Example anti-pattern: <code>balance = balance - amount</code>. This
                    mutates state in place and assumes isolation that does not exist in
                    distributed systems.
                  </p>
                </TabsContent>
                <TabsContent value="failure" className="space-y-3">
                  <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
                    <li>Lost updates from concurrent writes.</li>
                    <li>Race conditions around insufficient-funds checks.</li>
                    <li>No immutable audit trail for compliance or reconciliation.</li>
                  </ul>
                </TabsContent>
                <TabsContent value="target" className="space-y-3">
                  <p className="text-sm leading-7 text-muted-foreground">
                    LedgerX is designed to guarantee conservation of value, produce
                    verifiable transaction history, and behave deterministically under
                    simultaneous requests across multiple service instances.
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section id="chapter-2">
          <Card>
            <CardHeader>
              <CardTitle>Chapter 2: Immutable Double-Entry Accounting</CardTitle>
              <CardDescription>
                Money is never edited in place. It is represented by immutable debits and credits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                In LedgerX, every transfer is expressed as two immutable ledger facts:
                one <code>DEBIT</code> from the source account and one <code>CREDIT</code>
                to the destination account. I do not rewrite historical entries. I append
                new entries and let transaction state represent lifecycle changes.
              </p>

              <CodeBlock
                language="text"
                title="Core Schema"
                code={schemaSnippet}
              />

              <p className="text-sm leading-7 text-muted-foreground">
                The <code>transactions</code> row binds both ledger entries together as a
                single atomic business event. Within each transaction boundary, the sum of
                debits and credits is zero by construction. This gives deterministic
                reconciliation and prevents silent money creation or destruction.
              </p>

              <CodeBlock
                language="java"
                title="Atomic Double-Entry Write"
                code={ledgerWriteSnippet}
              />
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section id="chapter-3">
          <Card>
            <CardHeader>
              <CardTitle>Chapter 3: Concurrency &amp; The Deadlock Problem</CardTitle>
              <CardDescription>
                Why I chose pessimistic row locks and how deterministic lock ordering eliminates deadlocks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                For hot wallets, pure optimistic locking leads to retry storms and poor
                throughput under contention. LedgerX uses pessimistic row-level locking
                (<code>SELECT ... FOR UPDATE</code>) to serialize writes at the account row.
                That guarantees only one transfer mutates a given wallet at a time.
              </p>

              <CodeBlock
                language="java"
                title="Spring Data Locking Query"
                code={pessimisticQuerySnippet}
              />

              <p className="text-sm leading-7 text-muted-foreground">
                Critical edge case: deadlocks. Example: Thread 1 executes A→B while
                Thread 2 executes B→A simultaneously. If each thread locks its source
                first, they can block each other forever. The fix is deterministic lock
                acquisition: sort account identifiers lexicographically and always acquire
                locks in that order.
              </p>

              <CodeBlock
                language="java"
                title="Deterministic Lock Acquisition (Deadlock Prevention)"
                code={deterministicLockOrderSnippet}
              />
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section id="chapter-4">
          <Card>
            <CardHeader>
              <CardTitle>Chapter 4: Distributed Systems &amp; Idempotency</CardTitle>
              <CardDescription>
                Timeouts are ambiguous; retries are mandatory; duplicate charges are unacceptable.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                In distributed systems, a client timeout does not prove the transfer failed.
                If a caller receives a 504 Gateway Timeout, the transfer may still have been
                committed. Retrying blindly can double-charge users.
              </p>

              <Tabs defaultValue="mechanism">
                <TabsList>
                  <TabsTrigger value="mechanism">Mechanism</TabsTrigger>
                  <TabsTrigger value="retries">Retry Semantics</TabsTrigger>
                </TabsList>
                <TabsContent value="mechanism" className="space-y-3">
                  <p className="text-sm leading-7 text-muted-foreground">
                    Every write request carries an <code>Idempotency-Key</code>. The key is
                    persisted with a unique database constraint. If the same key is retried,
                    LedgerX returns the already-completed transaction instead of creating a
                    second transfer.
                  </p>
                </TabsContent>
                <TabsContent value="retries" className="space-y-3">
                  <p className="text-sm leading-7 text-muted-foreground">
                    Clients can safely retry after network failures. The system treats
                    repeated keys as the same logical operation, turning at-least-once
                    delivery from the network into exactly-once business outcomes.
                  </p>
                </TabsContent>
              </Tabs>

              <CodeBlock
                language="java"
                title="Idempotent Transfer Endpoint"
                code={idempotencySnippet}
              />
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section id="chapter-5">
          <Card>
            <CardHeader>
              <CardTitle>Chapter 5: Transaction Boundaries &amp; Audit Compliance</CardTitle>
              <CardDescription>
                Audit events must be emitted only after successful commit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                Standard synchronous logging or plain AOP can fire before the transaction
                is durably committed. That risks false audit trails if the database commit
                later fails. LedgerX uses <code>@TransactionalEventListener</code> with
                <code>TransactionPhase.AFTER_COMMIT</code> so audit records are emitted only
                when money movement is truly persisted.
              </p>

              <CodeBlock
                language="java"
                title="After-Commit Audit Listener"
                code={afterCommitSnippet}
              />

              <p className="text-sm leading-7 text-muted-foreground">
                This approach cleanly separates compliance concerns from core transfer
                logic while preserving correctness: no commit, no audit event.
              </p>
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section id="chapter-6">
          <Card>
            <CardHeader>
              <CardTitle>Chapter 6: The Interview FAQ</CardTitle>
              <CardDescription>
                High-signal answers to architecture questions I expect in backend interviews.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="faq-1">
                  <AccordionTrigger>
                    Why not use a NoSQL database like MongoDB?
                  </AccordionTrigger>
                  <AccordionContent>
                    LedgerX is a consistency-critical financial system. I need strict ACID
                    guarantees, mature row-level locking semantics, and predictable behavior
                    for multi-entity writes. While MongoDB supports multi-document
                    transactions, that path carries additional coordination overhead and is
                    generally less operationally ergonomic for lock-heavy monetary workflows
                    than PostgreSQL. Relational databases remain the safer default for
                    high-integrity ledger systems.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-2">
                  <AccordionTrigger>
                    How does the system handle Insufficient Funds under load?
                  </AccordionTrigger>
                  <AccordionContent>
                    The insufficient-funds check runs under the same locked transactional
                    context as the debit attempt, so concurrent requests cannot bypass it.
                    When a transfer fails, LedgerX can persist a FAILED transaction record in
                    a dedicated <code>@Transactional(propagation = REQUIRES_NEW)</code>
                    boundary. This preserves an immutable failure trail even if the primary
                    transfer transaction rolls back.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-3">
                  <AccordionTrigger>
                    How does this scale horizontally?
                  </AccordionTrigger>
                  <AccordionContent>
                    Concurrency safety is enforced at the database row level, not in JVM
                    memory. That means multiple Spring Boot instances can run behind a load
                    balancer and still coordinate correctly through PostgreSQL locks. The
                    locking model is process-agnostic, so horizontal scaling does not break
                    correctness guarantees.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

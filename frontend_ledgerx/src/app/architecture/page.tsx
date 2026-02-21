import { CodeBlock } from "@/components/ui/code-block";

const ledgerSnippet = `-- Every transfer writes two immutable entries.
INSERT INTO ledger_entry (tx_id, account_id, direction, amount, currency)
VALUES
  (:txId, :fromAccount, 'DEBIT',  :amount, :currency),
  (:txId, :toAccount,   'CREDIT', :amount, :currency);

-- Sum(debits) must always equal Sum(credits) per transaction.`;

const lockSnippet = `@Transactional
public TransferResult transfer(TransferRequestDTO req) {
  Account from = accountRepository.findByIdForUpdate(req.fromAccountId());
  Account to = accountRepository.findByIdForUpdate(req.toAccountId());

  from.debit(req.amount());
  to.credit(req.amount());

  return transferWriter.persistDoubleEntry(from, to, req);
}`;

const idempotencySnippet = `@PostMapping("/api/transfers")
public ResponseEntity<?> createTransfer(
    @RequestHeader("Idempotency-Key") String key,
    @RequestBody TransferRequestDTO request
) {
  if (transactionRepository.existsByIdempotencyKey(key)) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body("Duplicate request");
  }
  return ResponseEntity.ok(transferService.transfer(request.withKey(key)));
}`;

const aopSnippet = `@Aspect
@Component
public class TransferAuditAspect {
  @AfterReturning(
    pointcut = "@annotation(AuditableTransfer)",
    returning = "result"
  )
  public void logTransfer(JoinPoint jp, Object result) {
    auditLogRepository.save(AuditLog.from(jp, result));
  }
}`;

export default function ArchitecturePage() {
  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-10 space-y-4 border-b border-border/70 pb-8">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Engineering
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          How I Built LedgerX for High-Concurrency Money Movement
        </h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          I’m Artem Moshnin, Lead Software Engineering of LedgerX. This is the
          architecture playbook I used to guarantee correctness first and then
          scale throughput without compromising financial integrity.
        </p>
      </div>

      <article className="prose prose-zinc prose-headings:tracking-tight prose-headings:text-foreground prose-p:text-zinc-300 prose-strong:text-zinc-100 prose-li:text-zinc-300 prose-code:text-zinc-100 prose-pre:m-0 prose-pre:bg-transparent prose-a:text-cyan-300 max-w-none dark:prose-invert">
        <h2>System Overview</h2>
        <p>
          My core goal with LedgerX is simple to state and hard to execute:
          process thousands of financial transactions per second without dropping
          a cent. I designed the system as a transaction-safe payment engine,
          where each transfer either commits fully or rolls back completely.
        </p>
        <ul>
          <li>Spring Boot handles transactional orchestration and validation.</li>
          <li>PostgreSQL acts as the source of truth with strong consistency.</li>
          <li>Each transfer is atomic, auditable, and replay-safe.</li>
        </ul>

        <h2>Double-Entry Accounting</h2>
        <p>
          Every transfer generates two immutable <code>LedgerEntry</code> rows:
          one Debit and one Credit. I never mutate historical entries. Instead, I
          append records so the ledger remains a permanent audit trail. This
          guarantees that money is never created or destroyed by a bug or retry.
        </p>
        <CodeBlock
          language="sql"
          title="Ledger Write Path"
          code={ledgerSnippet}
        />
        <ul>
          <li>Debit and Credit are always persisted in the same transaction.</li>
          <li>I treat ledger rows as immutable facts, not mutable state.</li>
          <li>Reconciliation becomes deterministic from append-only history.</li>
        </ul>

        <h2>Concurrency &amp; Pessimistic Locking</h2>
        <p>
          When 100 users hit the same wallet simultaneously, race conditions are
          the real enemy. To prevent overlapping balance mutations, I lock rows
          with PostgreSQL <code>FOR UPDATE</code>. This serializes writes for a
          given account at the database boundary, so two concurrent withdrawals
          cannot both spend the same funds.
        </p>
        <CodeBlock
          language="java"
          title="Row-Level Locking Service Flow"
          code={lockSnippet}
        />

        <h2>Idempotency</h2>
        <p>
          Network retries are unavoidable, so I made charge creation idempotent.
          The client sends an <code>Idempotency-Key</code> header, and LedgerX
          treats repeated keys as the same logical operation. If a request is
          retried after a timeout, we return the prior outcome instead of
          charging twice.
        </p>
        <CodeBlock
          language="java"
          title="Idempotency-Key Guard"
          code={idempotencySnippet}
        />
        <ul>
          <li>Duplicate requests are detected before money movement executes.</li>
          <li>Retries become safe for clients and upstream gateways.</li>
          <li>Operational incidents do not translate into duplicate charges.</li>
        </ul>

        <h2>Audit Logging (AOP)</h2>
        <p>
          Compliance logging is mandatory, but I did not want logging concerns to
          pollute transfer logic. I used Aspect-Oriented Programming to intercept
          auditable flows and persist structured audit events after successful
          execution. This keeps business services focused while ensuring a full
          compliance trail.
        </p>
        <CodeBlock
          language="java"
          title="Aspect-Oriented Audit Logging"
          code={aopSnippet}
        />
      </article>
    </section>
  );
}

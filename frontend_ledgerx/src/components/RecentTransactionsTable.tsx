import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SpringPage, Transaction } from "@/lib/api/types";

type RecentTransactionsTableProps = {
  pageData: SpringPage<Transaction> | null;
  isLoading: boolean;
  currentPage: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "n/a";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getStatusBadge(status: string) {
  const normalized = status.toUpperCase();

  if (normalized === "FAILED") {
    return {
      label: "Failed",
      className:
        "border-rose-500/35 bg-rose-500/12 text-rose-200",
    };
  }

  if (normalized === "COMPLETED") {
    return {
      label: "Success",
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    };
  }

  return {
    label: status,
    className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-200",
  };
}

function formatAmount(value: number | undefined, currency: string | null | undefined) {
  const numericValue = Number(value ?? 0);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  const code = (currency ?? "USD").toUpperCase();

  try {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeValue);

    return `${formatted} ${code}`;
  } catch {
    return `${safeValue.toFixed(2)} ${code}`;
  }
}

export function RecentTransactionsTable({
  pageData,
  isLoading,
  currentPage,
  onPreviousPage,
  onNextPage,
}: RecentTransactionsTableProps) {
  const transactions = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 0;
  const currentPageDisplay = totalPages > 0 ? Math.min(currentPage + 1, totalPages) : 1;
  const totalPagesDisplay = Math.max(totalPages, 1);
  const isPreviousDisabled = isLoading || currentPage === 0;
  const isNextDisabled = isLoading || totalPages === 0 || currentPage >= totalPages - 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Live Ledger</CardTitle>
        <CardDescription>
          Latest transactions (refreshes every 2 seconds)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Created At</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Idempotency Key</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length > 0 ? (
              transactions.map((transaction) => {
                const badge = getStatusBadge(transaction.status ?? "UNKNOWN");

                return (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-muted-foreground">
                      {formatTimestamp(transaction.createdAt)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground">
                      {transaction.status?.toUpperCase() === "FAILED"
                        ? "N/A"
                        : transaction.fromAccount ?? "N/A"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground">
                      {transaction.toAccount ?? "N/A"}
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums text-foreground">
                      {formatAmount(transaction.amount, transaction.currency)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground">
                      {transaction.id}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {transaction.idempotencyKey}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {isLoading ? "Loading ledger feed..." : "No transactions yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onPreviousPage}
            disabled={isPreviousDisabled}
          >
            Previous
          </Button>

          <p className="text-sm text-muted-foreground">
            Page {currentPageDisplay} of {totalPagesDisplay}
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNextPage}
            disabled={isNextDisabled}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

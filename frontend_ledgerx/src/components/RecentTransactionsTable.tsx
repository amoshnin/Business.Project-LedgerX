import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Transaction } from "@/lib/api/types";

type RecentTransactionsTableProps = {
  transactions: Transaction[];
  isLoading: boolean;
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

export function RecentTransactionsTable({
  transactions,
  isLoading,
}: RecentTransactionsTableProps) {
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
                  colSpan={4}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {isLoading ? "Loading ledger feed..." : "No transactions yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

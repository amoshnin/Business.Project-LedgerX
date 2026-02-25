"use client";

import { ArrowRightLeft, Loader2 } from "lucide-react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type TransferFormProps = {
  fromAccount: string;
  toAccount: string;
  amount: string;
  isBackendReady: boolean;
  isSubmitting: boolean;
  onAmountChange: (value: string) => void;
  onSwapDirection: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function TransferForm({
  fromAccount,
  toAccount,
  amount,
  isBackendReady,
  isSubmitting,
  onAmountChange,
  onSwapDirection,
  onSubmit,
}: TransferFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="size-4 text-cyan-300" />
          Manual Transfer Form
        </CardTitle>
        <CardDescription>
          Toggle transfer direction and execute a single transfer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                From
              </label>
              <Input value={fromAccount} readOnly />
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onSwapDirection}
              disabled={!isBackendReady || isSubmitting}
              className="self-center sm:mb-0.5"
              aria-label="Swap transfer direction"
              title="Swap transfer direction"
            >
              <ArrowRightLeft className="size-4" />
            </Button>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                To
              </label>
              <Input value={toAccount} readOnly />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="transfer-amount"
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              Amount
            </label>
            <Input
              id="transfer-amount"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={amount}
              disabled={!isBackendReady || isSubmitting}
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder="0.00"
            />
          </div>

          <Button
            type="submit"
            disabled={!isBackendReady || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Send Transfer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

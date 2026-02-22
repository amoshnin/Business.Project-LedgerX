import type {
  Account,
  SpringPage,
  Transaction,
  TransferRequest,
} from "@/lib/api/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_LEDGERX_API_URL ?? "http://localhost:8080";

type ApiErrorCode =
  | "CONFLICT"
  | "INSUFFICIENT_FUNDS"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "HTTP_ERROR"
  | "NETWORK_ERROR";

type BackendErrorPayload = {
  timestamp?: string;
  status?: number;
  message?: string;
};

export class LedgerApiError extends Error {
  readonly status: number | null;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(params: {
    message: string;
    code: ApiErrorCode;
    status: number | null;
    details?: unknown;
  }) {
    super(params.message);
    this.name = "LedgerApiError";
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
  }
}

function getIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function parseBody(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (!raw) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  return raw;
}

function extractBackendMessage(data: unknown): string | null {
  if (!data) {
    return null;
  }

  if (typeof data === "string") {
    return data;
  }

  if (typeof data === "object" && data !== null && "message" in data) {
    const message = (data as BackendErrorPayload).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return null;
}

function formatHttpError(status: number, data: unknown): LedgerApiError {
  const backendMessage = extractBackendMessage(data);

  if (status === 409) {
    return new LedgerApiError({
      status,
      code: "CONFLICT",
      message:
        backendMessage ??
        "Transfer conflict detected from a concurrent update. Please retry.",
      details: data,
    });
  }

  if (status === 422) {
    return new LedgerApiError({
      status,
      code: "INSUFFICIENT_FUNDS",
      message:
        backendMessage ??
        "Insufficient funds for this transfer. Lower the amount or change source account.",
      details: data,
    });
  }

  if (status === 404) {
    return new LedgerApiError({
      status,
      code: "NOT_FOUND",
      message: backendMessage ?? "Requested resource was not found.",
      details: data,
    });
  }

  if (status === 400) {
    return new LedgerApiError({
      status,
      code: "BAD_REQUEST",
      message: backendMessage ?? "Invalid request payload.",
      details: data,
    });
  }

  return new LedgerApiError({
    status,
    code: "HTTP_ERROR",
    message: backendMessage ?? `Request failed with HTTP ${status}.`,
    details: data,
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (error) {
    throw new LedgerApiError({
      status: null,
      code: "NETWORK_ERROR",
      message: "Unable to reach LedgerX API. Check that the backend is running.",
      details: error,
    });
  }

  const body = await parseBody(response);
  if (!response.ok) {
    throw formatHttpError(response.status, body);
  }

  return body as T;
}

export async function getAccount(accountNumber: string): Promise<Account> {
  const safeAccountNumber = encodeURIComponent(accountNumber);
  return request<Account>(`/api/v1/accounts/${safeAccountNumber}`);
}

export async function getRecentTransactions(
  page: number,
  size: number,
): Promise<SpringPage<Transaction>> {
  const safePage = Math.max(0, Math.floor(page));
  const safeSize = Math.max(1, Math.floor(size));

  return request<SpringPage<Transaction>>(
    `/api/v1/transactions?page=${safePage}&size=${safeSize}`,
  );
}

export async function executeTransfer(
  payload: TransferRequest,
): Promise<Transaction> {
  return request<Transaction>("/api/v1/transfers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": getIdempotencyKey(),
    },
    body: JSON.stringify(payload),
  });
}

export async function resetSystem(): Promise<void> {
  await request<unknown>("/api/v1/demo/reset", {
    method: "POST",
  });
}

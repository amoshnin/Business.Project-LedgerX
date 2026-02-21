export interface Account {
  id: string;
  accountNumber: string;
  balance: number;
  currency: string;
}

export interface Transaction {
  id: string;
  idempotencyKey: string;
  status: string;
  createdAt: string;
}

export interface TransferRequest {
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
}

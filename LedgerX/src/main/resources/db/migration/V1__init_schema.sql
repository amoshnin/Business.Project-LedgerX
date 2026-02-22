CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    account_number VARCHAR(255) NOT NULL UNIQUE,
    currency VARCHAR(3) NOT NULL,
    balance NUMERIC(19, 4) NOT NULL,
    status VARCHAR(255) NOT NULL,
    version BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT chk_accounts_balance_non_negative CHECK (balance >= 0)
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(255) NOT NULL,
    error_message VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY,
    transaction_id UUID NOT NULL,
    account_id UUID NOT NULL,
    amount NUMERIC(19, 4) NOT NULL,
    direction VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_ledger_entries_transaction
        FOREIGN KEY (transaction_id) REFERENCES transactions (id),
    CONSTRAINT fk_ledger_entries_account
        FOREIGN KEY (account_id) REFERENCES accounts (id)
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    account_number VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    amount NUMERIC(19, 4) NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_ledger_entries_transaction_id ON ledger_entries (transaction_id);
CREATE INDEX idx_ledger_entries_account_id ON ledger_entries (account_id);
CREATE INDEX idx_audit_logs_account_number ON audit_logs (account_number);

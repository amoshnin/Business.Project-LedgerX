package com.example.ledgerx.exception;

public class IdempotencyConflictException extends LedgerException {

    public IdempotencyConflictException(String message) {
        super(message);
    }
}

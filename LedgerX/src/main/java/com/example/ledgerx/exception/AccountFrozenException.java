package com.example.ledgerx.exception;

public class AccountFrozenException extends LedgerException {

    public AccountFrozenException(String message) {
        super(message);
    }
}

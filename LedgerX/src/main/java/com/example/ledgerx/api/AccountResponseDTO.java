package com.example.ledgerx.api;

import com.example.ledgerx.entity.Account;
import com.example.ledgerx.entity.AccountStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AccountResponseDTO(
        UUID id,
        String accountNumber,
        String currency,
        BigDecimal balance,
        AccountStatus status,
        Instant createdAt,
        Instant updatedAt
) {
    public static AccountResponseDTO from(Account account) {
        return new AccountResponseDTO(
                account.getId(),
                account.getAccountNumber(),
                account.getCurrency(),
                account.getBalance(),
                account.getStatus(),
                account.getCreatedAt(),
                account.getUpdatedAt()
        );
    }
}

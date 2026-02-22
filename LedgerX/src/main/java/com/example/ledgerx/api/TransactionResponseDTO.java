package com.example.ledgerx.api;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TransactionResponseDTO(
        UUID id,
        Instant createdAt,
        String status,
        String fromAccount,
        String toAccount,
        BigDecimal amount,
        String currency,
        String idempotencyKey
) {
}

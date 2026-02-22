package com.example.ledgerx.api;

import com.example.ledgerx.entity.Transaction;
import com.example.ledgerx.entity.TransactionStatus;

import java.time.Instant;
import java.util.UUID;

public record TransactionResponseDTO(
        UUID id,
        String idempotencyKey,
        TransactionStatus status,
        String errorMessage,
        Instant createdAt,
        Instant completedAt
) {
    public static TransactionResponseDTO from(Transaction transaction) {
        return new TransactionResponseDTO(
                transaction.getId(),
                transaction.getIdempotencyKey(),
                transaction.getStatus(),
                transaction.getErrorMessage(),
                transaction.getCreatedAt(),
                transaction.getCompletedAt()
        );
    }
}

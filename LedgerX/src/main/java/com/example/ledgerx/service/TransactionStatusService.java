package com.example.ledgerx.service;

import com.example.ledgerx.entity.Transaction;
import com.example.ledgerx.entity.TransactionStatus;
import com.example.ledgerx.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class TransactionStatusService {

    private static final int MAX_ERROR_LENGTH = 255;

    private final TransactionRepository transactionRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailedTransaction(String idempotencyKey, String error) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return;
        }

        Transaction transaction = transactionRepository.findByIdempotencyKey(idempotencyKey)
                .orElseGet(() -> Transaction.builder()
                        .idempotencyKey(idempotencyKey)
                        .build());

        if (transaction.getStatus() == TransactionStatus.COMPLETED) {
            return;
        }

        transaction.setStatus(TransactionStatus.FAILED);
        transaction.setErrorMessage(sanitizeError(error));
        transaction.setCompletedAt(Instant.now());
        transactionRepository.save(transaction);
    }

    private String sanitizeError(String error) {
        if (error == null || error.isBlank()) {
            return "Transfer failed";
        }
        return error.length() <= MAX_ERROR_LENGTH ? error : error.substring(0, MAX_ERROR_LENGTH);
    }
}

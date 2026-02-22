package com.example.ledgerx.audit;

import java.math.BigDecimal;

public record TransferCompletedEvent(
        String fromAccountNumber,
        String toAccountNumber,
        BigDecimal amount
) {
}

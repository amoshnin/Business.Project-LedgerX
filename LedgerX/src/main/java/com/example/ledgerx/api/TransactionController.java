package com.example.ledgerx.api;

import com.example.ledgerx.exception.LedgerException;
import com.example.ledgerx.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class TransactionController {

    private static final int MAX_RECENT_LIMIT = 10;

    private final TransactionRepository transactionRepository;

    @GetMapping("/api/v1/transactions/recent")
    public List<TransactionResponseDTO> getRecentTransactions(@RequestParam(defaultValue = "10") int limit) {
        if (limit <= 0) {
            throw new LedgerException("limit must be greater than zero");
        }

        int effectiveLimit = Math.min(limit, MAX_RECENT_LIMIT);
        return transactionRepository.findTop10ByOrderByCreatedAtDesc().stream()
                .limit(effectiveLimit)
                .map(TransactionResponseDTO::from)
                .toList();
    }
}

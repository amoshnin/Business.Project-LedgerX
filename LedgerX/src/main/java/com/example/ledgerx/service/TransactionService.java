package com.example.ledgerx.service;

import com.example.ledgerx.api.TransactionResponseDTO;
import com.example.ledgerx.entity.EntryDirection;
import com.example.ledgerx.entity.LedgerEntry;
import com.example.ledgerx.entity.Transaction;
import com.example.ledgerx.exception.LedgerException;
import com.example.ledgerx.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;

    @Transactional(readOnly = true)
    public Page<TransactionResponseDTO> getTransactions(int page, int size) {
        if (page < 0) {
            throw new LedgerException("page must be zero or greater");
        }
        if (size <= 0) {
            throw new LedgerException("size must be greater than zero");
        }

        return transactionRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size))
                .map(this::toResponseDTO);
    }

    public TransactionResponseDTO toResponseDTO(Transaction transaction) {
        List<LedgerEntry> entries = transaction.getLedgerEntries() != null ? transaction.getLedgerEntries() : List.of();

        LedgerEntry debitEntry = findEntry(entries, EntryDirection.DEBIT);
        LedgerEntry creditEntry = findEntry(entries, EntryDirection.CREDIT);

        String fromAccount = debitEntry != null && debitEntry.getAccount() != null
                ? debitEntry.getAccount().getAccountNumber()
                : null;
        String toAccount = creditEntry != null && creditEntry.getAccount() != null
                ? creditEntry.getAccount().getAccountNumber()
                : null;

        BigDecimal amount = debitEntry != null
                ? debitEntry.getAmount()
                : creditEntry != null ? creditEntry.getAmount() : null;

        String currency = debitEntry != null && debitEntry.getAccount() != null
                ? debitEntry.getAccount().getCurrency()
                : creditEntry != null && creditEntry.getAccount() != null
                ? creditEntry.getAccount().getCurrency()
                : null;

        return new TransactionResponseDTO(
                transaction.getId(),
                transaction.getCreatedAt(),
                transaction.getStatus() != null ? transaction.getStatus().name() : null,
                fromAccount,
                toAccount,
                amount,
                currency,
                transaction.getIdempotencyKey()
        );
    }

    private LedgerEntry findEntry(List<LedgerEntry> entries, EntryDirection direction) {
        return entries.stream()
                .filter(entry -> entry.getDirection() == direction)
                .findFirst()
                .orElse(null);
    }
}

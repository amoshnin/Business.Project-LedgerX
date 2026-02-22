package com.example.ledgerx.service;

import com.example.ledgerx.audit.TransferCompletedEvent;
import com.example.ledgerx.entity.Account;
import com.example.ledgerx.entity.AccountStatus;
import com.example.ledgerx.entity.EntryDirection;
import com.example.ledgerx.entity.LedgerEntry;
import com.example.ledgerx.entity.Transaction;
import com.example.ledgerx.entity.TransactionStatus;
import com.example.ledgerx.exception.AccountFrozenException;
import com.example.ledgerx.exception.AccountNotFoundException;
import com.example.ledgerx.exception.IdempotencyConflictException;
import com.example.ledgerx.exception.InsufficientFundsException;
import com.example.ledgerx.exception.LedgerException;
import com.example.ledgerx.repository.AccountRepository;
import com.example.ledgerx.repository.LedgerEntryRepository;
import com.example.ledgerx.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransferService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final ApplicationEventPublisher applicationEventPublisher;
    private final TransactionStatusService transactionStatusService;

    @Transactional(isolation = Isolation.READ_COMMITTED, propagation = Propagation.REQUIRES_NEW)
    public Transaction processTransfer(
            String fromAccountNum,
            String toAccountNum,
            BigDecimal amount,
            String currency,
            String idempotencyKey
    ) {
        Transaction existing = transactionRepository.findByIdempotencyKey(idempotencyKey).orElse(null);
        if (existing != null) {
            if (existing.getStatus() == TransactionStatus.COMPLETED) {
                return existing;
            }
            if (existing.getStatus() == TransactionStatus.PENDING) {
                throw new IdempotencyConflictException(
                        "Transfer is already being processed for idempotency key: " + idempotencyKey
                );
            }
            throw new IdempotencyConflictException(
                    "Idempotency key cannot be reused with transaction status: " + existing.getStatus()
            );
        }

        try {
            Transaction transaction = transactionRepository.save(
                    Transaction.builder()
                            .idempotencyKey(idempotencyKey)
                            .status(TransactionStatus.PENDING)
                            .build()
            );

            validateRequest(fromAccountNum, toAccountNum, amount, currency, idempotencyKey);

            List<String> orderedAccountNumbers = List.of(fromAccountNum, toAccountNum).stream()
                    .sorted()
                    .toList();

            Account firstLocked = findByAccountNumberForUpdateOrThrow(orderedAccountNumbers.get(0));
            Account secondLocked = findByAccountNumberForUpdateOrThrow(orderedAccountNumbers.get(1));

            Account fromAccount = firstLocked.getAccountNumber().equals(fromAccountNum) ? firstLocked : secondLocked;
            Account toAccount = firstLocked.getAccountNumber().equals(toAccountNum) ? firstLocked : secondLocked;

            validateBusinessRules(fromAccount, toAccount, amount, currency);

            fromAccount.setBalance(fromAccount.getBalance().subtract(amount));
            toAccount.setBalance(toAccount.getBalance().add(amount));

            LedgerEntry debitEntry = LedgerEntry.builder()
                    .transaction(transaction)
                    .account(fromAccount)
                    .amount(amount)
                    .direction(EntryDirection.DEBIT)
                    .build();

            LedgerEntry creditEntry = LedgerEntry.builder()
                    .transaction(transaction)
                    .account(toAccount)
                    .amount(amount)
                    .direction(EntryDirection.CREDIT)
                    .build();

            ledgerEntryRepository.save(debitEntry);
            ledgerEntryRepository.save(creditEntry);

            transaction.setStatus(TransactionStatus.COMPLETED);
            transaction.setCompletedAt(Instant.now());
            Transaction completedTransaction = transactionRepository.save(transaction);
            applicationEventPublisher.publishEvent(new TransferCompletedEvent(fromAccountNum, toAccountNum, amount));
            return completedTransaction;
        } catch (LedgerException ex) {
            if (!(ex instanceof IdempotencyConflictException)) {
                transactionStatusService.recordFailedTransaction(idempotencyKey, ex.getMessage());
            }
            throw ex;
        }
    }

    private void validateRequest(
            String fromAccountNum,
            String toAccountNum,
            BigDecimal amount,
            String currency,
            String idempotencyKey
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new LedgerException("Idempotency key is required");
        }
        if (fromAccountNum == null || fromAccountNum.isBlank() || toAccountNum == null || toAccountNum.isBlank()) {
            throw new LedgerException("Both source and destination account numbers are required");
        }
        if (fromAccountNum.equals(toAccountNum)) {
            throw new LedgerException("Source and destination accounts must be different");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new LedgerException("Transfer amount must be greater than zero");
        }
        if (currency == null || currency.isBlank()) {
            throw new LedgerException("Currency is required");
        }
    }

    private Account findByAccountNumberForUpdateOrThrow(String accountNumber) {
        return accountRepository.findByAccountNumberForUpdate(accountNumber)
                .orElseThrow(() -> new AccountNotFoundException("Account not found: " + accountNumber));
    }

    private void validateBusinessRules(Account fromAccount, Account toAccount, BigDecimal amount, String currency) {
        boolean matchingCurrencies = currency.equals(fromAccount.getCurrency()) && currency.equals(toAccount.getCurrency());
        if (!matchingCurrencies) {
            throw new LedgerException("Currency mismatch between transfer request and account currencies");
        }

        if (fromAccount.getStatus() == AccountStatus.FROZEN || toAccount.getStatus() == AccountStatus.FROZEN) {
            throw new AccountFrozenException("Cannot process transfer because one or more accounts are frozen");
        }

        if (fromAccount.getBalance().compareTo(amount) < 0) {
            throw new InsufficientFundsException("Insufficient funds in account: " + fromAccount.getAccountNumber());
        }
    }
}

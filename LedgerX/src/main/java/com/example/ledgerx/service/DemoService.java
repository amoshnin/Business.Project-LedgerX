package com.example.ledgerx.service;

import com.example.ledgerx.entity.Account;
import com.example.ledgerx.exception.AccountNotFoundException;
import com.example.ledgerx.repository.AccountRepository;
import com.example.ledgerx.repository.AuditLogRepository;
import com.example.ledgerx.repository.LedgerEntryRepository;
import com.example.ledgerx.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class DemoService {

    private static final String ACCOUNT_A = "ACC-A-001";
    private static final String ACCOUNT_B = "ACC-B-001";
    private static final BigDecimal RESET_BALANCE = new BigDecimal("10000.0000");

    private final LedgerEntryRepository ledgerEntryRepository;
    private final AuditLogRepository auditLogRepository;
    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;

    @Transactional
    public void resetDemoState() {
        ledgerEntryRepository.deleteAllInBatch();
        auditLogRepository.deleteAllInBatch();
        transactionRepository.deleteAllInBatch();

        Account accountA = accountRepository.findByAccountNumber(ACCOUNT_A)
                .orElseThrow(() -> new AccountNotFoundException("Account not found: " + ACCOUNT_A));
        Account accountB = accountRepository.findByAccountNumber(ACCOUNT_B)
                .orElseThrow(() -> new AccountNotFoundException("Account not found: " + ACCOUNT_B));

        accountA.setBalance(RESET_BALANCE);
        accountB.setBalance(RESET_BALANCE);

        accountRepository.save(accountA);
        accountRepository.save(accountB);
    }
}

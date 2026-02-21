package com.example.ledgerx;

import com.example.ledgerx.entity.Account;
import com.example.ledgerx.entity.AccountStatus;
import com.example.ledgerx.entity.TransactionStatus;
import com.example.ledgerx.repository.AccountRepository;
import com.example.ledgerx.repository.AuditLogRepository;
import com.example.ledgerx.repository.LedgerEntryRepository;
import com.example.ledgerx.repository.TransactionRepository;
import com.example.ledgerx.service.TransferService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class TransferServiceConcurrencyTest {

    private static final String ACCOUNT_A = "ACC-A-001";
    private static final String ACCOUNT_B = "ACC-B-001";
    private static final String CURRENCY = "USD";
    private static final BigDecimal INITIAL_BALANCE_A = new BigDecimal("10000.0000");
    private static final BigDecimal INITIAL_BALANCE_B = new BigDecimal("0.0000");
    private static final BigDecimal TRANSFER_AMOUNT = new BigDecimal("50.0000");

    @Autowired
    private TransferService transferService;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private LedgerEntryRepository ledgerEntryRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @BeforeEach
    void setUp() {
        clearDatabase();

        Account accountA = Account.builder()
                .accountNumber(ACCOUNT_A)
                .currency(CURRENCY)
                .balance(INITIAL_BALANCE_A)
                .status(AccountStatus.ACTIVE)
                .build();

        Account accountB = Account.builder()
                .accountNumber(ACCOUNT_B)
                .currency(CURRENCY)
                .balance(INITIAL_BALANCE_B)
                .status(AccountStatus.ACTIVE)
                .build();

        accountRepository.saveAll(List.of(accountA, accountB));
    }

    @AfterEach
    void tearDown() {
        clearDatabase();
    }

    @Test
    void shouldHandleConcurrentTransfersSafely() throws InterruptedException {
        int totalTransfers = 100;
        ExecutorService executorService = Executors.newFixedThreadPool(20);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch completionLatch = new CountDownLatch(totalTransfers);
        ConcurrentLinkedQueue<Throwable> failures = new ConcurrentLinkedQueue<>();

        try {
            for (int i = 0; i < totalTransfers; i++) {
                executorService.submit(() -> {
                    try {
                        startLatch.await();
                        transferService.processTransfer(
                                ACCOUNT_A,
                                ACCOUNT_B,
                                TRANSFER_AMOUNT,
                                CURRENCY,
                                UUID.randomUUID().toString()
                        );
                    } catch (Throwable t) {
                        failures.add(t);
                    } finally {
                        completionLatch.countDown();
                    }
                });
            }

            startLatch.countDown();
            boolean finished = completionLatch.await(90, TimeUnit.SECONDS);
            assertTrue(finished, "Not all transfer tasks completed in time");
        } finally {
            executorService.shutdownNow();
            executorService.awaitTermination(10, TimeUnit.SECONDS);
        }

        if (!failures.isEmpty()) {
            Throwable firstFailure = failures.peek();
            fail("Concurrent transfer failures detected. First error: " + firstFailure);
        }

        Account reloadedA = findAccountByNumber(ACCOUNT_A);
        Account reloadedB = findAccountByNumber(ACCOUNT_B);

        assertEquals(0, reloadedA.getBalance().compareTo(new BigDecimal("5000.0000")));
        assertEquals(0, reloadedB.getBalance().compareTo(new BigDecimal("5000.0000")));

        long completedTransactions = transactionRepository.findAll().stream()
                .filter(transaction -> transaction.getStatus() == TransactionStatus.COMPLETED)
                .count();

        assertEquals(100L, transactionRepository.count());
        assertEquals(100L, completedTransactions);
        assertEquals(200L, ledgerEntryRepository.count());
    }

    private Account findAccountByNumber(String accountNumber) {
        return accountRepository.findAll().stream()
                .filter(account -> account.getAccountNumber().equals(accountNumber))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Account not found for test assertion: " + accountNumber));
    }

    private void clearDatabase() {
        ledgerEntryRepository.deleteAllInBatch();
        transactionRepository.deleteAllInBatch();
        auditLogRepository.deleteAllInBatch();
        accountRepository.deleteAllInBatch();
    }
}

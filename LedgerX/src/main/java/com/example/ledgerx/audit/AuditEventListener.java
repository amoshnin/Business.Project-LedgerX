package com.example.ledgerx.audit;

import com.example.ledgerx.entity.AuditLog;
import com.example.ledgerx.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class AuditEventListener {

    private final AuditLogRepository auditLogRepository;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onTransferCompleted(TransferCompletedEvent event) {
        Instant now = Instant.now();

        AuditLog senderAudit = AuditLog.builder()
                .accountNumber(event.fromAccountNumber())
                .action("TRANSFER_OUT")
                .amount(event.amount())
                .timestamp(now)
                .build();

        AuditLog receiverAudit = AuditLog.builder()
                .accountNumber(event.toAccountNumber())
                .action("TRANSFER_IN")
                .amount(event.amount())
                .timestamp(now)
                .build();

        auditLogRepository.save(senderAudit);
        auditLogRepository.save(receiverAudit);
    }
}

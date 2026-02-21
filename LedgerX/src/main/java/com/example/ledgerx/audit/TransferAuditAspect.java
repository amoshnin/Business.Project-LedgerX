package com.example.ledgerx.audit;

import com.example.ledgerx.entity.AuditLog;
import com.example.ledgerx.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;

@Aspect
@Component
@RequiredArgsConstructor
public class TransferAuditAspect {

    private final AuditLogRepository auditLogRepository;

    @Async
    @AfterReturning("@annotation(com.example.ledgerx.audit.AuditableTransfer)")
    public void logTransferSuccess(JoinPoint joinPoint) {
        Object[] args = joinPoint.getArgs();
        if (args.length < 3) {
            return;
        }

        String fromAccountNum = (String) args[0];
        String toAccountNum = (String) args[1];
        BigDecimal amount = (BigDecimal) args[2];
        Instant now = Instant.now();

        AuditLog senderAudit = AuditLog.builder()
                .accountNumber(fromAccountNum)
                .action("TRANSFER_OUT")
                .amount(amount)
                .timestamp(now)
                .build();

        AuditLog receiverAudit = AuditLog.builder()
                .accountNumber(toAccountNum)
                .action("TRANSFER_IN")
                .amount(amount)
                .timestamp(now)
                .build();

        auditLogRepository.save(senderAudit);
        auditLogRepository.save(receiverAudit);
    }
}

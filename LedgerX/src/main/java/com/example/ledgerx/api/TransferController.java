package com.example.ledgerx.api;

import com.example.ledgerx.entity.Transaction;
import com.example.ledgerx.service.TransferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class TransferController {

    private final TransferService transferService;

    @PostMapping("/api/v1/transfers")
    public Transaction transfer(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody TransferRequestDTO request
    ) {
        return transferService.processTransfer(
                request.fromAccount(),
                request.toAccount(),
                request.amount(),
                request.currency(),
                idempotencyKey
        );
    }
}

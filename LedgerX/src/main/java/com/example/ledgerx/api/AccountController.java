package com.example.ledgerx.api;

import com.example.ledgerx.exception.AccountNotFoundException;
import com.example.ledgerx.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class AccountController {

    private final AccountRepository accountRepository;

    @GetMapping("/api/v1/accounts/{accountNumber}")
    public AccountResponseDTO getAccount(@PathVariable String accountNumber) {
        return accountRepository.findByAccountNumber(accountNumber)
                .map(AccountResponseDTO::from)
                .orElseThrow(() -> new AccountNotFoundException("Account not found: " + accountNumber));
    }
}

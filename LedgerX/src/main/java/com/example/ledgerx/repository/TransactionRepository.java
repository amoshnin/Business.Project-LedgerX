package com.example.ledgerx.repository;

import com.example.ledgerx.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    Optional<Transaction> findByIdempotencyKey(String idempotencyKey);

    List<Transaction> findTop10ByOrderByCreatedAtDesc();
}

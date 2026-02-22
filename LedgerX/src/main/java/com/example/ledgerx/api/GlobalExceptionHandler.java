package com.example.ledgerx.api;

import com.example.ledgerx.exception.AccountNotFoundException;
import com.example.ledgerx.exception.IdempotencyConflictException;
import com.example.ledgerx.exception.InsufficientFundsException;
import com.example.ledgerx.exception.LedgerException;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.Locale;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(InsufficientFundsException.class)
    public ResponseEntity<ErrorResponse> handleInsufficientFunds(InsufficientFundsException ex) {
        return build(HttpStatus.valueOf(422), ex.getMessage());
    }

    @ExceptionHandler(AccountNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleAccountNotFound(AccountNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(IdempotencyConflictException.class)
    public ResponseEntity<ErrorResponse> handleIdempotencyConflict(IdempotencyConflictException ex) {
        return build(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(this::formatFieldError)
                .collect(Collectors.joining("; "));
        if (message.isBlank()) {
            message = "Request validation failed";
        }
        return build(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponse> handleOptimisticLocking(OptimisticLockingFailureException ex) {
        return build(HttpStatus.CONFLICT, "Concurrent update detected. Please retry.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        if (isIdempotencyKeyConstraintViolation(ex)) {
            return build(HttpStatus.CONFLICT, "Idempotency conflict: Request already processing");
        }
        return build(HttpStatus.BAD_REQUEST, "Data integrity violation");
    }

    @ExceptionHandler({CannotAcquireLockException.class, PessimisticLockingFailureException.class})
    public ResponseEntity<ErrorResponse> handleLockContention(RuntimeException ex) {
        return build(HttpStatus.CONFLICT, "System busy, please retry the transaction");
    }

    @ExceptionHandler(LedgerException.class)
    public ResponseEntity<ErrorResponse> handleLedgerException(LedgerException ex) {
        return build(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected server error");
    }

    private String formatFieldError(FieldError fieldError) {
        String defaultMessage = fieldError.getDefaultMessage() != null ? fieldError.getDefaultMessage() : "invalid";
        return fieldError.getField() + ": " + defaultMessage;
    }

    private boolean isIdempotencyKeyConstraintViolation(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            String message = current.getMessage();
            if (message != null) {
                String normalized = message.toLowerCase(Locale.ROOT);
                if (normalized.contains("transactions_idempotency_key_key")) {
                    return true;
                }
                if (normalized.contains("idempotency_key")
                        && (normalized.contains("unique") || normalized.contains("duplicate"))) {
                    return true;
                }
            }
            current = current.getCause();
        }
        return false;
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus status, String message) {
        ErrorResponse response = new ErrorResponse(Instant.now(), status.value(), message);
        return ResponseEntity.status(status).body(response);
    }
}

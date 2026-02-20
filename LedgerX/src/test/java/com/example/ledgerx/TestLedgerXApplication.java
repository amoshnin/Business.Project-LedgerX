package com.example.ledgerx;

import org.springframework.boot.SpringApplication;

public class TestLedgerXApplication {

    public static void main(String[] args) {
        SpringApplication.from(LedgerXApplication::main).with(TestcontainersConfiguration.class).run(args);
    }

}

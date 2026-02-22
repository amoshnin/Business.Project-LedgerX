package com.example.ledgerx.api;

import com.example.ledgerx.service.DemoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class DemoController {

    private final DemoService demoService;

    @PostMapping("/api/v1/demo/reset")
    public ResponseEntity<String> resetDemoState() {
        demoService.resetDemoState();
        return ResponseEntity.ok("System reset to pristine state");
    }
}

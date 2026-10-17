package com.tracegraphai.backend.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
public class HealthController {

    @GetMapping("/api/health")
    public Map<String, String> health(){
        return Map.of(
                "application", "TraceGraphAI",
                "status", "UP"
        );
    }
}

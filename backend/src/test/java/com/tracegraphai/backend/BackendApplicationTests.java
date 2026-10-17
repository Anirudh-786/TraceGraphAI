package com.tracegraphai.backend;

import com.tracegraphai.backend.controller.GraphController;
import com.tracegraphai.backend.service.GraphSeedService;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class BackendApplicationTests {

    @Autowired
    private GraphController graphController;

    @Autowired
    private GraphSeedService graphSeedService;

    @Test
    @Order(1)
    void contextLoads() {
        assertNotNull(graphController);
        assertNotNull(graphSeedService);
    }

    @Test
    @Order(2)
    void testIdempotentSeedAndGraphExpansion() {
        // First seed execution
        Map<String, Object> firstSeed = graphSeedService.seedRealisticMicroservicesGraph();
        assertEquals("SUCCESS", firstSeed.get("status"));

        Map<String, Object> graphData1 = graphController.getGraphData();
        List<?> nodes1 = (List<?>) graphData1.get("nodes");
        List<?> edges1 = (List<?>) graphData1.get("edges");

        assertTrue(nodes1.size() >= 17, "Expected at least 17 microservice nodes, found: " + nodes1.size());
        assertTrue(edges1.size() >= 20, "Expected at least 20 dependency edges, found: " + edges1.size());

        // Second seed execution - must be strictly idempotent
        Map<String, Object> secondSeed = graphSeedService.seedRealisticMicroservicesGraph();
        assertEquals("SUCCESS", secondSeed.get("status"));

        Map<String, Object> graphData2 = graphController.getGraphData();
        List<?> nodes2 = (List<?>) graphData2.get("nodes");
        List<?> edges2 = (List<?>) graphData2.get("edges");

        assertEquals(nodes1.size(), nodes2.size(), "Node count changed after repeated seeding! Idempotency failed.");
        assertEquals(edges1.size(), edges2.size(), "Edge count changed after repeated seeding! Idempotency failed.");
    }

    @Test
    @Order(3)
    void testImpactAnalysisOnCoreServices() {
        // 1. database-service failure blast radius
        Map<String, Object> dbImpact = graphController.getServiceImpact("database-service");
        assertEquals("database-service", dbImpact.get("service"));
        int dbAffected = (int) dbImpact.get("affectedCount");
        int dbDirect = (int) dbImpact.get("directCount");
        int dbIndirect = (int) dbImpact.get("indirectCount");

        assertTrue(dbAffected >= 5, "database-service outage should impact at least 5 dependent services");
        assertTrue(dbDirect >= 3, "database-service should have direct dependents");
        assertTrue(dbIndirect >= 1, "database-service should have indirect dependents");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> affectedList = (List<Map<String, Object>>) dbImpact.get("affectedServices");
        for (Map<String, Object> affected : affectedList) {
            int distance = (int) affected.get("distance");
            String impactType = (String) affected.get("impactType");
            if (distance == 1) {
                assertEquals("DIRECT", impactType);
            } else {
                assertEquals("INDIRECT", impactType);
            }
        }

        // 2. payment-service failure blast radius
        Map<String, Object> payImpact = graphController.getServiceImpact("payment-service");
        int payAffected = (int) payImpact.get("affectedCount");
        assertTrue(payAffected >= 1, "payment-service should impact at least order-service");

        // 3. api-gateway failure blast radius
        Map<String, Object> gwImpact = graphController.getServiceImpact("api-gateway");
        int gwAffected = (int) gwImpact.get("affectedCount");
        assertTrue(gwAffected >= 1, "api-gateway should impact at least frontend-service");

        // 4. message-queue failure blast radius
        Map<String, Object> mqImpact = graphController.getServiceImpact("message-queue");
        int mqAffected = (int) mqImpact.get("affectedCount");
        assertTrue(mqAffected >= 1, "message-queue should impact event consumers/producers");
    }

    @Test
    @Order(4)
    void testServiceRiskCalculations() {
        Map<String, Object> dbRisk = graphController.getServiceRisk("database-service");
        assertEquals(true, dbRisk.get("found"));
        int riskScore = (int) dbRisk.get("riskScore");
        assertTrue(riskScore >= 70, "database-service should score high risk (>=70) due to high criticality and wide blast radius");
        assertEquals("HIGH", dbRisk.get("riskLevel"));

        // All risks endpoint
        List<Map<String, Object>> allRisks = graphController.getAllServiceRisks();
        assertFalse(allRisks.isEmpty(), "Service risk list should not be empty");

        // Verify descending sort order by risk score
        for (int i = 0; i < allRisks.size() - 1; i++) {
            int scoreA = (int) allRisks.get(i).get("riskScore");
            int scoreB = (int) allRisks.get(i + 1).get("riskScore");
            assertTrue(scoreA >= scoreB, "Risks must be sorted in descending order of riskScore");
        }
    }

    @Test
    @Order(5)
    void testDependencyPath() {
        Map<String, Object> pathResult = graphController.getDependencyPath("frontend-service", "database-service");
        assertEquals(true, pathResult.get("found"));
        @SuppressWarnings("unchecked")
        List<String> path = (List<String>) pathResult.get("path");
        assertNotNull(path);
        assertFalse(path.isEmpty());
        assertEquals("frontend-service", path.get(0));
        assertEquals("database-service", path.get(path.size() - 1));
    }
}

package com.tracegraphai.backend.service;

import com.falkordb.Graph;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class GraphSeedService implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(GraphSeedService.class);

    private final Graph graph;
    private final boolean seedOnStartup;

    public GraphSeedService(
            Graph graph,
            @Value("${graph.seed.on-startup:false}") boolean seedOnStartup) {
        this.graph = graph;
        this.seedOnStartup = seedOnStartup;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (seedOnStartup) {
            log.info("graph.seed.on-startup is true. Executing idempotent graph expansion...");
            seedRealisticMicroservicesGraph();
        } else {
            log.info("graph.seed.on-startup is false. Preserving existing graph data without auto-seed.");
        }
    }

    public record ServiceDef(
            String name,
            String criticality,
            String serviceType,
            String environment,
            String description
    ) {}

    public record DependencyDef(
            String source,
            String target
    ) {}

    public static final List<ServiceDef> DEMO_SERVICES = List.of(
            // Customer-facing services
            new ServiceDef("frontend-service", "high", "customer-facing", "production", "Customer Web Frontend Interface"),
            new ServiceDef("api-gateway", "high", "customer-facing", "production", "Ingress API Gateway & Traffic Router"),
            new ServiceDef("authentication-service", "high", "customer-facing", "production", "User Authentication, JWT & Security Tokens"),
            new ServiceDef("user-service", "medium", "customer-facing", "production", "User Account & Profile Management"),

            // Business services
            new ServiceDef("product-service", "medium", "business", "production", "Product Catalog & Details Service"),
            new ServiceDef("inventory-service", "high", "business", "production", "Inventory Tracking & Stock Reservation"),
            new ServiceDef("cart-service", "medium", "business", "production", "Active Shopping Cart Session Manager"),
            new ServiceDef("order-service", "high", "business", "production", "Order Orchestration & Lifecycle Workflow"),
            new ServiceDef("payment-service", "high", "business", "production", "Payment Processing & Gateway Integration"),
            new ServiceDef("notification-service", "low", "business", "production", "Notification Dispatch & Template Engine"),
            new ServiceDef("shipping-service", "medium", "business", "production", "Fulfillment & Carrier Logistics Service"),

            // Data and infrastructure services
            new ServiceDef("database-service", "high", "infrastructure", "production", "Primary Relational Database Cluster"),
            new ServiceDef("cache-service", "medium", "infrastructure", "production", "Distributed In-Memory Session & Cache Store"),
            new ServiceDef("message-queue", "high", "infrastructure", "production", "Asynchronous Event Broker & Message Bus"),
            new ServiceDef("search-service", "medium", "infrastructure", "production", "Search Index & Query Engine"),
            new ServiceDef("object-storage-service", "low", "infrastructure", "production", "Media, Images & Document Object Storage"),
            new ServiceDef("email-provider", "low", "infrastructure", "production", "External Email Delivery Gateway")
    );

    public static final List<DependencyDef> DEMO_DEPENDENCIES = List.of(
            // frontend depends on api-gateway
            new DependencyDef("frontend-service", "api-gateway"),

            // api-gateway depends on core entry services
            new DependencyDef("api-gateway", "authentication-service"),
            new DependencyDef("api-gateway", "product-service"),
            new DependencyDef("api-gateway", "cart-service"),
            new DependencyDef("api-gateway", "order-service"),

            // order-service depends on business dependencies
            new DependencyDef("order-service", "payment-service"),
            new DependencyDef("order-service", "inventory-service"),
            new DependencyDef("order-service", "shipping-service"),
            new DependencyDef("order-service", "message-queue"),

            // data store dependencies
            new DependencyDef("payment-service", "database-service"),
            new DependencyDef("inventory-service", "database-service"),
            new DependencyDef("user-service", "database-service"),
            new DependencyDef("product-service", "database-service"),
            new DependencyDef("product-service", "search-service"),
            new DependencyDef("product-service", "object-storage-service"),

            // cart dependencies
            new DependencyDef("cart-service", "cache-service"),
            new DependencyDef("cart-service", "database-service"),

            // asynchronous event & messaging dependencies
            new DependencyDef("notification-service", "message-queue"),
            new DependencyDef("notification-service", "email-provider"),
            new DependencyDef("shipping-service", "message-queue")
    );

    /**
     * Idempotently seeds the demo microservices architecture into FalkorDB.
     * Uses MERGE and ON CREATE SET to ensure that existing nodes and properties are NOT overwritten,
     * and relationships are only created if not already present.
     */
    public Map<String, Object> seedRealisticMicroservicesGraph() {
        int nodesMerged = 0;
        int relationshipsMerged = 0;

        for (ServiceDef svc : DEMO_SERVICES) {
            String safeName = escape(svc.name());
            String safeCrit = escape(svc.criticality());
            String safeType = escape(svc.serviceType());
            String safeEnv = escape(svc.environment());
            String safeDesc = escape(svc.description());

            // MERGE ensures node exists; COALESCE ensures null fields get defaults without overwriting user properties
            graph.query(
                    "MERGE (s:Service {name: '" + safeName + "'}) " +
                    "SET s.criticality = COALESCE(s.criticality, '" + safeCrit + "'), " +
                    "s.serviceType = COALESCE(s.serviceType, '" + safeType + "'), " +
                    "s.environment = COALESCE(s.environment, '" + safeEnv + "'), " +
                    "s.description = COALESCE(s.description, '" + safeDesc + "')"
            );
            nodesMerged++;
        }

        for (DependencyDef dep : DEMO_DEPENDENCIES) {
            String safeSource = escape(dep.source());
            String safeTarget = escape(dep.target());

            // MERGE relationship ensures it is not duplicated
            graph.query(
                    "MATCH (s:Service {name: '" + safeSource + "'}), (t:Service {name: '" + safeTarget + "'}) " +
                    "MERGE (s)-[r:DEPENDS_ON]->(t)"
            );
            relationshipsMerged++;
        }

        log.info("Idempotent graph seed completed: {} service definitions and {} dependency definitions verified.",
                nodesMerged, relationshipsMerged);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "SUCCESS");
        result.put("architecture", "demo-ecommerce-microservices");
        result.put("servicesConfigured", nodesMerged);
        result.put("dependenciesConfigured", relationshipsMerged);
        result.put("message", "Idempotently seeded realistic microservice dependency graph into FalkorDB.");
        return result;
    }

    private String escape(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\").replace("'", "\\'");
    }
}

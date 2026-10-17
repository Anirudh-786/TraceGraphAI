// TraceGraphAI - Idempotent FalkorDB Seed Script
// Demo e-commerce microservices architecture (17 services, 20 relationships)
// Direction rule: A -[:DEPENDS_ON]-> B means A depends on B. If B fails, A is impacted.

// 1. Customer-Facing Services
MERGE (s:Service {name: 'frontend-service'})
SET s.criticality = COALESCE(s.criticality, 'high'),
    s.serviceType = COALESCE(s.serviceType, 'customer-facing'),
    s.environment = COALESCE(s.environment, 'production'),
    s.description = COALESCE(s.description, 'Customer Web Frontend Interface');

MERGE (s:Service {name: 'api-gateway'})
SET s.criticality = COALESCE(s.criticality, 'high'),
    s.serviceType = COALESCE(s.serviceType, 'customer-facing'),
    s.environment = COALESCE(s.environment, 'production'),
    s.description = COALESCE(s.description, 'Ingress API Gateway & Traffic Router');

MERGE (s:Service {name: 'authentication-service'})
SET s.criticality = COALESCE(s.criticality, 'high'),
    s.serviceType = COALESCE(s.serviceType, 'customer-facing'),
    s.environment = COALESCE(s.environment, 'production'),
    s.description = COALESCE(s.description, 'User Authentication, JWT & Security Tokens');

MERGE (s:Service {name: 'user-service'})
SET s.criticality = COALESCE(s.criticality, 'medium'),
    s.serviceType = COALESCE(s.serviceType, 'customer-facing'),
    s.environment = COALESCE(s.environment, 'production'),
    s.description = COALESCE(s.description, 'User Account & Profile Management');

// 2. Business Services
MERGE (s:Service {name: 'product-service'})
SET s.criticality = COALESCE(s.criticality, 'medium'),
    s.serviceType = COALESCE(s.serviceType, 'business'),
    s.environment = COALESCE(s.environment, 'production'),
    s.description = COALESCE(s.description, 'Product Catalog & Details Service');

MERGE (s:Service {name: 'inventory-service'})
SET s.criticality = COALESCE(s.criticality, 'high'),
    s.serviceType = COALESCE(s.serviceType, 'business'),
    s.environment = COALESCE(s.environment, 'production'),
    s.description = COALESCE(s.description, 'Inventory Tracking & Stock Reservation');

MERGE (s:Service {name: 'cart-service'})
SET s.criticality = COALESCE(s.criticality, 'medium'),
    s.serviceType = COALESCE(s.serviceType, 'business'),
    s.environment = COALESCE(s.environment, 'production'),
    s.description = COALESCE(s.description, 'Active Shopping Cart Session Manager');

MERGE (s:Service {name: 'order-service'})
SET s.criticality = COALESCE(s.criticality, 'high'),
    s.serviceType = COALESCE(s.serviceType, 'business'),
    s.environment = COALESCE(s.environment, 'production'),
    s.description = COALESCE(s.description, 'Order Orchestration & Lifecycle Workflow');

MERGE (s:Service {name: 'payment-service'})
SET s.criticality = COALESCE(s.criticality, 'high'),
    s.serviceType = COALESCE(s.serviceType, 'business'),
    s.environment = COALESCE(s.environment, 'production'),
    s.description = COALESCE(s.description, 'Payment Processing & Gateway Integration');

MERGE (s:Service {name: 'notification-service'})
SET s.criticality = COALESCE(s.criticality, 'low'),
    s.serviceType = COALESCE(s.serviceType, 'business'),
    s.environment = COALESCE(s.environment, 'production'),
    s.description = COALESCE(s.description, 'Notification Dispatch & Template Engine');

MERGE (s:Service {name: 'shipping-service'})
SET s.criticality = COALESCE(s.criticality, 'medium'),
    s.serviceType = COALESCE(s.serviceType, 'business'),
    s.environment = COALESCE(s.environment, 'production'),
    s.description = COALESCE(s.description, 'Fulfillment & Carrier Logistics Service');

// 3. Infrastructure & Data Services
MERGE (s:Service {name: 'database-service'})
SET s.criticality = COALESCE(s.criticality, 'high'),
    s.serviceType = COALESCE(s.serviceType, 'infrastructure'),
    s.environment = COALESCE(s.environment, 'production'),
    s.description = COALESCE(s.description, 'Primary Relational Database Cluster');

MERGE (s:Service {name: 'cache-service'})
SET s.criticality = COALESCE(s.criticality, 'medium'),
    s.serviceType = COALESCE(s.serviceType, 'infrastructure'),
    s.environment = COALESCE(s.environment, 'production'),
    s.description = COALESCE(s.description, 'Distributed In-Memory Session & Cache Store');

MERGE (s:Service {name: 'message-queue'})
SET s.criticality = COALESCE(s.criticality, 'high'),
    s.serviceType = COALESCE(s.serviceType, 'infrastructure'),
    s.environment = COALESCE(s.environment, 'production'),
    s.description = COALESCE(s.description, 'Asynchronous Event Broker & Message Bus');

MERGE (s:Service {name: 'search-service'})
SET s.criticality = COALESCE(s.criticality, 'medium'),
    s.serviceType = COALESCE(s.serviceType, 'infrastructure'),
    s.environment = COALESCE(s.environment, 'production'),
    s.description = COALESCE(s.description, 'Search Index & Query Engine');

MERGE (s:Service {name: 'object-storage-service'})
SET s.criticality = COALESCE(s.criticality, 'low'),
    s.serviceType = COALESCE(s.serviceType, 'infrastructure'),
    s.environment = COALESCE(s.environment, 'production'),
    s.description = COALESCE(s.description, 'Media, Images & Document Object Storage');

MERGE (s:Service {name: 'email-provider'})
SET s.criticality = COALESCE(s.criticality, 'low'),
    s.serviceType = COALESCE(s.serviceType, 'infrastructure'),
    s.environment = COALESCE(s.environment, 'production'),
    s.description = COALESCE(s.description, 'External Email Delivery Gateway');

// 4. Meaningful Dependency Relationships
MATCH (s:Service {name: 'frontend-service'}), (t:Service {name: 'api-gateway'}) MERGE (s)-[r:DEPENDS_ON]->(t);
MATCH (s:Service {name: 'api-gateway'}), (t:Service {name: 'authentication-service'}) MERGE (s)-[r:DEPENDS_ON]->(t);
MATCH (s:Service {name: 'api-gateway'}), (t:Service {name: 'product-service'}) MERGE (s)-[r:DEPENDS_ON]->(t);
MATCH (s:Service {name: 'api-gateway'}), (t:Service {name: 'cart-service'}) MERGE (s)-[r:DEPENDS_ON]->(t);
MATCH (s:Service {name: 'api-gateway'}), (t:Service {name: 'order-service'}) MERGE (s)-[r:DEPENDS_ON]->(t);

MATCH (s:Service {name: 'order-service'}), (t:Service {name: 'payment-service'}) MERGE (s)-[r:DEPENDS_ON]->(t);
MATCH (s:Service {name: 'order-service'}), (t:Service {name: 'inventory-service'}) MERGE (s)-[r:DEPENDS_ON]->(t);
MATCH (s:Service {name: 'order-service'}), (t:Service {name: 'shipping-service'}) MERGE (s)-[r:DEPENDS_ON]->(t);
MATCH (s:Service {name: 'order-service'}), (t:Service {name: 'message-queue'}) MERGE (s)-[r:DEPENDS_ON]->(t);

MATCH (s:Service {name: 'payment-service'}), (t:Service {name: 'database-service'}) MERGE (s)-[r:DEPENDS_ON]->(t);
MATCH (s:Service {name: 'inventory-service'}), (t:Service {name: 'database-service'}) MERGE (s)-[r:DEPENDS_ON]->(t);
MATCH (s:Service {name: 'user-service'}), (t:Service {name: 'database-service'}) MERGE (s)-[r:DEPENDS_ON]->(t);
MATCH (s:Service {name: 'product-service'}), (t:Service {name: 'database-service'}) MERGE (s)-[r:DEPENDS_ON]->(t);
MATCH (s:Service {name: 'product-service'}), (t:Service {name: 'search-service'}) MERGE (s)-[r:DEPENDS_ON]->(t);
MATCH (s:Service {name: 'product-service'}), (t:Service {name: 'object-storage-service'}) MERGE (s)-[r:DEPENDS_ON]->(t);

MATCH (s:Service {name: 'cart-service'}), (t:Service {name: 'cache-service'}) MERGE (s)-[r:DEPENDS_ON]->(t);
MATCH (s:Service {name: 'cart-service'}), (t:Service {name: 'database-service'}) MERGE (s)-[r:DEPENDS_ON]->(t);

MATCH (s:Service {name: 'notification-service'}), (t:Service {name: 'message-queue'}) MERGE (s)-[r:DEPENDS_ON]->(t);
MATCH (s:Service {name: 'notification-service'}), (t:Service {name: 'email-provider'}) MERGE (s)-[r:DEPENDS_ON]->(t);
MATCH (s:Service {name: 'shipping-service'}), (t:Service {name: 'message-queue'}) MERGE (s)-[r:DEPENDS_ON]->(t);

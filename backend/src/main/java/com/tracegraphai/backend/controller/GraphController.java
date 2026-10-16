
package com.tracegraphai.backend.controller;

import com.falkordb.Graph;
import com.falkordb.Record;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;

import java.util.LinkedHashMap;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
public class GraphController {

    private final Graph graph;

    public GraphController(Graph graph) {
        this.graph = graph;
    }

    @PostMapping("/api/graph/nodes")
    public ResponseEntity<Map<String, Object>> createService(
            @RequestBody Map<String, Object> request) {

        Object nameValue = request.get("name");

        if (!(nameValue instanceof String name)
                || name.isBlank()
                || name.length() > 100) {
            return ResponseEntity.badRequest().body(
                    Map.of("error", "A service name of 1-100 characters is required")
            );
        }

        name = name.trim();

        String safeName = escapeCypherString(name);

        var result = graph.query(
                "MERGE (s:Service {name: '" + safeName + "'}) " +
                        "RETURN id(s) AS id, labels(s) AS labels, " +
                        "properties(s) AS properties"
        );

        Record record = result.iterator().next();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", record.getValue("id").toString());
        response.put("labels", record.getValue("labels"));
        response.put("properties", record.getValue("properties"));

        return ResponseEntity.ok(response);
    }


    @PostMapping("/api/graph/relationships")
    public ResponseEntity<Map<String, Object>> createDependency(
            @RequestBody Map<String, Object> request) {

        Object sourceValue = request.get("source");
        Object targetValue = request.get("target");

        if (!(sourceValue instanceof String source)
                || !(targetValue instanceof String target)
                || source.isBlank()
                || target.isBlank()
                || source.length() > 100
                || target.length() > 100) {
            return ResponseEntity.badRequest().body(
                    Map.of("error", "Valid source and target service names are required")
            );
        }

        source = source.trim();
        target = target.trim();

        if (source.equals(target)) {
            return ResponseEntity.badRequest().body(
                    Map.of("error", "A service cannot depend on itself")
            );
        }

        String safeSource = escapeCypherString(source);
        String safeTarget = escapeCypherString(target);

        var result = graph.query(
                "MATCH (s:Service {name: '" + safeSource + "'}), " +
                        "(t:Service {name: '" + safeTarget + "'}) " +
                        "MERGE (s)-[r:DEPENDS_ON]->(t) " +
                        "RETURN id(s) AS sourceId, id(t) AS targetId, " +
                        "type(r) AS relationship"
        );

        var iterator = result.iterator();

        if (!iterator.hasNext()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                    Map.of("error", "Source or target service was not found")
            );
        }

        Record record = iterator.next();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("sourceId", record.getValue("sourceId").toString());
        response.put("targetId", record.getValue("targetId").toString());
        response.put("relationship", record.getValue("relationship"));

        return ResponseEntity.ok(response);
    }


    private String escapeCypherString(String value) {
        return value.replace("\\", "\\\\")
                .replace("'", "\\'");
    }

    @GetMapping("/api/graph/test")
    public Map<String, Object> testGraphConnection() {
        var result = graph.query(
                "MATCH (n) OPTIONAL MATCH (n)-[r]->() " +
                        "RETURN count(DISTINCT n) AS nodes, count(r) AS relationships"
        );

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("application", "TraceGraphAI");
        response.put("graph", "tracegraph");
        response.put("status", "UP");

        if (result.iterator().hasNext()) {
            Record record = result.iterator().next();
            response.put("nodes", record.getValue("nodes"));
            response.put("relationships", record.getValue("relationships"));
        }

        return response;
    }


    @GetMapping("/api/graph")
    public Map<String, Object> getGraphData() {
        var result = graph.query(
                "MATCH (n) " +
                        "OPTIONAL MATCH (n)-[r]->(m) " +
                        "RETURN id(n) AS sourceId, " +
                        "labels(n) AS nodeLabels, " +
                        "properties(n) AS nodeProperties, " +
                        "collect(CASE WHEN r IS NOT NULL THEN {" +
                        "source: id(n), " +
                        "target: id(m), " +
                        "type: type(r)" +
                        "} END) AS relationships"
        );

        var nodes = new java.util.ArrayList<Map<String, Object>>();
        var edges = new java.util.ArrayList<Map<String, Object>>();
        var seenEdges = new java.util.HashSet<String>();

        for (Record record : result) {
            Object sourceId = record.getValue("sourceId");
            Object labels = record.getValue("nodeLabels");
            Object properties = record.getValue("nodeProperties");

            Map<String, Object> node = new LinkedHashMap<>();
            node.put("id", String.valueOf(sourceId));
            node.put("labels", labels);
            node.put("properties", properties);
            nodes.add(node);

            Object relationships = record.getValue("relationships");
            if (relationships instanceof Iterable<?> items) {
                for (Object item : items) {
                    if (item instanceof Map<?, ?> relationship) {
                        Object source = relationship.get("source");
                        Object target = relationship.get("target");
                        Object type = relationship.get("type");

                        if (source == null || target == null || type == null) {
                            continue;
                        }

                        String edgeKey = source + "->" + target + ":" + type;
                        if (seenEdges.add(edgeKey)) {
                            Map<String, Object> edge = new LinkedHashMap<>();
                            edge.put("source", String.valueOf(source));
                            edge.put("target", String.valueOf(target));
                            edge.put("label", String.valueOf(type));
                            edges.add(edge);
                        }
                    }
                }
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("application", "TraceGraphAI");
        response.put("graph", "tracegraph");
        response.put("nodes", nodes);
        response.put("edges", edges);

        return response;
    }


    @GetMapping("/api/graph/impact")
    public Map<String, Object> getServiceImpact(
            @org.springframework.web.bind.annotation.RequestParam String service) {

        String safeService = escapeCypherString(service.trim());

        var result = graph.query(
                "MATCH path = (affected:Service)-[:DEPENDS_ON*1..]->" +
                        "(target:Service {name: '" + safeService + "'}) " +
                        "WITH affected, min(length(path)) AS distance " +
                        "RETURN DISTINCT id(affected) AS id, " +
                        "labels(affected) AS labels, " +
                        "properties(affected) AS properties, " +
                        "distance " +
                        "ORDER BY distance"
        );

        var affectedServices = new java.util.ArrayList<Map<String, Object>>();
        int directCount = 0;
        int indirectCount = 0;

        for (Record record : result) {
            int distance = Integer.parseInt(
                    record.getValue("distance").toString()
            );

            Map<String, Object> node = new LinkedHashMap<>();
            node.put("id", record.getValue("id").toString());
            node.put("labels", record.getValue("labels"));
            node.put("properties", record.getValue("properties"));
            node.put("distance", distance);
            node.put("impactType", distance == 1 ? "DIRECT" : "INDIRECT");

            if (distance == 1) {
                directCount++;
            } else {
                indirectCount++;
            }

            affectedServices.add(node);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("application", "TraceGraphAI");
        response.put("service", service);
        response.put("affectedCount", affectedServices.size());
        response.put("directCount", directCount);
        response.put("indirectCount", indirectCount);
        response.put("affectedServices", affectedServices);

        return response;
    }


    @GetMapping("/api/graph/path")
    public Map<String, Object> getDependencyPath(
            @org.springframework.web.bind.annotation.RequestParam String source,
            @org.springframework.web.bind.annotation.RequestParam String target) {

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("application", "TraceGraphAI");
        response.put("source", source);
        response.put("target", target);

        if (source.isBlank() || target.isBlank()
                || source.length() > 100 || target.length() > 100) {
            response.put("found", false);
            response.put("error", "Source and target must be between 1 and 100 characters");
            return response;
        }

        String safeSource = escapeCypherString(source.trim());
        String safeTarget = escapeCypherString(target.trim());

        var result = graph.query(
                "MATCH (s:Service {name: '" + safeSource + "'}), " +
                        "(t:Service {name: '" + safeTarget + "'}) " +
                        "WITH shortestPath((s)-[:DEPENDS_ON*0..]->(t)) AS p " +
                        "RETURN [n IN nodes(p) | properties(n).name] AS path, " +
                        "[r IN relationships(p) | type(r)] AS relationships"
        );

        var iterator = result.iterator();

        if (!iterator.hasNext()) {
            response.put("found", false);
            response.put("path", List.of());
            response.put("relationships", List.of());
            return response;
        }

        Record record = iterator.next();

        response.put("found", true);
        response.put("path", record.getValue("path"));
        response.put("relationships", record.getValue("relationships"));

        return response;
    }


    @GetMapping("/risk")
    public Map<String, Object> getServiceRisk(
            @org.springframework.web.bind.annotation.RequestParam String service) {

        String safeService = escapeCypherString(service);

        var result = graph.query(
                "MATCH (s:Service {name: '" + safeService + "'}) " +
                        "OPTIONAL MATCH (affected:Service)-[:DEPENDS_ON*1..]->(s) " +
                        "RETURN s.name AS name, " +
                        "s.criticality AS criticality, " +
                        "count(DISTINCT affected) AS affectedCount"
        );

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("application", "TraceGraphAI");
        response.put("service", service);


        var iterator = result.iterator();

        if (!iterator.hasNext()) {
            response.put("found", false);
            response.put("message", "Service not found");
            return response;
        }

        Record record = iterator.next();


        String criticality = record.getValue("criticality") == null
                ? "medium"
                : record.getValue("criticality").toString();

        int affectedCount = Integer.parseInt(
                record.getValue("affectedCount").toString()
        );

        int criticalityScore;

        switch (criticality.toLowerCase()) {
            case "high" -> criticalityScore = 60;
            case "medium" -> criticalityScore = 35;
            case "low" -> criticalityScore = 15;
            default -> criticalityScore = 35;
        }

        int impactScore = Math.min(affectedCount * 10, 40);
        int riskScore = Math.min(criticalityScore + impactScore, 100);

        String riskLevel;

        if (riskScore >= 70) {
            riskLevel = "HIGH";
        } else if (riskScore >= 40) {
            riskLevel = "MEDIUM";
        } else {
            riskLevel = "LOW";
        }

        response.put("found", true);
        response.put("criticality", criticality);
        response.put("affectedCount", affectedCount);
        response.put("criticalityScore", criticalityScore);
        response.put("impactScore", impactScore);
        response.put("riskScore", riskScore);
        response.put("riskLevel", riskLevel);

        return response;
    }


    @GetMapping("/api/graph/risks")
    public List<Map<String, Object>> getAllServiceRisks() {

        var result = graph.query(
                "MATCH (s:Service) " +
                        "OPTIONAL MATCH (affected:Service)-[:DEPENDS_ON*1..]->(s) " +
                        "RETURN s.name AS name, " +
                        "s.criticality AS criticality, " +
                        "count(DISTINCT affected) AS affectedCount"
        );

        List<Map<String, Object>> risks = new java.util.ArrayList<>();

        for (Record record : result) {

            String name = record.getValue("name").toString();

            String criticality = record.getValue("criticality") == null
                    ? "medium"
                    : record.getValue("criticality").toString();

            int affectedCount = Integer.parseInt(
                    record.getValue("affectedCount").toString()
            );

            int criticalityScore;

            switch (criticality.toLowerCase()) {
                case "high" -> criticalityScore = 60;
                case "medium" -> criticalityScore = 35;
                case "low" -> criticalityScore = 15;
                default -> criticalityScore = 35;
            }

            int impactScore = Math.min(affectedCount * 10, 40);
            int riskScore = Math.min(criticalityScore + impactScore, 100);

            String riskLevel;

            if (riskScore >= 70) {
                riskLevel = "HIGH";
            } else if (riskScore >= 40) {
                riskLevel = "MEDIUM";
            } else {
                riskLevel = "LOW";
            }

            Map<String, Object> risk = new LinkedHashMap<>();
            risk.put("service", name);
            risk.put("criticality", criticality);
            risk.put("affectedCount", affectedCount);
            risk.put("criticalityScore", criticalityScore);
            risk.put("impactScore", impactScore);
            risk.put("riskScore", riskScore);
            risk.put("riskLevel", riskLevel);

            risks.add(risk);
        }

        risks.sort((a, b) ->
                Integer.compare(
                        (Integer) b.get("riskScore"),
                        (Integer) a.get("riskScore")
                )
        );

        return risks;
    }

}

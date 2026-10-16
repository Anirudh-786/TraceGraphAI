
package com.tracegraphai.backend.controller;

import com.falkordb.Graph;
import com.falkordb.Record;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.util.LinkedHashMap;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
public class GraphController {

    private final Graph graph;

    public GraphController(Graph graph) {
        this.graph = graph;
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

}

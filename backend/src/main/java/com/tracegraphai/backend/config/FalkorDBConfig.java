
package com.tracegraphai.backend.config;

import com.falkordb.Driver;
import com.falkordb.FalkorDB;
import com.falkordb.Graph;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FalkorDBConfig {

    @Bean(destroyMethod = "close")
    public Driver falkorDBDriver(
            @Value("${falkordb.host}") String host,
            @Value("${falkordb.port}") int port) {
        return FalkorDB.driver(host, port);
    }

    @Bean
    public Graph traceGraph(
            Driver driver,
            @Value("${falkordb.graph}") String graphName) {
        return driver.graph(graphName);
    }
}


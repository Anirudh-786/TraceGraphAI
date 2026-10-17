package com.tracegraphai.backend.config;

import com.falkordb.Driver;
import com.falkordb.FalkorDB;
import com.falkordb.Graph;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.net.URI;

@Configuration
public class FalkorDBConfig {

    private static final Logger log = LoggerFactory.getLogger(FalkorDBConfig.class);

    @Bean(destroyMethod = "close")
    public Driver falkorDBDriver(
            @Value("${falkordb.url:}") String url,
            @Value("${falkordb.host:localhost}") String host,
            @Value("${falkordb.port:6379}") int port,
            @Value("${falkordb.username:}") String username,
            @Value("${falkordb.password:}") String password) {

        if (url != null && !url.isBlank()) {
            log.info("Connecting to FalkorDB via connection URI");
            return FalkorDB.driver(URI.create(url.trim()));
        }

        if (password != null && !password.isBlank()) {
            String user = (username != null && !username.isBlank()) ? username.trim() : "default";
            log.info("Connecting to FalkorDB at {}:{} with authentication as user '{}'", host, port, user);
            return FalkorDB.driver(host.trim(), port, user, password.trim());
        }

        log.info("Connecting to FalkorDB at {}:{} (unauthenticated local/docker)", host, port);
        return FalkorDB.driver(host.trim(), port);
    }

    @Bean
    public Graph traceGraph(
            Driver driver,
            @Value("${falkordb.graph:tracegraph}") String graphName) {
        log.info("Using FalkorDB graph: {}", graphName);
        return driver.graph(graphName);
    }
}

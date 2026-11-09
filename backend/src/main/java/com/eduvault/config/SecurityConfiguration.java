package com.eduvault.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfiguration {

    @Bean
    @Order(1)
    public SecurityFilterChain mcpSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .securityMatcher("/mcp", "/mcp/**", "/sse", "/sse/**")
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/mcp", "/mcp/**", "/sse", "/sse/**").authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> {})
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(401);
                    response.setContentType("application/json");
                    response.setHeader("WWW-Authenticate",
                            "Bearer realm=\"https://campusaxis.devs.surf\", " +
                            "authorization_uri=\"https://campusaxis.devs.surf/oauth2/authorize\", " +
                            "resource_metadata=\"https://campusaxis.devs.surf/.well-known/oauth-authorization-server\"");
                    response.getWriter().write("{\"error\":\"unauthorized\",\"authorization_uri\":\"https://campusaxis.devs.surf/oauth2/authorize\"}");
                })
            );

        return http.build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain defaultSecurityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/.well-known/**",
                    "/oauth2/**",
                    "/api/**",
                    "/health",
                    "/sitemap.xml",
                    "/robots.txt",
                    "/error",
                    "/static/**",
                    "/*.html",
                    "/*.js",
                    "/*.css",
                    "/*.png",
                    "/*.ico"
                ).permitAll()
                .anyRequest().permitAll()
            );

        return http.build();
    }
}


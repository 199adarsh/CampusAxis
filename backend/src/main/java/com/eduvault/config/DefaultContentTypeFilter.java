package com.eduvault.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.Set;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DefaultContentTypeFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        String contentType = request.getHeader("Content-Type");

        // If hitting /mcp or /oauth2/token without a Content-Type or text/plain, default to application/json
        if (path.startsWith("/mcp") || path.startsWith("/oauth2/token")) {
            if (contentType == null || contentType.trim().isEmpty() || contentType.contains("text/plain")) {
                HttpServletRequestWrapper mutatedRequest = new HttpServletRequestWrapper(request) {
                    @Override
                    public String getHeader(String name) {
                        if ("content-type".equalsIgnoreCase(name)) {
                            return "application/json";
                        }
                        return super.getHeader(name);
                    }

                    @Override
                    public Enumeration<String> getHeaders(String name) {
                        if ("content-type".equalsIgnoreCase(name)) {
                            return Collections.enumeration(Collections.singleton("application/json"));
                        }
                        return super.getHeaders(name);
                    }

                    @Override
                    public Enumeration<String> getHeaderNames() {
                        Set<String> set = new HashSet<>();
                        Enumeration<String> enumeration = super.getHeaderNames();
                        while (enumeration.hasMoreElements()) {
                            set.add(enumeration.nextElement());
                        }
                        set.add("Content-Type");
                        return Collections.enumeration(set);
                    }

                    @Override
                    public String getContentType() {
                        return "application/json";
                    }
                };
                filterChain.doFilter(mutatedRequest, response);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}

package com.eduvault.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SecurityHeadersFilter implements Filter {

    private static final Logger auditLogger = LoggerFactory.getLogger("SECURITY_AUDIT");
    private static final Map<String, RequestBucket> rateLimitMap = new ConcurrentHashMap<>();
    private static final int MAX_AUTH_REQUESTS_PER_MINUTE = 30;

    private static class RequestBucket {
        final AtomicInteger count = new AtomicInteger(0);
        volatile long resetTime = System.currentTimeMillis() + 60000;

        boolean allow() {
            long now = System.currentTimeMillis();
            if (now > resetTime) {
                synchronized (this) {
                    if (now > resetTime) {
                        count.set(0);
                        resetTime = now + 60000;
                    }
                }
            }
            return count.incrementAndGet() <= MAX_AUTH_REQUESTS_PER_MINUTE;
        }
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // 1. Mandatory Security Headers
        httpResponse.setHeader("X-Content-Type-Options", "nosniff");
        httpResponse.setHeader("X-Frame-Options", "DENY");
        httpResponse.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        httpResponse.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        httpResponse.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
        httpResponse.setHeader("Content-Security-Policy", "frame-ancestors 'none'; object-src 'none';");

        String path = httpRequest.getRequestURI();
        String clientIp = getClientIp(httpRequest);

        // 2. Rate limiting & Audit Logging on Authentication Endpoints
        if (path.startsWith("/api/portal/dashboard") || path.startsWith("/api/portal/faculty/login")) {
            RequestBucket bucket = rateLimitMap.computeIfAbsent(clientIp, k -> new RequestBucket());
            if (!bucket.allow()) {
                auditLogger.warn("SECURITY_RATE_LIMIT_EXCEEDED: IP={} Path={}", clientIp, path);
                httpResponse.setStatus(429);
                httpResponse.setContentType("application/json");
                httpResponse.getWriter().write("{\"error\":\"Too many requests. Please try again in one minute.\"}");
                return;
            }
            auditLogger.info("AUTH_ATTEMPT: IP={} Path={} Method={}", clientIp, path, httpRequest.getMethod());
        }

        chain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }
}


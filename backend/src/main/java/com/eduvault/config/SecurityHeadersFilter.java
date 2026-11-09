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
import java.util.concurrent.atomic.AtomicLong;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SecurityHeadersFilter implements Filter {

    private static final Logger auditLogger = LoggerFactory.getLogger("SECURITY_AUDIT");
    private static final Map<String, RequestBucket> rateLimitMap = new ConcurrentHashMap<>();

    public static final int MAX_MAP_CAPACITY = 5_000;
    private static final long SWEEP_INTERVAL_MS = 60_000; // 1 minute
    private static final AtomicLong lastSweepTimestamp = new AtomicLong(System.currentTimeMillis());

    public enum ApiTier {
        AUTH(30),
        AI(20),
        HEAVY_OPERATION(20),
        GENERAL(240);

        private final int maxRequestsPerMinute;

        ApiTier(int maxRequestsPerMinute) {
            this.maxRequestsPerMinute = maxRequestsPerMinute;
        }

        public int getMaxRequestsPerMinute() {
            return maxRequestsPerMinute;
        }
    }

    public static class RequestBucket {
        private final AtomicInteger count = new AtomicInteger(0);
        private volatile long resetTime;
        private final int limit;

        public RequestBucket(int limit) {
            this.limit = limit;
            this.resetTime = System.currentTimeMillis() + 60000;
        }

        public long getResetTime() {
            return resetTime;
        }

        public int getLimit() {
            return limit;
        }

        public int getCount() {
            return count.get();
        }

        public boolean allow() {
            long now = System.currentTimeMillis();
            if (now > resetTime) {
                synchronized (this) {
                    if (now > resetTime) {
                        count.set(0);
                        resetTime = now + 60000;
                    }
                }
            }
            return count.incrementAndGet() <= limit;
        }
    }

    public static ApiTier resolveTier(String path) {
        if (path == null) {
            return ApiTier.GENERAL;
        }
        if (path.startsWith("/api/portal/dashboard") || path.startsWith("/api/portal/faculty/login") || path.startsWith("/api/portal/admin/login")) {
            return ApiTier.AUTH;
        }
        if (path.startsWith("/api/ai")) {
            return ApiTier.AI;
        }
        if (path.startsWith("/api/notes/upload") || path.startsWith("/api/notes/sync-b2") || path.startsWith("/api/notes/repair") || path.startsWith("/api/batch")) {
            return ApiTier.HEAVY_OPERATION;
        }
        return ApiTier.GENERAL;
    }

    public static void sweepEviction(long now) {
        rateLimitMap.entrySet().removeIf(e -> now > e.getValue().getResetTime());
        if (rateLimitMap.size() > MAX_MAP_CAPACITY) {
            int toRemove = rateLimitMap.size() - MAX_MAP_CAPACITY;
            var it = rateLimitMap.keySet().iterator();
            while (it.hasNext() && toRemove-- > 0) {
                it.next();
                it.remove();
            }
        }
    }

    private static void performSweepIfNeeded() {
        long now = System.currentTimeMillis();
        long last = lastSweepTimestamp.get();
        if (now - last > SWEEP_INTERVAL_MS || rateLimitMap.size() >= MAX_MAP_CAPACITY) {
            if (lastSweepTimestamp.compareAndSet(last, now)) {
                sweepEviction(now);
            }
        }
    }

    public static void clearRateLimitMap() {
        rateLimitMap.clear();
        lastSweepTimestamp.set(System.currentTimeMillis());
    }

    public static int getRateLimitMapSize() {
        return rateLimitMap.size();
    }

    public static Map<String, RequestBucket> getRateLimitMap() {
        return rateLimitMap;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // 1. Mandatory Security Headers
        httpResponse.setHeader("X-Content-Type-Options", "nosniff");
        httpResponse.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        httpResponse.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        httpResponse.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");

        String requestUri = httpRequest.getRequestURI();
        boolean isOAuthFlow = requestUri != null && (requestUri.startsWith("/oauth2/") || requestUri.startsWith("/oauth-login.html"));
        if (isOAuthFlow) {
            httpResponse.setHeader("Content-Security-Policy", "frame-ancestors 'self' https://platform.openai.com https://chatgpt.com; object-src 'none';");
        } else {
            httpResponse.setHeader("X-Frame-Options", "DENY");
            httpResponse.setHeader("Content-Security-Policy", "frame-ancestors 'none'; object-src 'none';");
        }

        // Bypass rate limiting on HTTP OPTIONS preflight requests
        if ("OPTIONS".equalsIgnoreCase(httpRequest.getMethod())) {
            chain.doFilter(request, response);
            return;
        }

        String path = httpRequest.getRequestURI();
        if (path == null || !path.startsWith("/api")) {
            chain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(httpRequest);
        ApiTier tier = resolveTier(path);
        String bucketKey = clientIp + ":" + tier.name();

        performSweepIfNeeded();

        RequestBucket bucket = rateLimitMap.computeIfAbsent(bucketKey, k -> new RequestBucket(tier.getMaxRequestsPerMinute()));
        if (!bucket.allow()) {
            auditLogger.warn("SECURITY_RATE_LIMIT_EXCEEDED: IP={} Tier={} Path={}", clientIp, tier.name(), path);
            httpResponse.setStatus(429);
            httpResponse.setContentType("application/json");
            httpResponse.getWriter().write("{\"error\":\"Too many requests. Please try again in one minute.\"}");
            return;
        }

        if (tier == ApiTier.AUTH) {
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



package com.eduvault.performance;

import com.eduvault.config.SecurityHeadersFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Performance verification tests for H-7 and M-2:
 * H-7: Strict rate limiting on authentication and sensitive endpoints.
 * M-2: Bounded rateLimitMap eviction preventing memory leak / heap growth.
 */
public class RateLimiterEvictionPerformanceTest {

    private SecurityHeadersFilter filter;
    private Map<String, Object> rateLimitMap;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() throws Exception {
        filter = new SecurityHeadersFilter();
        Field mapField = SecurityHeadersFilter.class.getDeclaredField("rateLimitMap");
        mapField.setAccessible(true);
        rateLimitMap = (Map<String, Object>) mapField.get(null);
        rateLimitMap.clear();
    }

    @AfterEach
    void tearDown() {
        if (rateLimitMap != null) {
            rateLimitMap.clear();
        }
    }

    @Test
    @DisplayName("H-7: Mandatory security headers are applied to every response")
    void testSecurityHeadersApplied() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/notes");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals("nosniff", response.getHeader("X-Content-Type-Options"));
        assertEquals("DENY", response.getHeader("X-Frame-Options"));
        assertEquals("max-age=31536000; includeSubDomains", response.getHeader("Strict-Transport-Security"));
        assertEquals("strict-origin-when-cross-origin", response.getHeader("Referrer-Policy"));
        assertEquals("geolocation=(), camera=(), microphone=()", response.getHeader("Permissions-Policy"));
        assertEquals("frame-ancestors 'none'; object-src 'none';", response.getHeader("Content-Security-Policy"));
    }

    @Test
    @DisplayName("H-7: Sensitive auth endpoint allows exactly 30 requests per minute from same IP")
    void testAuthEndpointRateLimitingWithinThreshold() throws ServletException, IOException {
        String clientIp = "192.168.1.100";

        for (int i = 1; i <= 30; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/portal/faculty/login");
            request.setRemoteAddr(clientIp);
            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();

            filter.doFilter(request, response, chain);

            assertEquals(HttpServletResponse.SC_OK, response.getStatus(), "Request #" + i + " should succeed");
        }
    }

    @Test
    @DisplayName("H-7: 31st request from same IP returns 429 Too Many Requests with JSON error")
    void testAuthEndpointRejects31stRequestWith429() throws ServletException, IOException {
        String clientIp = "192.168.1.101";

        // Consume all 30 permits
        for (int i = 1; i <= 30; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/portal/dashboard/stats");
            request.setRemoteAddr(clientIp);
            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();
            filter.doFilter(request, response, chain);
        }

        // 31st request must trigger 429
        MockHttpServletRequest blockedRequest = new MockHttpServletRequest("POST", "/api/portal/dashboard/stats");
        blockedRequest.setRemoteAddr(clientIp);
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        AtomicInteger chainInvocationCount = new AtomicInteger(0);

        FilterChain chain = (req, res) -> chainInvocationCount.incrementAndGet();

        filter.doFilter(blockedRequest, blockedResponse, chain);

        assertEquals(429, blockedResponse.getStatus());
        assertEquals("application/json", blockedResponse.getContentType());
        assertTrue(blockedResponse.getContentAsString().contains("Too many requests"));
        assertEquals(0, chainInvocationCount.get(), "Chain must not be invoked when rate limit is exceeded");
    }

    @Test
    @DisplayName("H-7: Distinct client IPs maintain independent rate limit quotas")
    void testIndependentClientIpBuckets() throws ServletException, IOException {
        String blockedIp = "10.0.0.1";
        String allowedIp = "10.0.0.2";

        // Exhaust IP 1
        for (int i = 1; i <= 30; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/portal/dashboard");
            request.setRemoteAddr(blockedIp);
            filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
        }

        // IP 1 blocked
        MockHttpServletRequest req1 = new MockHttpServletRequest("GET", "/api/portal/dashboard");
        req1.setRemoteAddr(blockedIp);
        MockHttpServletResponse res1 = new MockHttpServletResponse();
        filter.doFilter(req1, res1, new MockFilterChain());
        assertEquals(429, res1.getStatus());

        // IP 2 must still be allowed
        MockHttpServletRequest req2 = new MockHttpServletRequest("GET", "/api/portal/dashboard");
        req2.setRemoteAddr(allowedIp);
        MockHttpServletResponse res2 = new MockHttpServletResponse();
        filter.doFilter(req2, res2, new MockFilterChain());
        assertEquals(HttpServletResponse.SC_OK, res2.getStatus());
    }

    @Test
    @DisplayName("H-7: Client IP extracted from X-Forwarded-For header when present")
    void testClientIpResolutionFromXForwardedFor() throws ServletException, IOException {
        String proxiedIp = "203.0.113.195";

        for (int i = 1; i <= 30; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/portal/faculty/login");
            request.addHeader("X-Forwarded-For", proxiedIp + ", 10.0.0.1, 127.0.0.1");
            request.setRemoteAddr("10.0.0.1");
            filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
        }

        // Next request from proxied IP should be blocked
        MockHttpServletRequest nextReq = new MockHttpServletRequest("POST", "/api/portal/faculty/login");
        nextReq.addHeader("X-Forwarded-For", proxiedIp + ", 10.0.0.1");
        nextReq.setRemoteAddr("10.0.0.1");
        MockHttpServletResponse nextRes = new MockHttpServletResponse();
        filter.doFilter(nextReq, nextRes, new MockFilterChain());

        assertEquals(429, nextRes.getStatus());
    }

    @Test
    @DisplayName("M-2: Stale bucket eviction triggers when rateLimitMap size exceeds 5000 entries")
    void testRateLimitMapEvictionAbove5000Entries() throws Exception {
        Class<?> bucketClass = Class.forName("com.eduvault.config.SecurityHeadersFilter$RequestBucket");
        Constructor<?> constructor = bucketClass.getDeclaredConstructor(int.class);
        constructor.setAccessible(true);
        Field resetTimeField = bucketClass.getDeclaredField("resetTime");
        resetTimeField.setAccessible(true);

        long now = System.currentTimeMillis();

        // Populate 5005 entries: 5000 expired (past resetTime), 5 still active
        for (int i = 0; i < 5000; i++) {
            Object bucket = constructor.newInstance(30);
            resetTimeField.set(bucket, now - 10000); // 10 seconds in the past
            rateLimitMap.put("expired-ip-" + i, bucket);
        }

        for (int i = 0; i < 5; i++) {
            Object bucket = constructor.newInstance(30);
            resetTimeField.set(bucket, now + 50000); // in the future
            rateLimitMap.put("active-ip-" + i, bucket);
        }

        assertEquals(5005, rateLimitMap.size(), "Initial map size must exceed 5000 before request");

        // Trigger request to /api/portal/dashboard to invoke the eviction sweep
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/portal/dashboard");
        request.setRemoteAddr("trigger-ip");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());

        // CRITICAL M-2 ASSERTION: All 5000 expired entries must be pruned, leaving only active entries
        assertTrue(rateLimitMap.size() <= 10, "Stale entries must be evicted when map exceeds 5000; actual size: " + rateLimitMap.size());
        assertTrue(rateLimitMap.containsKey("active-ip-0"), "Active unexpired entry should remain");
        assertFalse(rateLimitMap.containsKey("expired-ip-0"), "Expired entry must be evicted");
    }

    @Test
    @DisplayName("M-2: Concurrent requests from multiple threads maintain thread safety without data corruption")
    void testConcurrentRateLimitingThreadSafety() throws Exception {
        int threadCount = 10;
        int requestsPerThread = 5;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        String sharedIp = "198.51.100.42";

        for (int t = 0; t < threadCount; t++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    for (int r = 0; r < requestsPerThread; r++) {
                        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/portal/faculty/login");
                        req.setRemoteAddr(sharedIp);
                        MockHttpServletResponse res = new MockHttpServletResponse();
                        filter.doFilter(req, res, new MockFilterChain());
                        if (res.getStatus() == 200) {
                            successCount.incrementAndGet();
                        } else if (res.getStatus() == 429) {
                            rejectedCount.incrementAndGet();
                        }
                    }
                } catch (Exception e) {
                    fail("Exception in concurrent request: " + e.getMessage());
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        assertTrue(doneLatch.await(10, TimeUnit.SECONDS), "Concurrent test must complete within 10 seconds");
        executor.shutdown();

        // Out of 50 total requests, exactly 30 must succeed and 20 must be rejected
        assertEquals(30, successCount.get(), "Exactly 30 requests should be permitted");
        assertEquals(20, rejectedCount.get(), "Remaining 20 requests should receive 429 status");
    }
}

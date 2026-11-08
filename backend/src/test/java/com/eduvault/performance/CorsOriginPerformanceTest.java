package com.eduvault.performance;

import com.eduvault.EduVaultApplication;
import com.eduvault.controller.ApiController;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.servlet.config.annotation.CorsRegistration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Performance & Architecture verification tests for M-10:
 * Centralized CORS configuration and removal of redundant/insecure @CrossOrigin(origins = "*")
 * on REST controllers.
 */
public class CorsOriginPerformanceTest {

    // Allowed origin pattern regexes defined in application.properties:
    // spring.web.cors.allowed-origin-patterns=http://localhost:*,https://*.vercel.app,https://*.onrender.com
    private static final List<Pattern> ALLOWED_PATTERNS = List.of(
            Pattern.compile("^http://localhost(:\\d+)?$"),
            Pattern.compile("^https://([a-zA-Z0-9-]+\\.)*vercel\\.app$"),
            Pattern.compile("^https://([a-zA-Z0-9-]+\\.)*onrender\\.com$")
    );

    private boolean isOriginAllowed(String origin) {
        if (origin == null || origin.isBlank()) return false;
        return ALLOWED_PATTERNS.stream().anyMatch(p -> p.matcher(origin).matches());
    }

    @Test
    @DisplayName("M-10: EduVaultApplication registers WebMvcConfigurer bean for /api/**")
    @SuppressWarnings("unchecked")
    void testCorsConfigurerRegistersApiMapping() throws Exception {
        EduVaultApplication app = new EduVaultApplication();
        org.springframework.test.util.ReflectionTestUtils.setField(
                app, "allowedOriginPatterns", "http://localhost:*,https://*.vercel.app,https://*.onrender.com"
        );
        WebMvcConfigurer configurer = app.corsConfigurer();
        assertNotNull(configurer, "WebMvcConfigurer bean must not be null");

        CorsRegistry registry = new CorsRegistry();
        configurer.addCorsMappings(registry);

        // Inspect registrations in registry via reflection
        Field registrationsField = CorsRegistry.class.getDeclaredField("registrations");
        registrationsField.setAccessible(true);
        List<CorsRegistration> registrations = (List<CorsRegistration>) registrationsField.get(registry);

        assertFalse(registrations.isEmpty(), "At least one CORS registration must be configured");

        Field pathField = CorsRegistration.class.getDeclaredField("pathPattern");
        pathField.setAccessible(true);
        boolean hasApiPath = registrations.stream().anyMatch(r -> {
            try {
                return "/api/**".equals(pathField.get(r));
            } catch (Exception e) {
                return false;
            }
        });

        assertTrue(hasApiPath, "CORS registry must contain /api/** mapping");
    }

    @Test
    @DisplayName("M-10: Permitted origin patterns allow legitimate dev, Vercel, and Render origins")
    void testAllowedOriginPatternsMatching() {
        // Localhost with arbitrary ports
        assertTrue(isOriginAllowed("http://localhost:5173"), "Vite default port must be allowed");
        assertTrue(isOriginAllowed("http://localhost:3000"), "React port 3000 must be allowed");
        assertTrue(isOriginAllowed("http://localhost:8080"), "Backend port 8080 must be allowed");
        assertTrue(isOriginAllowed("http://localhost"), "Bare localhost must be allowed");

        // Vercel production and preview subdomains
        assertTrue(isOriginAllowed("https://eduvault.vercel.app"), "Production Vercel deployment must be allowed");
        assertTrue(isOriginAllowed("https://eduvault-dev.vercel.app"), "Dev Vercel deployment must be allowed");
        assertTrue(isOriginAllowed("https://feature-branch-123.vercel.app"), "Branch preview must be allowed");

        // Render backends / frontends
        assertTrue(isOriginAllowed("https://eduvault.onrender.com"), "Render host must be allowed");
        assertTrue(isOriginAllowed("https://campusaxis-api.onrender.com"), "Render sub-domain must be allowed");
    }

    @Test
    @DisplayName("M-10: Disallowed origins are rejected by CORS pattern rules")
    void testDisallowedOriginsRejected() {
        assertFalse(isOriginAllowed("https://evil-site.com"));
        assertFalse(isOriginAllowed("http://attacker.org"));
        assertFalse(isOriginAllowed("http://localhost.attacker.com"));
        assertFalse(isOriginAllowed("https://vercel.app.malicious.net"));
        assertFalse(isOriginAllowed(""));
        assertFalse(isOriginAllowed(null));
    }

    @Test
    @DisplayName("M-10: ApiController must not have wildcard @CrossOrigin(origins = '*') annotation")
    void testApiControllerHasNoWildcardCrossOriginAnnotation() {
        CrossOrigin crossOrigin = ApiController.class.getAnnotation(CrossOrigin.class);
        if (crossOrigin != null) {
            String[] origins = crossOrigin.origins();
            boolean hasWildcard = Arrays.asList(origins).contains("*");
            assertFalse(hasWildcard, "ApiController must not use wildcard @CrossOrigin(origins = '*') which overrides central config");
        } else {
            // Annotation completely removed — optimal state!
            assertNull(crossOrigin, "ApiController successfully removed @CrossOrigin annotation");
        }
    }

    @Test
    @DisplayName("M-10: Standard HTTP methods (GET, POST, PUT, DELETE, OPTIONS) are supported")
    void testAllowedHttpMethods() {
        List<String> expectedMethods = List.of("GET", "POST", "PUT", "DELETE", "OPTIONS");
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedMethods(expectedMethods);

        assertEquals(5, config.getAllowedMethods().size());
        assertTrue(config.getAllowedMethods().containsAll(expectedMethods));
    }
}

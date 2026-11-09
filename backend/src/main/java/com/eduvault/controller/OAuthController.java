package com.eduvault.controller;

import com.eduvault.security.OAuthTokenKeyManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
public class OAuthController {

    private final OAuthTokenKeyManager tokenKeyManager;

    @Value("${app.oauth.base-url:https://campusaxis.devs.surf}")
    private String baseUrl;

    private static final Map<String, AuthCodeRecord> AUTHORIZATION_CODES = new ConcurrentHashMap<>();

    public record AuthCodeRecord(
            String prn,
            String role,
            String department,
            Integer semester,
            List<String> enrolledSubjects,
            String codeChallenge,
            String codeChallengeMethod,
            String redirectUri,
            String clientId,
            long expiresAt
    ) {}

    public OAuthController(OAuthTokenKeyManager tokenKeyManager) {
        this.tokenKeyManager = tokenKeyManager;
    }

    @GetMapping("/oauth2/jwks")
    public ResponseEntity<Map<String, Object>> getJwks() {
        return ResponseEntity.ok(tokenKeyManager.getJwks().toJSONObject());
    }

    @GetMapping("/oauth2/authorize")
    public ResponseEntity<?> authorize(
            @RequestParam("response_type") String responseType,
            @RequestParam("client_id") String clientId,
            @RequestParam("redirect_uri") String redirectUri,
            @RequestParam(value = "scope", required = false, defaultValue = "openid student") String scope,
            @RequestParam("state") String state,
            @RequestParam(value = "code_challenge", required = false) String codeChallenge,
            @RequestParam(value = "code_challenge_method", required = false, defaultValue = "S256") String codeChallengeMethod
    ) {
        if (!"code".equals(responseType)) {
            return ResponseEntity.badRequest().body(Map.of("error", "unsupported_response_type"));
        }

        // Redirect user to the clean CampusAxis OAuth Login UI (absolute URL required by OAuth spec)
        String loginPageUrl = baseUrl + "/oauth-login.html?" +
                "client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8) +
                "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8) +
                "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8) +
                (codeChallenge != null ? "&code_challenge=" + URLEncoder.encode(codeChallenge, StandardCharsets.UTF_8) : "") +
                (codeChallengeMethod != null ? "&code_challenge_method=" + URLEncoder.encode(codeChallengeMethod, StandardCharsets.UTF_8) : "");

        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(loginPageUrl)).build();
    }

    @PostMapping(value = "/oauth2/authorize/submit", consumes = "application/x-www-form-urlencoded")
    public ResponseEntity<?> authorizeSubmit(
            @RequestParam("client_id") String clientId,
            @RequestParam("redirect_uri") String redirectUri,
            @RequestParam("state") String state,
            @RequestParam("prn") String prn,
            @RequestParam(value = "dob", required = false) String dob,
            @RequestParam(value = "code_challenge", required = false) String codeChallenge,
            @RequestParam(value = "code_challenge_method", required = false, defaultValue = "S256") String codeChallengeMethod
    ) {
        String studentPrn = prn.trim().toUpperCase();
        String role = studentPrn.startsWith("TCHR") ? "TEACHER" : "STUDENT";
        String department = studentPrn.contains("AD") ? "B.Tech-UAD" : "CSE";
        int semester = 5;

        String code = UUID.randomUUID().toString().replace("-", "");
        AUTHORIZATION_CODES.put(code, new AuthCodeRecord(
                studentPrn,
                role,
                department,
                semester,
                List.of(),
                codeChallenge,
                codeChallengeMethod,
                redirectUri,
                clientId,
                System.currentTimeMillis() + 300_000
        ));

        // Accept OpenAI's CIMD client_id (https://chatgpt.com/oauth/client.json) and its redirect URIs
        String effectiveRedirectUri = (redirectUri != null && !redirectUri.isBlank())
                ? redirectUri.trim()
                : "https://chatgpt.com/connector_platform_oauth_redirect";

        String targetUrl = effectiveRedirectUri + (effectiveRedirectUri.contains("?") ? "&" : "?") +
                "code=" + URLEncoder.encode(code, StandardCharsets.UTF_8) +
                "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8) +
                "&iss=" + URLEncoder.encode(baseUrl, StandardCharsets.UTF_8);

        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(targetUrl)).build();
    }

    @PostMapping(value = "/oauth2/token")
    public ResponseEntity<?> token(
            jakarta.servlet.http.HttpServletRequest httpRequest,
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        // Read from form params first, then try JSON body
        String paramGrantType = httpRequest.getParameter("grant_type");
        String paramCode = httpRequest.getParameter("code");
        String paramRedirectUri = httpRequest.getParameter("redirect_uri");
        String paramClientId = httpRequest.getParameter("client_id");
        String paramClientSecret = httpRequest.getParameter("client_secret");
        String paramCodeVerifier = httpRequest.getParameter("code_verifier");

        Map<String, Object> body = null;
        String ct = httpRequest.getContentType();
        if (ct != null && ct.contains("application/json")) {
            try {
                String rawBody = new String(httpRequest.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                if (rawBody != null && !rawBody.isBlank()) {
                    body = new com.fasterxml.jackson.databind.ObjectMapper().readValue(rawBody, Map.class);
                }
            } catch (Exception ignored) {}
        }

        String grantType = (paramGrantType != null && !paramGrantType.isBlank()) 
                ? paramGrantType 
                : (body != null && body.get("grant_type") != null ? String.valueOf(body.get("grant_type")) : null);
        String code = (paramCode != null && !paramCode.isBlank()) 
                ? paramCode 
                : (body != null && body.get("code") != null ? String.valueOf(body.get("code")) : null);
        String codeVerifier = (paramCodeVerifier != null && !paramCodeVerifier.isBlank()) 
                ? paramCodeVerifier 
                : (body != null && body.get("code_verifier") != null ? String.valueOf(body.get("code_verifier")) : null);

        if (grantType == null || (!"authorization_code".equals(grantType) && !"refresh_token".equals(grantType))) {
            return ResponseEntity.badRequest().body(Map.of("error", "unsupported_grant_type"));
        }

        if (code == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "invalid_request", "error_description", "code is missing"));
        }

        AuthCodeRecord record = AUTHORIZATION_CODES.remove(code);
        if (record == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "invalid_grant",
                    "error_description", "Invalid or expired authorization code"
            ));
        }

        // PKCE verification if challenge was provided during authorization
        if (record.codeChallenge() != null && !record.codeChallenge().isBlank()) {
            if (codeVerifier != null && !codeVerifier.isBlank()) {
                if (!verifyCodeChallenge(codeVerifier, record.codeChallenge(), record.codeChallengeMethod())) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                            "error", "invalid_grant",
                            "error_description", "PKCE code_verifier verification failed"
                    ));
                }
            }
        }

        String accessToken = tokenKeyManager.issueAccessToken(
                baseUrl,
                record.prn(),
                record.role(),
                record.department(),
                record.semester(),
                record.enrolledSubjects()
        );

        Map<String, Object> tokenResponse = new HashMap<>();
        tokenResponse.put("access_token", accessToken);
        tokenResponse.put("token_type", "Bearer");
        tokenResponse.put("expires_in", 86400);
        tokenResponse.put("refresh_token", UUID.randomUUID().toString().replace("-", ""));
        tokenResponse.put("scope", "openid student");

        return ResponseEntity.ok()
                .header("Cache-Control", "no-store")
                .header("Pragma", "no-cache")
                .body(tokenResponse);
    }

    private boolean verifyCodeChallenge(String verifier, String challenge, String method) {
        try {
            if ("S256".equalsIgnoreCase(method)) {
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                byte[] hash = digest.digest(verifier.getBytes(StandardCharsets.US_ASCII));
                String computed = Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
                return computed.equals(challenge);
            }
            return verifier.equals(challenge);
        } catch (Exception e) {
            return false;
        }
    }
}


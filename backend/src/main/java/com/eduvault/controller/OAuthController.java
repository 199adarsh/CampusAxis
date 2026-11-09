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

        // Redirect user to the clean CampusAxis OAuth Login UI
        String loginPageUrl = "/oauth-login.html?" +
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

        // If redirectUri from client is missing or default, allow the ChatGPT connector callback
        String effectiveRedirectUri = (redirectUri != null && !redirectUri.isBlank()) 
                ? redirectUri.trim() 
                : "https://chatgpt.com/connector/oauth/QmfazbMYHYuz";

        String targetUrl = effectiveRedirectUri + (effectiveRedirectUri.contains("?") ? "&" : "?") +
                "code=" + URLEncoder.encode(code, StandardCharsets.UTF_8) +
                "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8);

        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(targetUrl)).build();
    }

    @PostMapping(value = "/oauth2/token", consumes = "application/x-www-form-urlencoded")
    public ResponseEntity<?> token(
            @RequestParam("grant_type") String grantType,
            @RequestParam("code") String code,
            @RequestParam("redirect_uri") String redirectUri,
            @RequestParam(value = "client_id", required = false) String clientId,
            @RequestParam(value = "code_verifier", required = false) String codeVerifier
    ) {
        if (!"authorization_code".equals(grantType)) {
            return ResponseEntity.badRequest().body(Map.of("error", "unsupported_grant_type"));
        }

        AuthCodeRecord record = AUTHORIZATION_CODES.remove(code);
        if (record == null || record.expiresAt() < System.currentTimeMillis()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "invalid_grant"));
        }

        if (record.codeChallenge() != null) {
            if (codeVerifier == null || !verifyCodeChallenge(codeVerifier, record.codeChallenge(), record.codeChallengeMethod())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "invalid_grant", "error_description", "PKCE verification failed"));
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

        return ResponseEntity.ok(Map.of(
                "access_token", accessToken,
                "token_type", "Bearer",
                "expires_in", 3600,
                "scope", "openid student"
        ));
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


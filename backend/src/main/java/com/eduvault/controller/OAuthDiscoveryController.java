package com.eduvault.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class OAuthDiscoveryController {

    @Value("${app.oauth.base-url:https://campusaxis.devs.surf}")
    private String baseUrl;

    @Value("${openai.apps.challenge-token:}")
    private String challengeToken;

    @GetMapping("/.well-known/oauth-authorization-server")
    public ResponseEntity<Map<String, Object>> oauthAuthorizationServer() {
        return ResponseEntity.ok(Map.of(
                "issuer", baseUrl,
                "authorization_endpoint", baseUrl + "/oauth2/authorize",
                "token_endpoint", baseUrl + "/oauth2/token",
                "jwks_uri", baseUrl + "/oauth2/jwks",
                "response_types_supported", List.of("code"),
                "grant_types_supported", List.of("authorization_code", "refresh_token"),
                "code_challenge_methods_supported", List.of("S256"),
                "token_endpoint_auth_methods_supported", List.of("none", "client_secret_post", "client_secret_basic")
        ));
    }

    @GetMapping("/.well-known/openid-configuration")
    public ResponseEntity<Map<String, Object>> openidConfiguration() {
        return oauthAuthorizationServer();
    }

    @GetMapping("/.well-known/openai-apps-challenge")
    public ResponseEntity<String> openaiChallenge() {
        return ResponseEntity.ok(challengeToken.isBlank() ? "pending-verification" : challengeToken);
    }
}


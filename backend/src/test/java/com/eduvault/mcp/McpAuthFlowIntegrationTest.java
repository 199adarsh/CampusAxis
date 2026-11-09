package com.eduvault.mcp;

import com.eduvault.security.OAuthTokenKeyManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "app.b2.access-key-id=test-access-key",
        "app.b2.secret-access-key=test-secret-key",
        "app.b2.bucket-name=test-bucket",
        "app.b2.endpoint=https://s3.ca-east-006.backblazeb2.com",
        "app.b2.region=ca-east-006"
})
@AutoConfigureMockMvc
class McpAuthFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private OAuthTokenKeyManager tokenKeyManager;

    private String validStudentToken;
    private String validTeacherToken;

    @BeforeEach
    void setUp() {
        validStudentToken = tokenKeyManager.issueAccessToken(
                "https://campusaxis.devs.surf",
                "24UAD019",
                "STUDENT",
                "AIDS",
                4,
                List.of("sub-cs-301", "sub-math-201")
        );

        validTeacherToken = tokenKeyManager.issueAccessToken(
                "https://campusaxis.devs.surf",
                "TCHR-CSE-001",
                "TEACHER",
                "CSE",
                4,
                List.of()
        );
    }

    @Test
    void testOAuthDiscoveryEndpointIsPublic() throws Exception {
        mockMvc.perform(get("/.well-known/oauth-authorization-server"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.issuer").value("https://campusaxis.devs.surf"))
                .andExpect(jsonPath("$.token_endpoint").value("https://campusaxis.devs.surf/oauth2/token"));
    }

    @Test
    void testJwksEndpointIsPublic() throws Exception {
        mockMvc.perform(get("/oauth2/jwks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.keys").isArray());
    }

    @Test
    void testUnauthenticatedMcpRequestIsRejected() throws Exception {
        mockMvc.perform(post("/mcp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testValidStudentTokenIsAcceptedOnMcp() throws Exception {
        mockMvc.perform(post("/mcp")
                        .header("Authorization", "Bearer " + validStudentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    // Must be authenticated (200 or accepted protocol status, NOT 401/403)
                    org.junit.jupiter.api.Assertions.assertNotEquals(401, status);
                    org.junit.jupiter.api.Assertions.assertNotEquals(403, status);
                });
    }

    @Test
    void testInvalidTokenIsRejectedOnMcp() throws Exception {
        mockMvc.perform(post("/mcp")
                        .header("Authorization", "Bearer invalid-tampered-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}"))
                .andExpect(status().isUnauthorized());
    }
}


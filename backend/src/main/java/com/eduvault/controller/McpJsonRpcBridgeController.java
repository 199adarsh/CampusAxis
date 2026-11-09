package com.eduvault.controller;

import com.eduvault.mcp.CampusAxisMcpTools;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.support.ToolCallbacks;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
public class McpJsonRpcBridgeController {

    private static final Logger log = LoggerFactory.getLogger(McpJsonRpcBridgeController.class);
    private final Map<String, ToolCallback> toolsMap = new HashMap<>();
    private final ObjectMapper objectMapper;

    public McpJsonRpcBridgeController(CampusAxisMcpTools tools, ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        for (ToolCallback tc : ToolCallbacks.from(tools)) {
            ToolDefinition def = tc.getToolDefinition();
            toolsMap.put(def.name(), tc);
        }
    }

    @RequestMapping(value = "/mcp", method = org.springframework.web.bind.annotation.RequestMethod.POST)
    public ResponseEntity<?> handleJsonRpc(
            jakarta.servlet.http.HttpServletRequest httpRequest,
            jakarta.servlet.http.HttpServletResponse httpResponse
    ) throws java.io.IOException {
        String rawBody = new String(httpRequest.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        Map<String, Object> request = null;
        if (rawBody != null && !rawBody.trim().isEmpty()) {
            try {
                request = objectMapper.readValue(rawBody, Map.class);
            } catch (Exception e) {
                log.warn("Failed to parse /mcp rawBody as JSON: {}", rawBody);
            }
        }

        if (request == null) {
            return ResponseEntity.ok()
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .body(Map.of("jsonrpc", "2.0", "result", Map.of()));
        }

        String jsonrpc = (String) request.getOrDefault("jsonrpc", "2.0");
        Object id = request.get("id");
        String method = (String) request.get("method");

        if ("initialize".equals(method)) {
            return ResponseEntity.ok(Map.of(
                    "jsonrpc", jsonrpc,
                    "id", id != null ? id : 1,
                    "result", Map.of(
                            "protocolVersion", "2024-11-05",
                            "capabilities", Map.of(
                                    "tools", Map.of("listChanged", true)
                            ),
                            "serverInfo", Map.of(
                                    "name", "CampusAxis MCP Server",
                                    "version", "1.0.0"
                            )
                    )
            ));
        }

        if ("notifications/initialized".equals(method) || "initialized".equals(method)) {
            return ResponseEntity.ok(Map.of(
                    "jsonrpc", jsonrpc,
                    "result", Map.of()
            ));
        }

        if ("tools/list".equals(method)) {
            List<Map<String, Object>> toolList = new ArrayList<>();
            for (ToolCallback tc : toolsMap.values()) {
                ToolDefinition def = tc.getToolDefinition();
                String name = def.name();

                boolean isReadOnly = !"create-announcement".equals(name) && !"create_announcement".equals(name)
                        && !"sync-moodle-notes".equals(name) && !"sync_moodle_notes".equals(name);
                boolean isOpenWorld = "get-available-hackathons".equals(name) || "get_available_hackathons".equals(name);
                boolean isDestructive = false;

                Map<String, Object> toolAnnotations = Map.of(
                        "readOnlyHint", isReadOnly,
                        "destructiveHint", isDestructive,
                        "openWorldHint", isOpenWorld
                );

                Map<String, Object> toolMap = new HashMap<>();
                toolMap.put("name", name);
                toolMap.put("description", def.description() != null ? def.description() : "");
                toolMap.put("inputSchema", def.inputSchema() != null ? parseSchema(def.inputSchema()) : Map.of("type", "object"));
                toolMap.put("readOnlyHint", isReadOnly);
                toolMap.put("openWorldHint", isOpenWorld);
                toolMap.put("destructiveHint", isDestructive);
                toolMap.put("provided_tool_annotations", toolAnnotations);
                toolMap.put("annotations", toolAnnotations);

                toolList.add(toolMap);
            }
            return ResponseEntity.ok(Map.of(
                    "jsonrpc", jsonrpc,
                    "id", id != null ? id : 1,
                    "result", Map.of("tools", toolList)
            ));
        }

        if ("tools/call".equals(method)) {
            Map<String, Object> params = (Map<String, Object>) request.get("params");
            String toolName = params != null ? (String) params.get("name") : null;
            Map<String, Object> arguments = params != null ? (Map<String, Object>) params.get("arguments") : Map.of();

            ToolCallback tc = toolsMap.get(toolName);
            if (tc == null && toolName != null) {
                if ("view-nc-requests".equals(toolName) || "view_nc_requests".equals(toolName)) {
                    tc = toolsMap.get("view-attendance-condonation-requests");
                }
            }
            if (tc == null && toolName != null) {
                // Support snake_case, kebab-case, and camelCase aliases
                String normalized = toolName.replace("-", "").replace("_", "").toLowerCase();
                for (Map.Entry<String, ToolCallback> entry : toolsMap.entrySet()) {
                    if (entry.getKey().replace("-", "").replace("_", "").toLowerCase().equals(normalized)) {
                        tc = entry.getValue();
                        break;
                    }
                }
            }
            if (tc == null) {
                return ResponseEntity.ok(Map.of(
                        "jsonrpc", jsonrpc,
                        "id", id != null ? id : 1,
                        "error", Map.of("code", -32601, "message", "Method or tool not found: " + toolName)
                ));
            }

            try {
                String inputJson = arguments != null ? objectMapper.writeValueAsString(arguments) : "{}";
                String toolCallResult = tc.call(inputJson);

                return ResponseEntity.ok(Map.of(
                        "jsonrpc", jsonrpc,
                        "id", id != null ? id : 1,
                        "result", Map.of(
                                "content", List.of(Map.of("type", "text", "text", toolCallResult)),
                                "isError", false
                        )
                ));
            } catch (Exception e) {
                log.error("Tool execution error: {}", e.getMessage(), e);
                return ResponseEntity.ok(Map.of(
                        "jsonrpc", jsonrpc,
                        "id", id != null ? id : 1,
                        "result", Map.of(
                                "content", List.of(Map.of("type", "text", "text", "Error: " + e.getMessage())),
                                "isError", true
                        )
                ));
            }
        }

        return ResponseEntity.ok(Map.of(
                "jsonrpc", jsonrpc,
                "id", id != null ? id : 1,
                "error", Map.of("code", -32601, "message", "Method not supported: " + method)
        ));
    }

    private Object parseSchema(String schemaStr) {
        try {
            return objectMapper.readValue(schemaStr, Object.class);
        } catch (Exception e) {
            return Map.of("type", "object");
        }
    }
}


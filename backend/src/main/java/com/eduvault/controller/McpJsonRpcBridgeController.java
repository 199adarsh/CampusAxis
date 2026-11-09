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

    @PostMapping(value = "/mcp", consumes = {"application/json", "*/*"}, produces = "application/json")
    public ResponseEntity<?> handleJsonRpc(@RequestBody(required = false) Map<String, Object> request) {
        if (request == null) {
            return ResponseEntity.ok(Map.of("jsonrpc", "2.0", "result", Map.of()));
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
                toolList.add(Map.of(
                        "name", def.name(),
                        "description", def.description() != null ? def.description() : "",
                        "inputSchema", def.inputSchema() != null ? parseSchema(def.inputSchema()) : Map.of("type", "object")
                ));
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


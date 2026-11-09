package com.eduvault.mcp;

import org.springframework.ai.support.ToolCallbacks;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.List;

@Configuration
public class McpToolsConfiguration {

    @Bean
    public List<ToolCallback> campusAxisToolCallbacks(CampusAxisMcpTools tools) {
        ToolCallback[] callbacks = ToolCallbacks.from(tools);
        return Arrays.asList(callbacks);
    }
}


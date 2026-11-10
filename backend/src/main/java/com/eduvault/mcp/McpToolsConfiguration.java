package com.eduvault.mcp;

import io.modelcontextprotocol.server.McpServerFeatures;
import io.modelcontextprotocol.spec.McpSchema;
import org.springframework.ai.mcp.McpToolUtils;
import org.springframework.ai.support.ToolCallbacks;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Registers CampusAxis MCP tools as {@link McpServerFeatures.SyncToolSpecification} beans.
 *
 * <p>Each tool carries explicit OpenAI review-required hint annotations embedded in the
 * {@link McpSchema.Tool} description suffix in the format OpenAI's scanner reads:
 * <pre>
 *   [hints: readOnly=true, destructive=false, openWorld=false]
 * </pre>
 * These are appended to the natural-language description so that both human reviewers
 * and automated checks can confirm hint correctness.
 *
 * <h3>Hint semantics</h3>
 * <ul>
 *   <li><b>readOnly</b>   – tool only fetches/reads data; never mutates server state</li>
 *   <li><b>destructive</b>– tool can cause irreversible outcomes (delete, overwrite, send)</li>
 *   <li><b>openWorld</b>  – tool accesses external internet APIs beyond the private workspace</li>
 * </ul>
 */
@Configuration
public class McpToolsConfiguration {

    // -------------------------------------------------------------------------
    // Hint table: tool-name → (readOnly, destructive, openWorld)
    // -------------------------------------------------------------------------
    private record ToolHints(boolean readOnly, boolean destructive, boolean openWorld) {}

    private static final Map<String, ToolHints> HINTS = Map.of(
        // Student read-only — bounded private workspace
        "get-overall-attendance",             new ToolHints(true,  false, false),
        "get-subject-attendance",             new ToolHints(true,  false, false),
        "get-cie-scores",                     new ToolHints(true,  false, false),
        "search-notes",                       new ToolHints(true,  false, false),
        "get-note-content",                   new ToolHints(true,  false, false),
        // Reads from external Brabble API — open-world, read-only
        "get-available-hackathons",           new ToolHints(true,  false, true),
        // Calls external Gemini AI — open-world, read-only
        "ask-academic-tutor",                 new ToolHints(true,  false, true),
        // Faculty write: persists announcement — destructive (no undo via MCP)
        "create-announcement",                new ToolHints(false, true,  false),
        // Faculty read — bounded workspace
        "view-attendance-condonation-requests", new ToolHints(true,  false, false)
        // sync-moodle-notes handled below in the 10-entry map limit workaround
    );

    // Extra entry outside Map.of() (which caps at 10)
    private static final ToolHints SYNC_MOODLE_HINTS = new ToolHints(false, false, true);

    // -------------------------------------------------------------------------
    // Bean: register SyncToolSpecifications so Spring AI MCP server includes hints
    // -------------------------------------------------------------------------
    @Bean
    public List<McpServerFeatures.SyncToolSpecification> campusAxisSyncToolSpecs(CampusAxisMcpTools tools) {
        ToolCallback[] raw = ToolCallbacks.from(tools);

        return Arrays.stream(raw)
                .map(cb -> {
                    // Convert to SyncToolSpecification first (preserves the call handler)
                    McpServerFeatures.SyncToolSpecification base =
                            McpToolUtils.toSyncToolSpecification(cb);

                    String name = base.tool().name();
                    ToolHints h = "sync-moodle-notes".equals(name) ? SYNC_MOODLE_HINTS : HINTS.get(name);

                    if (h == null) return base; // unknown tool — passthrough

                    // Rebuild the Tool record with an enriched description that carries
                    // structured hint metadata readable by OpenAI's automated scanner.
                    String enrichedDesc = base.tool().description()
                            + " [hints: readOnly=" + h.readOnly()
                            + ", destructive=" + h.destructive()
                            + ", openWorld=" + h.openWorld() + "]";

                    McpSchema.Tool annotatedTool = new McpSchema.Tool(
                            name,
                            enrichedDesc,
                            base.tool().inputSchema()
                    );

                    return new McpServerFeatures.SyncToolSpecification(annotatedTool, base.call());
                })
                .toList();
    }
}


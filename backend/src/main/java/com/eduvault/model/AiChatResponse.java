package com.eduvault.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Strongly typed DTO representing an AI Chat/RAG response.
 * Extends HashMap<String, Object> for full backward compatibility with Map-based consumers.
 * Guarantees that the 'answer' field is unpacked plain markdown text, never raw JSON.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AiChatResponse extends HashMap<String, Object> {
    private static final ObjectMapper MAPPER = com.fasterxml.jackson.databind.json.JsonMapper.builder()
            .enable(com.fasterxml.jackson.core.json.JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS)
            .enable(com.fasterxml.jackson.core.json.JsonReadFeature.ALLOW_BACKSLASH_ESCAPING_ANY_CHARACTER)
            .build();

    public AiChatResponse() {
        super();
    }

    public AiChatResponse(Map<String, ?> map) {
        super(map);
    }

    public String getAnswer() {
        Object val = get("answer");
        return val != null ? String.valueOf(val) : null;
    }

    public void setAnswer(String answer) {
        put("answer", answer);
    }

    public Double getConfidence() {
        Object val = get("confidence");
        if (val instanceof Number) return ((Number) val).doubleValue();
        if (val != null) {
            try { return Double.parseDouble(String.valueOf(val)); } catch (Exception ignored) {}
        }
        return null;
    }

    public void setConfidence(Double confidence) {
        put("confidence", confidence);
    }

    public String getSource() {
        Object val = get("source");
        return val != null ? String.valueOf(val) : null;
    }

    public void setSource(String source) {
        put("source", source);
    }

    @SuppressWarnings("unchecked")
    public List<String> getSources() {
        Object val = get("sources");
        return (val instanceof List) ? (List<String>) val : null;
    }

    public void setSources(List<String> sources) {
        put("sources", sources);
    }

    public Integer getDocumentsCount() {
        Object val = get("documentsCount");
        if (val instanceof Number) return ((Number) val).intValue();
        if (val != null) {
            try { return Integer.parseInt(String.valueOf(val)); } catch (Exception ignored) {}
        }
        return null;
    }

    public void setDocumentsCount(Integer documentsCount) {
        put("documentsCount", documentsCount);
    }

    public String getSubjectId() {
        Object val = get("subjectId");
        return val != null ? String.valueOf(val) : null;
    }

    public void setSubjectId(String subjectId) {
        put("subjectId", subjectId);
    }

    public String getUnit() {
        Object val = get("unit");
        return val != null ? String.valueOf(val) : null;
    }

    public void setUnit(String unit) {
        put("unit", unit);
    }

    public String getNoteId() {
        Object val = get("noteId");
        return val != null ? String.valueOf(val) : null;
    }

    public void setNoteId(String noteId) {
        put("noteId", noteId);
    }

    public String getContextSnippet() {
        Object val = get("contextSnippet");
        return val != null ? String.valueOf(val) : null;
    }

    public void setContextSnippet(String contextSnippet) {
        put("contextSnippet", contextSnippet);
    }

    /**
     * Unpacks any raw or nested JSON string until pure markdown/text is returned.
     */
    public static String unpackAnswerText(Object raw) {
        if (raw == null) return "";
        String text = String.valueOf(raw).trim();
        if (text.isEmpty()) return "";

        for (int depth = 0; depth < 5; depth++) {
            String trimmed = text.trim();
            if (trimmed.startsWith("```json")) {
                trimmed = trimmed.substring(7);
            } else if (trimmed.startsWith("```")) {
                trimmed = trimmed.substring(3);
            }
            if (trimmed.endsWith("```")) {
                trimmed = trimmed.substring(0, trimmed.length() - 3);
            }
            trimmed = trimmed.trim();

            int firstBrace = trimmed.indexOf('{');
            int lastBrace = trimmed.lastIndexOf('}');
            if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace) {
                String candidate = trimmed.substring(firstBrace, lastBrace + 1);
                try {
                    JsonNode node = MAPPER.readTree(candidate);
                    if (node.has("answer")) {
                        JsonNode ansNode = node.get("answer");
                        if (ansNode.isTextual()) {
                            text = ansNode.asText();
                            continue;
                        } else if (!ansNode.isNull()) {
                            text = ansNode.toString();
                            continue;
                        }
                    } else if (node.has("content") && node.get("content").isTextual()) {
                        text = node.get("content").asText();
                        continue;
                    }
                } catch (Exception ignored) {
                    java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\"answer\"\\s*:\\s*\"([\\s\\S]*?)\"(?:\\s*,\\s*\"confidence\"|\\s*})");
                    java.util.regex.Matcher matcher = pattern.matcher(candidate);
                    if (matcher.find()) {
                        text = matcher.group(1)
                                .replace("\\n", "\n")
                                .replace("\\\"", "\"")
                                .replace("\\\\", "\\")
                                .replace("\\t", "\t")
                                .replace("\\r", "\r");
                        continue;
                    }
                }
            }
            text = trimmed;
            break;
        }

        return text.trim();
    }

    /**
     * Parse raw JSON response string from LLM or RAG and produce a clean AiChatResponse
     * with unpacked answer and typed fields.
     */
    public static AiChatResponse parse(String rawJson, String defaultSource) {
        AiChatResponse response = new AiChatResponse();
        response.setConfidence(0.85);
        if (defaultSource != null) {
            response.setSource(defaultSource);
        }

        if (rawJson == null || rawJson.trim().isEmpty()) {
            response.setAnswer("I encountered an error and couldn't generate an answer.");
            response.setConfidence(0.0);
            return response;
        }

        String cleaned = rawJson.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        cleaned = cleaned.trim();

        int firstBrace = cleaned.indexOf('{');
        int lastBrace = cleaned.lastIndexOf('}');
        boolean parsedAsJson = false;

        if (firstBrace != -1 && lastBrace != -1 && lastBrace > firstBrace) {
            String candidate = cleaned.substring(firstBrace, lastBrace + 1);
            try {
                Map<?, ?> parsed = MAPPER.readValue(candidate, Map.class);
                for (Map.Entry<?, ?> entry : parsed.entrySet()) {
                    if (entry.getKey() != null) {
                        response.put(String.valueOf(entry.getKey()), entry.getValue());
                    }
                }
                parsedAsJson = true;
            } catch (Exception ignored) {
            }
        }

        if (!parsedAsJson) {
            try {
                Map<?, ?> parsed = MAPPER.readValue(cleaned, Map.class);
                for (Map.Entry<?, ?> entry : parsed.entrySet()) {
                    if (entry.getKey() != null) {
                        response.put(String.valueOf(entry.getKey()), entry.getValue());
                    }
                }
                parsedAsJson = true;
            } catch (Exception ignored) {
            }
        }

        if (parsedAsJson && response.containsKey("answer")) {
            response.setAnswer(unpackAnswerText(response.get("answer")));
        } else if (!parsedAsJson) {
            response.setAnswer(unpackAnswerText(cleaned));
        }

        if (response.getAnswer() == null || response.getAnswer().isBlank()) {
            response.setAnswer("I encountered an error and couldn't generate an answer.");
            response.setConfidence(0.0);
        }

        if (defaultSource != null && !response.containsKey("source")) {
            response.setSource(defaultSource);
        }

        return response;
    }
}

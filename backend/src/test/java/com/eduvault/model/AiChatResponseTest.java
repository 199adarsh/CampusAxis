package com.eduvault.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class AiChatResponseTest {

    @Test
    @DisplayName("Unpacks clean JSON answer directly")
    void testCleanJsonUnpack() {
        String json = "{\"answer\": \"### Operating Systems\\nProcess scheduling explained.\", \"confidence\": 0.95}";
        AiChatResponse response = AiChatResponse.parse(json, "CHAPTER_RAG");

        assertEquals("### Operating Systems\nProcess scheduling explained.", response.getAnswer());
        assertEquals(0.95, response.getConfidence(), 0.001);
        assertEquals("CHAPTER_RAG", response.getSource());
    }

    @Test
    @DisplayName("Unpacks markdown-fenced JSON answer")
    void testMarkdownFencedJsonUnpack() {
        String json = "```json\n{\"answer\": \"### Round Robin\\nFair timesharing algorithm.\", \"confidence\": 0.92}\n```";
        AiChatResponse response = AiChatResponse.parse(json, "OKF_KNOWLEDGE");

        assertEquals("### Round Robin\nFair timesharing algorithm.", response.getAnswer());
        assertEquals(0.92, response.getConfidence(), 0.001);
        assertEquals("OKF_KNOWLEDGE", response.getSource());
    }

    @Test
    @DisplayName("Unpacks nested stringified JSON answer preventing raw JSON leaks")
    void testNestedStringifiedJsonLeakPrevention() {
        String leakedJson = "{\"answer\": \"{\\\"answer\\\": \\\"### Memory Management\\nPaging and segmentation.\\\", \\\"confidence\\\": 0.98}\", \"confidence\": 0.95}";
        AiChatResponse response = AiChatResponse.parse(leakedJson, "MULTI_FILE_RAG");

        assertEquals("### Memory Management\nPaging and segmentation.", response.getAnswer());
        assertFalse(response.getAnswer().contains("{\"answer\""));
        assertFalse(response.getAnswer().contains("confidence"));
    }

    @Test
    @DisplayName("Handles raw unformatted markdown string gracefully")
    void testRawMarkdownStringHandling() {
        String rawMarkdown = "### Binary Trees\nA tree data structure where each node has at most two children.";
        AiChatResponse response = AiChatResponse.parse(rawMarkdown, "GENERAL_TUTOR");

        assertEquals(rawMarkdown, response.getAnswer());
        assertEquals(0.85, response.getConfidence(), 0.001);
        assertEquals("GENERAL_TUTOR", response.getSource());
    }

    @Test
    @DisplayName("Maintains Map compatibility for existing consumers and tests")
    void testMapCompatibility() {
        AiChatResponse response = new AiChatResponse();
        response.setAnswer("Unpacked text");
        response.setConfidence(0.90);
        response.setSource("GENERAL_TUTOR");
        response.setDocumentsCount(3);
        response.setSources(List.of("doc1.pdf", "doc2.pdf"));

        // Verify Map access
        Map<String, Object> map = response;
        assertEquals("Unpacked text", map.get("answer"));
        assertEquals(0.90, map.get("confidence"));
        assertEquals("GENERAL_TUTOR", map.get("source"));
        assertEquals(3, map.get("documentsCount"));
        assertEquals(List.of("doc1.pdf", "doc2.pdf"), map.get("sources"));
    }

    @Test
    @DisplayName("Unpacks JSON containing literal control characters and unescaped newlines")
    void testLiteralUnescapedNewlines() {
        String jsonWithLiteralNewlines = "{\"answer\": \"### Chapter 1\n* Item 1\n* Item 2\", \"confidence\": 0.94}";
        AiChatResponse response = AiChatResponse.parse(jsonWithLiteralNewlines, "CHAPTER_RAG");

        assertEquals("### Chapter 1\n* Item 1\n* Item 2", response.getAnswer());
        assertEquals(0.94, response.getConfidence(), 0.001);
    }
}

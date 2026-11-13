package com.eduvault.service;

import com.eduvault.model.UploadedDocument;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

public class MultiFileRAGServiceTest {

    @InjectMocks
    private RAGService ragService;

    @Mock
    private GeminiService geminiService;

    private MultiFileDocumentStore documentStore;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        documentStore = new MultiFileDocumentStore();
    }

    @Test
    @DisplayName("Document store saves, retrieves and clears session documents correctly")
    void testDocumentStoreOperations() {
        UploadedDocument doc1 = new UploadedDocument("doc_1", "calculus_ch1.pdf", 1024, "application/pdf",
                "Calculus Chapter 1 covers derivatives and limits.", "session_abc");
        UploadedDocument doc2 = new UploadedDocument("doc_2", "algebra_ch2.docx", 2048, "application/docx",
                "Linear Algebra Chapter 2 covers eigenvalues and matrix inversion.", "session_abc");

        documentStore.saveDocument(doc1);
        documentStore.saveDocument(doc2);

        List<UploadedDocument> sessionDocs = documentStore.getDocumentsForSession("session_abc");
        assertEquals(2, sessionDocs.size());

        assertTrue(documentStore.getDocument("doc_1").isPresent());
        assertEquals("calculus_ch1.pdf", documentStore.getDocument("doc_1").get().getFilename());

        documentStore.removeDocument("doc_1");
        assertFalse(documentStore.getDocument("doc_1").isPresent());
        assertEquals(1, documentStore.getDocumentsForSession("session_abc").size());

        documentStore.clearSession("session_abc");
        assertEquals(0, documentStore.getDocumentsForSession("session_abc").size());
    }

    @Test
    @DisplayName("askMultiDocument synthesizes answers and cites relevant documents")
    void testAskMultiDocumentSynthesis() throws Exception {
        UploadedDocument doc1 = new UploadedDocument("doc_1", "operating_systems.pdf", 4096, "application/pdf",
                "### Process Scheduling\nRound robin scheduling uses a fixed time slice or quantum. Processes execute cyclically.", "sess_1");
        UploadedDocument doc2 = new UploadedDocument("doc_2", "system_design.pdf", 4096, "application/pdf",
                "### Concurrency and Locks\nDeadlocks can occur when four conditions are met: mutual exclusion, hold and wait, no preemption, and circular wait.", "sess_1");

        when(geminiService.chat(anyString(), anyString(), anyDouble(), any()))
                .thenReturn("{\"answer\": \"Round Robin scheduling operates with time slices [operating_systems.pdf].\", \"confidence\": 0.95, \"sources\": [\"operating_systems.pdf\"]}");

        String response = ragService.askMultiDocument("Explain round robin scheduling time slice", List.of(doc1, doc2), null, "high");

        assertNotNull(response);
        assertTrue(response.contains("Round Robin"));
        assertTrue(response.contains("operating_systems.pdf"));
    }

    @Test
    @DisplayName("askMultiDocument handles empty query or empty document list gracefully")
    void testAskMultiDocumentEdgeCases() {
        String emptyQueryRes = ragService.askMultiDocument("", List.of(new UploadedDocument("id", "name.pdf", 100, "pdf", "text", "sess")), null, "high");
        assertTrue(emptyQueryRes.contains("Please provide a valid question"));

        String emptyDocsRes = ragService.askMultiDocument("What is AI?", List.of(), null, "high");
        assertTrue(emptyDocsRes.contains("No documents provided"));

        String noTextDocsRes = ragService.askMultiDocument("What is AI?", List.of(new UploadedDocument("id", "corrupted.pdf", 100, "pdf", "Failed to extract text.", "sess")), null, "high");
        assertTrue(noTextDocsRes.contains("None of the uploaded files contain readable text"));
    }

    @Test
    @DisplayName("askMultiDocument recovers cleanly when LLM returns non-JSON raw markdown")
    void testAskMultiDocumentNonJsonResponseRecovery() throws Exception {
        UploadedDocument doc1 = new UploadedDocument("doc_1", "operating_systems.pdf", 4096, "application/pdf",
                "### Process Scheduling\nRound robin scheduling uses a fixed time slice or quantum.", "sess_1");

        when(geminiService.chat(anyString(), anyString(), anyDouble(), any()))
                .thenReturn("Round robin operates with fixed time slices. This is plain markdown without json.");

        String response = ragService.askMultiDocument("Explain round robin scheduling", List.of(doc1), null, "high");

        assertNotNull(response);
        assertTrue(response.contains("\"answer\""));
        assertTrue(response.contains("\"sources\""));
        assertTrue(response.contains("operating_systems.pdf"));
    }

    @Test
    @DisplayName("askMultiDocument fallback quotes handle quotes and special characters safely")
    void testAskMultiDocumentFallbackQuotesSafety() throws Exception {
        UploadedDocument doc1 = new UploadedDocument("doc_1", "quotes_test.pdf", 4096, "application/pdf",
                "### Complex \"Quoted\" Heading\nThis section explains \"critical concepts\" with special characters & symbols.", "sess_1");

        when(geminiService.chat(anyString(), anyString(), anyDouble(), any()))
                .thenThrow(new RuntimeException("API error"));

        String response = ragService.askMultiDocument("Explain critical concepts", List.of(doc1), null, "high");

        assertNotNull(response);
        assertTrue(response.contains("\"answer\""));
        assertTrue(response.contains("\"sources\""));
        assertTrue(response.contains("quotes_test.pdf"));
    }
}

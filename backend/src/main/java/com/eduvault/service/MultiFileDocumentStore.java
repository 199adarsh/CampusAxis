package com.eduvault.service;

import com.eduvault.model.UploadedDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * High-performance, concurrent in-memory document store for multi-file RAG sessions.
 * Holds active uploaded documents with per-session isolation and LRU/TTL expiration.
 */
@Service
public class MultiFileDocumentStore {

    private static final Logger logger = LoggerFactory.getLogger(MultiFileDocumentStore.class);
    private static final long MAX_DOCUMENT_AGE_MS = 24L * 60 * 60 * 1000L; // 24 hours

    private final Map<String, UploadedDocument> documentsById = new ConcurrentHashMap<>();
    private final Map<String, Set<String>> sessionDocumentIds = new ConcurrentHashMap<>();

    public void saveDocument(UploadedDocument doc) {
        if (doc == null || doc.getId() == null) return;
        documentsById.put(doc.getId(), doc);

        if (doc.getSessionId() != null && !doc.getSessionId().isBlank()) {
            sessionDocumentIds.computeIfAbsent(doc.getSessionId(), k -> Collections.synchronizedSet(new LinkedHashSet<>()))
                    .add(doc.getId());
        }
        pruneIfNecessary();
        logger.info("Saved multi-file document: id={}, name={}, chars={}", doc.getId(), doc.getFilename(),
                doc.getExtractedText() != null ? doc.getExtractedText().length() : 0);
    }

    public Optional<UploadedDocument> getDocument(String id) {
        if (id == null) return Optional.empty();
        return Optional.ofNullable(documentsById.get(id));
    }

    public List<UploadedDocument> getDocuments(List<String> ids) {
        if (ids == null || ids.isEmpty()) return Collections.emptyList();
        return ids.stream()
                .map(documentsById::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    public List<UploadedDocument> getDocumentsForSession(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) return Collections.emptyList();
        Set<String> ids = sessionDocumentIds.get(sessionId);
        if (ids == null || ids.isEmpty()) return Collections.emptyList();

        List<UploadedDocument> docs = new ArrayList<>();
        synchronized (ids) {
            for (String id : ids) {
                UploadedDocument doc = documentsById.get(id);
                if (doc != null) {
                    docs.add(doc);
                }
            }
        }
        return docs;
    }

    public boolean removeDocument(String id) {
        if (id == null) return false;
        UploadedDocument doc = documentsById.remove(id);
        if (doc != null && doc.getSessionId() != null) {
            Set<String> sessionSet = sessionDocumentIds.get(doc.getSessionId());
            if (sessionSet != null) {
                sessionSet.remove(id);
            }
            logger.info("Removed multi-file document: id={}, name={}", id, doc.getFilename());
            return true;
        }
        return false;
    }

    public void clearSession(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) return;
        Set<String> ids = sessionDocumentIds.remove(sessionId);
        if (ids != null) {
            synchronized (ids) {
                for (String id : ids) {
                    documentsById.remove(id);
                }
            }
            logger.info("Cleared {} multi-file documents for session: {}", ids.size(), sessionId);
        }
    }

    private void pruneIfNecessary() {
        if (documentsById.size() > 500) {
            long cutoff = System.currentTimeMillis() - MAX_DOCUMENT_AGE_MS;
            documentsById.entrySet().removeIf(entry -> {
                boolean expired = entry.getValue().getUploadedAt() < cutoff;
                if (expired && entry.getValue().getSessionId() != null) {
                    Set<String> set = sessionDocumentIds.get(entry.getValue().getSessionId());
                    if (set != null) set.remove(entry.getKey());
                }
                return expired;
            });
        }
    }
}


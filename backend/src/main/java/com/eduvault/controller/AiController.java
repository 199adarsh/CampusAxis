package com.eduvault.controller;

import com.eduvault.model.AiChatResponse;
import com.eduvault.model.Note;
import com.eduvault.repository.LocalJsonDatabase;
import com.eduvault.service.GeminiService;
import com.eduvault.service.RAGService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private RAGService ragService;

    @Autowired
    private LocalJsonDatabase database;

    @Autowired
    private com.eduvault.service.MultiFileDocumentStore multiFileDocumentStore;

    @Autowired
    private com.eduvault.service.FileStorageService fileStorageService;

    @Autowired(required = false)
    private com.eduvault.service.OkfKnowledgeService okfKnowledgeService;

    @Autowired(required = false)
    private com.eduvault.service.OkfBatchService okfBatchService;

    @Autowired(required = false)
    private com.eduvault.service.R2StorageService r2StorageService;

    private static final Logger logger = LoggerFactory.getLogger(AiController.class);
    private final ObjectMapper mapper = new ObjectMapper();

    private String getParam(Map<String, ?> map, String key) {
        if (map == null) return null;
        Object val = map.get(key);
        return val != null ? String.valueOf(val).trim() : null;
    }

    @PostMapping(value = "/upload", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadFiles(
            @RequestParam("files") org.springframework.web.multipart.MultipartFile[] files,
            @RequestParam(value = "sessionId", required = false) String sessionId) {
        try {
            if (files == null || files.length == 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "No files provided for upload"));
            }

            String activeSessionId = (sessionId != null && !sessionId.isBlank())
                    ? sessionId.trim()
                    : UUID.randomUUID().toString();

            List<Map<String, Object>> uploadedList = new ArrayList<>();

            for (org.springframework.web.multipart.MultipartFile file : files) {
                if (file.isEmpty()) continue;
                String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf";
                String docId = "doc_" + UUID.randomUUID().toString().substring(0, 8);

                String extractedText = fileStorageService.extractTextFromMultipartFile(file);
                String lowerName = originalFilename.toLowerCase();
                boolean isPlainText = lowerName.endsWith(".txt") || lowerName.endsWith(".md") || lowerName.endsWith(".csv") || lowerName.endsWith(".json");
                if (extractedText == null || extractedText.isBlank() || extractedText.startsWith("Failed to extract")) {
                    if (isPlainText) {
                        try {
                            extractedText = new String(file.getBytes(), java.nio.charset.StandardCharsets.UTF_8);
                        } catch (Exception ex) {
                            extractedText = "Content could not be parsed as text.";
                        }
                    } else {
                        extractedText = "No extractable text found in " + originalFilename + ". (File may be scanned, image-only, or encrypted).";
                    }
                }

                com.eduvault.model.UploadedDocument doc = new com.eduvault.model.UploadedDocument(
                        docId,
                        originalFilename,
                        file.getSize(),
                        file.getContentType(),
                        extractedText,
                        activeSessionId
                );
                multiFileDocumentStore.saveDocument(doc);

                Map<String, Object> meta = new HashMap<>();
                meta.put("id", docId);
                meta.put("name", originalFilename);
                meta.put("size", file.getSize());
                meta.put("charCount", extractedText != null ? extractedText.length() : 0);
                meta.put("preview", extractedText != null && extractedText.length() > 150 ? extractedText.substring(0, 150) + "..." : extractedText);
                uploadedList.add(meta);
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "sessionId", activeSessionId,
                    "files", uploadedList
            ));
        } catch (Exception e) {
            logger.error("Error uploading files for multi-file RAG", e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to process uploaded files: " + e.getMessage()));
        }
    }

    @GetMapping("/files")
    public ResponseEntity<?> getUploadedFiles(@RequestParam(value = "sessionId", required = false) String sessionId) {
        List<com.eduvault.model.UploadedDocument> docs = multiFileDocumentStore.getDocumentsForSession(sessionId);
        List<Map<String, Object>> metaList = docs.stream().map(doc -> {
            Map<String, Object> meta = new HashMap<>();
            meta.put("id", doc.getId());
            meta.put("name", doc.getFilename());
            meta.put("size", doc.getSize());
            meta.put("charCount", doc.getExtractedText() != null ? doc.getExtractedText().length() : 0);
            return meta;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("files", metaList));
    }

    @DeleteMapping("/files/{id}")
    public ResponseEntity<?> deleteUploadedFile(@PathVariable("id") String id) {
        boolean removed = multiFileDocumentStore.removeDocument(id);
        return ResponseEntity.ok(Map.of("success", removed, "id", id));
    }

    @PostMapping("/files/clear")
    public ResponseEntity<?> clearUploadedFiles(@RequestBody(required = false) Map<String, String> body) {
        String sessionId = (body != null) ? body.get("sessionId") : null;
        if (sessionId != null) {
            multiFileDocumentStore.clearSession(sessionId);
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "Session documents cleared"));
    }

    @PostMapping("/attach-notes")
    public ResponseEntity<?> attachNotesToSession(@RequestBody Map<String, ?> body) {
        try {
            String sessionId = getParam(body, "sessionId");
            if (sessionId == null || sessionId.isBlank()) {
                sessionId = UUID.randomUUID().toString();
            }

            List<String> noteIds = new ArrayList<>();
            Object noteIdsObj = body.get("noteIds");
            if (noteIdsObj instanceof List<?>) {
                for (Object o : (List<?>) noteIdsObj) {
                    if (o != null && !String.valueOf(o).isBlank()) noteIds.add(String.valueOf(o).trim());
                }
            } else if (noteIdsObj instanceof String && !((String) noteIdsObj).isBlank()) {
                for (String p : ((String) noteIdsObj).split(",")) {
                    if (!p.trim().isEmpty()) noteIds.add(p.trim());
                }
            }

            if (noteIds.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No noteIds provided to attach"));
            }

            List<Map<String, Object>> attachedList = new ArrayList<>();

            for (String nId : noteIds) {
                Optional<Note> noteOpt = database.getNoteById(nId);
                if (noteOpt.isEmpty()) continue;
                Note note = noteOpt.get();

                String extractedText = note.getExtractedText();
                if (extractedText == null || extractedText.trim().isEmpty() || extractedText.startsWith("Failed to extract") || extractedText.startsWith("File not found")) {
                    if (note.getFileUrl() != null && fileStorageService != null) {
                        extractedText = fileStorageService.extractText(note.getFileUrl());
                    }
                    if ((extractedText == null || extractedText.isBlank() || extractedText.startsWith("File not found") || extractedText.startsWith("Failed to extract"))
                            && note.getR2ObjectKey() != null && r2StorageService != null && fileStorageService != null) {
                        try {
                            byte[] bytes = r2StorageService.getObjectBytes(note.getR2ObjectKey());
                            if (bytes != null && bytes.length > 0) {
                                extractedText = fileStorageService.extractTextFromBytes(bytes, note.getOriginalFilename() != null ? note.getOriginalFilename() : note.getR2ObjectKey());
                            }
                        } catch (Exception ex) {
                            logger.warn("attachNotes: R2 lazy extraction failed for noteId={}: {}", nId, ex.getMessage());
                        }
                    }
                    if (extractedText != null && !extractedText.isBlank() && !extractedText.startsWith("File not found") && !extractedText.startsWith("Failed to extract")) {
                        note.setExtractedText(extractedText);
                        database.updateNote(note);
                    }
                }

                String filename = note.getOriginalFilename();
                if (filename == null || filename.isBlank()) {
                    filename = (note.getTitle() != null && !note.getTitle().isBlank()) ? note.getTitle() : ("note_" + nId + ".pdf");
                }
                if (note.getUnit() != null && !note.getUnit().isBlank()) {
                    String uTag = "[" + note.getUnit().trim() + "] ";
                    if (!filename.startsWith(uTag)) {
                        filename = uTag + filename;
                    }
                }

                com.eduvault.model.UploadedDocument doc = new com.eduvault.model.UploadedDocument(
                        nId,
                        filename,
                        extractedText != null ? (long) extractedText.length() : 0L,
                        "application/pdf",
                        extractedText != null ? extractedText : "",
                        sessionId
                );
                multiFileDocumentStore.saveDocument(doc);

                Map<String, Object> meta = new HashMap<>();
                meta.put("id", nId);
                meta.put("name", filename);
                meta.put("unit", note.getUnit());
                meta.put("subjectId", note.getSubjectId());
                meta.put("charCount", extractedText != null ? extractedText.length() : 0);
                attachedList.add(meta);
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "sessionId", sessionId,
                    "files", attachedList
            ));
        } catch (Exception e) {
            logger.error("Error attaching notes to multi-file store", e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to attach notes: " + e.getMessage()));
        }
    }

    @PostMapping("/chat")
    public ResponseEntity<?> chat(
            @RequestHeader(value = "X-Gemini-Api-Key", required = false) String apiKeyHeader,
            @RequestBody Map<String, ?> request) {
        try {
            String question = getParam(request, "question");
            if (question == null || question.isEmpty()) {
                question = getParam(request, "message");
            }
            if (question == null || question.isEmpty()) {
                question = getParam(request, "prompt");
            }
            String noteId = getParam(request, "noteId"); // Optional context
            String subjectId = getParam(request, "subjectId");
            String unit = getParam(request, "unit");
            String prn = getParam(request, "prn");
            String lengthMode = getParam(request, "lengthMode");
            if (lengthMode == null || lengthMode.isBlank()) {
                lengthMode = getParam(request, "mode");
            }
            String customApiKey = apiKeyHeader;
            if (customApiKey == null || customApiKey.isBlank()) {
                customApiKey = getParam(request, "apiKey");
            }
            if (customApiKey == null || customApiKey.isBlank()) {
                customApiKey = getParam(request, "customApiKey");
            }

            if (question == null || question.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Question or message is required"));
            }

            // Inspect multi-file attachments
            List<String> fileIds = new ArrayList<>();
            Object fileIdsObj = request.get("fileIds");
            if (fileIdsObj instanceof List<?>) {
                for (Object o : (List<?>) fileIdsObj) {
                    if (o != null && !String.valueOf(o).isBlank()) fileIds.add(String.valueOf(o).trim());
                }
            } else if (fileIdsObj instanceof String && !((String) fileIdsObj).isBlank()) {
                String[] parts = ((String) fileIdsObj).split(",");
                for (String p : parts) {
                    if (!p.trim().isEmpty()) fileIds.add(p.trim());
                }
            }

            String sessionId = getParam(request, "sessionId");
            List<com.eduvault.model.UploadedDocument> multiDocs = Collections.emptyList();
            if (!fileIds.isEmpty()) {
                multiDocs = multiFileDocumentStore.getDocuments(fileIds);
            } else if (sessionId != null && !sessionId.isBlank()) {
                multiDocs = multiFileDocumentStore.getDocumentsForSession(sessionId.trim());
            }

            String jsonResponse;
            String source = "GENERAL_TUTOR";
            String contextSnippet = null;

            // Route 0: Multi-File RAG across uploaded files
            if (!multiDocs.isEmpty()) {
                logger.info("Executing Multi-File RAG across {} uploaded documents for query: '{}'", multiDocs.size(), question);
                jsonResponse = ragService.askMultiDocument(question, multiDocs, customApiKey, lengthMode);
                source = "MULTI_FILE_RAG";
            }
            // Route 1: Subject-Aware OKF Knowledge Serving
            else if (subjectId != null && !subjectId.trim().isEmpty() && okfKnowledgeService != null) {
                Optional<String> okfContext = okfKnowledgeService.buildSubjectKnowledgeContext(subjectId.trim(), question, unit);
                
                // JIT On-Demand Compilation: if not compiled yet, compile immediately so user never waits for overnight cron
                if (okfContext.isEmpty() && okfBatchService != null) {
                    logger.info("OKF not pre-compiled for subjectId={}. Executing instant JIT compilation.", subjectId);
                    try {
                        okfBatchService.executeBatchSync(subjectId.trim(), "JIT_ON_DEMAND");
                        okfKnowledgeService.preloadSubject(subjectId.trim());
                        okfContext = okfKnowledgeService.buildSubjectKnowledgeContext(subjectId.trim(), question, unit);
                    } catch (Exception ex) {
                        logger.warn("Instant JIT OKF compilation encountered an issue: {}", ex.getMessage());
                    }
                }

                if (okfContext.isPresent()) {
                    contextSnippet = okfContext.get();
                    if (lengthMode != null && !lengthMode.isBlank()) {
                        jsonResponse = geminiService.askTutor(question, contextSnippet, customApiKey, lengthMode);
                    } else {
                        jsonResponse = geminiService.askTutor(question, contextSnippet, customApiKey);
                    }
                    source = "OKF_KNOWLEDGE";
                } else {
                    logger.info("OKF knowledge context still empty for subjectId={}, falling back with strict subject isolation", subjectId);
                    if (noteId != null && !noteId.trim().isEmpty()) {
                        jsonResponse = ragService.askChapter(question, noteId, customApiKey, lengthMode);
                        source = "CHAPTER_RAG";
                    } else {
                        jsonResponse = executeGeneralTutor(question, prn, customApiKey, subjectId.trim(), lengthMode);
                        source = "GENERAL_TUTOR";
                    }
                }
            } else if (noteId != null && !noteId.trim().isEmpty()) {
                // Route 2: Note-specific Chapter RAG
                jsonResponse = ragService.askChapter(question, noteId, customApiKey, lengthMode);
                source = "CHAPTER_RAG";
            } else {
                // Route 3: General Academic Assistant Context
                jsonResponse = executeGeneralTutor(question, prn, customApiKey, null, lengthMode);
                source = "GENERAL_TUTOR";
            }

            AiChatResponse responseObj = AiChatResponse.parse(jsonResponse, source);

            if ("MULTI_FILE_RAG".equals(source)) {
                responseObj.setDocumentsCount(multiDocs.size());
            } else if ("OKF_KNOWLEDGE".equals(source)) {
                responseObj.setSubjectId(subjectId.trim());
                if (unit != null && !unit.isBlank()) {
                    responseObj.setUnit(unit.trim());
                }
                if (contextSnippet != null) {
                    responseObj.setContextSnippet(contextSnippet);
                }
            } else if ("CHAPTER_RAG".equals(source)) {
                responseObj.setNoteId(noteId);
            }

            return ResponseEntity.ok(responseObj);
        } catch (Exception e) {
            logger.error("Controller error in /api/ai/chat", e);
            return ResponseEntity.status(500).body(Map.of("error", "Internal AI Logic failure", "message", e.getMessage()));
        }
    }

    private String executeGeneralTutor(String question, String prn, String customApiKey) {
        return executeGeneralTutor(question, prn, customApiKey, null);
    }

    private String executeGeneralTutor(String question, String prn, String customApiKey, String targetSubjectId) {
        return executeGeneralTutor(question, prn, customApiKey, targetSubjectId, null);
    }

    private String executeGeneralTutor(String question, String prn, String customApiKey, String targetSubjectId, String lengthMode) {
        StringBuilder contextBuilder = new StringBuilder();

        com.eduvault.model.StudentProfile profile = (prn != null && !prn.isBlank()) ? database.getProfile(prn.trim()) : null;
        if (profile != null && profile.getName() != null) {
            contextBuilder.append("=== STUDENT PROFILE ===\n")
                    .append("Name: ").append(profile.getName()).append("\n")
                    .append("PRN: ").append(profile.getPrn()).append("\n")
                    .append("Department: ").append(profile.getDepartment()).append("\n")
                    .append("Semester: ").append(profile.getSemester()).append("\n\n");
        }

        List<com.eduvault.model.Subject> subjects = database.getAllSubjects();
        if (subjects != null && !subjects.isEmpty()) {
            contextBuilder.append("=== ENROLLED SUBJECTS & ATTENDANCE ===\n");
            for (com.eduvault.model.Subject s : subjects) {
                contextBuilder.append("- ").append(s.getName())
                        .append(" (Code: ").append(s.getCode() != null ? s.getCode() : "N/A").append("): ")
                        .append("Attendance ").append(s.getAttendance() != null ? s.getAttendance() : "0").append("%")
                        .append(" (").append(s.getTotalAttended()).append("/").append(s.getTotalConducted()).append(" sessions attended)\n");
            }
            contextBuilder.append("\n");
        }

        List<com.eduvault.model.Announcement> announcements = database.getAllAnnouncements();
        if (announcements != null && !announcements.isEmpty()) {
            contextBuilder.append("=== ANNOUNCEMENTS & NOTICES ===\n");
            for (com.eduvault.model.Announcement a : announcements.stream().limit(5).toList()) {
                contextBuilder.append("• ").append(a.getTitle()).append(": ").append(a.getDescription()).append("\n");
            }
            contextBuilder.append("\n");
        }

        List<Note> allNotes = database.getAllNotes();
        List<Note> eligibleNotes = (allNotes != null) ? allNotes : Collections.emptyList();

        if (targetSubjectId != null && !targetSubjectId.isBlank()) {
            // Strictly scope to target subject to prevent cross-subject contamination
            eligibleNotes = eligibleNotes.stream()
                    .filter(n -> targetSubjectId.equalsIgnoreCase(n.getSubjectId()))
                    .collect(Collectors.toList());
        } else {
            // Filter strictly: only include notes whose title or subject matches keywords in question
            String qLower = question.toLowerCase();
            eligibleNotes = eligibleNotes.stream()
                    .filter(n -> {
                        String title = (n.getTitle() != null) ? n.getTitle().toLowerCase() : "";
                        String sId = (n.getSubjectId() != null) ? n.getSubjectId().toLowerCase() : "";
                        return (title.length() > 3 && qLower.contains(title)) ||
                               (!sId.isEmpty() && qLower.contains(sId));
                    })
                    .collect(Collectors.toList());
        }

        String notesContext = eligibleNotes.stream()
                .filter(n -> n.getExtractedText() != null && n.getExtractedText().length() > 50)
                .sorted((a, b) -> {
                    String da = a.getCreatedAt() != null ? a.getCreatedAt() : "";
                    String db = b.getCreatedAt() != null ? b.getCreatedAt() : "";
                    return db.compareTo(da);
                })
                .limit(3)
                .map(n -> "Material (" + n.getTitle() + "):\n" + n.getExtractedText().substring(0, Math.min(n.getExtractedText().length(), 1000)))
                .collect(Collectors.joining("\n\n---\n\n"));

        if (!notesContext.isEmpty()) {
            contextBuilder.append("=== RECENT STUDY MATERIALS ===\n").append(notesContext);
        }

        String fullContext = contextBuilder.toString().trim();
        if (fullContext.isEmpty()) {
            fullContext = "EduVault Academic Vault ready to assist.";
        }

        if (lengthMode != null && !lengthMode.isBlank()) {
            return geminiService.askTutor(question, fullContext, customApiKey, lengthMode);
        } else {
            return geminiService.askTutor(question, fullContext, customApiKey);
        }
    }

    @PostMapping("/study-guide")
    public ResponseEntity<?> generateStudyGuide(@RequestBody Map<String, String> request) {
        try {
            String pyqText = request.get("pyqText");
            String qbText = request.get("qbText");

            if ((pyqText == null || pyqText.trim().isEmpty()) && (qbText == null || qbText.trim().isEmpty())) {
                if (request.containsKey("prompt")) {
                    pyqText = request.get("prompt");
                } else if (request.containsKey("subject") || request.containsKey("topic")) {
                    pyqText = "Subject: " + request.getOrDefault("subject", "General") + 
                              ", Topic: " + request.getOrDefault("topic", "Exam Preparation");
                }
            }

            if ((pyqText == null || pyqText.trim().isEmpty()) && (qbText == null || qbText.trim().isEmpty())) {
                return ResponseEntity.badRequest().body(Map.of("error", "Provide at least one of Question Bank, PYQ text, or subject/topic"));
            }

            String jsonResponse = geminiService.generateStudyGuide(pyqText, qbText);

            try {
                return ResponseEntity.ok(mapper.readValue(jsonResponse, Map.class));
            } catch (Exception e) {
                return ResponseEntity.ok(Map.of("guide", List.of(
                        Map.of("topic", "Key Exam Questions", "priority", "High", "questions", List.of(pyqText != null && !pyqText.isBlank() ? pyqText : "Review key concepts"))
                )));
            }
        } catch (Exception e) {
            logger.error("Controller error in /api/ai/study-guide", e);
            return ResponseEntity.status(502).body(Map.of("error", "Study Guide generation failed: " + e.getMessage()));
        }
    }

    @PostMapping("/roadmap")
    public ResponseEntity<?> generateRoadmap(@RequestBody Map<String, Object> request) {
        try {
            String pyqText = (String) request.get("pyqText");
            String qbText = (String) request.get("qbText");
            String examDate = (String) request.get("examDate");
            String currentDate = (String) request.get("currentDate");

            // Safe Integer extraction
            Integer subjectsCount = request.get("subjectsCount") instanceof Integer
                    ? (Integer) request.get("subjectsCount")
                    : Integer.parseInt(String.valueOf(request.get("subjectsCount")));

            Integer daysRemaining = request.get("daysRemaining") instanceof Integer
                    ? (Integer) request.get("daysRemaining")
                    : Integer.parseInt(String.valueOf(request.get("daysRemaining")));

            if (examDate == null || currentDate == null || subjectsCount == null || daysRemaining == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing required roadmap parameters"));
            }

            String jsonResponse = geminiService.generateRoadmap(subjectsCount, pyqText, qbText, examDate, currentDate, daysRemaining);

            try {
                return ResponseEntity.ok(mapper.readValue(jsonResponse, Map.class));
            } catch (Exception e) {
                return ResponseEntity.status(500).body(Map.of("error", "Failed to parse roadmap", "raw", jsonResponse));
            }
        } catch (Exception e) {
            logger.error("Controller error in /api/ai/roadmap", e);
            return ResponseEntity.status(500).body(Map.of("error", "Roadmap generation failed: " + e.getMessage()));
        }
    }

    @PostMapping("/analyze-roadmap-subjects")
    public ResponseEntity<?> analyzeRoadmapSubjects(@RequestBody(required = false) Map<String, Object> request) {
        try {
            String domain = request != null && request.containsKey("domain") ? String.valueOf(request.get("domain")) : "Frontend Development";
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> subjects = request != null && request.containsKey("subjects")
                    ? (List<Map<String, Object>>) request.get("subjects")
                    : null;

            String jsonResponse = geminiService.analyzeRoadmapSubjects(domain, subjects);
            try {
                return ResponseEntity.ok(mapper.readValue(jsonResponse, Map.class));
            } catch (Exception e) {
                return ResponseEntity.ok(Map.of(
                        "domain", domain,
                        "raw", jsonResponse
                ));
            }
        } catch (Exception e) {
            logger.error("Controller error in /api/ai/analyze-roadmap-subjects", e);
            return ResponseEntity.status(500).body(Map.of("error", "Subject analysis failed: " + e.getMessage()));
        }
    }
}

package com.eduvault.controller;

import com.eduvault.model.Doubt;
import com.eduvault.model.Note;
import com.eduvault.model.StudentProfile;
import com.eduvault.model.Subject;
import com.eduvault.repository.LocalJsonDatabase;
import com.eduvault.service.BackblazeStorageService;
import com.eduvault.service.FileStorageService;
import com.eduvault.service.GeminiService;
import com.eduvault.service.RAGService;
import com.eduvault.util.AcademicNormalizer;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.S3Exception;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import com.eduvault.util.TeacherSubjectMatcher;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ApiController {
    
    private static final Logger logger = LoggerFactory.getLogger(ApiController.class);

    @Autowired
    private LocalJsonDatabase database;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private BackblazeStorageService backblazeStorageService;

    @Autowired
    private com.eduvault.service.DocumentConversionService documentConversionService;

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private RAGService ragService;

    @Autowired
    private ObjectMapper mapper;

    private final java.util.concurrent.atomic.AtomicReference<List<Subject>> cachedStaticSubjects = new java.util.concurrent.atomic.AtomicReference<>(null);

    private List<Subject> getStaticCatalog() {
        List<Subject> cached = cachedStaticSubjects.get();
        if (cached != null) return cached;
        synchronized (cachedStaticSubjects) {
            if (cachedStaticSubjects.get() != null) return cachedStaticSubjects.get();
            try {
                Path jsonPath = Paths.get("data", "subjects.json");
                if (!Files.exists(jsonPath)) {
                    jsonPath = Paths.get("backend", "data", "subjects.json");
                }
                if (Files.exists(jsonPath)) {
                    List<Subject> loaded = mapper.readValue(Files.readAllBytes(jsonPath), new com.fasterxml.jackson.core.type.TypeReference<List<Subject>>() {});
                    cachedStaticSubjects.set(loaded);
                    return loaded;
                }
            } catch (Exception e) {
                logger.warn("Could not read static subjects.json: {}", e.getMessage());
            }
            List<Subject> dbFallback = database.getAllSubjects();
            cachedStaticSubjects.set(dbFallback);
            return dbFallback;
        }
    }

    @GetMapping("/subjects")
    public ResponseEntity<List<Subject>> getSubjects(
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) String prn) {
        List<Subject> all = getStaticCatalog();
        
        String targetDept = department;
        String targetSem = semester;
        if (targetDept == null && prn != null && !prn.isBlank()) {
            StudentProfile profile = database.getProfile(prn);
            if (profile != null) {
                targetDept = profile.getDepartment();
                targetSem = profile.getSemester();
            }
        }

        if (targetDept != null || targetSem != null) {
            final String finalDept = targetDept;
            final String finalSem = targetSem;
            all = all.stream()
                .filter(s -> {
                    boolean deptMatch = finalDept == null 
                            || AcademicNormalizer.isDepartmentMatch(s.getDepartment(), finalDept)
                            || AcademicNormalizer.isAlliedDepartment(s.getDepartment(), finalDept);
                    boolean semMatch = finalSem == null || AcademicNormalizer.isSemesterMatch(s.getSemester(), finalSem);
                    return deptMatch && semMatch;
                })
                .collect(java.util.stream.Collectors.toList());
        }
        return ResponseEntity.ok(all);
    }

    @GetMapping("/profile")
    public ResponseEntity<StudentProfile> getProfile(
            @RequestParam(required = false) String prn,
            @RequestHeader(value = "X-Student-PRN", required = false) String headerPrn) {
        String effectivePrn = (prn != null && !prn.isBlank()) ? prn : headerPrn;
        if (effectivePrn == null || effectivePrn.isBlank()) {
            return ResponseEntity.ok(null);
        }
        StudentProfile profile = database.getProfile(effectivePrn);
        if (profile == null) {
            return ResponseEntity.ok(null);
        }
        // Redact plaintext DOB credential to prevent IDOR credential harvesting, but preserve TEACHER role marker
        boolean isTeacherUser = "TEACHER".equalsIgnoreCase(profile.getDob()) || "TEACHER".equalsIgnoreCase(profile.getRole());
        StudentProfile sanitized = new StudentProfile(
                profile.getPrn(),
                profile.getName(),
                profile.getImage(),
                profile.getRollNo(),
                profile.getAbcId(),
                profile.getDepartment(),
                profile.getSemester(),
                profile.getSection(),
                isTeacherUser ? "TEACHER" : null,
                profile.getSelectedSubjects(),
                profile.getSubjectIds(),
                isTeacherUser ? "TEACHER" : profile.getRole()
        );
        return ResponseEntity.ok(sanitized);
    }

    @PostMapping("/profile")
    public ResponseEntity<StudentProfile> updateProfile(@RequestBody StudentProfile profile) {
        if (profile == null || profile.getPrn() == null || profile.getPrn().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(database.updateProfile(profile));
    }

    @PostMapping("/profile/logout")
    public ResponseEntity<Void> logoutProfile() {
        // Individual logout does not clear the database
        return ResponseEntity.ok().build();
    }

    @PostMapping("/subjects")
    public ResponseEntity<Subject> createSubject(@RequestBody Map<String, String> payload) {
        String name = payload.get("name");
        String semester = payload.get("semester");
        String department = payload.get("department");
        if (name == null || name.trim().isEmpty() || semester == null || semester.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        
        Subject subject = Subject.builder()
                .id(UUID.randomUUID().toString())
                .name(name.trim())
                .semester(semester.trim())
                .department(department != null && !department.isBlank() ? department.trim() : "General")
                .createdAt(LocalDate.now().format(DateTimeFormatter.ISO_DATE))
                .noteCount(0)
                .build();
                
        return ResponseEntity.ok(database.addSubject(subject));
    }

    private <T> ResponseEntity<List<T>> paginate(List<T> items, Integer page, Integer size) {
        int totalCount = items != null ? items.size() : 0;
        if (items == null || items.isEmpty()) {
            return ResponseEntity.ok()
                    .header("X-Total-Count", "0")
                    .header("X-Total-Pages", "0")
                    .header("X-Current-Page", page != null ? String.valueOf(page) : "0")
                    .body(java.util.Collections.emptyList());
        }

        if (page != null && size != null && size > 0 && page >= 0) {
            int totalPages = (int) Math.ceil((double) totalCount / size);
            int fromIndex = Math.min(page * size, totalCount);
            int toIndex = Math.min(fromIndex + size, totalCount);
            List<T> paged = items.subList(fromIndex, toIndex);
            return ResponseEntity.ok()
                    .header("X-Total-Count", String.valueOf(totalCount))
                    .header("X-Total-Pages", String.valueOf(totalPages))
                    .header("X-Current-Page", String.valueOf(page))
                    .header("X-Page-Size", String.valueOf(size))
                    .body(paged);
        }

        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(totalCount))
                .header("X-Total-Pages", "1")
                .header("X-Current-Page", "0")
                .body(items);
    }

    public ResponseEntity<List<Note>> getNotes(
            String subjectId,
            String semester,
            String examType,
            String keyword,
            String search,
            String department,
            String unit,
            String folder,
            String prn,
            String headerPrn,
            String roleHeader) {
        return getNotes(subjectId, semester, examType, keyword, search, department, unit, folder, prn, null, null, headerPrn, roleHeader, null);
    }

    public ResponseEntity<List<Note>> getNotes(
            String subjectId,
            String semester,
            String examType,
            String keyword,
            String search,
            String department,
            String unit,
            String folder,
            String prn,
            String headerPrn,
            String roleHeader,
            String studentSubjectsHeader) {
        return getNotes(subjectId, semester, examType, keyword, search, department, unit, folder, prn, null, null, headerPrn, roleHeader, studentSubjectsHeader);
    }

    @GetMapping("/notes")
    public ResponseEntity<List<Note>> getNotes(
            @RequestParam(required = false) String subjectId,
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) String examType,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String unit,
            @RequestParam(required = false) String folder,
            @RequestParam(required = false) String prn,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestHeader(value = "X-Student-PRN", required = false) String headerPrn,
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader,
            @RequestHeader(value = "X-Student-Subjects", required = false) String studentSubjectsHeader) {

        boolean isTeacher = roleHeader != null && (roleHeader.equalsIgnoreCase("teacher") || roleHeader.equalsIgnoreCase("faculty") || roleHeader.equalsIgnoreCase("admin"));
        String effectivePrn = (prn != null && !prn.isBlank()) ? prn : headerPrn;
        StudentProfile profile = (effectivePrn != null && !effectivePrn.isBlank()) ? database.getProfile(effectivePrn) : null;

        java.util.Set<String> enrolledSubjectIds = new java.util.HashSet<>();
        if (studentSubjectsHeader != null && !studentSubjectsHeader.isBlank()) {
            for (String sid : studentSubjectsHeader.split(",")) {
                String clean = sid.trim();
                if (!clean.isEmpty()) enrolledSubjectIds.add(clean);
            }
        }

        String queryDept = department;
        String querySem = semester;
        if (folder != null && folder.contains("-")) {
            String[] parts = folder.split("-", 2);
            queryDept = parts[0];
            querySem = parts[1];
        }

        // Students must ONLY see notes matching their academic profile or enrolled subjects
        if (!isTeacher) {
            if (profile != null) {
                String profDept = profile.getDepartment();
                String profSem = profile.getSemester();
                // Reject unauthorized cross-department or cross-semester folder queries by students
                if (queryDept != null && !queryDept.isBlank() && !AcademicNormalizer.isDepartmentMatch(queryDept, profDept)) {
                    return ResponseEntity.ok(java.util.List.of());
                }
                if (querySem != null && !querySem.isBlank() && !AcademicNormalizer.isSemesterMatch(querySem, profSem)) {
                    return ResponseEntity.ok(java.util.List.of());
                }
                queryDept = profDept;
                querySem = profSem;
            } else if (effectivePrn != null && !effectivePrn.isBlank()) {
                String inferredDept = AcademicNormalizer.normalizeDepartment(effectivePrn);
                if (queryDept != null && !queryDept.isBlank() && !AcademicNormalizer.isDepartmentMatch(queryDept, inferredDept)) {
                    return ResponseEntity.ok(java.util.List.of());
                }
                if (queryDept == null || queryDept.isBlank()) {
                    queryDept = inferredDept;
                }
            }
        }

        final String finalSearch = (search != null && !search.isBlank()) ? search.toLowerCase() : ((keyword != null && !keyword.isBlank()) ? keyword.toLowerCase() : null);

        List<Note> sourceNotes;
        if (subjectId != null && !subjectId.isBlank()) {
            sourceNotes = database.getNotesBySubjectId(subjectId);
            if (sourceNotes == null || sourceNotes.isEmpty()) {
                sourceNotes = database.getNoteSummariesBySubjectId(subjectId);
            }
            if (sourceNotes == null || sourceNotes.isEmpty()) {
                sourceNotes = database.getAllNotes();
            }
        } else {
            sourceNotes = database.getAllNoteSummaries();
            if (sourceNotes == null || sourceNotes.isEmpty()) {
                sourceNotes = database.getAllNotes();
            }
        }

        final String finalDept = queryDept;
        final String finalSem = querySem;
        final String finalSubjectId = subjectId;
        final String finalUnit = unit;
        final String explicitSemester = semester;

        Map<String, Subject> subjectMap = database.getAllSubjects().stream()
                .filter(s -> s.getId() != null)
                .collect(java.util.stream.Collectors.toMap(Subject::getId, s -> s, (s1, s2) -> s1));

        List<Note> filtered = sourceNotes.stream()
                .filter(n -> {
                    // 1. Never publish unmapped or draft notes to students
                    if (!isTeacher) {
                        if (n.getSubjectId() == null || n.getSubjectId().isBlank()) return false;
                        if ("UNRESOLVED".equalsIgnoreCase(n.getStatus()) || "PENDING_MAPPING".equalsIgnoreCase(n.getStatus())) {
                            return false;
                        }
                    }

                    // 2. Specific Subject ID requested
                    if (finalSubjectId != null && !finalSubjectId.isBlank() && !finalSubjectId.equalsIgnoreCase(n.getSubjectId())) {
                        return false;
                    }

                    // 3. Unit filter
                    if (finalUnit != null && !finalUnit.isBlank() && (n.getUnit() == null || !n.getUnit().equalsIgnoreCase(finalUnit))) {
                        return false;
                    }

                    // 4. Access condition: If student is enrolled in this subject, authorize immediately
                    boolean isEnrolled = enrolledSubjectIds.contains(n.getSubjectId());

                    // Department scoping (bypassed if student is enrolled in the course)
                    if (finalDept != null && !finalDept.isBlank() && (finalSubjectId == null || finalSubjectId.isBlank()) && !isEnrolled) {
                        String noteDept = n.getDepartment();
                        if ((noteDept == null || noteDept.isBlank()) && n.getSubjectId() != null) {
                            Subject s = subjectMap.get(n.getSubjectId());
                            if (s != null) noteDept = s.getDepartment();
                        }
                        if (noteDept == null || (!AcademicNormalizer.isDepartmentMatch(noteDept, finalDept) && !AcademicNormalizer.isAlliedDepartment(noteDept, finalDept))) {
                            return false;
                        }
                    }

                    // Semester metadata filter:
                    // If caller explicitly queried ?semester=... or requested an explicit virtual folder, filter by semester
                    String requiredSem = (explicitSemester != null && !explicitSemester.isBlank()) ? explicitSemester
                            : ((folder != null && folder.contains("-")) ? finalSem : null);

                    if (requiredSem != null && !requiredSem.isBlank() && (finalSubjectId == null || finalSubjectId.isBlank())) {
                        String noteSem = n.getSemester();
                        if ((noteSem == null || noteSem.isBlank()) && n.getSubjectId() != null) {
                            Subject s = subjectMap.get(n.getSubjectId());
                            if (s != null) noteSem = s.getSemester();
                        }
                        if (noteSem == null || !AcademicNormalizer.isSemesterMatch(noteSem, requiredSem)) {
                            return false;
                        }
                    } else if (!isTeacher && enrolledSubjectIds.isEmpty() && finalSem != null && !finalSem.isBlank() && (finalSubjectId == null || finalSubjectId.isBlank())) {
                        // Fallback when no enrolled subjects were supplied (e.g. initial login before sync or unit tests)
                        String noteSem = n.getSemester();
                        if ((noteSem == null || noteSem.isBlank()) && n.getSubjectId() != null) {
                            Subject s = subjectMap.get(n.getSubjectId());
                            if (s != null) noteSem = s.getSemester();
                        }
                        if (noteSem == null || !AcademicNormalizer.isSemesterMatch(noteSem, finalSem)) {
                            return false;
                        }
                    }

                    // 5. Search keyword
                    if (finalSearch != null) {
                        String title = n.getTitle() != null ? n.getTitle().toLowerCase() : "";
                        String text = n.getExtractedText() != null ? n.getExtractedText().toLowerCase() : "";
                        if (!title.contains(finalSearch) && !text.contains(finalSearch)) {
                            return false;
                        }
                    }
                    return true;
                })
                .collect(java.util.stream.Collectors.toList());

        // Strip heavy extractedText on list view to reduce JSON payload by >90%
        List<Note> summaries = filtered.stream()
                .map(Note::toSummary)
                .collect(java.util.stream.Collectors.toList());

        return paginate(summaries, page, size);
    }

    @RequestMapping(value = "/notes/sync-b2", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<Map<String, Object>> syncB2Notes() {
        int synced = database.syncNotesFromBackblaze();
        return ResponseEntity.ok(Map.of("syncedCount", synced, "totalNotes", database.getTotalNotesCount()));
    }

    @RequestMapping(value = "/notes/repair", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<Map<String, Object>> repairNotes() {
        int repaired = database.repairExistingNotes();
        return ResponseEntity.ok(Map.of("repairedCount", repaired, "totalNotes", database.getTotalNotesCount()));
    }

    @GetMapping("/notes/{id}")
    public ResponseEntity<Note> getNote(@PathVariable String id) {
        return database.getNoteById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/notes/{id}/tags")
    public ResponseEntity<Note> updateNoteTags(@PathVariable String id, @RequestBody Map<String, List<String>> payload) {
        List<String> tags = payload.get("tags");
        return database.updateNoteTags(id, tags)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/notes/{id}")
    public ResponseEntity<Map<String, String>> deleteNote(@PathVariable String id) {
        return database.getNoteById(id).map(note -> {
            // Delete from B2 (primary) and also attempt local cleanup for legacy files
            String b2Key = note.getB2ObjectKey() != null ? note.getB2ObjectKey() : note.getFileUrl();
            backblazeStorageService.deleteFile(b2Key);
            fileStorageService.deleteFile(note.getFileUrl());
            database.deleteNote(id);
            return ResponseEntity.ok(Map.of("message", "Note deleted successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/notes")
    public ResponseEntity<Map<String, Object>> deleteAllNotes(
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader) {
        List<Note> all = database.getAllNotes();
        int count = all.size();
        Set<String> b2Keys = new HashSet<>();
        for (Note note : all) {
            try {
                String b2Key = note.getB2ObjectKey() != null ? note.getB2ObjectKey() : note.getFileUrl();
                if (b2Key != null && !b2Key.isBlank() && !b2Key.startsWith("http://") && !b2Key.startsWith("https://")) {
                    b2Keys.add(b2Key.trim());
                }
                fileStorageService.deleteFile(note.getFileUrl());
            } catch (Exception ignored) {}
        }
        if (!b2Keys.isEmpty() && backblazeStorageService != null) {
            backblazeStorageService.deleteObjectsBatch(b2Keys);
        }
        int purgedB2 = backblazeStorageService != null ? backblazeStorageService.purgeAllBucketObjects() : 0;
        database.deleteAllNotes();
        return ResponseEntity.ok(Map.of("message", "All notes and B2 files deleted successfully", "deletedNotes", count, "purgedB2Objects", purgedB2));
    }

    @GetMapping("/files/{noteId}")
    public ResponseEntity<Map<String, String>> downloadFile(@PathVariable String noteId) {
        return database.getNoteById(noteId).map(note -> {
            String fileUrl = note.getFileUrl();
            if (fileUrl != null && fileUrl.startsWith("http")) {
                return ResponseEntity.ok(Map.of(
                        "noteId", noteId,
                        "url", fileUrl
                ));
            }
            return ResponseEntity.ok(Map.of(
                    "noteId", noteId,
                    "url", "/api/files/raw/" + fileUrl
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/files/{noteId}/raw")
    public ResponseEntity<Resource> getNoteRawById(@PathVariable String noteId) {
        Optional<Note> noteOpt = database.getNoteById(noteId);
        if (noteOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, max-age=0, must-revalidate")
                    .header(HttpHeaders.PRAGMA, "no-cache")
                    .build();
        }
        Note note = noteOpt.get();
        String fileName = (note.getOriginalFilename() != null && !note.getOriginalFilename().isBlank())
                ? note.getOriginalFilename()
                : (note.getFileUrl() != null && !note.getFileUrl().isBlank()
                    ? note.getFileUrl()
                    : (note.getTitle() != null ? note.getTitle() : "document"));

        // 1. Try local storage
        if (note.getFileUrl() != null) {
            Path path = fileStorageService.getFilePath(note.getFileUrl());
            if (!Files.exists(path)) {
                path = Paths.get("./data").resolve(note.getFileUrl());
            }
            if (!Files.exists(path)) {
                path = Paths.get("./backend/data").resolve(note.getFileUrl());
            }
            if (Files.exists(path)) {
                try {
                    Resource resource = new UrlResource(path.toUri());
                    String contentType = Files.probeContentType(path);
                    if (contentType == null) contentType = resolveContentType(note.getFileUrl());
                    return ResponseEntity.ok()
                            .contentType(MediaType.parseMediaType(contentType))
                            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + path.getFileName().toString() + "\"")
                            .header(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                            .header(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, "GET, OPTIONS")
                            .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                            .body(resource);
                } catch (Exception ignored) {}
            }
        }

        // 2. Try S3/R2 storage with multi-key candidates
        byte[] foundBytes = null;
        boolean transientStorageError = false;
        Throwable lastStorageError = null;

        if (backblazeStorageService != null) {
            LinkedHashSet<String> candidates = new LinkedHashSet<>();
            if (note.getB2ObjectKey() != null && !note.getB2ObjectKey().isBlank()) {
                candidates.add(note.getB2ObjectKey().trim());
                if (note.getB2ObjectKey().contains("/")) {
                    candidates.add(note.getB2ObjectKey().substring(note.getB2ObjectKey().lastIndexOf('/') + 1).trim());
                }
            }
            if (note.getFileUrl() != null && !note.getFileUrl().isBlank() && !note.getFileUrl().startsWith("http")) {
                candidates.add(note.getFileUrl().trim());
                if (note.getFileUrl().contains("/")) {
                    candidates.add(note.getFileUrl().substring(note.getFileUrl().lastIndexOf('/') + 1).trim());
                }
            }
            if (note.getOriginalFilename() != null && !note.getOriginalFilename().isBlank()) {
                candidates.add(note.getOriginalFilename().trim());
                if (note.getImportBatchId() != null && !note.getImportBatchId().isBlank()) {
                    candidates.add(note.getImportBatchId().trim() + "/" + note.getOriginalFilename().trim());
                }
            }

            for (String key : candidates) {
                try {
                    byte[] bytes = backblazeStorageService.getObjectBytes(key);
                    if (bytes != null && bytes.length > 0) {
                        foundBytes = bytes;
                        break;
                    }
                } catch (Exception e) {
                    if (isTransientStorageException(e)) {
                        transientStorageError = true;
                        lastStorageError = e;
                    }
                }
            }

            if (foundBytes != null && foundBytes.length > 0) {
                String contentType = resolveContentType(fileName);
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                        .header(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                        .header(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, "GET, OPTIONS")
                        .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                        .body(new ByteArrayResource(foundBytes));
            }
        }

        if (transientStorageError) {
            HttpStatus status = HttpStatus.BAD_GATEWAY;
            if (lastStorageError != null) {
                if (lastStorageError instanceof BackblazeStorageService.StorageUnavailableException sue && sue.getStatusCode() == 503) {
                    status = HttpStatus.SERVICE_UNAVAILABLE;
                } else if (lastStorageError instanceof S3Exception s3e && s3e.statusCode() == 503) {
                    status = HttpStatus.SERVICE_UNAVAILABLE;
                } else if (lastStorageError.getMessage() != null && lastStorageError.getMessage().contains("503")) {
                    status = HttpStatus.SERVICE_UNAVAILABLE;
                }
            }
            return ResponseEntity.status(status)
                    .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, max-age=0, must-revalidate")
                    .header(HttpHeaders.PRAGMA, "no-cache")
                    .header("Retry-After", "3")
                    .build();
        }

        // For binary documents (PDF, DOCX, etc.), do NOT fall back to 200 text/plain when binary is missing
        if (isBinaryDocument(note, fileName)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, max-age=0, must-revalidate")
                    .header(HttpHeaders.PRAGMA, "no-cache")
                    .build();
        }

        // 3. Resilient Fallback for non-binary text notes
        if (note.getExtractedText() != null && !note.getExtractedText().isBlank()) {
            byte[] textBytes = note.getExtractedText().getBytes(java.nio.charset.StandardCharsets.UTF_8);
            String txtFileName = (note.getTitle() != null ? note.getTitle().replaceAll("[\\\\/:*?\"<>|]", "_") : "notes") + ".txt";
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_PLAIN)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + txtFileName + "\"")
                    .header(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                    .header(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, "GET, OPTIONS")
                    .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, max-age=0, must-revalidate")
                    .header(HttpHeaders.PRAGMA, "no-cache")
                    .body(new ByteArrayResource(textBytes));
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, max-age=0, must-revalidate")
                .header(HttpHeaders.PRAGMA, "no-cache")
                .build();
    }

    @GetMapping("/files/{noteId}/pdf")
    public ResponseEntity<Resource> getNoteAsPdf(@PathVariable String noteId) {
        Optional<Note> noteOpt = database.getNoteById(noteId);
        if (noteOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        Note note = noteOpt.get();
        String fileName = (note.getOriginalFilename() != null && !note.getOriginalFilename().isBlank())
                ? note.getOriginalFilename()
                : (note.getFileUrl() != null && !note.getFileUrl().isBlank()
                    ? note.getFileUrl()
                    : (note.getTitle() != null ? note.getTitle() : "document"));
        String lower = fileName.toLowerCase();

        if (lower.endsWith(".pdf")) {
            return getNoteRawById(noteId);
        }

        byte[] fileBytes = null;
        if (note.getFileUrl() != null) {
            Path path = fileStorageService.getFilePath(note.getFileUrl());
            if (!Files.exists(path)) path = Paths.get("./data").resolve(note.getFileUrl());
            if (!Files.exists(path)) path = Paths.get("./backend/data").resolve(note.getFileUrl());
            if (Files.exists(path)) {
                try {
                    fileBytes = Files.readAllBytes(path);
                } catch (Exception ignored) {}
            }
        }
        if (fileBytes == null && backblazeStorageService != null) {
            LinkedHashSet<String> candidates = new LinkedHashSet<>();
            if (note.getB2ObjectKey() != null && !note.getB2ObjectKey().isBlank()) {
                candidates.add(note.getB2ObjectKey().trim());
            }
            if (note.getFileUrl() != null && !note.getFileUrl().isBlank() && !note.getFileUrl().startsWith("http")) {
                candidates.add(note.getFileUrl().trim());
            }
            if (note.getOriginalFilename() != null && !note.getOriginalFilename().isBlank()) {
                candidates.add(note.getOriginalFilename().trim());
            }
            for (String key : candidates) {
                try {
                    byte[] bytes = backblazeStorageService.getObjectBytes(key);
                    if (bytes != null && bytes.length > 0) {
                        fileBytes = bytes;
                        break;
                    }
                } catch (Exception ignored) {}
            }
        }

        if (fileBytes != null && fileBytes.length > 0) {
            try {
                if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) {
                    byte[] pdfBytes = documentConversionService.convertPptToPdf(new ByteArrayInputStream(fileBytes), fileName);
                    return ResponseEntity.ok()
                            .contentType(MediaType.APPLICATION_PDF)
                            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName.replaceAll("(?i)\\.pptx?$", ".pdf") + "\"")
                            .header(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                            .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                            .body(new ByteArrayResource(pdfBytes));
                } else if (lower.endsWith(".docx")) {
                    Path tempDocx = Files.createTempFile("docx_", ".docx");
                    try {
                        Files.write(tempDocx, fileBytes);
                        byte[] pdfBytes = documentConversionService.convertDocxToPdf(tempDocx);
                        return ResponseEntity.ok()
                                .contentType(MediaType.APPLICATION_PDF)
                                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName.replaceAll("(?i)\\.docx?$", ".pdf") + "\"")
                                .header(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                                .body(new ByteArrayResource(pdfBytes));
                    } finally {
                        Files.deleteIfExists(tempDocx);
                    }
                }
            } catch (Exception e) {
                logger.warn("PDF conversion failed for noteId {}: {}", noteId, e.getMessage());
            }
        }

        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).build();
    }

    private boolean isTransientStorageException(Throwable t) {
        if (t == null) return false;
        Throwable current = t;
        while (current != null) {
            if (current instanceof NoSuchKeyException) {
                return false;
            }
            if (current instanceof S3Exception s3e) {
                if (s3e.statusCode() == 404) {
                    return false;
                }
                return true;
            }
            if (current instanceof BackblazeStorageService.StorageUnavailableException) {
                return true;
            }
            current = current.getCause();
        }
        return true;
    }

    private boolean isBinaryDocument(Note note, String fileName) {
        if (fileName != null && fileName.contains(".")) {
            String ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
            if (ext.equals(".txt") || ext.equals(".text") || ext.equals(".md") || ext.equals(".csv") || ext.equals(".log") || ext.equals(".json") || ext.equals(".xml") || ext.equals(".html")) {
                return false;
            }
            return true;
        }
        if (note != null) {
            if (note.getOriginalFilename() != null && isBinaryDocument(null, note.getOriginalFilename())) {
                return true;
            }
            if (note.getFileUrl() != null && isBinaryDocument(null, note.getFileUrl())) {
                return true;
            }
            if (note.getB2ObjectKey() != null && isBinaryDocument(null, note.getB2ObjectKey())) {
                return true;
            }
        }
        return false;
    }

    private String resolveContentType(String fileName) {
        if (fileName == null) return "application/octet-stream";
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (lower.endsWith(".doc")) return "application/msword";
        if (lower.endsWith(".pptx")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        if (lower.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
        if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }

    @GetMapping("/files/raw/{*fileName}")
    public ResponseEntity<Resource> getRawFile(@PathVariable String fileName) {
        if (fileName == null || fileName.contains("..") || fileName.contains("\\")) {
            return ResponseEntity.badRequest().build();
        }
        if (fileName.startsWith("/")) {
            fileName = fileName.substring(1);
        }
        Path path = fileStorageService.getFilePath(fileName);
        if (!java.nio.file.Files.exists(path)) {
            path = Paths.get("./data").resolve(fileName);
        }
        if (!java.nio.file.Files.exists(path)) {
            path = Paths.get("./backend/data").resolve(fileName);
        }

        if (java.nio.file.Files.exists(path)) {
            try {
                Resource resource = new UrlResource(path.toUri());
                String contentType = java.nio.file.Files.probeContentType(path);
                if (contentType == null) contentType = resolveContentType(fileName);
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                        .header(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                        .header(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, "GET, OPTIONS")
                        .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                        .body(resource);
            } catch (Exception e) {
                // fall through
            }
        }

        // Fallback: Stream directly from Backblaze B2 if available
        byte[] foundBytes = null;
        boolean transientStorageError = false;
        Throwable lastStorageError = null;

        if (backblazeStorageService != null) {
            LinkedHashSet<String> b2KeyCandidates = new LinkedHashSet<>();
            b2KeyCandidates.add(fileName);
            if (fileName.contains("/")) {
                b2KeyCandidates.add(fileName.substring(fileName.lastIndexOf('/') + 1));
            }
            String finalName = fileName;
            database.getAllNotes().stream()
                    .filter(n -> finalName.equals(n.getFileUrl()) ||
                            (n.getB2ObjectKey() != null && (n.getB2ObjectKey().equals(finalName) || n.getB2ObjectKey().endsWith("/" + finalName) || n.getB2ObjectKey().contains(finalName))) ||
                            finalName.equals(n.getOriginalFilename()) ||
                            (n.getOriginalFilename() != null && finalName.endsWith(n.getOriginalFilename())))
                    .findFirst()
                    .ifPresent(n -> {
                        if (n.getB2ObjectKey() != null) b2KeyCandidates.add(n.getB2ObjectKey());
                        if (n.getFileUrl() != null) b2KeyCandidates.add(n.getFileUrl());
                        if (n.getOriginalFilename() != null) b2KeyCandidates.add(n.getOriginalFilename());
                    });

            for (String key : b2KeyCandidates) {
                try {
                    byte[] bytes = backblazeStorageService.getObjectBytes(key);
                    if (bytes != null && bytes.length > 0) {
                        foundBytes = bytes;
                        break;
                    }
                } catch (Exception e) {
                    if (isTransientStorageException(e)) {
                        transientStorageError = true;
                        lastStorageError = e;
                    }
                }
            }
        }

        if (foundBytes != null && foundBytes.length > 0) {
            String contentType = resolveContentType(fileName);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                    .header(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                    .header(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, "GET, OPTIONS")
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                    .body(new org.springframework.core.io.ByteArrayResource(foundBytes));
        }

        if (transientStorageError) {
            HttpStatus status = HttpStatus.BAD_GATEWAY;
            if (lastStorageError != null) {
                if (lastStorageError instanceof BackblazeStorageService.StorageUnavailableException sue && sue.getStatusCode() == 503) {
                    status = HttpStatus.SERVICE_UNAVAILABLE;
                } else if (lastStorageError instanceof S3Exception s3e && s3e.statusCode() == 503) {
                    status = HttpStatus.SERVICE_UNAVAILABLE;
                } else if (lastStorageError.getMessage() != null && lastStorageError.getMessage().contains("503")) {
                    status = HttpStatus.SERVICE_UNAVAILABLE;
                }
            }
            return ResponseEntity.status(status)
                    .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, max-age=0, must-revalidate")
                    .header(HttpHeaders.PRAGMA, "no-cache")
                    .header("Retry-After", "3")
                    .build();
        }

        // For binary documents, do NOT fall back to 200 text/plain when binary is missing
        if (isBinaryDocument(null, fileName)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, max-age=0, must-revalidate")
                    .header(HttpHeaders.PRAGMA, "no-cache")
                    .build();
        }

        // Fallback: If not found in storage and not a binary document, check database for extracted text
        final String lookupTarget = fileName;
        Optional<Note> matchingNote = database.getAllNotes().stream()
                .filter(n -> lookupTarget.equals(n.getFileUrl()) ||
                        (n.getB2ObjectKey() != null && (n.getB2ObjectKey().equals(lookupTarget) || n.getB2ObjectKey().endsWith("/" + lookupTarget))) ||
                        lookupTarget.equals(n.getOriginalFilename()))
                .findFirst();
        if (matchingNote.isPresent() && matchingNote.get().getExtractedText() != null && !matchingNote.get().getExtractedText().isBlank()) {
            byte[] textBytes = matchingNote.get().getExtractedText().getBytes(java.nio.charset.StandardCharsets.UTF_8);
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_PLAIN)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"extracted_notes.txt\"")
                    .header(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                    .header(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, "GET, OPTIONS")
                    .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, max-age=0, must-revalidate")
                    .header(HttpHeaders.PRAGMA, "no-cache")
                    .body(new org.springframework.core.io.ByteArrayResource(textBytes));
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, max-age=0, must-revalidate")
                .header(HttpHeaders.PRAGMA, "no-cache")
                .build();
    }

    /**
     * Returns a direct, CORS-safe proxy URL for viewing or downloading the file.
     */
    @GetMapping("/files/{noteId}/presigned")
    public ResponseEntity<Map<String, String>> getPresignedUrl(@PathVariable String noteId) {
        return database.getNoteById(noteId).map(note -> {
            // Return same-origin proxy to ensure browser fetches, pdfjs, and mobile views never hit B2 CORS
            return ResponseEntity.ok(Map.of(
                    "noteId", noteId,
                    "url", "/api/files/" + noteId + "/raw"
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/notes/upload")
    public ResponseEntity<Map<String, String>> uploadNote(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam("subjectId") String subjectId,
            @RequestParam(value = "department", required = false) String departmentParam,
            @RequestParam(value = "semester", required = false) String semesterParam,
            @RequestParam(value = "unit", required = false, defaultValue = "Unit 1") String unit,
            @RequestParam(value = "examType", required = false, defaultValue = "mid-sem") String examType,
            @RequestParam(value = "category", required = false, defaultValue = "Notes") String category,
            @RequestParam(value = "tags", required = false) String tagsJson,
            @RequestParam(value = "uploaderName", required = false, defaultValue = "Anonymous") String uploaderName) {

        // 0. Validate Subject
        Optional<Subject> subjectOpt = database.getSubjectById(subjectId);
        if (subjectOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid subject. Please select a subject from your dashboard."));
        }
        Subject targetSubject = subjectOpt.get();

        // 1. Parse tags from JSON string
        List<String> tags = List.of();
        if (tagsJson != null && !tagsJson.trim().isEmpty()) {
            try {
                tags = mapper.readValue(tagsJson, new TypeReference<List<String>>() {});
            } catch (Exception e) {
                logger.warn("Failed to parse tags JSON: " + tagsJson, e);
            }
        }

        // 2. Extract department and semester directly from selected subject or request parameters
        String department = (targetSubject.getDepartment() != null && !targetSubject.getDepartment().isBlank())
                ? targetSubject.getDepartment()
                : ((departmentParam != null && !departmentParam.isBlank()) ? departmentParam.trim() : "General");
        String semester = (targetSubject.getSemester() != null && !targetSubject.getSemester().isBlank())
                ? targetSubject.getSemester()
                : ((semesterParam != null && !semesterParam.isBlank()) ? semesterParam.trim() : "General");
        
        // 2. Extract text from the in-memory file BEFORE uploading (avoids re-downloading from B2)
        String extractedText = fileStorageService.extractTextFromMultipartFile(file);

        // 3. Construct deterministic B2 key: [CourseCode] [SubjectName]/[Unit]/[filename]
        String safeSubject = targetSubject != null && targetSubject.getName() != null
                ? targetSubject.getName().replaceAll("[\\\\/:*?\"<>|]", "_").trim()
                : "General";
        String safeUnit = (unit != null && !unit.isBlank()) ? unit.replaceAll("[\\\\/:*?\"<>|]", "_").trim() : "General";
        String coursePrefix = (targetSubject != null && targetSubject.getCode() != null && !targetSubject.getCode().isBlank())
                ? targetSubject.getCode().trim().toUpperCase() + " "
                : "";
        String courseFolder = (coursePrefix + safeSubject).trim();
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document.pdf";
        String safeOriginalName = originalName.replaceAll("[\\\\/:*?\"<>|#%&{}^~`\\[\\]]", "_").trim();
        String b2Key = courseFolder + "/" + safeUnit + "/" + safeOriginalName;

        String savedFileName = backblazeStorageService.uploadFile(file, b2Key);
        
        // 4. Create Note Record
        Note note = Note.builder()
                .id(UUID.randomUUID().toString())
                .title(title)
                .subjectId(subjectId)
                .department(department) // Auto-filled from profile
                .semester(semester) // Auto-filled from profile
                .unit(unit)
                .examType(examType)
                .fileUrl(b2Key)
                .b2ObjectKey(b2Key)
                .b2ObjectKey(savedFileName)
                .originalFilename(file.getOriginalFilename())
                .uploadedBy(uploaderName)
                .createdAt(LocalDate.now().format(DateTimeFormatter.ISO_DATE))
                .status("ready")
                .category(category != null && !category.isBlank() ? category : "Notes")
                .tags(tags != null ? tags : List.of())
                .extractedText(extractedText)
                .build();

        database.addNote(note);

        // Trigger Async AI generation and RAG ingestion
        geminiService.processNoteAsync(note.getId());
        ragService.ingestNote(note.getId());

        // Warn if text extraction failed (e.g. scanned/image-only PDF) — AI features will be skipped
        boolean textExtractionFailed = extractedText == null
                || extractedText.trim().isEmpty()
                || extractedText.equals("Failed to extract text.")
                || extractedText.startsWith("Text extraction only supported");

        if (textExtractionFailed) {
            logger.warn("Text extraction produced no usable content for note: {} ({}). AI features will be skipped.", note.getId(), savedFileName);
            return ResponseEntity.ok(Map.of(
                    "noteId", note.getId(),
                    "title", note.getTitle(),
                    "status", "processing",
                    "warning", "Text could not be extracted from this file. AI features (topics, questions, RAG chat) will not be available. Scanned or image-based PDFs are not supported."
            ));
        }

        return ResponseEntity.ok(Map.of(
                "noteId", note.getId(),
                "title", note.getTitle(),
                "status", "processing"
        ));
    }

    @GetMapping("/notes/{id}/doubts")
    public ResponseEntity<List<Doubt>> getDoubts(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader,
            @RequestHeader(value = "X-Teacher-Subjects", required = false) String teacherSubjectsHeader,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String teacherSubjects,
            @RequestParam(required = false) String prn,
            @RequestHeader(value = "X-Student-PRN", required = false) String headerPrn) {

        String effectivePrn = (prn != null && !prn.isBlank()) ? prn : headerPrn;
        StudentProfile callerProfile = (effectivePrn != null && !effectivePrn.isBlank()) ? database.getProfile(effectivePrn) : null;

        boolean isTeacher = (roleHeader != null && (roleHeader.equalsIgnoreCase("teacher") || roleHeader.equalsIgnoreCase("faculty") || roleHeader.equalsIgnoreCase("admin")))
                || (role != null && (role.equalsIgnoreCase("teacher") || role.equalsIgnoreCase("faculty") || role.equalsIgnoreCase("admin")))
                || (callerProfile != null && ("TEACHER".equalsIgnoreCase(callerProfile.getDob()) || "TEACHER".equalsIgnoreCase(callerProfile.getRole())));

        if (isTeacher) {
            Optional<Note> noteOpt = database.getNoteById(id);
            if (noteOpt.isEmpty()) {
                return ResponseEntity.ok(java.util.Collections.emptyList());
            }
            Note note = noteOpt.get();
            String noteSubId = note.getSubjectId();

            Set<String> selectedSubs = TeacherSubjectMatcher.parseSubjectList(teacherSubjectsHeader, teacherSubjects);

            if (callerProfile != null) {
                if (callerProfile.getSelectedSubjects() != null) {
                    for (String s : callerProfile.getSelectedSubjects()) {
                        TeacherSubjectMatcher.addSubjectsFromString(selectedSubs, s);
                    }
                }
                if (callerProfile.getSubjectIds() != null) {
                    for (String s : callerProfile.getSubjectIds()) {
                        TeacherSubjectMatcher.addSubjectsFromString(selectedSubs, s);
                    }
                }
            }

            // If teacher has not selected any subjects, return empty doubts list
            if (selectedSubs.isEmpty()) {
                return ResponseEntity.ok(java.util.Collections.emptyList());
            }

            String noteSubjectName = null;
            String noteSubjectCode = null;
            if (noteSubId != null && !noteSubId.isBlank()) {
                Optional<Subject> subOpt = database.getSubjectById(noteSubId);
                if (subOpt.isPresent()) {
                    Subject s = subOpt.get();
                    noteSubjectName = s.getName();
                    noteSubjectCode = s.getCode();
                }
            }

            boolean matches = TeacherSubjectMatcher.matchesAnySubject(selectedSubs, noteSubId, noteSubjectName, noteSubjectCode, note.getTitle());
            if (!matches) {
                return ResponseEntity.ok(java.util.Collections.emptyList());
            }
        }

        return ResponseEntity.ok(database.getDoubtsByNoteId(id));
    }

    public ResponseEntity<List<Doubt>> getAllDoubts(
            String roleHeader,
            String teacherSubjectsHeader,
            String headerPrn,
            String role,
            String teacherSubjects,
            String prn,
            String noteId) {
        return getAllDoubts(roleHeader, teacherSubjectsHeader, headerPrn, role, teacherSubjects, prn, noteId, null, null);
    }

    @GetMapping("/doubts")
    public ResponseEntity<List<Doubt>> getAllDoubts(
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader,
            @RequestHeader(value = "X-Teacher-Subjects", required = false) String teacherSubjectsHeader,
            @RequestHeader(value = "X-Student-PRN", required = false) String headerPrn,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String teacherSubjects,
            @RequestParam(required = false) String prn,
            @RequestParam(required = false) String noteId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {

        if (noteId != null && !noteId.isBlank()) {
            return getDoubts(noteId, roleHeader, teacherSubjectsHeader, role, teacherSubjects, prn, headerPrn);
        }

        String effectivePrn = (prn != null && !prn.isBlank()) ? prn : headerPrn;
        StudentProfile callerProfile = (effectivePrn != null && !effectivePrn.isBlank()) ? database.getProfile(effectivePrn) : null;

        boolean isTeacher = (roleHeader != null && (roleHeader.equalsIgnoreCase("teacher") || roleHeader.equalsIgnoreCase("faculty") || roleHeader.equalsIgnoreCase("admin")))
                || (role != null && (role.equalsIgnoreCase("teacher") || role.equalsIgnoreCase("faculty") || role.equalsIgnoreCase("admin")))
                || (callerProfile != null && ("TEACHER".equalsIgnoreCase(callerProfile.getDob()) || "TEACHER".equalsIgnoreCase(callerProfile.getRole())));

        if (!isTeacher) {
            return paginate(database.getAllDoubts(), page, size);
        }

        Set<String> selectedSubs = new HashSet<>();
        selectedSubs = TeacherSubjectMatcher.parseSubjectList(teacherSubjectsHeader, teacherSubjects);
        if (callerProfile != null) {
            if (callerProfile.getSelectedSubjects() != null) {
                for (String s : callerProfile.getSelectedSubjects()) {
                    TeacherSubjectMatcher.addSubjectsFromString(selectedSubs, s);
                }
            }
            if (callerProfile.getSubjectIds() != null) {
                for (String s : callerProfile.getSubjectIds()) {
                    TeacherSubjectMatcher.addSubjectsFromString(selectedSubs, s);
                }
            }
        }
        if (selectedSubs.isEmpty()) {
            return paginate(java.util.Collections.emptyList(), page, size);
        }

        List<Note> allNotes = database.getAllNoteSummaries();
        if (allNotes == null || allNotes.isEmpty()) {
            allNotes = database.getAllNotes();
        }
        List<String> matchingNoteIds = new java.util.ArrayList<>();
        for (Note n : allNotes) {
            String noteSubId = n.getSubjectId();
            String noteSubjectName = null;
            String noteSubjectCode = null;
            if (noteSubId != null && !noteSubId.isBlank()) {
                Optional<Subject> subOpt = database.getSubjectById(noteSubId);
                if (subOpt.isPresent()) {
                    Subject s = subOpt.get();
                    noteSubjectName = s.getName();
                    noteSubjectCode = s.getCode();
                }
            }
            boolean matches = TeacherSubjectMatcher.matchesAnySubject(selectedSubs, noteSubId, noteSubjectName, noteSubjectCode, n.getTitle());
            if (matches) {
                matchingNoteIds.add(n.getId());
            }
        }

        return paginate(database.getDoubtsByNoteIds(matchingNoteIds), page, size);
    }

    @PostMapping("/notes/{id}/doubts")
    public ResponseEntity<Doubt> addDoubt(@PathVariable String id, @RequestBody Map<String, String> payload) {
        String question = payload.get("question");
        String studentName = payload.get("studentName");
        
        if (question == null || question.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        Doubt doubt = Doubt.builder()
                .id(UUID.randomUUID().toString())
                .noteId(id)
                .studentName(studentName != null ? studentName : "Anonymous")
                .question(question)
                .createdAt(LocalDate.now().format(DateTimeFormatter.ISO_DATE))
                .status("pending")
                .build();

        database.addDoubt(doubt);
        return ResponseEntity.ok(doubt);
    }

    @PutMapping("/doubts/{doubtId}/answer")
    public ResponseEntity<?> answerDoubt(
            @PathVariable String doubtId,
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader,
            @RequestHeader(value = "X-Teacher-Subjects", required = false) String teacherSubjectsHeader,
            @RequestHeader(value = "X-Student-PRN", required = false) String headerPrn,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String prn,
            @RequestParam(required = false) String teacherSubjects,
            @RequestBody Map<String, String> payload) {

        String answer = payload.get("answer");
        if (answer == null || answer.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Answer cannot be empty"));
        }

        Optional<Doubt> doubtOpt = database.getDoubtById(doubtId);

        if (doubtOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Doubt doubt = doubtOpt.get();
        Note note = database.getNoteById(doubt.getNoteId()).orElse(null);

        String effectivePrn = (prn != null && !prn.isBlank()) ? prn : headerPrn;
        StudentProfile callerProfile = (effectivePrn != null && !effectivePrn.isBlank()) ? database.getProfile(effectivePrn) : null;
        boolean isTeacher = (roleHeader != null && (roleHeader.equalsIgnoreCase("teacher") || roleHeader.equalsIgnoreCase("faculty") || roleHeader.equalsIgnoreCase("admin")))
                || (role != null && (role.equalsIgnoreCase("teacher") || role.equalsIgnoreCase("faculty") || role.equalsIgnoreCase("admin")))
                || (callerProfile != null && ("TEACHER".equalsIgnoreCase(callerProfile.getDob()) || "TEACHER".equalsIgnoreCase(callerProfile.getRole())));

        if (isTeacher && note != null) {
            Set<String> selectedSubs = TeacherSubjectMatcher.parseSubjectList(teacherSubjectsHeader, teacherSubjects);
            if (callerProfile != null) {
                if (callerProfile.getSelectedSubjects() != null) {
                    for (String s : callerProfile.getSelectedSubjects()) {
                        TeacherSubjectMatcher.addSubjectsFromString(selectedSubs, s);
                    }
                }
                if (callerProfile.getSubjectIds() != null) {
                    for (String s : callerProfile.getSubjectIds()) {
                        TeacherSubjectMatcher.addSubjectsFromString(selectedSubs, s);
                    }
                }
            }

            String noteSubId = note.getSubjectId();
            String noteSubjectName = null;
            String noteSubjectCode = null;
            if (noteSubId != null && !noteSubId.isBlank()) {
                Optional<Subject> subOpt = database.getSubjectById(noteSubId);
                if (subOpt.isPresent()) {
                    noteSubjectName = subOpt.get().getName();
                    noteSubjectCode = subOpt.get().getCode();
                }
            }

            boolean matches = TeacherSubjectMatcher.matchesAnySubject(selectedSubs, noteSubId, noteSubjectName, noteSubjectCode, note.getTitle());
            if (!matches) {
                return ResponseEntity.status(403).body(Map.of("error", "You can only answer doubts for subjects you have selected."));
            }
        }

        doubt.setAnswer(answer.trim());
        doubt.setStatus("answered");
        database.updateDoubt(doubt);
        return ResponseEntity.ok(doubt);
    }

    // --- PYQ Endpoints ---

    public ResponseEntity<List<com.eduvault.model.PYQ>> getPyqs(String subjectId, String examType) {
        return getPyqs(subjectId, examType, null, null);
    }

    @GetMapping("/pyqs")
    public ResponseEntity<List<com.eduvault.model.PYQ>> getPyqs(
            @RequestParam(required = false) String subjectId,
            @RequestParam(required = false) String examType,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return paginate(database.getPyqsByFilter(subjectId, examType), page, size);
    }

    @PostMapping("/pyqs")
    public ResponseEntity<com.eduvault.model.PYQ> uploadPyq(@RequestBody com.eduvault.model.PYQ pyq) {
        if (pyq.getId() == null) pyq.setId(UUID.randomUUID().toString());
        if (pyq.getCreatedAt() == null) pyq.setCreatedAt(LocalDate.now().format(DateTimeFormatter.ISO_DATE));
        return ResponseEntity.ok(database.addPyq(pyq));
    }

    @PostMapping(value = "/pyqs/predict", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> predictPyqs(@RequestBody Map<String, String> payload) {
        String pyqText = payload.get("pyqText");
        String qbText = payload.get("qbText");
        return ResponseEntity.ok(geminiService.generateStudyGuide(pyqText, qbText));
    }

    @DeleteMapping("/pyqs")
    public ResponseEntity<?> clearAllPyqs() {
        database.deleteAllPyqs();
        return ResponseEntity.ok(Map.of("message", "All PYQs deleted successfully."));
    }

    @DeleteMapping("/pyqs/{id}")
    public ResponseEntity<?> deletePyq(@PathVariable String id) {
        database.deletePyq(id);
        return ResponseEntity.ok(Map.of("message", "PYQ deleted successfully."));
    }

    // --- Announcement Endpoints (Full CRUD with Permissions & Persistence) ---

    public ResponseEntity<List<com.eduvault.model.Announcement>> getAnnouncements() {
        return getAnnouncements(null, null);
    }

    @GetMapping("/announcements")
    public ResponseEntity<List<com.eduvault.model.Announcement>> getAnnouncements(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return paginate(database.getAllAnnouncements(), page, size);
    }

    @GetMapping("/announcements/recent")
    public ResponseEntity<List<com.eduvault.model.Announcement>> getRecentAnnouncements() {
        return ResponseEntity.ok(database.getRecentAnnouncements(5));
    }

    @GetMapping("/announcements/{id}")
    public ResponseEntity<com.eduvault.model.Announcement> getAnnouncementById(@PathVariable String id) {
        return database.getAnnouncementById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/announcements")
    public ResponseEntity<?> createAnnouncement(
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader,
            @RequestBody com.eduvault.model.Announcement announcement) {
        boolean isTeacher = roleHeader != null && (roleHeader.equalsIgnoreCase("teacher") || roleHeader.equalsIgnoreCase("faculty") || roleHeader.equalsIgnoreCase("admin"));
        if (!isTeacher) {
            return ResponseEntity.status(403).body(Map.of("error", "Permission Denied: Only teachers/faculty can post announcements"));
        }
        if (announcement.getTitle() == null || announcement.getTitle().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Title is required for notice"));
        }
        if (announcement.getId() == null) announcement.setId(UUID.randomUUID().toString());
        if (announcement.getCreatedAt() == null) announcement.setCreatedAt(LocalDate.now().format(DateTimeFormatter.ISO_DATE));
        if (announcement.getPostedBy() == null || announcement.getPostedBy().isBlank()) {
            announcement.setPostedBy("Faculty / Department");
        }
        return ResponseEntity.ok(database.addAnnouncement(announcement));
    }

    @PutMapping("/announcements/{id}")
    public ResponseEntity<?> updateAnnouncement(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader,
            @RequestBody com.eduvault.model.Announcement announcement) {
        boolean isTeacher = roleHeader != null && (roleHeader.equalsIgnoreCase("teacher") || roleHeader.equalsIgnoreCase("faculty") || roleHeader.equalsIgnoreCase("admin"));
        if (!isTeacher) {
            return ResponseEntity.status(403).body(Map.of("error", "Permission Denied: Only teachers/faculty can update notices"));
        }
        return database.updateAnnouncement(id, announcement)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/announcements/{id}")
    public ResponseEntity<?> deleteAnnouncement(
            @PathVariable String id,
            @RequestHeader(value = "X-User-Role", required = false) String roleHeader) {
        boolean isTeacher = roleHeader != null && (roleHeader.equalsIgnoreCase("teacher") || roleHeader.equalsIgnoreCase("faculty") || roleHeader.equalsIgnoreCase("admin"));
        if (!isTeacher) {
            return ResponseEntity.status(403).body(Map.of("error", "Permission Denied: Only teachers/faculty can delete notices"));
        }
        boolean deleted = database.deleteAnnouncement(id);
        if (deleted) {
            return ResponseEntity.ok(Map.of("message", "Notice successfully deleted", "id", id));
        }
        return ResponseEntity.notFound().build();
    }

    // --- Roadmap Endpoints ---

    public ResponseEntity<List<com.eduvault.model.PredefinedRoadmap>> getRoadmaps() {
        return getRoadmaps(null, null);
    }

    @GetMapping("/roadmaps")
    public ResponseEntity<List<com.eduvault.model.PredefinedRoadmap>> getRoadmaps(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return paginate(database.getAllRoadmaps(), page, size);
    }

    @GetMapping("/roadmaps/{id}")
    public ResponseEntity<com.eduvault.model.PredefinedRoadmap> getRoadmap(@PathVariable String id) {
        return database.getRoadmapById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // --- Timeline Endpoints ---

    public ResponseEntity<List<com.eduvault.model.TimelineEvent>> getTimeline() {
        return getTimeline(null, null);
    }

    @GetMapping("/timeline")
    public ResponseEntity<List<com.eduvault.model.TimelineEvent>> getTimeline(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return paginate(database.getAllTimelineEvents(), page, size);
    }

    @PostMapping("/timeline")
    public ResponseEntity<com.eduvault.model.TimelineEvent> createTimelineEvent(@RequestBody com.eduvault.model.TimelineEvent event) {
        if (event.getId() == null) event.setId(UUID.randomUUID().toString());
        database.addTimelineEvent(event);
        return ResponseEntity.ok(event);
    }

    @PutMapping("/timeline/{id}")
    public ResponseEntity<com.eduvault.model.TimelineEvent> updateTimelineEvent(@PathVariable String id, @RequestBody com.eduvault.model.TimelineEvent event) {
        event.setId(id);
        database.updateTimelineEvent(event);
        return ResponseEntity.ok(event);
    }

    @DeleteMapping("/timeline/{id}")
    public ResponseEntity<Map<String, String>> deleteTimelineEvent(@PathVariable String id) {
        database.deleteTimelineEvent(id);
        return ResponseEntity.ok(Map.of("message", "Event deleted"));
    }

}

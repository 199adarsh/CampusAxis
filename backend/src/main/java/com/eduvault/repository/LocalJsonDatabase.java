package com.eduvault.repository;

import com.eduvault.model.*;
import com.eduvault.util.AcademicNormalizer;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Repository;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;

@Repository
@Primary
public class LocalJsonDatabase {

    private static final Logger logger = LoggerFactory.getLogger(LocalJsonDatabase.class);

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private StudentProfileRepository studentProfileRepository;

    @Autowired
    private DoubtRepository doubtRepository;

    @Autowired
    private PYQRepository pyqRepository;

    @Autowired
    private AnnouncementRepository announcementRepository;

    @Autowired
    private PredefinedRoadmapRepository predefinedRoadmapRepository;

    @Autowired
    private TimelineEventRepository timelineEventRepository;

    @Autowired
    private NcRequestRepository ncRequestRepository;

    @Autowired
    private NcNotificationRepository ncNotificationRepository;

    @Autowired
    @org.springframework.context.annotation.Lazy
    private com.eduvault.service.R2StorageService r2StorageService;

    @Autowired
    @org.springframework.context.annotation.Lazy
    private com.eduvault.service.FileStorageService fileStorageService;

    @Autowired(required = false)
    private javax.sql.DataSource dataSource;

    @Autowired(required = false)
    private org.springframework.cache.CacheManager cacheManager;

    private final ReentrantLock syncLock = new ReentrantLock();

    private void evictNoteCaches() {
        if (cacheManager != null) {
            org.springframework.cache.Cache c1 = cacheManager.getCache("allNotes");
            if (c1 != null) c1.clear();
            org.springframework.cache.Cache c2 = cacheManager.getCache("allNoteSummaries");
            if (c2 != null) c2.clear();
        }
    }

    private final ObjectMapper mapper = mapperWithJava8Time();

    private ObjectMapper mapperWithJava8Time() {
        ObjectMapper m = new ObjectMapper();
        m.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        return m;
    }

    @PostConstruct
    public void init() {
        logger.info("LocalJsonDatabase redirected to Supabase/PostgreSQL");

        if (dataSource != null) {
            try (java.sql.Connection conn = dataSource.getConnection();
                 java.sql.Statement stmt = conn.createStatement()) {
                stmt.execute("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS deadline VARCHAR(255)");
            } catch (Exception e) {
                logger.warn("Could not alter announcements table for deadline column: {}", e.getMessage());
            }

            try (java.sql.Connection conn = dataSource.getConnection();
                 java.sql.Statement stmt = conn.createStatement()) {
                stmt.execute("ALTER TABLE notes ADD COLUMN IF NOT EXISTS okf_status VARCHAR(50) DEFAULT 'PENDING'");
                stmt.execute("UPDATE notes SET okf_status = 'PENDING' WHERE okf_status IS NULL");
            } catch (Exception e) {
                logger.warn("Could not alter notes table for OKF columns: {}", e.getMessage());
            }

            try (java.sql.Connection conn = dataSource.getConnection();
                 java.sql.Statement stmt = conn.createStatement()) {
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_notes_subject_id ON notes(subject_id)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_notes_dept_sem ON notes(department, semester)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(status)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_notes_unit ON notes(unit)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_notes_okf_status ON notes(okf_status)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_notes_moodle_id ON notes(moodle_id)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_notes_source_url ON notes(source_url)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_notes_r2_key ON notes(r2_object_key)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_notes_uploaded_by ON notes(uploaded_by)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_notes_subject_unit ON notes(subject_id, unit)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_pyqs_subject_exam ON pyqs(subject_id, exam_type)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_nc_requests_student ON nc_requests(student_prn, created_at DESC)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_nc_requests_status ON nc_requests(status)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_doubts_note_id ON doubts(note_id)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_nc_notifications_recipient ON nc_notifications(recipient_prn, read)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_subjects_dept_sem ON subjects(department, semester)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code)");
                stmt.execute("CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects(name)");
            } catch (Exception e) {
                logger.warn("Could not ensure database indexes: {}", e.getMessage());
            }
        }

        Thread seedThread = new Thread(() -> {
            try {
                // Seed Subjects if empty
                seedIfEmpty("subjects.json", new com.fasterxml.jackson.core.type.TypeReference<List<Subject>>() {}, list -> subjectRepository.saveAll(list), subjectRepository.count());

                // Seed Notes if empty
                seedIfEmpty("notes.json", new com.fasterxml.jackson.core.type.TypeReference<List<Note>>() {}, list -> noteRepository.saveAll(list), noteRepository.count());

                // Seed Announcements if empty
                seedIfEmpty("announcements.json", new com.fasterxml.jackson.core.type.TypeReference<List<Announcement>>() {}, list -> announcementRepository.saveAll(list), announcementRepository.count());

                // Purge legacy dummy timeline seeds if present
                try {
                    if (timelineEventRepository.existsById("e1")) timelineEventRepository.deleteById("e1");
                    if (timelineEventRepository.existsById("e2")) timelineEventRepository.deleteById("e2");
                } catch (Exception ignored) {}

                // Seed Timeline Events if empty
                seedIfEmpty("timeline.json", new com.fasterxml.jackson.core.type.TypeReference<List<TimelineEvent>>() {}, list -> timelineEventRepository.saveAll(list), timelineEventRepository.count());

                // Seed NC Requests if empty
                seedIfEmpty("nc_requests.json", new com.fasterxml.jackson.core.type.TypeReference<List<NcRequest>>() {}, list -> ncRequestRepository.saveAll(list), ncRequestRepository.count());

                // Seed NC Notifications if empty
                seedIfEmpty("nc_notifications.json", new com.fasterxml.jackson.core.type.TypeReference<List<NcNotification>>() {}, list -> ncNotificationRepository.saveAll(list), ncNotificationRepository.count());

                // Seed Predefined Roadmaps if empty
                if (predefinedRoadmapRepository.count() == 0) {
                    seedIfEmpty("roadmaps.json", new com.fasterxml.jackson.core.type.TypeReference<List<PredefinedRoadmap>>() {}, list -> predefinedRoadmapRepository.saveAll(list), 0);
                    if (predefinedRoadmapRepository.count() == 0) {
                        try {
                            org.springframework.core.io.ClassPathResource resource = new org.springframework.core.io.ClassPathResource("seed_roadmaps.json");
                            if (resource.exists()) {
                                List<PredefinedRoadmap> defaultRoadmaps = mapper.readValue(
                                        resource.getInputStream(),
                                        new com.fasterxml.jackson.core.type.TypeReference<List<PredefinedRoadmap>>() {}
                                );
                                predefinedRoadmapRepository.saveAll(defaultRoadmaps);
                                logger.info("Seeded predefined roadmaps from classpath resource");
                            }
                        } catch (IOException e) {
                            logger.error("Failed to seed predefined roadmaps", e);
                        }
                    }
                }

                // Seed Profile if empty
                if (studentProfileRepository.count() == 0) {
                    seedIfEmpty("profile.json", new com.fasterxml.jackson.core.type.TypeReference<StudentProfile>() {}, prof -> {
                        if (prof != null) studentProfileRepository.save(prof);
                    }, 0);
                }

                updateSubjectCounts();
                repairExistingNotes();
            } catch (Exception e) {
                logger.warn("Non-fatal background DB seed notice: {}", e.getMessage());
            }
        });
        seedThread.setName("db-seed-thread");
        seedThread.setDaemon(true);
        seedThread.start();
    }

    public int repairExistingNotes() {
        syncLock.lock();
        try {
            ensureCoreSubjects();
            List<Subject> subjects = subjectRepository.findAll();
            List<Note> allNotes = noteRepository.findAll();
            int repaired = 0;

            for (Note note : allNotes) {
                if (note.getR2ObjectKey() == null && note.getFileUrl() != null) {
                    note.setR2ObjectKey(note.getFileUrl());
                }

                boolean validSubject = note.getSubjectId() != null && subjects.stream().anyMatch(s -> s.getId().equals(note.getSubjectId()));
                if (!validSubject || "PENDING_MAPPING".equalsIgnoreCase(note.getStatus())) {
                    FolderInfo info = extractFolderInfoFromKey(note.getR2ObjectKey() != null ? note.getR2ObjectKey() : note.getFileUrl());
                    Subject matched = findSubjectFromFolderOrKey(info.subject, note.getR2ObjectKey(), subjects);
                    if (matched == null) {
                        matched = findSubjectFromContent(note.getExtractedText(), subjects);
                    }
                    if (matched == null && note.getTitle() != null) {
                        matched = findSubjectFromContent(note.getTitle(), subjects);
                    }
                    if (matched != null) {
                        note.setSubjectId(matched.getId());
                        note.setDepartment(matched.getDepartment());
                        note.setSemester(matched.getSemester());
                        note.setStatus("ready");
                        if (info.unit != null && !info.unit.isBlank()) {
                            note.setUnit(extractUnitFromContent(info.unit));
                        }
                        repaired++;
                    } else if (note.getSubjectId() == null || !validSubject) {
                        note.setSubjectId(null);
                        note.setStatus("UNRESOLVED");
                    }
                }
            }

            if (repaired > 0) {
                noteRepository.saveAll(allNotes);
                updateSubjectCounts();
                logger.info("Repaired {} existing note records according to subject schema", repaired);
            }
            return repaired;
        } catch (Exception e) {
            logger.warn("Error during repairExistingNotes: {}", e.getMessage());
            return 0;
        } finally {
            syncLock.unlock();
            evictNoteCaches();
        }
    }

    public int syncNotesFromR2() {
        if (r2StorageService == null) return 0;
        syncLock.lock();
        try {
            logger.info("Checking notes from Cloudflare R2 bucket...");

            List<software.amazon.awssdk.services.s3.model.S3Object> objects = r2StorageService.listAllObjects();
            if (objects.isEmpty()) return 0;

            java.util.Map<String, Note> existingByB2Key = new java.util.HashMap<>();
            java.util.Map<String, Note> existingByFileUrl = new java.util.HashMap<>();
            for (Note n : noteRepository.findAll()) {
                if (n.getR2ObjectKey() != null) existingByB2Key.put(n.getR2ObjectKey(), n);
                if (n.getFileUrl() != null) existingByFileUrl.put(n.getFileUrl(), n);
            }

            List<Subject> subjects = subjectRepository.findAll();
            List<Note> notesToSave = new java.util.ArrayList<>();
            int countNewOrUpdated = 0;

            java.util.Set<String> existingPyqUrls = new java.util.HashSet<>();
            try {
                for (com.eduvault.model.PYQ p : pyqRepository.findAll()) {
                    if (p.getFileUrl() != null) existingPyqUrls.add(p.getFileUrl());
                }
            } catch (Exception ex) {
                logger.warn("Could not pre-cache existing PYQ URLs: {}", ex.getMessage());
            }

            java.util.Map<String, Note> cachedNotesByKey = new java.util.HashMap<>();
            try {
                java.nio.file.Path notesJsonPath = java.nio.file.Paths.get("data", "notes.json");
                if (!java.nio.file.Files.exists(notesJsonPath)) {
                    notesJsonPath = java.nio.file.Paths.get("backend", "data", "notes.json");
                }
                if (java.nio.file.Files.exists(notesJsonPath)) {
                    List<Note> cachedList = mapper.readValue(notesJsonPath.toFile(), new com.fasterxml.jackson.core.type.TypeReference<List<Note>>() {});
                    if (cachedList != null) {
                        for (Note cn : cachedList) {
                            if (cn.getFileUrl() != null) cachedNotesByKey.put(cn.getFileUrl(), cn);
                        }
                    }
                }
            } catch (Exception ignored) {}

            for (software.amazon.awssdk.services.s3.model.S3Object obj : objects) {
                String key = obj.key();
                if (key.endsWith(".json") || key.endsWith("/") || key.startsWith(".") || key.startsWith("_config/")) continue;

                String filenameOnly = key.contains("/") ? key.substring(key.lastIndexOf('/') + 1) : key;
                String ext = key.contains(".") ? key.substring(key.lastIndexOf('.')) : "";

                FolderInfo folderInfo = extractFolderInfoFromKey(key);
                Subject matched = findSubjectFromFolderOrKey(folderInfo.subject, key, subjects);

                if (matched == null || !"B.Tech-UAD".equalsIgnoreCase(matched.getDepartment())) {
                    continue;
                }

                Note note = existingByB2Key.get(key);
                if (note == null) {
                    note = existingByFileUrl.get(key);
                }
                boolean isNew = (note == null);
                if (isNew) {
                    note = Note.builder()
                            .id(java.util.UUID.randomUUID().toString())
                            .uploadedBy("Cloudflare R2")
                            .createdAt(java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ISO_DATE))
                            .build();
                }

                note.setFileUrl(filenameOnly);
                note.setR2ObjectKey(key);

                String extractedText = note.getExtractedText();
                if (extractedText == null || extractedText.isBlank()) {
                    if (cachedNotesByKey.containsKey(key)) {
                        Note cached = cachedNotesByKey.get(key);
                        if (cached.getExtractedText() != null && !cached.getExtractedText().isBlank()) {
                            extractedText = cached.getExtractedText();
                        }
                    }

                    if ((extractedText == null || extractedText.isBlank()) && fileStorageService != null) {
                        try {
                            extractedText = fileStorageService.extractText(key);
                        } catch (Exception ignored) {}
                    }

                    if (extractedText != null && !extractedText.startsWith("File not found") && !extractedText.startsWith("Failed to extract")) {
                        note.setExtractedText(extractedText.length() > 5000 ? extractedText.substring(0, 5000) : extractedText);
                    }
                }

                String title = extractTitleFromContent(note.getExtractedText(), key, ext);
                note.setTitle(title);

                String unit = (folderInfo.unit != null && !folderInfo.unit.equalsIgnoreCase("General")) 
                        ? extractUnitFromContent(folderInfo.unit)
                        : extractUnitFromContent(note.getExtractedText());
                note.setUnit(unit);

                String lowerKey = key.toLowerCase();
                String category = "Notes";
                String examType = "mid-sem";

                if (lowerKey.contains("pyq") || lowerKey.contains("question paper") || lowerKey.contains("ese") || lowerKey.contains("see")) {
                    category = "PYQ";
                    examType = "end-sem";
                } else if (lowerKey.contains("syllabus")) {
                    category = "Syllabus";
                } else if (lowerKey.contains("lab") || lowerKey.contains("manual")) {
                    category = "Lab Manual";
                } else if (lowerKey.contains("lecture") || lowerKey.contains("plan")) {
                    category = "Lecture Plan";
                }
                note.setCategory(category);
                note.setExamType(examType);

                note.setSubjectId(matched.getId());
                note.setDepartment(matched.getDepartment());
                note.setSemester(matched.getSemester());
                note.setStatus("ready");

                if ("PYQ".equalsIgnoreCase(category) && !existingPyqUrls.contains(key)) {
                    try {
                        com.eduvault.model.PYQ pyq = com.eduvault.model.PYQ.builder()
                                .id(java.util.UUID.randomUUID().toString())
                                .subjectId(matched.getId())
                                .subjectName(matched.getName())
                                .year(String.valueOf(java.time.LocalDate.now().getYear()))
                                .examType(examType)
                                .tags("R2, PYQ, " + title)
                                .fileUrl(key)
                                .uploadedBy("Cloudflare R2")
                                .createdAt(java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ISO_DATE))
                                .build();
                        pyqRepository.save(pyq);
                        existingPyqUrls.add(key);
                    } catch (Exception ex) {
                        logger.warn("Failed to mirror PYQ for key {}: {}", key, ex.getMessage());
                    }
                }

                notesToSave.add(note);
                countNewOrUpdated++;
            }

            if (!notesToSave.isEmpty()) {
                noteRepository.saveAll(notesToSave);
                updateSubjectCounts();
                logger.info("Sync completed: {} notes processed idempotently (new/updated)", countNewOrUpdated);
            }
            return countNewOrUpdated;
        } catch (Exception e) {
            logger.error("Error during Cloudflare R2 note synchronization: {}", e.getMessage(), e);
        } finally {
            syncLock.unlock();
            evictNoteCaches();
        }
        return 0;
    }

    public int deleteDisposableTestImportNotes() {
        syncLock.lock();
        try {
            List<Note> testNotes = noteRepository.findByUploadedBy("Cloudflare R2");
            int deleted = 0;
            for (Note n : testNotes) {
                if (n.getFileUrl() != null && r2StorageService != null) {
                    try {
                        r2StorageService.deleteFile(n.getFileUrl());
                    } catch (Exception ex) {
                        logger.warn("Could not delete R2 file {}: {}", n.getFileUrl(), ex.getMessage());
                    }
                }
                noteRepository.delete(n);
                deleted++;
            }
            updateSubjectCounts();
            logger.info("Safely deleted {} disposable test-import notes and associated R2 files", deleted);
            return deleted;
        } catch (Exception e) {
            logger.error("Error deleting disposable test import notes: {}", e.getMessage(), e);
            return 0;
        } finally {
            syncLock.unlock();
            evictNoteCaches();
        }
    }

    private static class FolderInfo {
        String subject;
        String unit;
    }

    private FolderInfo extractFolderInfoFromKey(String key) {
        FolderInfo info = new FolderInfo();
        if (key == null || !key.contains("/")) return info;
        String[] parts = key.split("/");
        if (parts.length == 2) {
            info.subject = parts[0].replace("_", " ").trim();
        } else if (parts.length == 3) {
            String p1Upper = parts[1].toUpperCase().trim();
            if (p1Upper.startsWith("UNIT") || p1Upper.matches("(?i)U0?[1-6]") || p1Upper.equalsIgnoreCase("GENERAL") || p1Upper.equalsIgnoreCase("LAB") || p1Upper.equalsIgnoreCase("PYQ")) {
                info.subject = parts[0].replace("_", " ").trim();
                info.unit = parts[1].replace("_", " ").trim();
            } else {
                info.subject = parts[1].replace("_", " ").trim();
            }
        } else if (parts.length >= 4) {
            info.subject = parts[1].replace("_", " ").trim();
            info.unit = parts[2].replace("_", " ").trim();
        }
        return info;
    }

    public static String extractCourseCode(String text, String key) {
        String combined = (text != null ? text : "") + " " + (key != null ? key : "");
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("([0-9]{2}[A-Z]{2,6}[0-9]{3,4}[A-Z]?)").matcher(combined.toUpperCase());
        if (m.find()) return m.group(1);
        return null;
    }

    private Subject findSubjectFromFolderOrKey(String folderSubject, String fullKey, List<Subject> subjects) {
        if (subjects == null || subjects.isEmpty()) return null;

        // Extract potential course code from folder or key
        String code = AcademicNormalizer.extractCourseCode(folderSubject);
        if (code == null && fullKey != null) {
            code = AcademicNormalizer.extractCourseCode(fullKey);
        }

        // Tier 1 & Tier 3: Resolve using canonical 3-tier matcher (exact code, canonical ID, normalized exact name)
        if (folderSubject != null && !folderSubject.isBlank()) {
            Subject s = AcademicNormalizer.resolveSubject(folderSubject, code, null, subjects);
            if (s != null) return s;
        }

        // Try code match alone
        if (code != null) {
            Subject s = AcademicNormalizer.resolveSubject(null, code, null, subjects);
            if (s != null) return s;
        }

        // Try key segments
        if (fullKey != null && !fullKey.isBlank()) {
            String[] segments = fullKey.split("/");
            for (String seg : segments) {
                Subject s = AcademicNormalizer.resolveSubject(seg, null, null, subjects);
                if (s != null) return s;
            }
        }

        // Never generate detached subject IDs or fuzzy guesses! Return null if unresolved.
        return null;
    }

    private Subject findSubjectFromContent(String text, List<Subject> subjects) {
        if (text == null || text.isBlank() || subjects == null || subjects.isEmpty()) return null;
        String upper = text.toUpperCase();

        // 1. Match verified course codes first
        for (Subject s : subjects) {
            if (s.getCode() != null && !s.getCode().isBlank()) {
                String code = s.getCode().trim().toUpperCase();
                if (upper.contains(code)) {
                    return s;
                }
            }
        }

        // 2. Exact subject name matches
        for (Subject s : subjects) {
            if (s.getName() != null && !s.getName().isBlank()) {
                String name = s.getName().trim().toUpperCase();
                if (upper.equals(name)) return s;
            }
        }

        // 3. Substring matching prioritizing longer subject names first with Lab distinction
        List<Subject> sortedByNameLength = subjects.stream()
                .filter(s -> s.getName() != null && !s.getName().isBlank())
                .sorted((a, b) -> Integer.compare(b.getName().trim().length(), a.getName().trim().length()))
                .toList();

        boolean contentIsLab = upper.contains("LAB") || upper.contains("EXPERIMENT");

        for (Subject s : sortedByNameLength) {
            String name = s.getName().trim().toUpperCase();
            boolean subIsLab = name.contains("LAB") || (s.getCode() != null && s.getCode().toUpperCase().contains("P"));
            if (contentIsLab != subIsLab) continue;

            if (upper.contains(name)) {
                return s;
            }
        }

        // Never force incorrect mappings
        return null;
    }

    private String extractTitleFromContent(String text, String key, String ext) {
        if (text != null && !text.isBlank() 
                && !text.startsWith("File not found") 
                && !text.startsWith("Failed to extract") 
                && !text.startsWith("Text extraction only")) {
            String[] lines = text.split("\\r?\\n");
            for (String line : lines) {
                String trimmed = line.trim();
                if (trimmed.length() >= 4 && trimmed.length() <= 75 
                        && !trimmed.matches("^[0-9a-fA-F-]{36}.*")
                        && !trimmed.toLowerCase().contains("file not found")
                        && !trimmed.toLowerCase().contains("text extraction")) {
                    return trimmed;
                }
            }
        }
        String rawKey = key.contains("/") ? key.substring(key.lastIndexOf('/') + 1) : key;
        String base = rawKey.contains(".") ? rawKey.substring(0, rawKey.lastIndexOf('.')) : rawKey;
        String clean = base.replaceAll("^[0-9a-fA-F-]{36}[_-]?", "").trim();
        if (clean.isEmpty() || clean.matches("^[0-9a-fA-F-]{36}$")) {
            String shortId = base.length() > 8 ? base.substring(0, 8).toUpperCase() : base.toUpperCase();
            return "Asset " + shortId + " (" + ext.replace(".", "").toUpperCase() + ")";
        }
        return clean.replace("_", " ");
    }

    private String extractUnitFromContent(String text) {
        if (text == null || text.isBlank()) return "Unit 1";
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?i)unit[\\s_-]?0?([1-6])").matcher(text);
        if (m.find()) {
            return "Unit " + m.group(1);
        }
        return "Unit 1";
    }

    private <T> void seedIfEmpty(String fileName, com.fasterxml.jackson.core.type.TypeReference<T> typeRef, java.util.function.Consumer<T> saver, long currentCount) {
        if (currentCount > 0) return;
        try {
            java.nio.file.Path path = java.nio.file.Paths.get("data", fileName);
            if (!java.nio.file.Files.exists(path)) {
                path = java.nio.file.Paths.get("backend", "data", fileName);
            }
            if (java.nio.file.Files.exists(path)) {
                T data = mapper.readValue(path.toFile(), typeRef);
                if (data != null) {
                    saver.accept(data);
                    logger.info("Automatically seeded {} from {}", fileName, path);
                }
            }
        } catch (Exception e) {
            logger.warn("Could not seed {} on startup: {}", fileName, e.getMessage());
        }
    }

    public StudentProfile getProfile() {
        return studentProfileRepository.findAll().stream().findFirst().orElse(null);
    }

    public StudentProfile getProfile(String prn) {
        if (prn == null || prn.trim().isEmpty()) {
            return null;
        }
        return studentProfileRepository.findById(prn.trim()).orElse(null);
    }
    
    public StudentProfile updateProfile(StudentProfile newProfile) {
        if (newProfile == null || newProfile.getPrn() == null || newProfile.getPrn().trim().isEmpty()) {
            return null;
        }
        return studentProfileRepository.save(newProfile);
    }

    public void clearProfile() {
        // Multi-tenant protection: do not delete all profiles
    }

    public void clearProfileAndSubjects() {
        // Multi-tenant protection: do not wipe global database
    }

    public void registerSubjectsCatalog(List<DashboardSubject> dashboardSubjects, String dept, String sem) {
        if (dashboardSubjects == null || dashboardSubjects.isEmpty()) return;
        List<Subject> existing = subjectRepository.findAll();

        List<Subject> toSave = new java.util.ArrayList<>();
        for (DashboardSubject ds : dashboardSubjects) {
            // Strict 3-tier matching: Exact code first, canonical ID second, normalized exact name third. Reject ambiguous.
            Subject matched = AcademicNormalizer.resolveSubject(ds.getName(), ds.getCode(), ds.getId(), existing);

            if (matched == null) {
                Subject newSub = Subject.builder()
                        .id(java.util.UUID.randomUUID().toString())
                        .name(ds.getName())
                        .code(ds.getCode())
                        .department(dept)
                        .semester(sem)
                        .createdAt(java.time.LocalDate.now().toString())
                        .build();
                toSave.add(newSub);
                existing.add(newSub);
                ds.setId(newSub.getId());
            } else {
                ds.setId(matched.getId());
                // Update code on catalog if missing
                if ((matched.getCode() == null || matched.getCode().isBlank()) && ds.getCode() != null && !ds.getCode().isBlank()) {
                    matched.setCode(ds.getCode().trim());
                    toSave.add(matched);
                }
            }
        }
        if (!toSave.isEmpty()) {
            subjectRepository.saveAll(toSave);
            updateSubjectCounts();
        }
    }

    @CacheEvict(value = "allSubjects", allEntries = true)
    private void updateSubjectCounts() {
        relinkOrphanNotes();
        List<Subject> subjects = subjectRepository.findAll();
        List<Object[]> counts = noteRepository.countNotesGroupedBySubject();
        java.util.Map<String, Integer> countMap = new java.util.HashMap<>();
        for (Object[] row : counts) {
            countMap.put((String) row[0], ((Number) row[1]).intValue());
        }
        for (Subject s : subjects) {
            s.setNoteCount(countMap.getOrDefault(s.getId(), 0));
        }
        subjectRepository.saveAll(subjects);
    }

    public void relinkOrphanNotes() {
        syncLock.lock();
        try {
            ensureCoreSubjects();
            List<Subject> subjects = subjectRepository.findAll();
            List<Note> orphanNotes = noteRepository.findOrphanOrPendingNotes();
            if (subjects.isEmpty() || orphanNotes.isEmpty()) return;

            List<Note> toUpdate = new java.util.ArrayList<>();
            for (Note n : orphanNotes) {
                Subject matched = matchSubjectForNote(n, subjects);
                if (matched != null) {
                    n.setSubjectId(matched.getId());
                    n.setStatus("ready");
                    toUpdate.add(n);
                }
            }
            if (!toUpdate.isEmpty()) {
                noteRepository.saveAll(toUpdate);
                logger.info("Relinked {} orphan notes to their respective subjects", toUpdate.size());
            }
        } finally {
            syncLock.unlock();
            evictNoteCaches();
        }
    }

    public void ensureCoreSubjects() {
        List<Subject> allSubs = subjectRepository.findAll();
        Set<String> existingIds = allSubs.stream()
                .map(Subject::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Set<String> existingNames = allSubs.stream()
                .map(Subject::getName)
                .filter(Objects::nonNull)
                .map(s -> s.trim().toLowerCase())
                .collect(Collectors.toSet());

        List<Subject> toSave = new ArrayList<>();

        if (!existingIds.contains("ef0e44fc-760d-4b34-93ad-e525d4a5e1c8")) {
            toSave.add(Subject.builder()
                    .id("ef0e44fc-760d-4b34-93ad-e525d4a5e1c8")
                    .name("Computer Algorithms")
                    .code("01ADL204")
                    .department("B.Tech-UAD")
                    .semester("SEM 04")
                    .createdAt("2026-05-01")
                    .noteCount(7)
                    .build());
        }
        if (!existingIds.contains("af189579-731a-445b-8dd1-ff89b8168157")) {
            toSave.add(Subject.builder()
                    .id("af189579-731a-445b-8dd1-ff89b8168157")
                    .name("Operating Systems")
                    .code("01ADL205")
                    .department("B.Tech-UAD")
                    .semester("SEM 04")
                    .createdAt("2026-05-01")
                    .noteCount(2)
                    .build());
        }

        if (!existingIds.contains("c501-cse-networks")) {
            toSave.add(Subject.builder()
                    .id("c501-cse-networks")
                    .name("Computer Networks")
                    .code("01CS501")
                    .department("CSE")
                    .semester("SEM 05")
                    .createdAt("2026-05-01")
                    .noteCount(0)
                    .build());
        }
        if (!existingIds.contains("c502-cse-softeng")) {
            toSave.add(Subject.builder()
                    .id("c502-cse-softeng")
                    .name("Software Engineering")
                    .code("01CS502")
                    .department("CSE")
                    .semester("SEM 05")
                    .createdAt("2026-05-01")
                    .noteCount(0)
                    .build());
        }
        if (!existingIds.contains("adl202-uad-softeng")) {
            toSave.add(Subject.builder()
                    .id("adl202-uad-softeng")
                    .name("Software Engineering")
                    .code("02ADL202")
                    .department("B.Tech-UAD")
                    .semester("SEM 04")
                    .createdAt("2026-05-01")
                    .noteCount(0)
                    .build());
        }
        if (!existingIds.contains("c503-cse-ai")) {
            toSave.add(Subject.builder()
                    .id("c503-cse-ai")
                    .name("Artificial Intelligence")
                    .code("01CS503")
                    .department("CSE")
                    .semester("SEM 05")
                    .createdAt("2026-05-01")
                    .noteCount(0)
                    .build());
        }
        if (!existingIds.contains("c401-cse-dsa")) {
            toSave.add(Subject.builder()
                    .id("c401-cse-dsa")
                    .name("Data Structures & Algorithms")
                    .code("01CS401")
                    .department("CSE")
                    .semester("SEM 04")
                    .createdAt("2026-05-01")
                    .noteCount(0)
                    .build());
        }
        if (!existingIds.contains("c402-cse-dbms")) {
            toSave.add(Subject.builder()
                    .id("c402-cse-dbms")
                    .name("Database Management Systems")
                    .code("01CS402")
                    .department("CSE")
                    .semester("SEM 04")
                    .createdAt("2026-05-01")
                    .noteCount(0)
                    .build());
        }
        if (!existingIds.contains("c403-cse-toc")) {
            toSave.add(Subject.builder()
                    .id("c403-cse-toc")
                    .name("Theory of Computation")
                    .code("01CS403")
                    .department("CSE")
                    .semester("SEM 04")
                    .createdAt("2026-05-01")
                    .noteCount(0)
                    .build());
        }

        if (!existingNames.contains("mathematics for artificial intelligence and data science")) {
            toSave.add(Subject.builder()
                    .id("sub-uad-maths-ai")
                    .name("Mathematics for Artificial Intelligence and Data Science")
                    .code("01ADL201")
                    .department("B.Tech-UAD")
                    .semester("SEM 04")
                    .createdAt("2026-05-01")
                    .noteCount(0)
                    .build());
        }
        if (!existingNames.contains("design and analysis of algorithms")) {
            toSave.add(Subject.builder()
                    .id("sub-uad-daa")
                    .name("Design and Analysis of Algorithms")
                    .code("01ADL210")
                    .department("B.Tech-UAD")
                    .semester("SEM 04")
                    .createdAt("2026-05-01")
                    .noteCount(0)
                    .build());
        }
        if (!existingNames.contains("design thinking and idea lab")) {
            toSave.add(Subject.builder()
                    .id("sub-uad-dtil")
                    .name("Design Thinking and Idea Lab")
                    .code("03TCP156")
                    .department("B.Tech-UAD")
                    .semester("SEM 04")
                    .createdAt("2026-05-01")
                    .noteCount(0)
                    .build());
        }
        if (!existingNames.contains("microprocessors")) {
            toSave.add(Subject.builder()
                    .id("sub-uad-mp")
                    .name("Microprocessors")
                    .code("02ADL204")
                    .department("B.Tech-UAD")
                    .semester("SEM 04")
                    .createdAt("2026-05-01")
                    .noteCount(0)
                    .build());
        }
        if (!existingNames.contains("mini-project-i")) {
            toSave.add(Subject.builder()
                    .id("sub-uad-mini-proj-1")
                    .name("Mini-Project-I")
                    .code("02ADD220")
                    .department("B.Tech-UAD")
                    .semester("SEM 04")
                    .createdAt("2026-05-01")
                    .noteCount(0)
                    .build());
        }

        if (!toSave.isEmpty()) {
            subjectRepository.saveAll(toSave);
        }
    }

    private Subject matchSubjectForNote(Note note, List<Subject> subjects) {
        String keyToInspect = note.getR2ObjectKey() != null ? note.getR2ObjectKey() : note.getFileUrl();
        if (keyToInspect != null && keyToInspect.contains("/")) {
            FolderInfo folderInfo = extractFolderInfoFromKey(keyToInspect);
            Subject fromKey = findSubjectFromFolderOrKey(folderInfo.subject, keyToInspect, subjects);
            if (fromKey != null) return fromKey;
        }

        String combined = ((note.getTitle() != null ? note.getTitle() : "") + " "
                + (note.getTags() != null ? String.join(" ", note.getTags()) : "") + " "
                + (note.getExtractedText() != null ? note.getExtractedText() : "")).toUpperCase();

        Subject fromContent = findSubjectFromContent(combined, subjects);
        if (fromContent != null) return fromContent;

        // Strict matching using verified AcademicNormalizer to prevent false-positive classifications
        if (note.getTitle() != null && !note.getTitle().isBlank()) {
            Subject s = AcademicNormalizer.resolveSubject(note.getTitle(), null, null, subjects);
            if (s != null) return s;
        }

        if (note.getTags() != null) {
            for (String tag : note.getTags()) {
                Subject s = AcademicNormalizer.resolveSubject(tag, null, null, subjects);
                if (s != null) return s;
            }
        }
        return null;
    }

    @CacheEvict(value = "allSubjects", allEntries = true)
    public void setSubjects(List<Subject> newSubjects) {
        List<Subject> existing = subjectRepository.findAll();
        java.util.Map<String, String> nameToId = new java.util.HashMap<>();
        for (Subject s : existing) {
            if (s.getName() != null) {
                nameToId.put(s.getName().trim().toLowerCase(), s.getId());
            }
        }

        for (Subject s : newSubjects) {
            if (s.getName() != null) {
                String existingId = nameToId.get(s.getName().trim().toLowerCase());
                if (existingId != null) {
                    s.setId(existingId);
                }
            }
        }
        subjectRepository.saveAll(newSubjects);
        updateSubjectCounts();
    }

    @Cacheable("allSubjects")
    public List<Subject> getAllSubjects() {
        return subjectRepository.findAll();
    }

    public Optional<Subject> getSubjectById(String id) {
        if (id == null) return Optional.empty();
        return subjectRepository.findById(id);
    }

    @Cacheable("allNotes")
    public List<Note> getAllNotes() {
        return noteRepository.findAll();
    }

    @Cacheable("allNoteSummaries")
    public List<Note> getAllNoteSummaries() {
        return noteRepository.findAll().stream()
                .map(Note::toSummary)
                .collect(Collectors.toList());
    }

    public List<Note> getNotesBySubjectId(String subjectId) {
        if (subjectId == null || subjectId.isBlank()) {
            return java.util.Collections.emptyList();
        }
        return noteRepository.findBySubjectId(subjectId);
    }

    public List<Note> getNoteSummariesBySubjectId(String subjectId) {
        if (subjectId == null || subjectId.isBlank()) {
            return java.util.Collections.emptyList();
        }
        return noteRepository.findBySubjectId(subjectId).stream()
                .map(Note::toSummary)
                .collect(Collectors.toList());
    }

    public Optional<Note> findNoteByStorageKey(String key) {
        if (key == null || key.isBlank()) return Optional.empty();
        return noteRepository.findByR2ObjectKeyEndingWith(key);
    }

    public long getTotalNotesCount() {
        return noteRepository.count();
    }

    public Optional<Note> getNoteById(String id) {
        return noteRepository.findById(id);
    }

    @CacheEvict(value = {"allNotes", "allNoteSummaries"}, allEntries = true)
    public void addNote(Note note) {
        noteRepository.save(note);
        evictNoteCaches();
        updateSubjectCounts();
    }
    
    @CacheEvict(value = {"allNotes", "allNoteSummaries"}, allEntries = true)
    public void updateNote(Note note) {
        noteRepository.save(note);
        evictNoteCaches();
        updateSubjectCounts();
    }
    
    @CacheEvict(value = {"allNotes", "allNoteSummaries"}, allEntries = true)
    public Optional<Note> updateNoteTags(String id, List<String> tags) {
        return noteRepository.findById(id).map(note -> {
            note.setTags(tags);
            Note saved = noteRepository.save(note);
            evictNoteCaches();
            return saved;
        });
    }

    @CacheEvict(value = {"allNotes", "allNoteSummaries"}, allEntries = true)
    public void deleteNote(String id) {
        noteRepository.deleteById(id);
        evictNoteCaches();
        updateSubjectCounts();
    }

    @CacheEvict(value = {"allNotes", "allNoteSummaries"}, allEntries = true)
    public void deleteAllNotes() {
        noteRepository.deleteAll();
        evictNoteCaches();
        updateSubjectCounts();
    }
    
    public boolean existsNoteByMoodleId(String moodleId) {
        if (moodleId == null || moodleId.trim().isEmpty()) return false;
        return noteRepository.existsByMoodleId(moodleId);
    }

    public boolean existsNoteBySourceUrl(String sourceUrl) {
        if (sourceUrl == null || sourceUrl.trim().isEmpty()) return false;
        return noteRepository.existsBySourceUrl(sourceUrl);
    }

    public boolean existsNoteByR2ObjectKey(String r2ObjectKey) {
        if (r2ObjectKey == null || r2ObjectKey.trim().isEmpty()) return false;
        return noteRepository.existsByR2ObjectKey(r2ObjectKey);
    }
    
    public Subject addSubject(Subject subject) {
        return subjectRepository.save(subject);
    }

    public Subject updateSubject(Subject subject) {
        return subjectRepository.save(subject);
    }

    public List<Note> getNotesByFilter(String subjectId, String semester, String examType, String keyword, String search, String department, String unit) {
        if ((subjectId == null || subjectId.isBlank()) &&
            (semester == null || semester.isBlank()) &&
            (examType == null || examType.isBlank()) &&
            (keyword == null || keyword.isBlank()) &&
            (search == null || search.isBlank()) &&
            (department == null || department.isBlank()) &&
            (unit == null || unit.isBlank())) {
            return noteRepository.findAll();
        }
        return noteRepository.findByFilters(subjectId, semester, examType, keyword, search, department, unit);
    }

    public List<Doubt> getDoubtsByNoteId(String noteId) {
        return doubtRepository.findByNoteId(noteId);
    }

    public List<Doubt> getDoubtsByNoteIds(java.util.Collection<String> noteIds) {
        if (noteIds == null || noteIds.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        return doubtRepository.findByNoteIdIn(noteIds);
    }

    public List<Doubt> getAllDoubts() {
        return doubtRepository.findAll();
    }

    public Optional<Doubt> getDoubtById(String id) {
        if (id == null) return Optional.empty();
        return doubtRepository.findById(id);
    }

    public void addDoubt(Doubt doubt) {
        doubtRepository.save(doubt);
    }

    public void updateDoubt(Doubt doubt) {
        doubtRepository.save(doubt);
    }

    public List<PYQ> getAllPyqs() {
        return pyqRepository.findAll();
    }

    public PYQ addPyq(PYQ pyq) {
        return pyqRepository.save(pyq);
    }

    public List<PYQ> getPyqsByFilter(String subjectId, String examType) {
        return pyqRepository.findByFilters(subjectId, examType);
    }

    public void deleteAllPyqs() {
        pyqRepository.deleteAll();
    }

    public void deletePyq(String id) {
        pyqRepository.deleteById(id);
    }

    public List<Announcement> getAllAnnouncements() {
        return announcementRepository.findAll();
    }

    public Optional<Announcement> getAnnouncementById(String id) {
        return announcementRepository.findById(id);
    }

    @CacheEvict(value = "recentAnnouncements", allEntries = true)
    public Announcement addAnnouncement(Announcement announcement) {
        if (announcement.getId() == null || announcement.getId().isBlank()) {
            announcement.setId(java.util.UUID.randomUUID().toString());
        }
        if (announcement.getCreatedAt() == null || announcement.getCreatedAt().isBlank()) {
            announcement.setCreatedAt(java.time.Instant.now().toString());
        }
        Announcement saved = announcementRepository.save(announcement);
        saveAnnouncementsBackup();
        return saved;
    }

    public Optional<Announcement> updateAnnouncement(String id, Announcement updated) {
        return announcementRepository.findById(id).map(existing -> {
            if (updated.getTitle() != null) existing.setTitle(updated.getTitle());
            if (updated.getDescription() != null) existing.setDescription(updated.getDescription());
            if (updated.getTag() != null) existing.setTag(updated.getTag());
            if (updated.getColor() != null) existing.setColor(updated.getColor());
            if (updated.getPostedBy() != null) existing.setPostedBy(updated.getPostedBy());
            if (updated.getAuthorRole() != null) existing.setAuthorRole(updated.getAuthorRole());
            if (updated.getDeadline() != null) existing.setDeadline(updated.getDeadline());
            if (updated.getIsPinned() != null) existing.setIsPinned(updated.getIsPinned());
            Announcement saved = announcementRepository.save(existing);
            saveAnnouncementsBackup();
            return saved;
        });
    }

    public boolean deleteAnnouncement(String id) {
        if (announcementRepository.existsById(id)) {
            announcementRepository.deleteById(id);
            saveAnnouncementsBackup();
            return true;
        }
        return false;
    }

    private void saveAnnouncementsBackup() {
        // Redundant synchronous findAll() JSON backup eliminated: PostgreSQL is primary store (L-6)
    }

    @Cacheable("recentAnnouncements")
    public List<Announcement> getRecentAnnouncements(int count) {
        return announcementRepository.findAll().stream().limit(count).toList();
    }

    @Cacheable("allRoadmaps")
    public List<PredefinedRoadmap> getAllRoadmaps() {
        return predefinedRoadmapRepository.findAll();
    }

    public Optional<PredefinedRoadmap> getRoadmapById(String id) {
        return predefinedRoadmapRepository.findById(id);
    }

    @Cacheable("allTimeline")
    public List<TimelineEvent> getAllTimelineEvents() {
        return timelineEventRepository.findAll();
    }

    @CacheEvict(value = "allTimeline", allEntries = true)
    public void addTimelineEvent(TimelineEvent event) {
        timelineEventRepository.save(event);
    }

    public void updateTimelineEvent(TimelineEvent event) {
        timelineEventRepository.save(event);
    }

    public void deleteTimelineEvent(String id) {
        timelineEventRepository.deleteById(id);
    }

    // --- NC (Absence Consideration) Management ---

    public boolean hasDuplicateNcDates(String studentPrn, List<String> dates) {
        if (studentPrn == null || dates == null || dates.isEmpty()) return false;
        List<NcRequest> existing = ncRequestRepository.findByStudentPrnOrderByCreatedAtDesc(studentPrn);
        for (NcRequest req : existing) {
            // Only check non-rejected requests
            if (!"REJECTED".equalsIgnoreCase(req.getStatus())) {
                if (req.getAbsentDates() != null) {
                    for (String d : dates) {
                        if (req.getAbsentDates().contains(d)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    public NcRequest addNcRequest(NcRequest request) {
        if (hasDuplicateNcDates(request.getStudentPrn(), request.getAbsentDates())) {
            throw new IllegalArgumentException("An NC request already exists for one or more selected dates.");
        }
        if (request.getId() == null || request.getId().isBlank()) {
            request.setId(java.util.UUID.randomUUID().toString());
        }
        if (request.getCreatedAt() == null || request.getCreatedAt().isBlank()) {
            request.setCreatedAt(java.time.Instant.now().toString());
        }
        if (request.getStatus() == null || request.getStatus().isBlank()) {
            request.setStatus("PENDING");
        }
        NcRequest saved = ncRequestRepository.save(request);
        saveNcRequestsBackup();

        // Trigger notification for teachers
        NcNotification notif = NcNotification.builder()
                .id(java.util.UUID.randomUUID().toString())
                .requestId(saved.getId())
                .recipientPrn("ALL_TEACHERS")
                .recipientRole("teacher")
                .title("New NC Request Submitted")
                .message("Student " + (saved.getStudentName() != null ? saved.getStudentName() : saved.getStudentPrn())
                        + " submitted an absence consideration request for " + String.join(", ", saved.getAbsentDates()))
                .type("SUBMITTED")
                .createdAt(java.time.Instant.now().toString())
                .read(false)
                .build();
        addNcNotification(notif);

        return saved;
    }

    public List<NcRequest> getAllNcRequests() {
        return ncRequestRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<NcRequest> getNcRequestsByStudent(String studentPrn) {
        return ncRequestRepository.findByStudentPrnOrderByCreatedAtDesc(studentPrn);
    }

    public Optional<NcRequest> getNcRequestById(String id) {
        return ncRequestRepository.findById(id);
    }

    public NcRequest updateNcRequest(NcRequest request) {
        NcRequest saved = ncRequestRepository.save(request);
        saveNcRequestsBackup();

        // Trigger notification for student
        String statusTitle = "APPROVED".equalsIgnoreCase(saved.getStatus()) ? "NC Request Approved" : "NC Request Reviewed";
        NcNotification notif = NcNotification.builder()
                .id(java.util.UUID.randomUUID().toString())
                .requestId(saved.getId())
                .recipientPrn(saved.getStudentPrn())
                .recipientRole("student")
                .title(statusTitle)
                .message("Your NC request for " + String.join(", ", saved.getAbsentDates()) + " was marked as "
                        + saved.getStatus() + (saved.getReviewComment() != null ? ": " + saved.getReviewComment() : "."))
                .type(saved.getStatus())
                .createdAt(java.time.Instant.now().toString())
                .read(false)
                .build();
        addNcNotification(notif);

        return saved;
    }

    public void deleteAllNcData() {
        ncRequestRepository.deleteAll();
        ncNotificationRepository.deleteAll();
        saveNcRequestsBackup();
        saveNcNotificationsBackup();
        logger.info("Cleared all NC requests and notifications from database and backup files");
    }

    private void saveNcRequestsBackup() {
        // Redundant synchronous findAll() JSON backup eliminated: PostgreSQL is primary store (L-6)
    }

    // --- NC Notifications ---

    public NcNotification addNcNotification(NcNotification notification) {
        if (notification.getId() == null || notification.getId().isBlank()) {
            notification.setId(java.util.UUID.randomUUID().toString());
        }
        if (notification.getCreatedAt() == null || notification.getCreatedAt().isBlank()) {
            notification.setCreatedAt(java.time.Instant.now().toString());
        }
        NcNotification saved = ncNotificationRepository.save(notification);
        saveNcNotificationsBackup();
        return saved;
    }

    public List<NcNotification> getNotifications(String recipientPrn, String recipientRole) {
        return ncNotificationRepository.findByRecipientPrnOrRecipientRoleOrderByCreatedAtDesc(recipientPrn, recipientRole);
    }

    public void markNotificationRead(String id) {
        ncNotificationRepository.findById(id).ifPresent(n -> {
            n.setRead(true);
            ncNotificationRepository.save(n);
            saveNcNotificationsBackup();
        });
    }

    private void saveNcNotificationsBackup() {
        // Redundant synchronous findAll() JSON backup eliminated: PostgreSQL is primary store (L-6)
    }
}

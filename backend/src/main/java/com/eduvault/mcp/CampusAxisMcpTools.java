package com.eduvault.mcp;

import com.eduvault.model.*;
import com.eduvault.repository.*;
import com.eduvault.security.AuthenticatedStudentResolver;
import com.eduvault.security.AuthenticatedStudentResolver.StudentPrincipal;
import com.eduvault.service.BrabbleService;
import com.eduvault.service.GeminiService;
import com.eduvault.service.LmsScraperService;
import com.eduvault.service.OkfKnowledgeService;
import com.eduvault.service.RAGService;
import com.eduvault.util.AcademicNormalizer;
import com.eduvault.util.TeacherSubjectMatcher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * CampusAxis Model Context Protocol Tools.
 * Exposes Student capabilities and Teacher-governed actions with token authorization.
 */
@Service
public class CampusAxisMcpTools {

    private static final Logger logger = LoggerFactory.getLogger(CampusAxisMcpTools.class);

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private PYQRepository pyqRepository;

    @Autowired
    private AnnouncementRepository announcementRepository;

    @Autowired
    private StudentProfileRepository studentProfileRepository;

    @Autowired
    private AuthenticatedStudentResolver studentResolver;

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private RAGService ragService;

    @Autowired(required = false)
    private OkfKnowledgeService okfKnowledgeService;

    @Autowired
    private BrabbleService brabbleService;

    @Autowired
    private LmsScraperService lmsScraperService;

    @Autowired
    private LocalJsonDatabase database;

    @Value("${app.lms.sy.username:${LMS_SY_USER:24UAD019}}")
    private String lmsSyUsername;

    @Value("${app.lms.sy.password:${LMS_SY_PASS:}}")
    private String lmsSyPassword;

    @Value("${app.lms.ty.username:${LMS_TY_USER:24UAD022}}")
    private String lmsTyUsername;

    @Value("${app.lms.ty.password:${LMS_TY_PASS:}}")
    private String lmsTyPassword;

    @Autowired
    private com.eduvault.service.PortalScraperService portalScraperService;

    // ==========================================
    // 🎓 STUDENT CAPABILITIES
    // ==========================================

    // 1. Get attendance of overall subjects
    @Tool(name = "get-overall-attendance",
          description = "Get overall attendance overview across all enrolled subjects for the authenticated student.")
    public Map<String, Object> getOverallAttendance() {
        StudentPrincipal student = studentResolver.resolveCurrentStudent();
        List<DashboardSubject> liveSubjects = getLiveStudentSubjects(student);

        if (!liveSubjects.isEmpty()) {
            int totalAttended = 0;
            int totalConducted = 0;
            List<Map<String, Object>> subjectBreakdown = new ArrayList<>();

            for (DashboardSubject ds : liveSubjects) {
                int attended = ds.getTotalAttended();
                int conducted = ds.getTotalConducted();
                totalAttended += attended;
                totalConducted += conducted;

                subjectBreakdown.add(Map.of(
                        "subjectId", ds.getId() != null ? ds.getId() : "",
                        "subjectName", ds.getName() != null ? ds.getName() : "",
                        "code", ds.getCode() != null ? ds.getCode() : "",
                        "attendancePercent", ds.getAttendance() + "%",
                        "attended", attended,
                        "conducted", conducted
                ));
            }

            double overallPercent = totalConducted > 0 ? ((double) totalAttended / totalConducted) * 100.0 : 0.0;

            return Map.of(
                    "studentPrn", student.prn(),
                    "overallAttendancePercent", String.format("%.2f%%", overallPercent),
                    "totalAttended", totalAttended,
                    "totalConducted", totalConducted,
                    "subjects", subjectBreakdown
            );
        }

        // Fallback to static catalog if live portal profile not yet fetched
        List<Subject> subjects = getAuthorizedSubjectsForStudent(student);
        int totalAttended = 0;
        int totalConducted = 0;
        List<Map<String, Object>> subjectBreakdown = new ArrayList<>();

        for (Subject s : subjects) {
            int attended = s.getTotalAttended() != null ? s.getTotalAttended() : 0;
            int conducted = s.getTotalConducted() != null ? s.getTotalConducted() : 0;
            totalAttended += attended;
            totalConducted += conducted;

            subjectBreakdown.add(Map.of(
                    "subjectId", s.getId() != null ? s.getId() : "",
                    "subjectName", s.getName() != null ? s.getName() : "",
                    "code", s.getCode() != null ? s.getCode() : "",
                    "attendancePercent", s.getAttendance() != null ? s.getAttendance() : "0%",
                    "attended", attended,
                    "conducted", conducted
            ));
        }

        double overallPercent = totalConducted > 0 ? ((double) totalAttended / totalConducted) * 100.0 : 0.0;

        return Map.of(
                "studentPrn", student.prn(),
                "overallAttendancePercent", String.format("%.2f%%", overallPercent),
                "totalAttended", totalAttended,
                "totalConducted", totalConducted,
                "subjects", subjectBreakdown
        );
    }

    // 2. Single subject attendance
    @Tool(name = "get-subject-attendance",
          description = "Get detailed attendance metrics and log records for a single specific enrolled subject.")
    public Map<String, Object> getSubjectAttendance(
            @ToolParam(description = "Subject ID or Course Code", required = true) String subjectIdentifier) {

        StudentPrincipal student = studentResolver.resolveCurrentStudent();
        List<DashboardSubject> liveSubjects = getLiveStudentSubjects(student);

        if (!liveSubjects.isEmpty() && subjectIdentifier != null) {
            String clean = subjectIdentifier.trim().toLowerCase();
            DashboardSubject matched = liveSubjects.stream()
                    .filter(s -> (s.getId() != null && s.getId().equalsIgnoreCase(clean))
                            || (s.getCode() != null && s.getCode().equalsIgnoreCase(clean))
                            || (s.getName() != null && s.getName().toLowerCase().contains(clean)))
                    .findFirst()
                    .orElse(null);

            if (matched != null) {
                return Map.of(
                        "subjectId", matched.getId() != null ? matched.getId() : "",
                        "subjectName", matched.getName() != null ? matched.getName() : "",
                        "code", matched.getCode() != null ? matched.getCode() : "",
                        "attendancePercent", matched.getAttendance() + "%",
                        "attended", matched.getTotalAttended(),
                        "conducted", matched.getTotalConducted(),
                        "detailedAttendance", matched.getDetailedAttendance() != null ? matched.getDetailedAttendance() : List.of()
                );
            }
        }

        Subject subject = findAuthorizedSubject(student, subjectIdentifier);

        if (subject == null) {
            return Map.of("error", "Subject not found or not in your enrolled curriculum: " + subjectIdentifier);
        }

        return Map.of(
                "subjectId", subject.getId() != null ? subject.getId() : "",
                "subjectName", subject.getName() != null ? subject.getName() : "",
                "code", subject.getCode() != null ? subject.getCode() : "",
                "attendancePercent", subject.getAttendance() != null ? subject.getAttendance() : "0%",
                "attended", subject.getTotalAttended() != null ? subject.getTotalAttended() : 0,
                "conducted", subject.getTotalConducted() != null ? subject.getTotalConducted() : 0,
                "detailedAttendance", subject.getDetailedAttendance() != null ? subject.getDetailedAttendance() : List.of()
        );
    }

    // 3. CIE (Continuous Internal Evaluation)
    @Tool(name = "get-cie-scores",
          description = "Get CIE (Continuous Internal Evaluation) scores and marks for enrolled subjects.")
    public Map<String, Object> getCieScores(
            @ToolParam(description = "Optional Subject ID to scope to a single subject", required = false) String subjectIdentifier) {

        StudentPrincipal student = studentResolver.resolveCurrentStudent();
        List<DashboardSubject> liveSubjects = getLiveStudentSubjects(student);

        if (!liveSubjects.isEmpty()) {
            if (subjectIdentifier != null && !subjectIdentifier.isBlank()) {
                String clean = subjectIdentifier.trim().toLowerCase();
                DashboardSubject matched = liveSubjects.stream()
                        .filter(s -> (s.getId() != null && s.getId().equalsIgnoreCase(clean))
                                || (s.getCode() != null && s.getCode().equalsIgnoreCase(clean))
                                || (s.getName() != null && s.getName().toLowerCase().contains(clean)))
                        .findFirst()
                        .orElse(null);

                if (matched != null) {
                    return Map.of(
                            "subjectId", matched.getId() != null ? matched.getId() : "",
                            "subjectName", matched.getName() != null ? matched.getName() : "",
                            "cieScore", String.valueOf(matched.getCie()),
                            "maxCie", String.valueOf(matched.getMaxCie())
                    );
                }
            }

            int totalObtained = 0;
            int totalMax = 0;
            List<Map<String, String>> cieList = new ArrayList<>();
            for (DashboardSubject ds : liveSubjects) {
                totalObtained += ds.getCie();
                totalMax += ds.getMaxCie();
                cieList.add(Map.of(
                        "subjectId", ds.getId() != null ? ds.getId() : "",
                        "subjectName", ds.getName() != null ? ds.getName() : "",
                        "code", ds.getCode() != null ? ds.getCode() : "",
                        "cieScore", String.valueOf(ds.getCie()),
                        "maxCie", String.valueOf(ds.getMaxCie())
                ));
            }

            double avgPercent = totalMax > 0 ? ((double) totalObtained / totalMax) * 100.0 : 0.0;
            return Map.of(
                    "studentPrn", student.prn(),
                    "totalScore", totalObtained + "/" + totalMax,
                    "averagePercent", String.format("%.2f%%", avgPercent),
                    "cieScores", cieList
            );
        }

        if (subjectIdentifier != null && !subjectIdentifier.isBlank()) {
            Subject s = findAuthorizedSubject(student, subjectIdentifier);
            if (s == null) {
                return Map.of("error", "Subject not found or not authorized: " + subjectIdentifier);
            }
            return Map.of(
                    "subjectId", s.getId() != null ? s.getId() : "",
                    "subjectName", s.getName() != null ? s.getName() : "",
                    "cieScore", s.getCie() != null ? s.getCie() : "N/A"
            );
        }

        List<Subject> subjects = getAuthorizedSubjectsForStudent(student);
        List<Map<String, String>> cieList = subjects.stream()
                .map(s -> Map.of(
                        "subjectId", s.getId() != null ? s.getId() : "",
                        "subjectName", s.getName() != null ? s.getName() : "",
                        "cieScore", s.getCie() != null ? s.getCie() : "N/A"
                ))
                .collect(Collectors.toList());

        return Map.of("studentPrn", student.prn(), "cieScores", cieList);
    }

    // 4. Available notes
    @Tool(name = "search-notes",
          description = "Search and list available study notes filtered by subject, unit, or keyword.")
    public List<Map<String, Object>> searchNotes(
            @ToolParam(description = "Subject ID to filter", required = false) String subjectId,
            @ToolParam(description = "Keyword search query", required = false) String search,
            @ToolParam(description = "Unit filter e.g. Unit 1", required = false) String unit,
            @ToolParam(description = "Maximum results (max 20)", required = false) Integer limit) {

        StudentPrincipal student = studentResolver.resolveCurrentStudent();
        int max = (limit != null && limit > 0) ? Math.min(limit, 20) : 10;

        List<Note> source = (subjectId != null && !subjectId.isBlank())
                ? noteRepository.findBySubjectId(subjectId.trim())
                : noteRepository.findAll();

        if (source == null) return List.of();

        String q = (search != null) ? search.toLowerCase().trim() : null;

        return source.stream()
                .filter(n -> isAuthorizedForNote(student, n))
                .filter(n -> unit == null || unit.isBlank() || (n.getUnit() != null && n.getUnit().equalsIgnoreCase(unit.trim())))
                .filter(n -> {
                    if (q == null || q.isBlank()) return true;
                    String title = n.getTitle() != null ? n.getTitle().toLowerCase() : "";
                    return title.contains(q);
                })
                .limit(max)
                .map(n -> Map.<String, Object>of(
                        "id", n.getId() != null ? n.getId() : "",
                        "title", n.getTitle() != null ? n.getTitle() : "",
                        "subjectId", n.getSubjectId() != null ? n.getSubjectId() : "",
                        "unit", n.getUnit() != null ? n.getUnit() : "",
                        "category", n.getCategory() != null ? n.getCategory() : "Notes"
                ))
                .collect(Collectors.toList());
    }

    @Tool(name = "get-note-content",
          description = "Retrieve the content of a specific study note after verifying student authorization.")
    public Map<String, Object> getNoteContent(
            @ToolParam(description = "Note UUID", required = true) String noteId) {

        StudentPrincipal student = studentResolver.resolveCurrentStudent();
        Optional<Note> noteOpt = noteRepository.findById(noteId);
        if (noteOpt.isEmpty()) {
            return Map.of("error", "Note not found", "noteId", noteId);
        }

        Note note = noteOpt.get();
        if (!isAuthorizedForNote(student, note)) {
            logger.warn("Security Alert: Student PRN={} denied access to NoteId={}", student.prn(), noteId);
            return Map.of("error", "Access Denied: You are not authorized to view notes outside your curriculum.");
        }

        String text = note.getExtractedText();
        if (text != null && text.length() > 6000) {
            text = text.substring(0, 6000) + "\n...[truncated for model context]";
        }

        return Map.of(
                "id", note.getId() != null ? note.getId() : "",
                "title", note.getTitle() != null ? note.getTitle() : "",
                "unit", note.getUnit() != null ? note.getUnit() : "",
                "extractedText", text != null ? text : "(No text extracted)"
        );
    }

    // 5. Hackathons available
    @Tool(name = "get-available-hackathons",
          description = "Discover upcoming national and collegiate hackathons, competitions, and hubs.")
    public String getAvailableHackathons(
            @ToolParam(description = "Optional city filter (e.g. Pune, Mumbai, Bangalore)", required = false) String city,
            @ToolParam(description = "Optional search keyword", required = false) String search,
            @ToolParam(description = "Max results (default 10)", required = false) Integer limit) {

        studentResolver.resolveCurrentStudent();
        int max = (limit != null && limit > 0) ? Math.min(limit, 25) : 10;
        return brabbleService.getHackathons("hackathons", city, null, null, null, null, search, max, 0);
    }

    // 7. Ask Academic Tutor (Grounded in course materials)
    @Tool(name = "ask-academic-tutor",
          description = "Ask an academic question grounded in student's verified syllabus notes and materials.")
    public Map<String, Object> askTutor(
            @ToolParam(description = "Student's question", required = true) String question,
            @ToolParam(description = "Optional Subject ID to scope answer", required = false) String subjectId,
            @ToolParam(description = "Optional Note ID for chapter-level RAG", required = false) String noteId,
            @ToolParam(description = "Optional unit identifier", required = false) String unit) {

        StudentPrincipal student = studentResolver.resolveCurrentStudent();

        if (question == null || question.isBlank()) {
            return Map.of("error", "Question parameter is required");
        }

        if (subjectId != null && !subjectId.isBlank()) {
            if (!isAuthorizedForSubject(student, subjectId.trim())) {
                return Map.of("error", "Access Denied: You are not enrolled in the requested subject.");
            }
        }

        if (noteId != null && !noteId.isBlank()) {
            Optional<Note> noteOpt = noteRepository.findById(noteId.trim());
            if (noteOpt.isEmpty() || !isAuthorizedForNote(student, noteOpt.get())) {
                return Map.of("error", "Access Denied: You are not authorized to query this note.");
            }
            String answer = ragService.askChapter(question, noteId.trim(), null);
            return Map.of("answer", answer, "source", "CHAPTER_RAG");
        }

        if (subjectId != null && !subjectId.isBlank() && okfKnowledgeService != null) {
            Optional<String> okfContext = okfKnowledgeService.buildSubjectKnowledgeContext(subjectId.trim(), question, unit);
            if (okfContext.isPresent()) {
                String answer = geminiService.askTutor(question, okfContext.get(), null);
                return Map.of("answer", answer, "source", "OKF_KNOWLEDGE");
            }
        }

        String answer = geminiService.askTutor(question, "CampusAxis Student Assistant for " + student.name(), null);
        return Map.of("answer", answer, "source", "GENERAL_TUTOR");
    }

    private boolean isAuthorizedForSubject(StudentPrincipal student, String subjectId) {
        if (student.isTeacher()) return true;
        if (student.enrolledSubjectIds().contains(subjectId)) return true;

        Optional<Subject> subOpt = subjectRepository.findById(subjectId);
        if (subOpt.isEmpty()) return false;

        Subject s = subOpt.get();
        boolean deptMatch = student.department() == null || AcademicNormalizer.isDepartmentMatch(s.getDepartment(), student.department());
        boolean semMatch = student.semester() == null || AcademicNormalizer.isSemesterMatch(s.getSemester(), student.semester());

        return deptMatch && semMatch;
    }

    // ==========================================
    // 👨‍🏫 TEACHER CAPABILITIES
    // ==========================================

    // 1. Make announcement
    @Tool(name = "create-announcement",
          description = "Post a new academic announcement or circular for students. (Faculty/Teachers only)")
    public Map<String, Object> createAnnouncement(
            @ToolParam(description = "Announcement title", required = true) String title,
            @ToolParam(description = "Announcement content/description", required = true) String description,
            @ToolParam(description = "Announcement tag e.g. Academic, Official Notice", required = false) String tag) {

        StudentPrincipal caller = studentResolver.resolveCurrentStudent();
        if (!caller.isTeacher()) {
            return Map.of("error", "Access Denied: Only teachers/faculty members can create announcements");
        }

        Announcement ann = new Announcement();
        ann.setId(UUID.randomUUID().toString());
        ann.setTitle(title.trim());
        ann.setDescription(description.trim());
        ann.setTag(tag != null && !tag.isBlank() ? tag.trim() : "Official Notice");
        ann.setColor("blue");
        ann.setPostedBy(caller.name() != null ? caller.name() : "Faculty");
        ann.setAuthorRole(caller.department() != null ? caller.department() : "Department Faculty");
        ann.setCreatedAt(LocalDate.now().format(DateTimeFormatter.ISO_DATE));

        announcementRepository.save(ann);
        return Map.of(
                "status", "SUCCESS",
                "message", "Announcement posted successfully",
                "announcementId", ann.getId(),
                "title", ann.getTitle()
        );
    }

    // 2. View NC requests
    @Tool(name = "view-nc-requests",
          description = "View pending or reviewed attendance non-credit / condonation requests. (Faculty/Teachers only)")
    public List<Map<String, Object>> viewNcRequests(
            @ToolParam(description = "Optional status filter (e.g. PENDING, APPROVED, REJECTED, ALL)", required = false) String status,
            @ToolParam(description = "Optional student PRN filter", required = false) String studentPrn) {

        StudentPrincipal caller = studentResolver.resolveCurrentStudent();
        if (!caller.isTeacher()) {
            return List.of(Map.of("error", "Access Denied: Only faculty can view attendance condonation (NC) requests"));
        }

        List<NcRequest> all = database.getAllNcRequests();
        if (all == null) return List.of();

        return all.stream()
                .filter(r -> status == null || status.isBlank() || "ALL".equalsIgnoreCase(status) || (r.getStatus() != null && r.getStatus().equalsIgnoreCase(status.trim())))
                .filter(r -> studentPrn == null || studentPrn.isBlank() || (r.getStudentPrn() != null && r.getStudentPrn().equalsIgnoreCase(studentPrn.trim())))
                .map(r -> Map.<String, Object>of(
                        "id", r.getId() != null ? r.getId() : "",
                        "studentPrn", r.getStudentPrn() != null ? r.getStudentPrn() : "",
                        "studentName", r.getStudentName() != null ? r.getStudentName() : "",
                        "reason", r.getReason() != null ? r.getReason() : "",
                        "status", r.getStatus() != null ? r.getStatus() : "PENDING",
                        "createdAt", r.getCreatedAt() != null ? r.getCreatedAt() : "",
                        "missedSubjects", r.getMissedSubjects() != null ? r.getMissedSubjects() : List.of()
                ))
                .collect(Collectors.toList());
    }

    // 3. Sync the notes with Moodle (SY / TY default credentials handled, with optional single subject scope)
    @Tool(name = "sync-moodle-notes",
          description = "Synchronize courses and study notes from Moodle LMS for SY or TY. Can optionally target a single subject or course. (Faculty/Teachers only)")
    public Map<String, Object> syncMoodleNotes(
            @ToolParam(description = "Class tier: 'SY' for Second Year or 'TY' for Third Year", required = true) String yearTier,
            @ToolParam(description = "Optional Subject ID, Course Code (e.g. 01ADL301), or Course Name to sync single subject only", required = false) String subjectIdentifier) {

        StudentPrincipal caller = studentResolver.resolveCurrentStudent();
        if (!caller.isTeacher()) {
            return Map.of("error", "Access Denied: Only teachers/faculty can trigger LMS notes synchronization");
        }

        String username;
        String password;

        if ("SY".equalsIgnoreCase(yearTier.trim())) {
            username = lmsSyUsername;
            password = lmsSyPassword;
        } else if ("TY".equalsIgnoreCase(yearTier.trim())) {
            username = lmsTyUsername;
            password = lmsTyPassword;
        } else {
            return Map.of("error", "Invalid yearTier. Please specify either 'SY' or 'TY'.");
        }

        if (password == null || password.isBlank()) {
            return Map.of("error", "LMS synchronization password is not configured in the server environment (LMS_SY_PASS / LMS_TY_PASS)");
        }

        try {
            List<String> courseIds = (subjectIdentifier != null && !subjectIdentifier.isBlank())
                    ? List.of(subjectIdentifier.trim())
                    : null;

            LmsCredentials credentials = new LmsCredentials(username, password, false, courseIds);
            LmsSyncResponse response = lmsScraperService.syncNotes(credentials);

            LmsProgress progress = lmsScraperService.getProgress(username);

            Map<String, Object> result = new HashMap<>();
            result.put("status", "SUCCESS");
            result.put("yearTier", yearTier.toUpperCase());
            result.put("username", username);
            result.put("scopedSubject", subjectIdentifier != null ? subjectIdentifier.trim() : "ALL");
            result.put("importedCount", response.getImportedCount());
            result.put("totalDiscoveredCourses", response.getTotalDiscoveredCourses());
            result.put("progress", progress != null ? Map.of(
                    "status", progress.getStatus() != null ? progress.getStatus() : "COMPLETED",
                    "stage", progress.getCurrentStage() != null ? progress.getCurrentStage() : "Sync complete",
                    "percent", progress.getPercent(),
                    "importedCount", progress.getImportedCount(),
                    "materialsFound", progress.getMaterialsFound(),
                    "skippedCount", progress.getSkippedCount(),
                    "failureCount", progress.getFailureCount()
            ) : Map.of("percent", 100, "status", "COMPLETED"));
            result.put("courses", response.getCourses() != null ? response.getCourses() : List.of());

            return result;
        } catch (Exception e) {
            logger.error("Error in syncMoodleNotes tool: {}", e.getMessage(), e);
            return Map.of(
                    "status", "FAILED",
                    "yearTier", yearTier.toUpperCase(),
                    "scopedSubject", subjectIdentifier != null ? subjectIdentifier.trim() : "ALL",
                    "error", e.getMessage() != null ? e.getMessage() : "Moodle sync failed"
            );
        }
    }

    // ==========================================
    // 🛡️ SECURITY & SCOPING HELPERS
    // ==========================================

    private List<DashboardSubject> getLiveStudentSubjects(StudentPrincipal student) {
        if (student == null || student.prn() == null || portalScraperService == null) {
            return List.of();
        }
        Optional<StudentProfile> profileOpt = studentProfileRepository.findById(student.prn());
        if (profileOpt.isPresent() && profileOpt.get().getDob() != null && !profileOpt.get().getDob().isBlank()) {
            try {
                PortalDashboardResponse resp = portalScraperService.fetchDashboard(student.prn(), profileOpt.get().getDob());
                if (resp != null && resp.getSubjects() != null) {
                    return resp.getSubjects();
                }
            } catch (Exception e) {
                logger.warn("Could not retrieve live portal dashboard for PRN {}: {}", student.prn(), e.getMessage());
            }
        }
        return List.of();
    }

    private List<Subject> getAuthorizedSubjectsForStudent(StudentPrincipal student) {
        List<Subject> all = subjectRepository.findAll();
        if (student.isTeacher()) return all;

        return all.stream()
                .filter(s -> {
                    if (s.getId() != null && student.enrolledSubjectIds().contains(s.getId())) return true;
                    boolean deptMatch = student.department() == null || AcademicNormalizer.isDepartmentMatch(s.getDepartment(), student.department());
                    boolean semMatch = student.semester() == null || AcademicNormalizer.isSemesterMatch(s.getSemester(), student.semester());
                    return deptMatch && semMatch;
                })
                .collect(Collectors.toList());
    }

    private Subject findAuthorizedSubject(StudentPrincipal student, String identifier) {
        if (identifier == null || identifier.isBlank()) return null;
        String clean = identifier.trim().toLowerCase();

        return getAuthorizedSubjectsForStudent(student).stream()
                .filter(s -> (s.getId() != null && s.getId().equalsIgnoreCase(clean))
                        || (s.getCode() != null && s.getCode().equalsIgnoreCase(clean))
                        || (s.getName() != null && s.getName().toLowerCase().contains(clean)))
                .findFirst()
                .orElse(null);
    }

    private boolean isAuthorizedForNote(StudentPrincipal student, Note note) {
        if (student.isTeacher()) return true;
        if (note == null) return false;

        if ("UNRESOLVED".equalsIgnoreCase(note.getStatus()) || "PENDING_MAPPING".equalsIgnoreCase(note.getStatus())) {
            return false;
        }

        if (note.getSubjectId() != null && student.enrolledSubjectIds().contains(note.getSubjectId())) {
            return true;
        }

        if (student.department() == null || student.department().isBlank()) {
            return false;
        }

        if (note.getDepartment() != null && !note.getDepartment().isBlank()) {
            boolean deptMatch = AcademicNormalizer.isDepartmentMatch(note.getDepartment(), student.department())
                    || AcademicNormalizer.isAlliedDepartment(note.getDepartment(), student.department());
            if (!deptMatch) return false;
        }

        if (student.semester() != null && note.getSemester() != null && !note.getSemester().isBlank()) {
            return AcademicNormalizer.isSemesterMatch(note.getSemester(), student.semester());
        }

        return false;
    }
}

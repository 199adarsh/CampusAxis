package com.eduvault.e2e;

import com.eduvault.controller.ApiController;
import com.eduvault.model.Note;
import com.eduvault.model.Subject;
import com.eduvault.repository.LocalJsonDatabase;
import com.eduvault.service.FileStorageService;
import com.eduvault.service.GeminiService;
import com.eduvault.service.R2StorageService;
import com.eduvault.service.RAGService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * End-to-end verification & Nyquist validation for:
 * 1. R2 bucket folder detection & Year/Semester enrichment
 * 2. Teacher Year/Sem/Subject JSON mapping persistence (zero DB)
 * 3. Notes upload (catalog fallback, collision disambiguation, R2 failure guard)
 * 4. Raw file streaming & Content-Disposition basename sanitization
 * 5. Role-based DELETE enforcement
 */
class NotesUploadAndMappingE2ETest {

    private ApiController controller;
    private LocalJsonDatabase database;
    private R2StorageService r2StorageService;
    private FileStorageService fileStorageService;
    private GeminiService geminiService;
    private RAGService ragService;
    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        controller = new ApiController();
        database = mock(LocalJsonDatabase.class);
        r2StorageService = mock(R2StorageService.class);
        fileStorageService = mock(FileStorageService.class);
        geminiService = mock(GeminiService.class);
        ragService = mock(RAGService.class);

        ReflectionTestUtils.setField(controller, "database", database);
        ReflectionTestUtils.setField(controller, "r2StorageService", r2StorageService);
        ReflectionTestUtils.setField(controller, "fileStorageService", fileStorageService);
        ReflectionTestUtils.setField(controller, "geminiService", geminiService);
        ReflectionTestUtils.setField(controller, "ragService", ragService);
        ReflectionTestUtils.setField(controller, "mapper", mapper);
    }

    @Test
    @DisplayName("1. Detect R2 bucket folders + merge DB/catalog subjects with Year & Semester")
    void testR2BucketSubjectDetectionAndMerge() {
        Subject ml = Subject.builder()
                .id("ml-sub-1")
                .code("01ADL302")
                .name("Machine Learning")
                .department("B.Tech-UAD")
                .semester("SEM 05")
                .build();
        Subject dbSub = Subject.builder()
                .id("auto-uuid-se")
                .code("02ADL202")
                .name("Software Engineering")
                .department("B.Tech-UAD")
                .semester("SEM 03")
                .build();

        ReflectionTestUtils.setField(controller, "cachedStaticSubjects",
                new AtomicReference<>(List.of(ml)));
        when(database.getAllSubjects()).thenReturn(List.of(dbSub));
        when(r2StorageService.listTopLevelFolders()).thenReturn(List.of(
                "01ADL302 Machine Learning",
                "02ADL202 Software Engineering",
                "01ETMDL2301 IoT Implementation"
        ));

        ResponseEntity<Map<String, Object>> res = controller.getR2BucketSubjects();
        assertEquals(HttpStatus.OK, res.getStatusCode());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> subjects = (List<Map<String, Object>>) res.getBody().get("subjects");
        assertNotNull(subjects);
        assertEquals(3, subjects.size());

        Map<String, Object> mlEntry = subjects.stream()
                .filter(s -> "ml-sub-1".equals(s.get("id"))).findFirst().orElseThrow();
        assertEquals(true, mlEntry.get("inBucket"));
        assertEquals("TY", mlEntry.get("year"));

        Map<String, Object> seEntry = subjects.stream()
                .filter(s -> "auto-uuid-se".equals(s.get("id"))).findFirst().orElseThrow();
        assertEquals(true, seEntry.get("inBucket"));
        assertEquals("SY", seEntry.get("year"));

        Map<String, Object> iotEntry = subjects.stream()
                .filter(s -> String.valueOf(s.get("id")).startsWith("r2-")).findFirst().orElseThrow();
        assertEquals(true, iotEntry.get("inBucket"));
        assertEquals("01ETMDL2301", iotEntry.get("code"));
    }

    @Test
    @DisplayName("2. Save & isolate teacher Year/Sem/Subject mappings in JSON config (zero DB)")
    void testTeacherMappingsJsonPersistenceAndIsolation() {
        AtomicReference<String> storedJson = new AtomicReference<>(null);
        when(r2StorageService.readJsonConfig("_config/teacher-mappings.json"))
                .thenAnswer(inv -> storedJson.get());
        when(r2StorageService.writeJsonConfig(eq("_config/teacher-mappings.json"), anyString()))
                .thenAnswer(inv -> {
                    storedJson.set(inv.getArgument(1));
                    return true;
                });

        Map<String, Object> payloadT1 = Map.of(
                "year", "SY",
                "semester", "SEM 03",
                "selectedSubjects", List.of("Software Engineering", "Data Structure")
        );
        ResponseEntity<Map<String, Object>> saveRes = controller.saveTeacherMappings("FAC001", null, payloadT1);
        assertEquals(HttpStatus.OK, saveRes.getStatusCode());

        // Teacher 2 saves empty selection -> should not affect FAC001 or fall back
        controller.saveTeacherMappings("FAC002", null, Map.of(
                "year", "TY",
                "semester", "SEM 05",
                "selectedSubjects", List.of()
        ));

        ResponseEntity<Map<String, Object>> loadT1 = controller.getTeacherMappings("FAC001", null);
        ResponseEntity<Map<String, Object>> loadT2 = controller.getTeacherMappings("FAC002", null);

        assertEquals("SY", loadT1.getBody().get("year"));
        assertEquals(List.of("Software Engineering", "Data Structure"), loadT1.getBody().get("selectedSubjects"));
        assertEquals(List.of(), loadT2.getBody().get("selectedSubjects"));
        verifyNoInteractions(database); // Zero DB overhead
    }

    @Test
    @DisplayName("3. Upload resolves catalog subject, disambiguates duplicate filename, and aborts on R2 failure")
    void testUploadEndToEndFlow() {
        Subject seSubject = Subject.builder()
                .id("adl202-uad-softeng")
                .code("02ADL202")
                .name("Software Engineering")
                .department("B.Tech-UAD")
                .semester("SEM 03")
                .build();

        ReflectionTestUtils.setField(controller, "cachedStaticSubjects",
                new AtomicReference<>(List.of(seSubject)));
        // Not yet in DB -> falls back to static catalog and persists subject
        when(database.getSubjectById("adl202-uad-softeng")).thenReturn(Optional.empty());
        when(database.addSubject(any(Subject.class))).thenReturn(seSubject);
        when(fileStorageService.extractTextFromMultipartFile(any())).thenReturn("Agile & Waterfall notes");

        MockMultipartFile file = new MockMultipartFile(
                "file", "Unit1_Notes.pdf", "application/pdf", "%PDF-1.4 sample".getBytes(StandardCharsets.UTF_8));

        // 3a. R2 upload failure must return 502 and NEVER insert broken Note into DB
        when(database.existsNoteByR2ObjectKey(anyString())).thenReturn(false);
        when(r2StorageService.uploadFile(any(), anyString())).thenReturn(null);

        ResponseEntity<Map<String, String>> failRes = controller.uploadNote(
                file, "Unit 1 Intro", "adl202-uad-softeng", null, null, "UNIT 01", "mid-sem", "Notes", null, "Prof. A");
        assertEquals(HttpStatus.BAD_GATEWAY, failRes.getStatusCode());
        verify(database, never()).addNote(any());

        // 3b. Collision disambiguation when clean key already exists
        String cleanKey = "02ADL202 Software Engineering/UNIT 01/Unit1_Notes.pdf";
        when(database.existsNoteByR2ObjectKey(cleanKey)).thenReturn(true);
        when(r2StorageService.uploadFile(any(), anyString())).thenAnswer(inv -> inv.getArgument(1));

        ResponseEntity<Map<String, String>> okRes = controller.uploadNote(
                file, "Unit 1 Intro", "adl202-uad-softeng", null, null, "UNIT 01", "mid-sem", "Notes", "[\"unit1\"]", "Prof. A");
        assertEquals(HttpStatus.OK, okRes.getStatusCode());

        ArgumentCaptor<Note> noteCaptor = ArgumentCaptor.forClass(Note.class);
        verify(database, times(1)).addNote(noteCaptor.capture());
        Note saved = noteCaptor.getValue();
        assertEquals("adl202-uad-softeng", saved.getSubjectId());
        assertNotEquals(cleanKey, saved.getR2ObjectKey());
        assertTrue(saved.getR2ObjectKey().startsWith("02ADL202 Software Engineering/UNIT 01/"));
        assertTrue(saved.getR2ObjectKey().endsWith("_Unit1_Notes.pdf"));
    }

    @Test
    @DisplayName("4. Raw file streaming sanitizes Content-Disposition basename & blocks traversal")
    void testRawFileStreamingAndTraversalGuard() {
        ResponseEntity<Resource> traversal = controller.getRawFile("../secret.pdf");
        assertEquals(HttpStatus.BAD_REQUEST, traversal.getStatusCode());

        byte[] pdfBytes = "%PDF-1.4 content".getBytes(StandardCharsets.UTF_8);
        String key = "02ADL202 Software Engineering/UNIT 01/Unit1_Notes.pdf";
        when(fileStorageService.getFilePath(anyString())).thenReturn(java.nio.file.Paths.get("nonexistent-local-file"));
        when(database.findNoteByStorageKey(key)).thenReturn(Optional.of(Note.builder().id("n1").r2ObjectKey(key).build()));
        when(r2StorageService.getObjectBytes(key)).thenReturn(pdfBytes);

        ResponseEntity<Resource> ok = controller.getRawFile(key);
        assertEquals(HttpStatus.OK, ok.getStatusCode());
        assertEquals("inline; filename=\"Unit1_Notes.pdf\"", ok.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION));
    }

    @Test
    @DisplayName("5. DELETE /notes and /notes/{id} reject students/anonymous and allow teachers")
    void testDeleteAuthorizationEnforcement() {
        ResponseEntity<Map<String, String>> anonDel = controller.deleteNote("n1", null);
        ResponseEntity<Map<String, String>> studentDel = controller.deleteNote("n1", "student");
        ResponseEntity<Map<String, Object>> studentWipe = controller.deleteAllNotes("student");

        assertEquals(HttpStatus.FORBIDDEN, anonDel.getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, studentDel.getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, studentWipe.getStatusCode());

        when(database.getNoteById("n1")).thenReturn(Optional.of(Note.builder().id("n1").r2ObjectKey("k/f.pdf").build()));
        ResponseEntity<Map<String, String>> teacherDel = controller.deleteNote("n1", "teacher");
        assertEquals(HttpStatus.OK, teacherDel.getStatusCode());
        verify(r2StorageService, times(1)).deleteFile("k/f.pdf");
        verify(database, times(1)).deleteNote("n1");
    }
}


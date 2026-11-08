package com.eduvault.performance;

import com.eduvault.controller.ApiController;
import com.eduvault.model.Doubt;
import com.eduvault.model.Note;
import com.eduvault.model.Subject;
import com.eduvault.repository.DoubtRepository;
import com.eduvault.repository.LocalJsonDatabase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Performance verification tests for C-1 and C-2:
 * C-1: Batch doubt querying via findByNoteIdIn replacing N+1 per-note loops.
 * C-2: O(1) single doubt lookup via doubtRepository.findById replacing stream flatMap over all notes.
 */
@ExtendWith(MockitoExtension.class)
public class DoubtBatchLookupPerformanceTest {

    @Mock
    private DoubtRepository doubtRepository;

    @Mock
    private LocalJsonDatabase database;

    @InjectMocks
    private ApiController apiController;

    private LocalJsonDatabase localJsonDatabase;

    @BeforeEach
    void setUp() {
        localJsonDatabase = new LocalJsonDatabase();
        ReflectionTestUtils.setField(localJsonDatabase, "doubtRepository", doubtRepository);
        ReflectionTestUtils.setField(apiController, "database", database);
    }

    // -------------------------------------------------------------
    // LocalJsonDatabase Batch & O(1) Contract Tests (C-1, C-2)
    // -------------------------------------------------------------

    @Test
    @DisplayName("C-1: getDoubtsByNoteIds calls repository.findByNoteIdIn in a single batch roundtrip")
    void testGetDoubtsByNoteIdsBatchRoundtrip() {
        List<String> noteIds = List.of("note-1", "note-2", "note-3");
        List<Doubt> mockDoubts = List.of(
                Doubt.builder().id("d1").noteId("note-1").question("Q1").build(),
                Doubt.builder().id("d2").noteId("note-2").question("Q2").build(),
                Doubt.builder().id("d3").noteId("note-3").question("Q3").build()
        );

        when(doubtRepository.findByNoteIdIn(noteIds)).thenReturn(mockDoubts);

        List<Doubt> result = localJsonDatabase.getDoubtsByNoteIds(noteIds);

        assertEquals(3, result.size());
        assertEquals("d1", result.get(0).getId());
        // Verify exactly 1 batch repository invocation, 0 per-note queries
        verify(doubtRepository, times(1)).findByNoteIdIn(noteIds);
        verify(doubtRepository, never()).findByNoteId(anyString());
    }

    @Test
    @DisplayName("C-1: getDoubtsByNoteIds returns empty list immediately for null or empty input without hitting DB")
    void testGetDoubtsByNoteIdsNullOrEmptySafety() {
        List<Doubt> nullResult = localJsonDatabase.getDoubtsByNoteIds(null);
        assertNotNull(nullResult);
        assertTrue(nullResult.isEmpty());

        List<Doubt> emptyResult = localJsonDatabase.getDoubtsByNoteIds(Collections.emptyList());
        assertNotNull(emptyResult);
        assertTrue(emptyResult.isEmpty());

        verify(doubtRepository, never()).findByNoteIdIn(any());
        verify(doubtRepository, never()).findByNoteId(anyString());
    }

    @Test
    @DisplayName("C-1: getAllDoubts invokes doubtRepository.findAll in a single query")
    void testGetAllDoubtsSingleQuery() {
        List<Doubt> all = List.of(
                Doubt.builder().id("d1").noteId("note-1").build(),
                Doubt.builder().id("d2").noteId("note-2").build()
        );
        when(doubtRepository.findAll()).thenReturn(all);

        List<Doubt> result = localJsonDatabase.getAllDoubts();

        assertEquals(2, result.size());
        verify(doubtRepository, times(1)).findAll();
        verify(doubtRepository, never()).findByNoteId(anyString());
    }

    @Test
    @DisplayName("C-2: getDoubtById performs direct O(1) indexed lookup via doubtRepository.findById")
    void testGetDoubtByIdDirectO1Lookup() {
        Doubt doubt = Doubt.builder().id("d-target").noteId("note-99").question("Target?").build();
        when(doubtRepository.findById("d-target")).thenReturn(Optional.of(doubt));

        Optional<Doubt> found = localJsonDatabase.getDoubtById("d-target");

        assertTrue(found.isPresent());
        assertEquals("d-target", found.get().getId());
        verify(doubtRepository, times(1)).findById("d-target");
    }

    @Test
    @DisplayName("C-2: getDoubtById returns empty for null ID or non-existent ID without throwing exception")
    void testGetDoubtByIdNullOrMissing() {
        Optional<Doubt> nullResult = localJsonDatabase.getDoubtById(null);
        assertTrue(nullResult.isEmpty());
        verify(doubtRepository, never()).findById(any());

        when(doubtRepository.findById("missing-id")).thenReturn(Optional.empty());
        Optional<Doubt> missingResult = localJsonDatabase.getDoubtById("missing-id");
        assertTrue(missingResult.isEmpty());
        verify(doubtRepository, times(1)).findById("missing-id");
    }

    // -------------------------------------------------------------
    // ApiController Endpoints Performance Contract Tests (C-1, C-2)
    // -------------------------------------------------------------

    @Test
    @DisplayName("C-1: ApiController.getAllDoubts for non-teacher returns database.getAllDoubts() in 1 query")
    void testGetAllDoubtsNonTeacherSingleQuery() {
        List<Doubt> allMockDoubts = List.of(
                Doubt.builder().id("d1").noteId("n1").question("How does indexing work?").build(),
                Doubt.builder().id("d2").noteId("n2").question("What is B2 storage?").build()
        );
        when(database.getAllDoubts()).thenReturn(allMockDoubts);

        ResponseEntity<List<Doubt>> response = apiController.getAllDoubts(
                null, null, null, null, null, null, null, null, null
        );

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().size());

        // Verifies O(1) batch query: getAllDoubts called once, no loop over individual notes
        verify(database, times(1)).getAllDoubts();
        verify(database, never()).getDoubtsByNoteId(anyString());
    }

    @Test
    @DisplayName("C-1: ApiController.getAllDoubts for teacher batches all matching note IDs into single getDoubtsByNoteIds call")
    void testGetAllDoubtsTeacherBatchedQuery() {
        // Teacher teaching "Cloud Computing"
        String teacherRole = "TEACHER";
        String teacherSubjectsHeader = "[\"Cloud Computing\"]";

        // Setup notes: 3 notes match "Cloud Computing", 2 notes belong to "Database Systems"
        Subject ccSubject = Subject.builder().id("sub-cc").name("Cloud Computing").code("CS401").build();
        Subject dbSubject = Subject.builder().id("sub-db").name("Database Systems").code("CS301").build();

        Note n1 = Note.builder().id("note-cc-1").title("AWS Overview").subjectId("sub-cc").build();
        Note n2 = Note.builder().id("note-cc-2").title("Docker & K8s").subjectId("sub-cc").build();
        Note n3 = Note.builder().id("note-cc-3").title("Serverless Arch").subjectId("sub-cc").build();
        Note n4 = Note.builder().id("note-db-1").title("SQL Normalization").subjectId("sub-db").build();
        Note n5 = Note.builder().id("note-db-2").title("B-Trees").subjectId("sub-db").build();

        when(database.getAllNoteSummaries()).thenReturn(List.of(n1, n2, n3, n4, n5));
        when(database.getSubjectById("sub-cc")).thenReturn(Optional.of(ccSubject));
        when(database.getSubjectById("sub-db")).thenReturn(Optional.of(dbSubject));

        List<Doubt> batchedDoubts = List.of(
                Doubt.builder().id("d-cc-1").noteId("note-cc-1").question("Lambda cold start?").build(),
                Doubt.builder().id("d-cc-2").noteId("note-cc-2").question("Pod scheduling?").build()
        );
        when(database.getDoubtsByNoteIds(List.of("note-cc-1", "note-cc-2", "note-cc-3"))).thenReturn(batchedDoubts);

        ResponseEntity<List<Doubt>> response = apiController.getAllDoubts(
                teacherRole, teacherSubjectsHeader, null, null, null, null, null, null, null
        );

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().size());

        // CRITICAL AUDIT ASSERTION: Single batch call for matching note IDs, zero per-note queries
        verify(database, times(1)).getDoubtsByNoteIds(List.of("note-cc-1", "note-cc-2", "note-cc-3"));
        verify(database, never()).getDoubtsByNoteId(anyString());
    }

    @Test
    @DisplayName("C-1: ApiController.getAllDoubts for teacher with no matching subjects returns empty without DB doubt query")
    void testGetAllDoubtsTeacherNoMatchingSubjects() {
        String teacherRole = "faculty";
        String teacherSubjectsHeader = "[\"Quantum Computing\"]";

        Subject sub = Subject.builder().id("sub-ai").name("Artificial Intelligence").code("CS501").build();
        Note note = Note.builder().id("note-1").title("Search Algorithms").subjectId("sub-ai").build();

        when(database.getAllNoteSummaries()).thenReturn(List.of(note));
        when(database.getSubjectById("sub-ai")).thenReturn(Optional.of(sub));
        when(database.getDoubtsByNoteIds(Collections.emptyList())).thenReturn(Collections.emptyList());

        ResponseEntity<List<Doubt>> response = apiController.getAllDoubts(
                teacherRole, teacherSubjectsHeader, null, null, null, null, null, null, null
        );

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isEmpty());

        verify(database, times(1)).getDoubtsByNoteIds(Collections.emptyList());
        verify(database, never()).getDoubtsByNoteId(anyString());
    }

    @Test
    @DisplayName("C-2: ApiController.answerDoubt uses direct O(1) doubt lookup and NEVER calls getAllNotes()")
    void testAnswerDoubtDirectO1LookupEliminatingFullScan() {
        String doubtId = "doubt-uuid-42";
        Doubt doubt = Doubt.builder()
                .id(doubtId)
                .noteId("note-target-10")
                .question("What is HikariCP max pool size?")
                .status("pending")
                .build();

        Note note = Note.builder()
                .id("note-target-10")
                .title("Database Performance")
                .subjectId("sub-db")
                .build();

        Subject sub = Subject.builder()
                .id("sub-db")
                .name("Database Systems")
                .code("CS301")
                .build();

        when(database.getDoubtById(doubtId)).thenReturn(Optional.of(doubt));
        when(database.getNoteById("note-target-10")).thenReturn(Optional.of(note));
        when(database.getSubjectById("sub-db")).thenReturn(Optional.of(sub));

        Map<String, String> body = Map.of("answer", "It is tuned to 10 for optimal throughput.");

        ResponseEntity<?> response = apiController.answerDoubt(
                doubtId, "TEACHER", "[\"Database Systems\"]", null, null, null, null, body
        );

        assertEquals(200, response.getStatusCode().value());
        assertEquals("answered", doubt.getStatus());
        assertEquals("It is tuned to 10 for optimal throughput.", doubt.getAnswer());

        // CRITICAL AUDIT ASSERTIONS (C-2):
        // 1. Single direct O(1) doubt lookup
        verify(database, times(1)).getDoubtById(doubtId);
        // 2. Strict guarantee: getAllNotes() is NEVER called (no full table scan)
        verify(database, never()).getAllNotes();
        // 3. Doubt is persisted with the answer
        verify(database, times(1)).updateDoubt(doubt);
    }

    @Test
    @DisplayName("C-2: ApiController.answerDoubt returns 404 when doubt does not exist without full scan")
    void testAnswerDoubtNotFoundDirect404() {
        String doubtId = "non-existent-doubt";
        when(database.getDoubtById(doubtId)).thenReturn(Optional.empty());

        Map<String, String> body = Map.of("answer", "Valid answer text");

        ResponseEntity<?> response = apiController.answerDoubt(
                doubtId, "TEACHER", null, null, null, null, null, body
        );

        assertEquals(404, response.getStatusCode().value());
        verify(database, times(1)).getDoubtById(doubtId);
        verify(database, never()).getAllNotes();
    }

    @Test
    @DisplayName("C-2: ApiController.answerDoubt returns 400 for empty or whitespace answer")
    void testAnswerDoubtEmptyAnswerBadRequest() {
        Map<String, String> emptyBody = Map.of("answer", "   ");

        ResponseEntity<?> response = apiController.answerDoubt(
                "d-1", "TEACHER", null, null, null, null, null, emptyBody
        );

        assertEquals(400, response.getStatusCode().value());
        verify(database, never()).getDoubtById(anyString());
        verify(database, never()).getAllNotes();
    }
}

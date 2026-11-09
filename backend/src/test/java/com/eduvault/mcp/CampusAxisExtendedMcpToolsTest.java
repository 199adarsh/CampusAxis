package com.eduvault.mcp;

import com.eduvault.model.NcRequest;
import com.eduvault.model.Note;
import com.eduvault.model.Subject;
import com.eduvault.repository.AnnouncementRepository;
import com.eduvault.repository.LocalJsonDatabase;
import com.eduvault.repository.NoteRepository;
import com.eduvault.repository.SubjectRepository;
import com.eduvault.security.AuthenticatedStudentResolver;
import com.eduvault.security.AuthenticatedStudentResolver.StudentPrincipal;
import com.eduvault.service.BrabbleService;
import com.eduvault.service.LmsScraperService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CampusAxisExtendedMcpToolsTest {

    @Mock
    private SubjectRepository subjectRepository;

    @Mock
    private NoteRepository noteRepository;

    @Mock
    private AnnouncementRepository announcementRepository;

    @Mock
    private AuthenticatedStudentResolver studentResolver;

    @Mock
    private BrabbleService brabbleService;

    @Mock
    private LmsScraperService lmsScraperService;

    @Mock
    private LocalJsonDatabase database;

    @InjectMocks
    private CampusAxisMcpTools mcpTools;

    private StudentPrincipal student;
    private StudentPrincipal teacher;

    @BeforeEach
    void setUp() {
        student = new StudentPrincipal("PRN-24UAD019", "Aarav", "AI & Data Science", "4", List.of("SUB-1"), false);
        teacher = new StudentPrincipal("FACULTY-01", "Prof. Patil", "AI & Data Science", "4", List.of(), true);
    }

    @Test
    void testGetOverallAttendance_CalculatesAccurately() {
        when(studentResolver.resolveCurrentStudent()).thenReturn(student);
        Subject s1 = Subject.builder().id("SUB-1").name("Machine Learning").attendance("80%").totalAttended(16).totalConducted(20).build();
        when(subjectRepository.findAll()).thenReturn(List.of(s1));

        Map<String, Object> res = mcpTools.getOverallAttendance();
        assertEquals("PRN-24UAD019", res.get("studentPrn"));
        assertEquals("80.00%", res.get("overallAttendancePercent"));
        assertEquals(16, res.get("totalAttended"));
        assertEquals(20, res.get("totalConducted"));
    }

    @Test
    void testGetCieScores_ReturnsStudentScores() {
        when(studentResolver.resolveCurrentStudent()).thenReturn(student);
        Subject s1 = Subject.builder().id("SUB-1").name("Machine Learning").cie("28/30").build();
        when(subjectRepository.findAll()).thenReturn(List.of(s1));

        Map<String, Object> res = mcpTools.getCieScores(null);
        assertTrue(res.containsKey("cieScores"));
        List<?> list = (List<?>) res.get("cieScores");
        assertEquals(1, list.size());
    }

    @Test
    void testStudentCannotAccessForeignNote() {
        when(studentResolver.resolveCurrentStudent()).thenReturn(student);

        Note foreignNote = new Note();
        foreignNote.setId("NOTE-MECH");
        foreignNote.setTitle("Thermodynamics");
        foreignNote.setDepartment("Mechanical");
        foreignNote.setSemester("6");
        foreignNote.setSubjectId("SUB-MECH");
        foreignNote.setExtractedText("Confidential content");

        when(noteRepository.findById("NOTE-MECH")).thenReturn(Optional.of(foreignNote));

        Map<String, Object> res = mcpTools.getNoteContent("NOTE-MECH");
        assertTrue(res.containsKey("error"));
        assertTrue(res.get("error").toString().contains("Access Denied"));
    }

    @Test
    void testTeacherEndpoints_RejectStudentCallers() {
        when(studentResolver.resolveCurrentStudent()).thenReturn(student);

        Map<String, Object> annRes = mcpTools.createAnnouncement("Exam Alert", "ISE schedule posted", "Exam");
        assertTrue(annRes.containsKey("error"));

        List<Map<String, Object>> ncRes = mcpTools.viewNcRequests("PENDING", null);
        assertEquals(1, ncRes.size());
        assertTrue(ncRes.get(0).containsKey("error"));
    }

    @Test
    void testTeacherEndpoints_PermitTeacherCallers() {
        when(studentResolver.resolveCurrentStudent()).thenReturn(teacher);

        Map<String, Object> annRes = mcpTools.createAnnouncement("Guest Lecture", "Session at 10 AM", "Notice");
        assertEquals("SUCCESS", annRes.get("status"));

        NcRequest req = NcRequest.builder().id("NC-1").studentPrn("PRN-24UAD019").studentName("Aarav").status("PENDING").build();
        when(database.getAllNcRequests()).thenReturn(List.of(req));

        List<Map<String, Object>> ncRes = mcpTools.viewNcRequests("PENDING", null);
        assertEquals(1, ncRes.size());
        assertEquals("NC-1", ncRes.get(0).get("id"));
    }
}


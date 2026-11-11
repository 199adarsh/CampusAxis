package com.eduvault.service;

import com.eduvault.model.Subject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class LmsSubjectMatchingTest {

    private LmsScraperService scraperService;
    private List<Subject> semester5Subjects;

    @BeforeEach
    void setUp() {
        scraperService = new LmsScraperService();

        semester5Subjects = List.of(
                Subject.builder().id("sub-db-theory").name("Database Engineering").code("01ADL301").semester("SEM 05").department("B.Tech-UAD").build(),
                Subject.builder().id("sub-db-lab").name("Database Engineering Lab").code("01ADP304").semester("SEM 05").department("B.Tech-UAD").build(),
                Subject.builder().id("sub-ml-theory").name("Machine Learning").code("01ADL302").semester("SEM 05").department("B.Tech-UAD").build(),
                Subject.builder().id("sub-ml-lab").name("Machine Learning using Python Lab").code("01ADP305").semester("SEM 05").department("B.Tech-UAD").build(),
                Subject.builder().id("sub-awt").name("Advanced Web Technology").code("01ADP303").semester("SEM 05").department("B.Tech-UAD").build(),
                Subject.builder().id("sub-fe-theory").name("Feature Engineering").code("01ADL333").semester("SEM 05").department("B.Tech-UAD").build(),
                Subject.builder().id("sub-fe-lab").name("Feature Engineering Lab").code("01ADP336").semester("SEM 05").department("B.Tech-UAD").build(),
                Subject.builder().id("sub-iot-theory").name("IoT Implementation Using Raspberry Pi Boards").code("01ETMDL2301").semester("SEM 05").department("B.Tech-UAD").build(),
                Subject.builder().id("sub-iot-lab").name("IoT Implementation Using Raspberry Pi Boards Lab").code("01ETMDP2302").semester("SEM 05").department("B.Tech-UAD").build()
        );
    }

    @Test
    void testExactCodeMatchPrecedence() {
        Subject s1 = scraperService.matchSubject("01ADL301", "01ADL301 Database Engineering 2024-25", semester5Subjects);
        assertNotNull(s1);
        assertEquals("sub-db-theory", s1.getId());
        assertEquals("01ADL301", s1.getCode());

        Subject s2 = scraperService.matchSubject("01ADP304", "01ADP304 Database Engineering Lab 2024-25", semester5Subjects);
        assertNotNull(s2);
        assertEquals("sub-db-lab", s2.getId());
        assertEquals("01ADP304", s2.getCode());
    }

    @Test
    void testLabVsLectureStrictSeparation() {
        // Even if fullname mentions "Database Engineering", code 01ADL301 must NOT match the lab
        Subject theory = scraperService.matchSubject("01ADL301", "Database Engineering", semester5Subjects);
        assertEquals("sub-db-theory", theory.getId());
        assertNotEquals("sub-db-lab", theory.getId());

        Subject lab = scraperService.matchSubject("01ADP304", "Database Engineering Lab", semester5Subjects);
        assertEquals("sub-db-lab", lab.getId());
        assertNotEquals("sub-db-theory", lab.getId());
    }

    @Test
    void testMachineLearningSeparation() {
        Subject mlTheory = scraperService.matchSubject("01ADL302", "01ADL302 Machine Learning", semester5Subjects);
        assertEquals("sub-ml-theory", mlTheory.getId());

        Subject mlLab = scraperService.matchSubject("01ADP305", "01ADP305 Machine Learning Lab", semester5Subjects);
        assertEquals("sub-ml-lab", mlLab.getId());
    }

    @Test
    void testOlderSemesterAndUnmatchedCoursesNeverForced() {
        // Second Year (SEM 03/04) courses like 02ADL202 (Software Engineering)
        Subject se = scraperService.matchSubject("02ADL202", "02ADL202 Software Engineering", semester5Subjects);
        assertNull(se, "Older semester course 02ADL202 must NOT be force-mapped to SEM 05 subjects");

        Subject ds = scraperService.matchSubject("02ADL203", "Data Structures", semester5Subjects);
        assertNull(ds, "Older semester course Data Structures must NOT be force-mapped");

        Subject unknown = scraperService.matchSubject("UNKNOWN_CODE", "Advanced Robotics", semester5Subjects);
        assertNull(unknown, "Unknown course must return null");
    }

    @Test
    void testLongerNamePrioritizationWhenCodeMissing() {
        // Without code, "Database Engineering Lab" should match Lab, not theory
        Subject labNoCode = scraperService.matchSubject(null, "Database Engineering Lab", semester5Subjects);
        assertNotNull(labNoCode);
        assertEquals("sub-db-lab", labNoCode.getId());

        // Without code, "Machine Learning using Python Lab" should match the lab
        Subject mlLabNoCode = scraperService.matchSubject(null, "Machine Learning using Python Lab", semester5Subjects);
        assertNotNull(mlLabNoCode);
        assertEquals("sub-ml-lab", mlLabNoCode.getId());
    }

    @Test
    void testLogsAreNeverTruncatedPastFortyEntries() {
        for (int i = 1; i <= 55; i++) {
            org.springframework.test.util.ReflectionTestUtils.invokeMethod(
                    scraperService,
                    "updateProgress",
                    "24uad022", "SYNCING", "Stage " + i, "Course A", 1, 2,
                    "Note " + i, i, i, 0, 0, 50, "Log entry " + i
            );
        }
        var progress = scraperService.getProgress("24uad022");
        assertNotNull(progress);
        assertEquals(55, progress.getLogs().size());
        assertTrue(progress.getLogs().get(0).contains("Log entry 1"));
        assertTrue(progress.getLogs().get(54).contains("Log entry 55"));
    }

    @Test
    void testAvailabilityReportDetectsMoreNotesThanVaultNoteCount() throws Exception {
        var server = com.sun.net.httpserver.HttpServer.create(new java.net.InetSocketAddress("127.0.0.1", 0), 0);
        try {
            server.createContext("/login/index.php", ex -> {
                byte[] b = ("POST".equalsIgnoreCase(ex.getRequestMethod())
                        ? "<html>OK</html>"
                        : "<html><form><input name=\"logintoken\" value=\"t1\"/></form></html>")
                        .getBytes(java.nio.charset.StandardCharsets.UTF_8);
                ex.sendResponseHeaders(200, b.length);
                try (var os = ex.getResponseBody()) { os.write(b); }
            });
            server.createContext("/my/courses.php", ex -> {
                byte[] b = "<script>{\"sesskey\":\"sk1\"}</script>".getBytes(java.nio.charset.StandardCharsets.UTF_8);
                ex.sendResponseHeaders(200, b.length);
                try (var os = ex.getResponseBody()) { os.write(b); }
            });
            server.createContext("/lib/ajax/service.php", ex -> {
                byte[] b = "[{\"data\":{\"courses\":[{\"id\":2,\"fullname\":\"01ADL301 Database Engineering\",\"shortname\":\"01ADL301\"},{\"id\":12,\"fullname\":\"01ADL302 Machine Learning\",\"shortname\":\"01ADL302\"}]}}]"
                        .getBytes(java.nio.charset.StandardCharsets.UTF_8);
                ex.sendResponseHeaders(200, b.length);
                try (var os = ex.getResponseBody()) { os.write(b); }
            });
            server.createContext("/course/view.php", ex -> {
                String q = ex.getRequestURI().getQuery();
                String html = q.contains("id=2")
                        ? "<ul><li class=\"section\"><ul><li class=\"activity\"><a href=\"/mod/resource/view.php?id=1\">A</a></li><li class=\"activity\"><a href=\"/mod/resource/view.php?id=2\">B</a></li><li class=\"activity\"><a href=\"/mod/resource/view.php?id=3\">C</a></li></ul></li></ul>"
                        : "<ul><li class=\"section\"><ul><li class=\"activity\"><a href=\"/mod/resource/view.php?id=4\">D</a></li></ul></li></ul>";
                byte[] b = html.getBytes(java.nio.charset.StandardCharsets.UTF_8);
                ex.sendResponseHeaders(200, b.length);
                try (var os = ex.getResponseBody()) { os.write(b); }
            });
            server.start();

            var db = org.mockito.Mockito.mock(com.eduvault.repository.LocalJsonDatabase.class);
            var dbSub1 = Subject.builder().id("sub-db-theory").name("Database Engineering").code("01ADL301").department("B.Tech-UAD").noteCount(1).build();
            var dbSub2 = Subject.builder().id("sub-ml-theory").name("Machine Learning").code("01ADL302").department("B.Tech-UAD").noteCount(1).build();
            org.mockito.Mockito.when(db.getAllSubjects()).thenReturn(List.of(dbSub1, dbSub2));

            org.springframework.test.util.ReflectionTestUtils.setField(scraperService, "database", db);
            org.springframework.test.util.ReflectionTestUtils.setField(scraperService, "objectMapper", new com.fasterxml.jackson.databind.ObjectMapper());
            org.springframework.test.util.ReflectionTestUtils.setField(scraperService, "baseUrl", "http://127.0.0.1:" + server.getAddress().getPort());

            var report = scraperService.checkMoodleAvailability("24UAD022", "Dkte@123");
            assertEquals(2, report.getTotalCourses());
            assertEquals(1, report.getSubjectsWithNewNotes());

            var dbCourse = report.getCourses().stream().filter(c -> "2".equals(c.getId())).findFirst().orElseThrow();
            assertEquals(3, dbCourse.getMoodleCount());
            assertEquals(1, dbCourse.getVaultCount());
            assertEquals(2, dbCourse.getExtraNotesCount());
            assertTrue(dbCourse.isHasNewNotes());

            var mlCourse = report.getCourses().stream().filter(c -> "12".equals(c.getId())).findFirst().orElseThrow();
            assertEquals(1, mlCourse.getMoodleCount());
            assertEquals(1, mlCourse.getVaultCount());
            assertEquals(0, mlCourse.getExtraNotesCount());
            assertFalse(mlCourse.isHasNewNotes());
        } finally {
            server.stop(0);
        }
    }
}

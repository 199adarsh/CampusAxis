package com.eduvault.controller;

import com.eduvault.model.DashboardCredentials;
import com.eduvault.service.PortalScraperService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/portal")
public class PortalController {

    private static final Logger logger = LoggerFactory.getLogger(PortalController.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();

    private static final List<Map<String, String>> DEFAULT_FACULTY_ACCOUNTS = List.of(
        Map.of("id", "DRP@Eduvault", "name", "Prof. D R Patil", "prefix", "DRP", "dept", "AI & Data Science"),
        Map.of("id", "HPM@Eduvault", "name", "Prof. H P Magdum", "prefix", "HPM", "dept", "AI & Data Science"),
        Map.of("id", "TIB@Eduvault", "name", "Prof. T I Bagban", "prefix", "TIB", "dept", "AI & Data Science"),
        Map.of("id", "PMM@Eduvault", "name", "Prof. P M Mathpati", "prefix", "PMM", "dept", "AI & Data Science")
    );

    private static volatile List<Map<String, String>> cachedFacultyAccounts = null;

    private static List<Map<String, String>> getFacultyAccounts() {
        if (cachedFacultyAccounts != null) {
            return cachedFacultyAccounts;
        }
        try {
            File file = new File("./data/faculty_accounts.json");
            if (file.exists()) {
                List<Map<String, String>> loaded = objectMapper.readValue(file, new TypeReference<List<Map<String, String>>>() {});
                if (loaded != null && !loaded.isEmpty()) {
                    cachedFacultyAccounts = loaded;
                    return cachedFacultyAccounts;
                }
            }
        } catch (Exception e) {
            logger.warn("Could not read faculty_accounts.json: {}. Using default accounts.", e.getMessage());
        }
        cachedFacultyAccounts = DEFAULT_FACULTY_ACCOUNTS;
        return cachedFacultyAccounts;
    }

    private final PortalScraperService portalScraperService;
    private final com.eduvault.repository.LocalJsonDatabase database;

    @Autowired
    public PortalController(PortalScraperService portalScraperService, com.eduvault.repository.LocalJsonDatabase database) {
        this.portalScraperService = portalScraperService;
        this.database = database;
    }

    @PostMapping("/faculty/login")
    public ResponseEntity<?> facultyLogin(@RequestBody Map<String, String> body) {
        String id = body.get("facultyId");
        String pass = body.get("password");
        if (id == null || pass == null || id.isBlank() || pass.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Faculty ID and password are required"));
        }

        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));
        int day = today.getDayOfMonth();
        String day1 = String.valueOf(day);
        String day2 = String.format("%02d", day);

        String trimmedPass = pass.trim().toLowerCase();

        for (Map<String, String> account : getFacultyAccounts()) {
            String accId = account.get("id");
            String prefix = account.getOrDefault("prefix", accId.split("@")[0]).toLowerCase();

            if (accId.equalsIgnoreCase(id.trim()) || prefix.equalsIgnoreCase(id.trim())) {
                String expected1 = prefix + "@caxis" + day1;
                String expected2 = prefix + "@caxis" + day2;

                byte[] actualBytes = trimmedPass.getBytes(StandardCharsets.UTF_8);
                boolean match1 = MessageDigest.isEqual(expected1.getBytes(StandardCharsets.UTF_8), actualBytes);
                boolean match2 = MessageDigest.isEqual(expected2.getBytes(StandardCharsets.UTF_8), actualBytes);

                if (match1 || match2) {
                    return ResponseEntity.ok(Map.of(
                        "name", account.get("name"),
                        "prn", account.get("id"),
                        "dob", "TEACHER",
                        "department", account.get("dept"),
                        "role", "teacher"
                    ));
                }
            }
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid Faculty ID or password"));
    }

    @PostMapping("/dashboard")
    public ResponseEntity<?> getDashboardData(@RequestBody DashboardCredentials credentials) {
        logger.info("Received request for student portal synchronization: PRN={}", credentials.getPrn());
        
        if (credentials.getPrn() == null || credentials.getDob() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "PRN and DOB are required"));
        }

        try {
            logger.debug("Executing portal scraper service...");
            com.eduvault.model.PortalDashboardResponse response = portalScraperService.fetchDashboard(credentials.getPrn(), credentials.getDob());
            
            // Persist the synced data automatically for this specific user
            if (response != null) {
                // 1. Update Profile (Scoped to this student PRN)
                com.eduvault.model.StudentProfile profile = response.getProfile();
                if (profile != null) {
                    profile.setPrn(credentials.getPrn());
                    profile.setDob(credentials.getDob());
                    database.updateProfile(profile);
                    
                    // 2. Register new subjects in the catalog without overwriting personal attendance
                    if (response.getSubjects() != null) {
                        database.registerSubjectsCatalog(response.getSubjects(), profile.getDepartment(), profile.getSemester());
                    }
                }
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.warn("Portal synchronization scraper error: {}. Evaluating response...", e.getMessage());
            
            // 1. If credentials failed, return 401 Unauthorized immediately
            if ("Invalid credentials".equalsIgnoreCase(e.getMessage()) 
                    || (e.getMessage() != null && e.getMessage().contains("Authentication failed"))
                    || (e.getMessage() != null && e.getMessage().contains("LoginFailedException"))) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials. Please check your PRN and Date of Birth."));
            }

            // 2. Only on network/external outage: serve stored profile if PRN exists AND DOB matches via constant-time comparison
            com.eduvault.model.StudentProfile existingProfile = database.getProfile(credentials.getPrn().trim());
            if (existingProfile != null && credentials.getDob() != null && existingProfile.getDob() != null) {
                byte[] expected = existingProfile.getDob().trim().toLowerCase().getBytes(java.nio.charset.StandardCharsets.UTF_8);
                byte[] actual = credentials.getDob().trim().toLowerCase().getBytes(java.nio.charset.StandardCharsets.UTF_8);
                if (java.security.MessageDigest.isEqual(expected, actual)) {
                    logger.info("Serving stored profile fallback for PRN: {}", credentials.getPrn());
                    com.eduvault.model.PortalDashboardResponse fallback = com.eduvault.model.PortalDashboardResponse.builder()
                            .profile(existingProfile)
                            .subjects(List.of())
                            .build();
                    return ResponseEntity.ok(fallback);
                } else {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials. Please check your PRN and Date of Birth."));
                }
            }

            String errorMessage = e.getMessage() != null ? e.getMessage() : "Unable to reach university portal.";
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", errorMessage));
        }
    }
}

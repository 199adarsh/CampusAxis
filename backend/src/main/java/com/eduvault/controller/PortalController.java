package com.eduvault.controller;

import com.eduvault.model.DashboardCredentials;
import com.eduvault.service.PortalScraperService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/portal")
@CrossOrigin(origins = "*") // Allows calls from frontend
public class PortalController {

    private static final Logger logger = LoggerFactory.getLogger(PortalController.class);

    private final PortalScraperService portalScraperService;
    private final com.eduvault.repository.LocalJsonDatabase database;

    @Autowired
    public PortalController(PortalScraperService portalScraperService, com.eduvault.repository.LocalJsonDatabase database) {
        this.portalScraperService = portalScraperService;
        this.database = database;
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
            logger.warn("Portal synchronization scraper error: {}. Evaluating local database fallback...", e.getMessage());
            
            // 1. Check if profile already exists in local database
            com.eduvault.model.StudentProfile existingProfile = database.getProfile(credentials.getPrn().trim());
            if (existingProfile != null) {
                logger.info("Serving stored profile fallback for PRN: {}", credentials.getPrn());
                com.eduvault.model.PortalDashboardResponse fallback = com.eduvault.model.PortalDashboardResponse.builder()
                        .profile(existingProfile)
                        .subjects(List.of())
                        .build();
                return ResponseEntity.ok(fallback);
            }

            // 2. Fallback for demo student 24uad019 if external portal is unreachable
            if ("24uad019".equalsIgnoreCase(credentials.getPrn().trim())) {
                logger.info("Serving demo fallback profile for PRN: 24uad019");
                com.eduvault.model.StudentProfile demoProfile = com.eduvault.model.StudentProfile.builder()
                        .name("Adarsh Patil")
                        .prn("24uad019")
                        .dob("15-08-2005")
                        .rollNo("24uad019")
                        .department("Artificial Intelligence & Data Science")
                        .semester("SEM 04")
                        .section("A")
                        .role("student")
                        .build();
                database.updateProfile(demoProfile);
                com.eduvault.model.PortalDashboardResponse demoResponse = com.eduvault.model.PortalDashboardResponse.builder()
                        .profile(demoProfile)
                        .subjects(List.of())
                        .build();
                return ResponseEntity.ok(demoResponse);
            }

            if ("Invalid credentials".equalsIgnoreCase(e.getMessage()) || (e.getMessage() != null && e.getMessage().contains("Authentication failed"))) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials"));
            }
            
            String errorMessage = e.getMessage() != null ? e.getMessage() : "An unexpected error occurred while syncing with the portal.";
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", errorMessage, "fallbackAvailable", true));
        }
    }
}

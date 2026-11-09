package com.eduvault.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

/**
 * Resolves student identity strictly from the validated OAuth 2.1 Bearer JWT token.
 * Rejects unauthenticated callers or tokens missing essential student scope.
 */
@Component
public class AuthenticatedStudentResolver {

    public record StudentPrincipal(
            String prn,
            String name,
            String department,
            String semester,
            List<String> enrolledSubjectIds,
            boolean isTeacher
    ) {}

    public StudentPrincipal resolveCurrentStudent() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new SecurityException("Unauthorized: No authenticated security context found");
        }

        Object principalObj = auth.getPrincipal();
        if (!(principalObj instanceof Jwt jwt)) {
            throw new SecurityException("Unauthorized: Caller is not authenticated via a valid JWT Bearer token");
        }

        String prn = jwt.getClaimAsString("prn");
        if (prn == null || prn.isBlank()) {
            prn = jwt.getSubject();
        }
        if (prn == null || prn.isBlank()) {
            throw new SecurityException("Unauthorized: Token missing student identifier claim (prn/sub)");
        }

        String name = jwt.getClaimAsString("name");
        String department = jwt.getClaimAsString("department");
        String semester = jwt.getClaimAsString("semester");
        
        List<String> subjectIds = jwt.getClaimAsStringList("enrolled_subjects");
        if (subjectIds == null) {
            subjectIds = Collections.emptyList();
        }

        String role = jwt.getClaimAsString("role");
        boolean isTeacher = "teacher".equalsIgnoreCase(role) || "faculty".equalsIgnoreCase(role) || "admin".equalsIgnoreCase(role);

        // Security gate: non-teachers must have identifiable department or enrolled subjects
        if (!isTeacher && (department == null || department.isBlank()) && subjectIds.isEmpty()) {
            throw new SecurityException("Forbidden: Student token does not contain department or enrolled subject claims");
        }

        return new StudentPrincipal(
                prn.trim(),
                name != null ? name.trim() : "Student",
                department != null ? department.trim() : null,
                semester != null ? semester.trim() : null,
                subjectIds,
                isTeacher
        );
    }
}


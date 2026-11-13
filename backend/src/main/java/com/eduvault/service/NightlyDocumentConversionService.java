package com.eduvault.service;

import com.eduvault.model.Note;
import com.eduvault.repository.LocalJsonDatabase;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Service to pre-convert presentation documents (.ppt, .pptx) into PDFs nightly
 * and store the resulting PDF in Cloudflare R2 / disk cache so student requests
 * are served instantly without on-demand timeouts or 502/503 errors.
 */
@Service
public class NightlyDocumentConversionService {

    private static final Logger logger = LoggerFactory.getLogger(NightlyDocumentConversionService.class);

    @Autowired
    private LocalJsonDatabase database;

    @Autowired
    private DocumentConversionService documentConversionService;

    @Autowired
    private R2StorageService r2StorageService;

    @Autowired
    private FileStorageService fileStorageService;

    @Value("${app.conversion.nightly.enabled:true}")
    private boolean nightlyConversionEnabled;

    private final AtomicBoolean isConverting = new AtomicBoolean(false);

    /**
     * Run nightly at 03:30 AM IST (after midnight scrapers and before peak daytime traffic).
     */
    @Scheduled(cron = "${app.conversion.nightly.cron:0 30 3 * * ?}", zone = "${app.conversion.nightly.zone:Asia/Kolkata}")
    public void scheduleNightlyPptConversion() {
        if (!nightlyConversionEnabled) {
            logger.info("Nightly PPT conversion is disabled via configuration.");
            return;
        }
        logger.info("Starting scheduled nightly PPT-to-PDF conversion task.");
        convertAllPresentationsToPdf();
    }

    /**
     * Iterates through all notes, detects PPT/PPTX files, and pre-converts them to PDF if not already converted.
     * @return count of successfully converted presentations
     */
    public int convertAllPresentationsToPdf() {
        if (!isConverting.compareAndSet(false, true)) {
            logger.warn("Document conversion is already in progress. Skipping duplicate execution.");
            return 0;
        }

        int convertedCount = 0;
        try {
            List<Note> allNotes = database.getAllNotes();
            logger.info("Evaluating {} total notes for presentation pre-conversion...", allNotes.size());

            for (Note note : allNotes) {
                if (note == null) continue;
                String fileName = getTargetFileName(note);
                if (fileName == null) continue;
                String lower = fileName.toLowerCase();

                if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) {
                    try {
                        boolean converted = preconvertNotePresentation(note, fileName);
                        if (converted) {
                            convertedCount++;
                        }
                    } catch (Exception e) {
                        logger.warn("Failed pre-converting note id {} ({}): {}", note.getId(), fileName, e.getMessage());
                    }
                }
            }
            logger.info("Nightly presentation conversion finished. Pre-converted {} presentations.", convertedCount);
        } finally {
            isConverting.set(false);
        }
        return convertedCount;
    }

    public boolean preconvertNotePresentation(Note note, String fileName) throws Exception {
        String cacheKey = getPdfR2Key(note);
        if (r2StorageService != null && r2StorageService.doesObjectExist(cacheKey)) {
            logger.debug("PDF already exists in cache for note id {}: {}", note.getId(), cacheKey);
            return false;
        }

        byte[] rawBytes = loadNoteRawBytes(note);
        if (rawBytes == null || rawBytes.length == 0) {
            logger.warn("Could not retrieve source bytes for note id {} ({})", note.getId(), fileName);
            return false;
        }

        logger.info("Converting note id {} ({}, {} bytes) to PDF...", note.getId(), fileName, rawBytes.length);
        byte[] pdfBytes;
        try (InputStream is = new ByteArrayInputStream(rawBytes)) {
            pdfBytes = documentConversionService.convertPptToPdf(is, fileName);
        }

        if (pdfBytes != null && pdfBytes.length > 0) {
            if (r2StorageService != null) {
                r2StorageService.uploadBytes(pdfBytes, cacheKey);
                logger.info("Cached converted PDF in R2 under key: {}", cacheKey);
            }

            // Also persist locally in data directory for fast local reads
            try {
                Path localPdfPath = Paths.get("./data", cacheKey);
                if (localPdfPath.getParent() != null) {
                    Files.createDirectories(localPdfPath.getParent());
                }
                Files.write(localPdfPath, pdfBytes);
            } catch (Exception e) {
                logger.debug("Local disk cache save error for {}: {}", cacheKey, e.getMessage());
            }
            return true;
        }
        return false;
    }

    public static String getPdfR2Key(Note note) {
        return "cache/pdf/" + note.getId() + ".pdf";
    }

    private String getTargetFileName(Note note) {
        if (note.getOriginalFilename() != null && !note.getOriginalFilename().isBlank()) {
            return note.getOriginalFilename();
        }
        if (note.getFileUrl() != null && !note.getFileUrl().isBlank()) {
            return note.getFileUrl();
        }
        if (note.getTitle() != null && !note.getTitle().isBlank()) {
            return note.getTitle();
        }
        return null;
    }

    private byte[] loadNoteRawBytes(Note note) {
        if (note.getFileUrl() != null) {
            Path path = fileStorageService.getFilePath(note.getFileUrl());
            if (!Files.exists(path)) path = Paths.get("./data").resolve(note.getFileUrl());
            if (!Files.exists(path)) path = Paths.get("./backend/data").resolve(note.getFileUrl());
            if (Files.exists(path)) {
                try {
                    return Files.readAllBytes(path);
                } catch (Exception ignored) {}
            }
        }

        if (r2StorageService != null) {
            LinkedHashSet<String> candidates = new LinkedHashSet<>();
            if (note.getR2ObjectKey() != null && !note.getR2ObjectKey().isBlank()) {
                candidates.add(note.getR2ObjectKey().trim());
            }
            if (note.getFileUrl() != null && !note.getFileUrl().isBlank() && !note.getFileUrl().startsWith("http")) {
                candidates.add(note.getFileUrl().trim());
            }
            if (note.getOriginalFilename() != null && !note.getOriginalFilename().isBlank()) {
                candidates.add(note.getOriginalFilename().trim());
            }

            for (String key : candidates) {
                try {
                    byte[] bytes = r2StorageService.getObjectBytes(key);
                    if (bytes != null && bytes.length > 0) {
                        return bytes;
                    }
                } catch (Exception ignored) {}
            }
        }
        return null;
    }
}


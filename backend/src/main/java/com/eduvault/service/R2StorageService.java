package com.eduvault.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

/**
 * Handles all file operations against Cloudflare R2 via the
 * AWS SDK v2 S3-compatible API.
 *
 * Upload stores the object with ContentType and ContentLength metadata.
 * generatePresignedUrl returns a time-limited URL for private-bucket access.
 */
@Service
public class R2StorageService {

    private static final Logger logger = LoggerFactory.getLogger(R2StorageService.class);

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${app.r2.bucket-name:${R2_BUCKET_NAME:${R2_BUCKET_NAME:campusaxis-notes}}}")
    private String bucketName;

    @Value("${app.r2.presigned-url-expiry-minutes:60}")
    private long presignedExpiryMinutes;

    @Value("${app.storage.local-dir:./data}")
    private String localDir;

    @Value("${app.r2.access-key-id:${R2_ACCESS_KEY_ID:}}")
    private String accessKeyId;

    @Value("${app.r2.secret-access-key:${R2_SECRET_ACCESS_KEY:}}")
    private String secretAccessKey;

    public boolean isConfigured() {
        return accessKeyId != null && !accessKeyId.isBlank() &&
               secretAccessKey != null && !secretAccessKey.isBlank();
    }

    public R2StorageService(S3Client s3Client, S3Presigner s3Presigner) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
    }

    /**
     * Uploads a {@link MultipartFile} to R2.
     *
     * @param file the uploaded file
     * @return the object key (UUID + original extension) stored in R2, or null on failure
     */
    public String uploadFile(MultipartFile file) {
        return uploadFile(file, null);
    }

    public String uploadFile(MultipartFile file, String targetKey) {
        if (!isConfigured()) {
            logger.error("R2 storage is unconfigured: R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY is missing in environment variables.");
            return null;
        }

        String originalName = file.getOriginalFilename();
        String ext = (originalName != null && originalName.contains("."))
                ? originalName.substring(originalName.lastIndexOf('.'))
                : "";
        String key = (targetKey != null && !targetKey.isBlank()) ? targetKey : (UUID.randomUUID() + ext);

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(resolveContentType(file, ext))
                    .contentLength(file.getSize())
                    .build();

            s3Client.putObject(request,
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            logger.info("Uploaded file to R2: bucket={} key={} size={}", bucketName, key, file.getSize());
            return key;
        } catch (IOException e) {
            logger.error("Failed to read file stream for R2 upload: {}", key, e);
            return null;
        } catch (S3Exception e) {
            logger.error("R2 S3 error during upload (status={}): {}", e.statusCode(),
                    e.awsErrorDetails() != null ? e.awsErrorDetails().errorMessage() : e.getMessage(), e);
            return null;
        } catch (Exception e) {
            logger.error("Unexpected error during R2 upload for key {}: {}", key, e.getMessage(), e);
            return null;
        }
    }

    public boolean checkR2Availability() {
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucketName).build());
            return true;
        } catch (S3Exception e) {
            if (e.statusCode() == 403) {
                logger.warn("R2 HTTP 403: Transaction/bandwidth cap or permissions issue detected: {}", e.awsErrorDetails().errorMessage());
            } else {
                logger.warn("R2 S3 check returned status {}: {}", e.statusCode(), e.awsErrorDetails().errorMessage());
            }
            return false;
        } catch (Exception e) {
            logger.warn("R2 check failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Uploads raw bytes to R2 using the specified key.
     *
     * @param bytes the byte array to upload
     * @param key the object key (filename) to use in R2
     * @return object key in R2
     */
    public String uploadBytes(byte[] bytes, String key) {
        String ext = (key != null && key.contains("."))
                ? key.substring(key.lastIndexOf('.'))
                : "";

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(resolveContentTypeFromExt(ext))
                    .contentLength((long) bytes.length)
                    .build();

            s3Client.putObject(request, RequestBody.fromBytes(bytes));
            logger.info("Uploaded raw bytes to R2: bucket={} key={} size={}", bucketName, key, bytes.length);
            return key;
        } catch (S3Exception e) {
            if (e.statusCode() == 403) {
                logger.warn("R2 upload blocked (HTTP 403): {}", e.awsErrorDetails().errorMessage());
            } else {
                logger.warn("R2 S3 upload failed with code {}: {}", e.statusCode(), e.awsErrorDetails().errorMessage());
            }
            return null;
        } catch (Exception e) {
            logger.warn("R2 uploadBytes failed: {}. Continuing with local fallback.", e.getMessage());
            return null;
        }
    }

    /**
     * Verifies that the file exists in R2; if missing, searches local storage and uploads it.
     */
    public void ensureUploaded(String key) {
        if (key == null || key.isEmpty() || key.startsWith("http")) return;
        try {
            s3Client.headObject(HeadObjectRequest.builder().bucket(bucketName).key(key).build());
        } catch (Exception missingEx) {
            try {
                Path localPath = Paths.get(localDir).resolve(key).toAbsolutePath().normalize();
                if (!Files.exists(localPath)) {
                    localPath = Paths.get("./backend/data").resolve(key).toAbsolutePath().normalize();
                }
                if (!Files.exists(localPath)) {
                    localPath = Paths.get("./data").resolve(key).toAbsolutePath().normalize();
                }

                if (Files.exists(localPath) && Files.isRegularFile(localPath)) {
                    String ext = key.contains(".") ? key.substring(key.lastIndexOf('.')) : "";
                    PutObjectRequest request = PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(key)
                            .contentType(resolveContentTypeFromExt(ext))
                            .contentLength(Files.size(localPath))
                            .build();

                    s3Client.putObject(request, RequestBody.fromFile(localPath));
                    logger.info("Auto-synced local file to R2: key={} path={}", key, localPath);
                }
            } catch (Exception ex) {
                logger.warn("Failed to auto-sync local file {} to R2: {}", key, ex.getMessage());
            }
        }
    }

    public List<S3Object> listAllObjects() {
        List<S3Object> all = new java.util.ArrayList<>();
        try {
            String token = null;
            do {
                ListObjectsV2Request.Builder builder = ListObjectsV2Request.builder()
                        .bucket(bucketName)
                        .maxKeys(1000);
                if (token != null) {
                    builder.continuationToken(token);
                }
                ListObjectsV2Response response = s3Client.listObjectsV2(builder.build());
                if (response.contents() != null) {
                    for (S3Object obj : response.contents()) {
                        if (obj.key() != null && !obj.key().startsWith("_config/")) {
                            all.add(obj);
                        }
                    }
                }
                token = Boolean.TRUE.equals(response.isTruncated()) ? response.nextContinuationToken() : null;
            } while (token != null);
            logger.info("Found {} objects in R2 bucket {}", all.size(), bucketName);
            return all;
        } catch (Exception e) {
            logger.error("Failed to list R2 objects: {}", e.getMessage(), e);
            return all;
        }
    }

    public List<String> listTopLevelFolders() {
        java.util.Set<String> folders = new java.util.TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        try {
            String token = null;
            do {
                ListObjectsV2Request.Builder builder = ListObjectsV2Request.builder()
                        .bucket(bucketName)
                        .delimiter("/")
                        .maxKeys(1000);
                if (token != null) {
                    builder.continuationToken(token);
                }
                ListObjectsV2Response response = s3Client.listObjectsV2(builder.build());
                if (response.commonPrefixes() != null) {
                    for (CommonPrefix cp : response.commonPrefixes()) {
                        String prefix = cp.prefix();
                        if (prefix != null && prefix.endsWith("/")) {
                            prefix = prefix.substring(0, prefix.length() - 1);
                        }
                        if (prefix != null && !prefix.isBlank() && !prefix.startsWith("_config")) {
                            folders.add(prefix);
                        }
                    }
                }
                token = Boolean.TRUE.equals(response.isTruncated()) ? response.nextContinuationToken() : null;
            } while (token != null);
        } catch (Exception e) {
            logger.warn("Failed to list top-level R2 folders: {}", e.getMessage());
        }
        return new java.util.ArrayList<>(folders);
    }

    public String readJsonConfig(String key) {
        try {
            byte[] bytes = getObjectBytes(key);
            if (bytes != null && bytes.length > 0) {
                return new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
            }
        } catch (Exception e) {
            logger.debug("R2 config read skipped for {}: {}", key, e.getMessage());
        }
        try {
            Path localPath = Paths.get(localDir).resolve(key).normalize();
            if (!Files.exists(localPath)) {
                localPath = Paths.get("data").resolve(key).normalize();
            }
            if (Files.exists(localPath) && Files.isRegularFile(localPath)) {
                return Files.readString(localPath, java.nio.charset.StandardCharsets.UTF_8);
            }
        } catch (Exception ignored) {}
        return null;
    }

    public boolean writeJsonConfig(String key, String jsonContent) {
        byte[] bytes = jsonContent.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        boolean localOk = false;
        try {
            Path localPath = Paths.get("data").resolve(key).normalize();
            if (!Files.exists(Paths.get("data")) && Files.exists(Paths.get("backend", "data"))) {
                localPath = Paths.get("backend", "data").resolve(key).normalize();
            }
            Files.createDirectories(localPath.getParent());
            Files.write(localPath, bytes);
            localOk = true;
        } catch (Exception e) {
            logger.warn("Failed to write local config {}: {}", key, e.getMessage());
        }
        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType("application/json")
                    .contentLength((long) bytes.length)
                    .build();
            s3Client.putObject(request, RequestBody.fromBytes(bytes));
            return true;
        } catch (Exception e) {
            logger.warn("Failed to write R2 config {}: {}", key, e.getMessage());
            return localOk;
        }
    }

    public static class StorageUnavailableException extends RuntimeException {
        private final int statusCode;

        public StorageUnavailableException(String message, Throwable cause, int statusCode) {
            super(message, cause);
            this.statusCode = statusCode;
        }

        public StorageUnavailableException(String message, Throwable cause) {
            this(message, cause, 502);
        }

        public int getStatusCode() {
            return statusCode;
        }
    }

    public byte[] getObjectBytes(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }
        int maxAttempts = 2;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                GetObjectRequest request = GetObjectRequest.builder()
                        .bucket(bucketName)
                        .key(key)
                        .build();
                return s3Client.getObjectAsBytes(request).asByteArray();
            } catch (NoSuchKeyException e) {
                logger.debug("R2 object {} not found (NoSuchKey)", key);
                return null;
            } catch (S3Exception e) {
                if (e.statusCode() == 404) {
                    logger.debug("R2 object {} not found (404)", key);
                    return null;
                }
                if (attempt < maxAttempts && (e.statusCode() >= 500 || e.statusCode() == 429)) {
                    logger.warn("Transient R2 S3 error on attempt {} for key {}: status={} msg={}. Retrying...",
                            attempt, key, e.statusCode(), e.awsErrorDetails() != null ? e.awsErrorDetails().errorMessage() : e.getMessage());
                    try {
                        Thread.sleep(100);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                    continue;
                }
                logger.error("R2 S3 error downloading object {}: status={} msg={}", key, e.statusCode(),
                        e.awsErrorDetails() != null ? e.awsErrorDetails().errorMessage() : e.getMessage());
                int status = e.statusCode() == 503 ? 503 : (e.statusCode() == 429 ? 429 : 502);
                throw new StorageUnavailableException("R2 S3 storage error (" + e.statusCode() + "): " + e.getMessage(), e, status);
            } catch (Exception e) {
                if (attempt < maxAttempts) {
                    logger.warn("Transient R2 error on attempt {} for key {}: {}. Retrying...", attempt, key, e.getMessage());
                    try {
                        Thread.sleep(100);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                    continue;
                }
                logger.error("Failed to download R2 object {}: {}", key, e.getMessage());
                throw new StorageUnavailableException("Transient R2 failure downloading object " + key + ": " + e.getMessage(), e, 502);
            }
        }
        return null;
    }

    /**
     * Deletes an object from R2 by key.
     *
     * @param key the object key to delete
     */
    public void deleteFile(String key) {
        if (key == null || key.isBlank() || key.startsWith("http://") || key.startsWith("https://")) {
            return;
        }
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build());
            logger.info("Deleted file from R2: bucket={} key={}", bucketName, key);
        } catch (S3Exception e) {
            logger.error("R2 S3 error during delete for key {}: {}", key, e.awsErrorDetails().errorMessage(), e);
        }
    }

    /**
     * Batch deletes objects from R2 by keys using chunking of up to 1,000 objects per S3 request.
     *
     * @param keys the collection of object keys to delete
     * @return the total number of objects deleted
     */
    public int deleteObjectsBatch(java.util.Collection<String> keys) {
        if (keys == null || keys.isEmpty()) {
            return 0;
        }
        List<String> validKeys = keys.stream()
                .filter(k -> k != null && !k.isBlank() && !k.startsWith("http://") && !k.startsWith("https://"))
                .distinct()
                .toList();
        if (validKeys.isEmpty()) {
            return 0;
        }

        int totalDeleted = 0;
        int chunkSize = 1000;
        for (int i = 0; i < validKeys.size(); i += chunkSize) {
            List<String> chunk = validKeys.subList(i, Math.min(i + chunkSize, validKeys.size()));
            List<ObjectIdentifier> identifiers = chunk.stream()
                    .map(k -> ObjectIdentifier.builder().key(k).build())
                    .toList();
            try {
                DeleteObjectsRequest request = DeleteObjectsRequest.builder()
                        .bucket(bucketName)
                        .delete(Delete.builder().objects(identifiers).build())
                        .build();
                DeleteObjectsResponse response = s3Client.deleteObjects(request);
                int deletedCount = (response != null && response.hasDeleted()) ? response.deleted().size() : chunk.size();
                totalDeleted += deletedCount;
                logger.info("Batch deleted {} objects from R2 bucket {}", deletedCount, bucketName);
                if (response != null && response.hasErrors() && !response.errors().isEmpty()) {
                    response.errors().forEach(err ->
                            logger.warn("Failed to delete key {}: {} ({})", err.key(), err.message(), err.code())
                    );
                }
            } catch (Exception e) {
                logger.error("Failed batch deleting chunk from R2 bucket {}: {}", bucketName, e.getMessage(), e);
            }
        }
        return totalDeleted;
    }

    public int purgeAllBucketObjects() {
        List<S3Object> objects = listAllObjects();
        if (objects == null || objects.isEmpty()) {
            return 0;
        }
        List<String> keys = objects.stream().map(S3Object::key).toList();
        int count = deleteObjectsBatch(keys);
        logger.info("Purged {} total objects from R2 bucket {}", count, bucketName);
        return count;
    }

    /**
     * Generates a presigned GET URL for a private R2 object.
     * Ensures the object is in R2 first.
     *
     * @param key the object key
     * @return time-limited presigned URL string
     */
    public String generatePresignedUrl(String key) {
        ensureUploaded(key);

        // Derive content type from file extension for inline display
        String ext = key.contains(".") ? key.substring(key.lastIndexOf('.')) : "";
        String contentType = resolveContentTypeFromExt(ext);

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .responseContentDisposition("inline")
                .responseContentType(contentType)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(presignedExpiryMinutes))
                .getObjectRequest(getObjectRequest)
                .build();

        PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(presignRequest);
        String url = presigned.url().toString();
        logger.info("Generated presigned URL for key={} expiry={}min contentType={}", key, presignedExpiryMinutes, contentType);
        return url;
    }

    /**
     * Generates a time-limited presigned PUT URL allowing clients (browsers)
     * to upload files directly to Cloudflare R2 without passing through backend servers.
     *
     * @param key the target R2 object key
     * @param contentType MIME type of the file being uploaded
     * @return time-limited presigned PUT URL, or null if R2 is unconfigured
     */
    public String generatePresignedUploadUrl(String key, String contentType) {
        if (!isConfigured()) {
            logger.warn("R2 storage is unconfigured; cannot generate presigned upload URL.");
            return null;
        }

        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(contentType != null && !contentType.isBlank() ? contentType : "application/octet-stream")
                    .build();

            PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofMinutes(15))
                    .putObjectRequest(putObjectRequest)
                    .build();

            PresignedPutObjectRequest presigned = s3Presigner.presignPutObject(presignRequest);
            String url = presigned.url().toString();
            logger.info("Generated presigned upload PUT URL for key={} contentType={}", key, contentType);
            return url;
        } catch (Exception e) {
            logger.error("Failed to generate presigned upload PUT URL for key={}: {}", key, e.getMessage(), e);
            return null;
        }
    }

    private String resolveContentTypeFromExt(String ext) {
        return switch (ext.toLowerCase()) {
            case ".pdf"  -> "application/pdf";
            case ".docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case ".doc"  -> "application/msword";
            case ".pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            case ".ppt"  -> "application/vnd.ms-powerpoint";
            case ".png"  -> "image/png";
            case ".jpg", ".jpeg" -> "image/jpeg";
            default -> "application/octet-stream";
        };
    }

    // ---- helpers ----

    private String resolveContentType(MultipartFile file, String ext) {
        String ct = file.getContentType();
        if (ct != null && !ct.isBlank() && !ct.equals("application/octet-stream")) {
            return ct;
        }
        return switch (ext.toLowerCase()) {
            case ".pdf"  -> "application/pdf";
            case ".docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case ".doc"  -> "application/msword";
            case ".pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
            case ".ppt"  -> "application/vnd.ms-powerpoint";
            case ".png"  -> "image/png";
            case ".jpg", ".jpeg" -> "image/jpeg";
            default -> "application/octet-stream";
        };
    }
}

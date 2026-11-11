package com.eduvault.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AnonymousCredentialsProvider;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

/**
 * Configures the AWS SDK v2 S3Client and S3Presigner beans
 * that are pointed at the Cloudflare R2 S3-compatible endpoint.
 *
 * All sensitive values are injected from environment variables:
 *   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 */
@Configuration
public class R2StorageConfig {

    private static final Logger log = LoggerFactory.getLogger(R2StorageConfig.class);

    @Value("${app.r2.access-key-id:${R2_ACCESS_KEY_ID:}}")
    private String accessKeyId;

    @Value("${app.r2.secret-access-key:${R2_SECRET_ACCESS_KEY:}}")
    private String secretAccessKey;

    @Value("${app.r2.endpoint:${R2_ENDPOINT:https://ed699a622be1d0fe280023629e3e007e.r2.cloudflarestorage.com}}")
    private String endpoint;

    @Value("${app.r2.region:${R2_REGION:auto}}")
    private String region;

    private AwsCredentialsProvider credentialsProvider() {
        String id = accessKeyId != null ? accessKeyId.trim() : "";
        String secret = secretAccessKey != null ? secretAccessKey.trim() : "";
        if (id.isEmpty() || secret.isEmpty()) {
            log.error("R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY is not configured; using anonymous credentials — R2 storage operations will fail until configured.");
            return AnonymousCredentialsProvider.create();
        }
        return StaticCredentialsProvider.create(AwsBasicCredentials.create(id, secret));
    }

    private URI getCleanEndpoint() {
        if (endpoint == null || endpoint.isBlank()) {
            return URI.create("https://ed699a622be1d0fe280023629e3e007e.r2.cloudflarestorage.com");
        }
        String ep = endpoint.trim();
        if (ep.startsWith("https://") || ep.startsWith("http://")) {
            return URI.create(ep);
        }
        return URI.create("https://" + ep);
    }

    private Region getCleanRegion() {
        if (region == null || region.isBlank()) {
            return Region.of("auto");
        }
        return Region.of(region.trim());
    }

    @Bean
    public S3Client s3Client() {
        return S3Client.builder()
                .credentialsProvider(credentialsProvider())
                .endpointOverride(getCleanEndpoint())
                .region(getCleanRegion())
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true) // Required for S3 compatibility
                        .build())
                .build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        return S3Presigner.builder()
                .credentialsProvider(credentialsProvider())
                .endpointOverride(getCleanEndpoint())
                .region(getCleanRegion())
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .build();
    }
}

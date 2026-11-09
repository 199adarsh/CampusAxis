package com.eduvault;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.context.annotation.Bean;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@SpringBootApplication(scanBasePackages = "com.eduvault")
@EntityScan(basePackages = "com.eduvault.model")
@EnableJpaRepositories(basePackages = "com.eduvault.repository")
@EnableCaching
public class EduVaultApplication {

    public static void main(String[] args) {
        SpringApplication.run(EduVaultApplication.class, args);
    }

    @org.springframework.beans.factory.annotation.Value("${spring.web.cors.allowed-origin-patterns:http://localhost:*,https://*.vercel.app,https://*.onrender.com}")
    private String allowedOriginPatterns;

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOriginPatterns("*")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }
        };
    }
}

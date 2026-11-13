package com.eduvault.model;

public class UploadedDocument {
    private String id;
    private String filename;
    private long size;
    private String contentType;
    private String extractedText;
    private long uploadedAt;
    private String sessionId;

    public UploadedDocument() {
        this.uploadedAt = System.currentTimeMillis();
    }

    public UploadedDocument(String id, String filename, long size, String contentType, String extractedText, String sessionId) {
        this.id = id;
        this.filename = filename;
        this.size = size;
        this.contentType = contentType;
        this.extractedText = extractedText;
        this.uploadedAt = System.currentTimeMillis();
        this.sessionId = sessionId;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public long getSize() {
        return size;
    }

    public void setSize(long size) {
        this.size = size;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public String getExtractedText() {
        return extractedText;
    }

    public void setExtractedText(String extractedText) {
        this.extractedText = extractedText;
    }

    public long getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(long uploadedAt) {
        this.uploadedAt = uploadedAt;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }
}


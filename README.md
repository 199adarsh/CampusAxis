<div align="center">

<br />

# CampusAxis

**The Sovereign Academic Operating System**

A calm, high-performance workspace engineered for curriculum mastery, zero-latency note streaming, and contextual AI tutoring.

<br />

<p align="center">
  <img src="https://img.shields.io/badge/Release-2026.1-111113?style=for-the-badge&logoColor=white" />
  <img src="https://img.shields.io/badge/Architecture-Spring_Boot_%2B_React_19-111113?style=for-the-badge&logoColor=white" />
  <img src="https://img.shields.io/badge/Engine-Three.js_Kinetic-111113?style=for-the-badge&logoColor=white" />
  <img src="https://img.shields.io/badge/Storage-Cloudflare_R2-111113?style=for-the-badge&logoColor=white" />
</p>

<br />

---

<br />

</div>

## ✦ System Architecture

<div align="center">

```mermaid
flowchart TD
    classDef client fill:#fbfbfb,stroke:#e1e1e1,stroke-width:1.5px,color:#111,rx:10,ry:10;
    classDef core fill:#ffffff,stroke:#111,stroke-width:2px,color:#000,rx:12,ry:12;
    classDef cloud fill:#f6f6f7,stroke:#d0d0d5,stroke-width:1px,color:#333,rx:8,ry:8;

    A["◈ CampusAxis 3D Kinetic Experience<br/>Three.js · GSAP · React 19"]:::client -->|Secure REST| B["⚙ Spring Boot 3.2.4 API Gateway<br/>Activity Tracker & Idle Detector"]:::core

    B --> C["🗄 Aiven PostgreSQL 18<br/>pgvector · Cosine Search"]:::cloud
    B --> D["☁ Cloudflare R2<br/>Zero-Egress Object Vault"]:::cloud
    B --> E["✦ Intelligent Tutor Engine<br/>Groq Cloud LPU · OKF RAG"]:::cloud
```

</div>

<br />

---

<br />

## ✦ Crafted Capabilities

<table>
  <tr>
    <td width="33%" valign="top">
      <h4>01 · Kinetic Atmosphere</h4>
      <p>Three.js WebGL procedural ribbon simulation with custom physical sheen and real-time shadow casting.</p>
    </td>
    <td width="33%" valign="top">
      <h4>02 · OKF Knowledge Stream</h4>
      <p>Continuous conversion of unstructured academic lectures into Google Open Knowledge Format with indexed YAML frontmatter.</p>
    </td>
    <td width="33%" valign="top">
      <h4>03 · Zero-Egress Storage</h4>
      <p>High-throughput S3 streaming through Cloudflare R2, eliminating network egress fees completely.</p>
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <h4>04 · Subject-Aware Tutor</h4>
      <p>Unit-wise vector RAG leveraging Groq LPUs for sub-second syllabus queries and exam preparation.</p>
    </td>
    <td width="33%" valign="top">
      <h4>05 · Sovereign Archive</h4>
      <p>Curriculum roadmaps, semester PYQs, and an in-browser zero-lag document previewer.</p>
    </td>
    <td width="33%" valign="top">
      <h4>06 · Attendance Ledger</h4>
      <p>Predictive attendance tracker calculating safe-cut margins and scheduled academic alerts.</p>
    </td>
  </tr>
</table>

<br />

---

<br />

## ✦ Tech Stack Matrix

| Layer | Technologies |
| :--- | :--- |
| **Interface** | React 19 · Vite 6 · Tailwind CSS · React Router v7 |
| **Visuals & 3D** | Three.js · GSAP 3 · ScrollTrigger · Framer Motion |
| **Server** | Java 21 · Spring Boot 3.2.4 · Spring Data JPA |
| **Data & Vectors** | Managed PostgreSQL 18 · pgvector · HikariCP |
| **Object Storage** | Cloudflare R2 (S3-compatible API) |
| **Inference** | Groq Cloud API · Gemini Web2API · Embeddings |

<br />

---

<br />

## ✦ Quickstart

```bash
# 1. Clone repository
git clone https://github.com/199adarsh/CampusAxis.git
cd CampusAxis

# 2. Boot Backend (Port 8080)
cd backend
mvn clean install -DskipTests
mvn spring-boot:run

# 3. Boot Frontend (Port 5173)
cd ../frontend
npm install
npm run dev
```

<br />

---

<br />

## ✦ Environment Specification

```env
# Database
DB_JDBC_URL=jdbc:postgresql://host:port/dbname?sslmode=require
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_DRIVER=org.postgresql.Driver
DDL_AUTO=update

# Cloudflare R2 Storage
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_BUCKET_NAME=campusaxis-notes

# AI Inference
GROQ_API_KEY=gsk_your_groq_api_key
GEMINI_BASE_URL=http://localhost:8000
```

<br />

---

<br />

<div align="center">

<sub>Designed & crafted with precision for academic excellence. MIT License.</sub>

</div>

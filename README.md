<div align="center">

# 🎓 CampusAxis (EduVault)

<p align="center">
  <strong>Next-Generation Academic Operating System & Intelligent Learning Space</strong>
</p>

<p align="center">
  <a href="https://spring.io/projects/spring-boot"><img src="https://img.shields.io/badge/Spring_Boot-3.2.4-6DB33F?style=for-the-badge&logo=springboot&logoColor=white" alt="Spring Boot" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" /></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-18_pgvector-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
  <a href="https://www.cloudflare.com/products/r2/"><img src="https://img.shields.io/badge/Cloudflare_R2-Zero_Egress-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare R2" /></a>
  <a href="https://threejs.org/"><img src="https://img.shields.io/badge/Three.js-WebGL_3D-black?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js" /></a>
</p>

---

<p align="center">
  <a href="#-key-features">Key Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-configuration">Configuration</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-deployment">Deployment</a>
</p>

</div>

---

## 🌟 Overview

**CampusAxis** is a university academic infrastructure and learning portal. Engineered for curriculum mastery, zero-latency note retrieval, and contextual AI tutoring, it bridges curriculum materials with high-density vector search, overnight batch markdown compilation, and an Apple Sovereign glassmorphism user interface.

```
                  ┌────────────────────────────────────────┐
                  │        CampusAxis 3D Landing &         │
                  │         Sovereign React Portal         │
                  └───────────────────┬────────────────────┘
                                      │ REST / JSON
                                      ▼
                  ┌────────────────────────────────────────┐
                  │       Spring Boot 3.2.4 Backend        │
                  │  (Activity Tracker + OKF Knowledge)    │
                  └─────┬──────────────┬─────────────┬─────┘
                        │              │             │
        ┌───────────────┘              │             └───────────────┐
        ▼                              ▼                             ▼
┌───────────────────┐        ┌───────────────────┐        ┌─────────────────────┐
│  Aiven PostgreSQL │        │   Cloudflare R2   │        │ AI Inference Engine │
│ 18 with pgvector  │        │   Zero-Egress S3  │        │ Groq Cloud / Gemini │
│ 53 Subjects & PYQs│        │ Note Documents    │        │ Sub-second RAG      │
└───────────────────┘        └───────────────────┘        └─────────────────────┘
```

---

## ⚡ Key Features

<table>
  <tr>
    <td width="50%">
      <h3>💎 3D Kinetic Landing Page</h3>
      <ul>
        <li>Three.js WebGL kinetic mesh simulation with custom physical sheen shaders.</li>
        <li>Interactive GSAP ScrollTrigger timeline transitions.</li>
        <li>Instant smooth forwarding into the academic dashboard.</li>
      </ul>
    </td>
    <td width="50%">
      <h3>🧠 OKF Knowledge & Batch Engine</h3>
      <ul>
        <li>Converts lecture notes into standard Google Open Knowledge Format.</li>
        <li>Automated overnight cron scheduler & activity idle detection (>30m).</li>
        <li>High-density YAML frontmatter indexing for rapid RAG context extraction.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🤖 Subject-Aware AI Tutor</h3>
      <ul>
        <li>Direct subject RAG routing via Groq LPU inference.</li>
        <li>Unit-wise syllabus breakdown and previous-year question mapping.</li>
        <li>Context-aware responses referencing verified notes and diagrams.</li>
      </ul>
    </td>
    <td width="50%">
      <h3>📊 Sovereign Academic Hub</h3>
      <ul>
        <li>Curriculum roadmaps, lecture archives, and semester PYQ library.</li>
        <li>Smart attendance calculator with predictive margin alerts.</li>
        <li>In-browser PDF reader with fast thumbnail caching.</li>
      </ul>
    </td>
  </tr>
</table>

---

## 🛠 Tech Stack

<div align="center">

| Domain | Technologies |
| :--- | :--- |
| **Frontend Core** | React 19, Vite 6, Tailwind CSS, React Router v7 |
| **Animation & 3D** | Three.js, GSAP 3, ScrollTrigger, Framer Motion |
| **UI Primitives** | Radix UI, Hugeicons, Lucide React, Sonner |
| **Backend Framework** | Java 17/21, Spring Boot 3.2.4, Spring Data JPA |
| **Database** | Managed PostgreSQL 18 with `pgvector` extension |
| **Cloud Object Store** | Cloudflare R2 (S3-compatible, Zero-Egress) |
| **AI & Acceleration** | Groq API, Gemini Web2API proxy, Vector Cosine Search |
| **Container & CI** | Docker, Maven, GitHub Actions |

</div>

---

## 📂 Repository Structure

```tree
CampusAxis/
├── backend/
│   ├── src/main/java/com/eduvault/
│   │   ├── config/          # Spring Security, Scheduling, R2 S3 Config
│   │   ├── controller/      # REST API Controllers (Notes, Batch, AI, Files)
│   │   ├── filter/          # Activity Tracker & Security Filters
│   │   ├── model/           # JPA Entities (Note, Subject, User, Attendance)
│   │   ├── repository/      # Spring Data JPA Repositories
│   │   └── service/         # OKF Batch Service, AI Knowledge Service, Scrapers
│   └── pom.xml              # Maven dependencies & build configuration
├── frontend/
│   ├── src/
│   │   ├── components/      # Sovereign Dashboard, Notes, Roadmaps, Attendance
│   │   ├── landing/         # Three.js 3D kinetic landing page & routes
│   │   ├── App.jsx          # Router & layout provider
│   │   └── main.jsx         # App mounting entry
│   ├── package.json         # Node dependencies
│   └── vite.config.js       # Vite configuration & dev proxy
├── Dockerfile               # Production container image
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- **Java 17+** (JDK 17 or JDK 21)
- **Apache Maven 3.8+**
- **Node.js 18+** & **npm**
- **PostgreSQL 15+** (with `pgvector`)

### 1. Clone & Configure
```bash
git clone https://github.com/199adarsh/CampusAxis.git
cd CampusAxis
cp .env.example .env
```

### 2. Launch Backend
```bash
cd backend
mvn clean install -DskipTests
mvn spring-boot:run
```
*Backend server spins up on `http://localhost:8080`*

### 3. Launch Frontend
```bash
cd ../frontend
npm install
npm run dev
```
*Frontend interface starts on `http://localhost:5173`*

---

## ⚙️ Environment Variables

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DB_JDBC_URL` | PostgreSQL connection URL | `jdbc:postgresql://host:port/dbname?sslmode=require` |
| `DB_USER` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | `••••••••` |
| `DB_DRIVER` | JDBC driver class | `org.postgresql.Driver` |
| `DDL_AUTO` | Hibernate schema management | `update` |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 Access Key | `cf_r2_access_key` |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 Secret Key | `cf_r2_secret_key` |
| `R2_ENDPOINT` | Cloudflare S3 API endpoint | `https://<id>.r2.cloudflarestorage.com` |
| `R2_BUCKET_NAME` | Bucket name for documents | `campusaxis-notes` |
| `GROQ_API_KEY` | Groq Cloud API key for AI Tutor | `gsk_••••••••` |
| `GEMINI_BASE_URL` | Local proxy URL for Gemini API | `http://localhost:8000` |

---

## 📡 API Reference Summary

### Notes & Academic Records
- `GET /api/notes` - Fetch catalog of semester notes with subject filtering.
- `GET /api/notes/{id}` - Retrieve metadata, chapter breakdown, and download link.
- `GET /api/files/raw/{fileName}` - Presigned secure document streaming from R2.

### OKF Batch Engine
- `POST /api/batch/okf/trigger?subjectId={id}` - Manual trigger for Markdown compilation.
- `GET /api/batch/okf/status` - Current batch queue status, progress, and error counts.

### AI Assistant & Tutor
- `POST /api/ai/chat` - Query AI Tutor with subject and unit context payload.
```json
{
  "question": "Explain dynamic memory allocation with diagrams",
  "subjectId": "sub_cs201",
  "unit": "Unit-2"
}
```

---

## 🚢 Production Deployment

### Docker Deployment
```bash
# Build multi-stage image
docker build -t campusaxis:latest .

# Run container
docker run -d \
  --name campusaxis \
  -p 8080:8080 \
  --env-file .env \
  campusaxis:latest
```

---

## 📄 License

This project is licensed under the MIT License. Built with ❤️ for academic excellence.

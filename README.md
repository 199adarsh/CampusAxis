<div align="center">

<!-- Typing SVG Header -->
<img src="https://readme-typing-svg.herokuapp.com?font=Cormorant+Garamond&size=40&duration=2800&pause=1000&color=7C8CFF&center=true&vCenter=true&width=950&lines=CampusAxis+%E2%80%94+The+Sovereign+Academic+OS;Intelligent+Notes+%7C+Curriculum+Roadmaps+%7C+AI+Tutor;Spring+Boot+3.2.4+%7C+React+19+%7C+Three.js+Kinetic;High+Performance+%7C+Zero-Egress+R2+Storage" alt="CampusAxis Typing SVG" width="100%" />

<br/>

<div align="center">

🌐 <a href="https://github.com/199adarsh/CampusAxis">Repository</a>
&nbsp;&nbsp;•&nbsp;&nbsp;
🎓 <a href="#-subsystem-breakdown">Architecture</a>
&nbsp;&nbsp;•&nbsp;&nbsp;
🤖 <a href="#-subsystem-breakdown">AI Tutor</a>
&nbsp;&nbsp;•&nbsp;&nbsp;
🚀 <a href="#-quick-start">Quick Start</a>
&nbsp;&nbsp;•&nbsp;&nbsp;
💼 <a href="https://www.linkedin.com/in/adarsh-herwade/">LinkedIn</a>
&nbsp;&nbsp;•&nbsp;&nbsp;
📬 <a href="mailto:adarshherwade11214@gmail.com">Contact</a>

</div>

<br/>

<p align="center">
  <img src="https://img.shields.io/badge/Architecture-Sovereign_Glass-7C8CFF?style=flat-square&logoColor=white" />
  <img src="https://img.shields.io/badge/Backend-Spring_Boot_3.2.4-6DB33F?style=flat-square&logo=springboot&logoColor=white" />
  <img src="https://img.shields.io/badge/Frontend-React_19_+_Vite_6-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Database-Aiven_PostgreSQL_18_pgvector-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Storage-Cloudflare_R2_Zero--Egress-F38020?style=flat-square&logo=cloudflare&logoColor=white" />
</p>

</div>

<br/>

---

### ✦ About CampusAxis

- 🎓 &nbsp; **Sovereign Academic Hub**: Tailored university infrastructure for lecture notes, PYQs, roadmaps, and attendance tracking.
- ⚡ &nbsp; **Kinetic 3D Atmosphere**: Three.js WebGL procedural ribbon simulation with custom physical sheen and smooth dashboard routing.
- 🧠 &nbsp; **Google OKF Knowledge Engine**: Automated batch conversion of lecture materials into Google Open Knowledge Format with indexed YAML frontmatter.
- 🤖 &nbsp; **Sub-Second AI Querying**: Subject-aware RAG pipeline powered by Groq Cloud LPUs and vector cosine similarity.
- ☁️ &nbsp; **Zero-Egress Document Pipeline**: Direct-stream S3 storage on Cloudflare R2 eliminating egress network overhead.

```javascript
const systemSpecs = {
  stack: "Spring Boot 3.2.4 (Java 21) + React 19 + Three.js",
  database: "Managed PostgreSQL 18 with pgvector extension",
  storage: "Cloudflare R2 (S3-compatible, Zero-Egress)",
  intelligence: "Groq Cloud LPU + Gemini Web2API + OKF Knowledge Cache",
  interface: "Apple Sovereign Glassmorphism with GSAP ScrollTrigger"
};
```

<br/>

---

## ✦ Subsystem Breakdown

<details open>
<summary><strong>01 · Kinetic 3D Experience & Sovereign Interface</strong></summary>

<br/>

A bespoke editorial entry experience combined with a glassmorphic dashboard layout.

- **Stack**: Three.js, GSAP 3, ScrollTrigger, React 19, Tailwind CSS
- **Performance**: 60 FPS WebGL shader pipeline, smooth-damped camera lerp, and reduced-motion fallback.
- **Interactions**: Magnetic navigational elements, real-time lighting calculations, and direct SPA routing to `/dashboard`.
- **Theme**: Adaptive dual palette with sovereign frosted glass navigation.

</details>

<details>
<summary><strong>02 · OKF Knowledge & Overnight Batch Engine</strong></summary>

<br/>

An autonomous processor converting raw academic notes into structured machine-readable knowledge.

- **Stack**: Spring Boot Scheduling, YAML Frontmatter Parser, Java NIO
- **Execution**: Automated overnight cron (`0 0 2 * * ?`) combined with idle activity detection (>30m no active traffic).
- **Optimization**: Compiles subject index manifests, pre-caches high-density context chunks, and serves instant RAG payloads.
- **Endpoints**: `POST /api/batch/okf/trigger`, `GET /api/batch/okf/status`.

</details>

<details>
<summary><strong>03 · Subject-Aware AI Tutor & Vector Retrieval</strong></summary>

<br/>

Contextual academic tutor answering queries grounded strictly in syllabus materials.

- **Stack**: Groq Cloud API, Gemini Web2API, pgvector Cosine Search
- **Routing**: Accepts `subjectId` and `unit` parameters to narrow search context down to relevant markdown bundles.
- **Accuracy**: Eliminates hallucinations by referencing verified lecture slides, formulas, and past exam patterns.
- **Endpoint**: `POST /api/ai/chat`.

</details>

<details>
<summary><strong>04 · Zero-Egress Object Storage (Cloudflare R2)</strong></summary>

<br/>

Production-grade file streaming architecture for large academic documents.

- **Stack**: AWS S3 SDK for Java, Cloudflare R2
- **Throughput**: Direct stream-to-storage piping preventing JVM heap spikes on large multi-megabyte PDFs.
- **Security**: Strict path sanitization on `/api/files/raw/{*fileName}` rejecting path traversal attempts (`..` or `\`).
- **Cost**: Eliminates egress bandwidth fees across global CDN edge nodes.

</details>

<details>
<summary><strong>05 · Academic Roadmaps & Predictive Attendance</strong></summary>

<br/>

Student utility tools designed to maintain academic compliance and track progression.

- **Stack**: React Flow, Recharts, LocalStorage sync with PostgreSQL fallback
- **Roadmaps**: Interactive subject prerequisite graph and semester milestone planner.
- **Attendance**: Intelligent margin calculator showing safe bunks remaining before crossing the mandatory 75% threshold.

</details>

<br/>

---

## ✦ Quick Start

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

<br/>

---

## ✦ Environment Variables

| Variable | Description |
| :--- | :--- |
| `DB_JDBC_URL` | PostgreSQL connection URL (`sslmode=require`) |
| `DB_USER` / `DB_PASSWORD` | PostgreSQL credentials |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Cloudflare R2 S3 access keys |
| `R2_ENDPOINT` | Cloudflare R2 S3 endpoint URL |
| `R2_BUCKET_NAME` | R2 bucket identifier (`campusaxis-notes`) |
| `GROQ_API_KEY` | Groq Cloud API key for sub-second LLM inference |
| `GEMINI_BASE_URL` | Local proxy URL for Gemini API integration |

<br/>

---

<div align="center">

Built with precision by **[Adarsh Herwade](https://github.com/199adarsh)**

<sub>© 2026 CampusAxis. Open source under the MIT License.</sub>

</div>

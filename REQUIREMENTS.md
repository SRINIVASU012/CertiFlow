# CertiFlow – Requirements & Specification Document
## Skilling Certificate Issuance Platform for Pragati Skills Mission

---

## 1. Problem Understanding

The **Pragati Skills Mission** is a state-level skilling initiative that trains approximately **8,000 young citizens every month** across more than **300 affiliated private and public training centres**.

### Legacy Operational Deficiencies
Prior to CertiFlow, the mission operated with disjointed, manual, and error-prone procedures:
1. **Unstructured Data Submission:** Training centres submitted candidate records via unstandardized spreadsheets with missing or malformed fields, unverified email addresses, and duplicated IDs.
2. **Manual & Unverifiable Approvals:** District officers conducted reviews via email and physical paperwork without multi-officer consensus, concurrency guards, or audit accountability.
3. **Bottlenecks at the State Level:** The state office manually compiled records and designed certificates one by one, resulting in multi-week delays for graduating trainees.
4. **Credential Forgery:** Employers had no instant, tamper-evident method to verify certificate authenticity, enabling the proliferation of counterfeit certificates.
5. **Lack of Transparency & Escalation:** Batches stalled indefinitely in review queues without alerting senior administrators.

### The CertiFlow Solution
CertiFlow establishes a unified, centralized, role-based platform that automates the entire lifecycle:
$$\text{Candidate Upload} \longrightarrow \text{2-Officer District Review} \longrightarrow \text{Quality Review (≥50)} \longrightarrow \text{State Approval} \longrightarrow \text{Async PDF & QR Generation} \longrightarrow \text{WhatsApp Notification} \longrightarrow \text{Public Verification}$$

---

## 2. User Roles & Personas

The platform defines six distinct roles, each guarded strictly by backend middleware.

| Role | Demo Persona | Email | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **Training Centre** | Anika Sharma | `anika@pragati.org` | Create batches, upload & validate candidate spreadsheets, track submission status, correct and resubmit returned cohorts, view issued certificates. |
| **District Officer** | Dev Patel | `dev@pragati.org` | Review pending candidate data, approve batches (1st or 2nd sign-off), return batches for corrections with mandatory reason, reject batches. |
| **District Officer** | Meera Nair | `meera@pragati.org` | Independent second district officer required to complete dual-officer sign-off. |
| **District Officer** | Kabir Rao | `kabir@pragati.org` | Additional district officer available for independent sign-offs. |
| **Quality Team** | Neha Verma | `neha@pragati.org` | Independent audit and quality inspection for large cohorts (≥ 50 candidates) prior to state approval. |
| **State Office** | Farah Khan | `farah@pragati.org` | Final certification authority, batch approval triggering async certificate generation, certificate revocation, system-wide audit monitoring, delayed batch tracking. |
| **Candidate** | — | — | Receives WhatsApp notification with verification link; downloads official PDF certificate. |
| **Public / Employers** | — | — | Instant verification via certificate number or QR code without login; zero PII exposed. |

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization
- **FR-AUTH-1:** Email & password authentication with `bcryptjs` password hashing (salt rounds = 10).
- **FR-AUTH-2:** Stateless JWT tokens containing user ID, email, and role; expiring in 7 days.
- **FR-AUTH-3:** Backend middleware verifying user existence and role permissions on every sensitive API endpoint. Frontend role-based routes prevent unauthorized navigation.
- **FR-AUTH-4:** One-click demo user switcher for hackathon evaluation and reviewer demonstration.

### 3.2 Batch Lifecycle Management
- **FR-BATCH-1:** Training centres can create cohorts with Batch Name, Course Name, and District.
- **FR-BATCH-2:** Statuses: `DRAFT`, `SUBMITTED`, `DISTRICT_REVIEW`, `QUALITY_REVIEW`, `STATE_REVIEW`, `APPROVED`, `REJECTED`, `RETURNED`, `CERTIFICATES_GENERATING`, `COMPLETED`.
- **FR-BATCH-3:** Spreadsheet parsing using `xlsx` with mandatory column checks:
  - *Candidate Name* (non-empty string)
  - *Candidate Email* (RFC 5322 regex validation)
  - *Mobile Number* (10-digit Indian phone or `+91` format)
  - *Course Name* (non-empty string)
  - *Training Completion Date* (valid ISO date)
  - *Candidate Identifier* (unique per batch)
- **FR-BATCH-4:** **Atomic All-or-Nothing Upload:** If any row in the spreadsheet is malformed, the system rejects the entire upload, displays the exact Excel row number and field error, and persists zero candidates to the database.

### 3.3 Multi-Stage Approval Workflow
- **FR-WF-1:** **Dual District Officer Rule:** A batch must be approved by **two different** district officers in the current submission cycle before advancing.
- **FR-WF-2:** **No Self-Duplication:** An officer cannot approve the same cohort twice in the same cycle.
- **FR-WF-3:** **Concurrency Protection:** Database transactions prevent race conditions when two officers approve simultaneously.
- **FR-WF-4:** **Large-Batch Quality Routing:** If a batch contains **≥ 50 candidates** (configurable via `QUALITY_REVIEW_THRESHOLD`), it is automatically routed to `QUALITY_REVIEW` after district approval. Batches with `< 50` candidates proceed directly to `STATE_REVIEW`.
- **FR-WF-5:** **State Final Sign-Off:** Farah Khan reviews district and quality approval trails and grants final approval.

### 3.4 Return & Resubmission Policy
- **FR-RESUB-1:** When an officer or quality reviewer returns a batch, a **reason is strictly mandatory**.
- **FR-RESUB-2:** The training centre can update or re-upload candidates and click "Resubmit".
- **FR-RESUB-3:** Resubmitting increments the batch's `submissionCycle` ($1 \to 2$).
- **FR-RESUB-4:** Prior cycle approvals are retained permanently in audit history but **do not count** toward the new submission cycle. The resubmitted cohort must receive fresh district approvals.

### 3.5 Automated Certificate Issuance
- **FR-CERT-1:** Upon state approval, the system pushes a background job to BullMQ (`certificateQueue`).
- **FR-CERT-2:** Generates high-resolution landscape A4 PDF certificates using `PDFKit` with official Pragati Skills Mission seal, borders, candidate credentials, and issue date.
- **FR-CERT-3:** Generates a unique, non-duplicable certificate number in the format `CERT-YYYY-XXXXXX` (e.g. `CERT-2026-000001`).
- **FR-CERT-4:** Embeds a high-correction QR code linking to `http://localhost:5173/verify/CERT-YYYY-XXXXXX`.
- **FR-CERT-5:** Stored in persistent volume / storage abstraction (`backend/certificates/`), not as bloated database BLOBs.

### 3.6 Simulated WhatsApp Delivery
- **FR-NOTIF-1:** Upon certificate creation, an async notification job is queued in BullMQ (`notificationQueue`).
- **FR-NOTIF-2:** Dispatches simulated message containing recipient name, course, and direct verification link.
- **FR-NOTIF-3:** Models real-world gateway latency, timeouts, delivery receipts, and exponential backoff retries.
- **FR-NOTIF-4:** Guaranteed idempotency via unique `idempotencyKey` per notification to eliminate duplicate WhatsApp messages on retry.

### 3.7 Public Verification Portal
- **FR-VERIF-1:** Zero-authentication portal accessible by any employer, recruiter, or citizen.
- **FR-VERIF-2:** Real-time database query on every lookup (no stale cache).
- **FR-VERIF-3:** Three explicit outcomes:
  - **VALID:** Official green verification seal, candidate name, course, training centre, dates, and PDF download button.
  - **CANCELLED / REVOKED:** Prominent red warning banner displaying official revocation timestamp and mandatory state reason. Public PDF download is blocked.
  - **NOT FOUND:** Clear notice indicating no record exists with that identifier.
- **FR-VERIF-4:** **PII Privacy Protection:** Candidate email, mobile number, and personal IDs are never exposed in public responses.

### 3.8 Certificate Revocation
- **FR-REVOC-1:** Exclusively authorized for `STATE_OFFICE` role.
- **FR-REVOC-2:** Requires a mandatory written justification.
- **FR-REVOC-3:** Updates status to `CANCELLED` and logs permanent audit entry.
- **FR-REVOC-4:** Immediate visibility: subsequent public lookups instantly reflect `CANCELLED`.

### 3.9 Delayed Batch SLA Monitoring
- **FR-SLA-1:** Scheduled background worker monitors batches pending review for longer than `DELAYED_BATCH_THRESHOLD_HOURS` (default: 24 hours).
- **FR-SLA-2:** Automatically generates `DELAYED_BATCH_ALERT` audit logs and surfaces overdue cohorts in the State Office dashboard.

### 3.10 Real-Time Updates
- **FR-RT-1:** Socket.IO integration emits live events for batch submission, approvals, rejections, returns, certificate completions, and revocations.
- **FR-RT-2:** Role-targeted rooms ensure private candidate data is never broadcast to unauthorized sockets.

---

## 4. Non-Functional Requirements

| Metric / Dimension | Specification | Implementation Strategy |
| :--- | :--- | :--- |
| **Security** | Zero-trust backend, JWT, Helmet headers, CORS scoping, bcrypt | Role middleware on every endpoint; Prisma parameterized queries prevent SQL injection |
| **Reliability** | Idempotent background queues, crash recovery | BullMQ + Redis persistent job storage, unique job IDs |
| **Performance** | Sub-100ms API response times; non-blocking PDF generation | CPU-intensive PDF creation and WhatsApp HTTP calls handled by separate worker process |
| **Traceability** | 100% audit coverage | `AuditLog` table records actor, action, previous status, new status, and timestamp |
| **Data Integrity** | ACID compliance | PostgreSQL transactions for batch submissions, approvals, and imports |

---

## 5. Architectural & Implementation Decisions

### Decision 1: Quality Review Threshold of 50 Candidates
- **Decision:** Cohorts with $\ge 50$ candidates are classified as large batches requiring dedicated Quality Review scrutiny.
- **Rationale:** The problem prompt states that large batches require quality team inspection without stipulating an exact number. In vocational skilling operations, a single classroom typically seats 25–30 students. A cohort of 50+ candidates represents multiple parallel sections or training batches, which introduces higher risks of trainer-to-student dilution, infrastructure strain, and attendance inflation. 50 is established as the default configurable threshold.

### Decision 2: Separate Worker Process
- **Decision:** BullMQ workers run in a dedicated `worker.js` process rather than inside Express request handlers.
- **Rationale:** Generating 60+ PDF certificates with PDFKit and embedding QR codes is CPU-intensive. Executing this synchronously within an HTTP request would block the Node.js event loop, resulting in HTTP 504 Gateway Timeouts for the approving state officer. Decoupling into an asynchronous worker ensures instant HTTP responses and predictable queue scaling.

### Decision 3: Resubmission Increments Cycle
- **Decision:** Resubmitting a returned batch increments `submissionCycle` ($1 \to 2$), requiring fresh district approvals.
- **Rationale:** When a batch is returned, candidate data or documentation has been modified. An approval given by an officer for version 1 cannot be assumed valid for version 2. Requiring fresh approvals prevents training centres from sneaking unauthorized candidates into returned batches after obtaining a prior approval.

---

## 6. Known Limitations
1. **WhatsApp Messaging is Simulated:** In accordance with prompt requirements, no live WhatsApp Business API account is connected. Delivery is modeled using realistic network delays, retry policies, and test failure hooks.
2. **Local Storage Abstraction:** Certificates are written to the local persistent directory / Docker volume `backend/certificates/`. For multi-region cloud deployment, this abstraction maps cleanly to AWS S3, Google Cloud Storage, or Azure Blob Storage.

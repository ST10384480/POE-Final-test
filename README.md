# HustleHub+ — Final Part (DevSecOps, Monitoring and Finalisation)

**INSY7314 — Group 20**

Group members: st10357922 - Atlegang Mogatusi · st10384480 - Olebogeng Dibodu · st10254932 - Lebohang Tsotetsi · st10367503 - Tebogo Thobejane

> Checklist of every assessment requirement and where it is implemented: **[REQUIREMENTS_CHECKLIST.md](REQUIREMENTS_CHECKLIST.md)**

---

## 1. System overview

HustleHub+ is a freelancing marketplace that links clients who want to find and reserve services with freelancers who provide them. Beyond the marketplace, the platform tracks the financial side of every booking: it records a (simulated) transaction, calculates a freelancer's income, and **estimates their tax**, showing the result on a visual dashboard so freelancers can understand their earnings without extra bookkeeping tools.

| Layer | Technology |
|---|---|
| Client | React 18 + Vite, React Router, Axios, dependency-free SVG charts |
| API | Node.js 20, Express, Mongoose, JWT, bcrypt, Helmet, express-validator, xss, express-rate-limit — served over **HTTPS** |
| Database | MongoDB 7 |
| DevSecOps | GitHub Actions, ESLint (+ security plugin), Jest/Supertest, Vitest, Docker, Docker Compose, nginx |

```
Browser ──http:8080──▶ nginx (client container) ──/api──▶ Express API (https:5000) ──▶ MongoDB
                         serves React build                logs/ app.log · security.log · access.log
```

---

## 2. Setup instructions

### Option A — Docker Compose (recommended, runs the whole stack)

Requires Docker Desktop (or Docker Engine + Compose v2).

```bash
cp .env.example .env              # then edit .env and set JWT_SECRET
openssl rand -hex 32              # paste the output as JWT_SECRET (>= 32 chars)
docker compose up --build         # builds both images and starts mongo + api + client
docker compose run --rm api npm run seed   # first run only: demo data (WIPES the database)
```

Open **http://localhost:8080**. Demo accounts created by the seed (password `DemoP@ss1`):

| Role | E-mail |
|---|---|
| Client | client@example.com |
| Freelancer | freelancer@example.com / freelancer2@example.com |
| Admin (monitoring) | admin@example.com |

Useful commands: `docker compose ps` (health status) · `docker compose logs -f api` · `docker compose down` (add `-v` to delete data and logs).

### Option B — Run locally without Docker

Requires Node 20+ and a MongoDB instance.

```bash
# API
cd "hustlehub+part2 update/hustlehub-backend"
cp .env.example .env                               # set MONGO_URI and JWT_SECRET
mkdir certs && openssl req -nodes -new -x509 -keyout certs/key.pem -out certs/cert.pem -days 365
npm install
npm run seed                                       # optional demo data
npm run dev                                        # https://localhost:5000

# Client (new terminal)
cd "hustlehub+part2 update/hustlehub-frontend"
npm install
npm run dev                                        # http://localhost:5173
```

(Open https://localhost:5000 once in the browser and accept the self-signed certificate, otherwise the client cannot reach the API.)

---

## 3. Feature descriptions

* **Authentication & RBAC** — register/login with JWT; roles `client`, `freelancer`, `admin`.
* **Gigs** — freelancers create, edit and delete their own gigs; everyone can browse and search.
* **Bookings** — clients book a gig; a confirmed booking is created together with a simulated payment transaction (`SIM-…` reference).
* **Income & tax dashboard (new)** — freelancers see gross income, estimated tax, net income, effective and marginal rate, a monthly income bar chart, a net-vs-tax donut chart and the per-bracket calculation (`/freelancer/dashboard`).
* **Monitoring summary (new)** — admins can read live counters of key events (`GET /api/monitoring/summary`).

---

## 4. Tax estimation component

**Where:** `hustlehub-backend/src/utils/tax.js` (logic) → `GET /api/bookings/freelancer/tax-summary` (endpoint) → `FreelancerDashboard.jsx` (display). The tax is always calculated **on the server**, never in the browser, so it cannot be tampered with.

**Logic explained**

1. **Gross income** = sum of all completed transactions received by the freelancer.
2. The estimate uses a **progressive (marginal) bracket model**: only the part of the income that falls *inside* a bracket is taxed at that bracket's rate.

   | Income bracket | Rate |
   |---|---|
   | 0 – 500 | 0 % |
   | 500 – 2 000 | 10 % |
   | 2 000 – 5 000 | 18 % |
   | 5 000 – 10 000 | 26 % |
   | 10 000 and above | 36 % |

3. **Estimated tax** = Σ (income inside bracket × bracket rate). **Net income** = gross − tax. **Effective rate** = tax ÷ gross. **Marginal rate** = rate on the next unit earned.

**Worked example** — income 3 000: `500×0% + 1 500×10% + 1 000×18% = 0 + 150 + 180 = 330` → net 2 670, effective rate 11 %, marginal rate 18 %.

*Design note:* the brackets are a simplified, illustrative model sized for the small gig values on this platform; they are **not** official tax tables. To use official tables (e.g. SARS) replace the `TAX_BRACKETS` array — no other code changes are needed. The dashboard always shows the method and a "not professional tax advice" disclaimer.

**Frontend display:** four summary cards, a monthly income bar chart, a net-vs-tax donut chart, and a table showing how each bracket contributed. Charts are plain SVG with accessible labels (no extra chart library to audit).

---

## 5. CI/CD pipeline (GitHub Actions)

Configuration: [`.github/workflows/ci.yml`](.github/workflows/ci.yml). Runs automatically on every **push**, **pull request** and on demand.

| Job | Steps |
|---|---|
| **backend** (with a MongoDB service container) | install dependencies → static analysis → static-analysis report → **backend tests** (unit + API integration, with coverage) → **build** → `npm audit` (informational) |
| **frontend** | install dependencies → static analysis → static-analysis report → **frontend tests** (Vitest) → **build** (`vite build`) → `npm audit` (informational) |
| **docker** (runs after both jobs pass) | create `.env` → validate compose file → build both images and start the stack → smoke test through nginx (`/api/health`, `/`) → tear down |

**The pipeline fails** when ESLint reports errors, any test fails, a build fails, or the containers do not become healthy — a failing step stops the job and the workflow turns red. Evidence artifacts (`static-analysis-backend`, `static-analysis-frontend`, `backend-coverage`) are uploaded on every run.

> Note: the pipeline uses `npm install` rather than `npm ci`. Run `npm install` once in each of the backend and frontend folders and commit the refreshed `package-lock.json` files; you can then switch the workflow to `npm ci` for fully reproducible installs.

---

## 6. Static code analysis

* **Tool:** [ESLint 9](https://eslint.org/) for both projects. The API additionally uses **`eslint-plugin-security`** (finds eval, unsafe regular expressions, non-literal file paths, object-injection patterns, child-process use); the client uses **`eslint-plugin-react`** (e.g. forbids `dangerouslySetInnerHTML`, unsafe `target="_blank"`) and **`eslint-plugin-react-hooks`**.
* **Config:** `hustlehub-backend/eslint.config.js`, `hustlehub-frontend/eslint.config.js`.
* **Run locally:** `npm run lint` (fails on errors) and `npm run lint:report` (writes `reports/eslint-report.json`, `reports/eslint-report.txt` and `reports/static-analysis-summary.md`).
* **Evidence:** every pipeline run attaches the reports as downloadable artifacts and prints the summary on the run page. Put your screenshot/report in `docs/evidence/` (see [docs/evidence/README.md](docs/evidence/README.md)).

**What the results indicate (how to read them):** *errors* are correctness problems or dangerous constructs (undefined variables, `eval`, hook-rule violations) and **fail the build**; *warnings* are code-quality and security smells (unused variables, `detect-object-injection`, non-literal regular expressions) that need human review. In this project the user-input regular expression used for gig search is escaped before use (`gigController.js`), so a `detect-non-literal-regexp` warning there is a reviewed false positive; `detect-object-injection` warnings on indexed access are likewise reviewed individually. Replace this paragraph with the actual counts from your latest run (`static-analysis-summary.md`).

---

## 7. Docker & Docker Compose

* `hustlehub-backend/Dockerfile` — multi-stage build, production dependencies only, generates the self-signed TLS certificate, runs as the **non-root `node` user**, has a `HEALTHCHECK` on `/api/health`.
* `hustlehub-frontend/Dockerfile` — multi-stage build (Vite → **unprivileged nginx**), `HEALTHCHECK`, security headers (CSP, `X-Frame-Options`, `nosniff`, …) in `nginx.conf`, `/api` reverse-proxied to the API so the browser uses a single origin.
* `docker-compose.yml` — orchestrates `mongo`, `api` and `client`; waits for health (`depends_on: condition: service_healthy`); MongoDB is **not** published to the host; logs persist in the `api-logs` volume; secrets come from `.env` (never committed); the compose file refuses to start without `JWT_SECRET`.
* `.dockerignore` files keep `node_modules`, `.env`, logs and tests out of the images.

---

## 8. Logging and monitoring

Implemented in `src/utils/logger.js` (+ `requestContext.js`, `morgan` access log). Output goes to the console (`docker logs`) **and** to JSON-lines files in `logs/` (persisted in the `api-logs` Docker volume; files rotate at 5 MB).

| What is logged | File / event | Why it matters |
|---|---|---|
| Login attempts — success, wrong password, unknown e-mail, blocked while locked | `security.log` — `login_success`, `login_failure`, `login_blocked` | Detects brute-force and credential-stuffing; provides an audit trail of who accessed the system and when. |
| Account lockouts | `account_locked` | Early warning that an account is under attack. |
| Registrations (and duplicate-e-mail attempts) | `user_registered`, `registration_rejected` | Shows sign-up abuse and account enumeration attempts. |
| Bookings | `booking_created` | Business audit trail; spikes can indicate booking spam. |
| Transactions | `transaction_recorded` (reference, amount) | Financial traceability and dispute investigation. |
| Authorisation failures | `access_denied` (wrong role), `token_rejected` (missing/invalid/expired JWT) | Reveals privilege-escalation attempts and stolen/forged tokens. |
| Errors | `app.log` — level `error` (with stack trace; the client never sees it) | Lets developers diagnose faults without leaking internals. |
| Every HTTP request | `access.log` (method, URL, status, time, request id) | Traffic analysis and incident reconstruction. |

Good practice built in: passwords, tokens, secrets and authorisation headers are **automatically redacted**; e-mail addresses are **masked** (`j***@example.com`); every request has an `X-Request-Id` that appears in the logs so one request can be traced across files.

**Monitoring**

* `GET /api/health` — liveness + database state (HTTP 503 when the DB is down); used by Docker health checks.
* `GET /api/monitoring/summary` (admin only) — uptime and counters: logins, failures, lockouts, registrations, bookings, transactions, denied access, rejected tokens, errors.

View logs: `docker compose exec api sh -c "tail -n 20 logs/security.log"` or `docker compose logs -f api`.

---

## 9. Security implementation

Carried over from Part 2: bcrypt (12 rounds); JWT with short expiry; RBAC via `requireRole`; ownership checks in controllers; express-validator + custom `xss` sanitiser; `express-mongo-sanitize`; rate limiting on auth, booking and the whole API; Helmet with a strict CSP and HSTS; HTTPS only; generic error messages with no stack traces; 10 kB body limit.

### Additional security features added in this part (all functional and tested)

1. **Account lockout** — after `LOGIN_MAX_ATTEMPTS` (default 5) failed logins the account is locked for `LOCKOUT_MINUTES` (default 15) and returns HTTP 423 even for the correct password. Counters reset on success. (`authController.js`, `User.js`)
2. **Security audit logging with redaction and request correlation** — see section 8.
3. **Fail-fast configuration validation** — the API refuses to start without `MONGO_URI`/`JWT_SECRET`, and in production refuses a `JWT_SECRET` shorter than 32 characters. (`config/env.js`)
4. **Hardening fixes found during the final review** — public registration can no longer create `admin` accounts (privilege escalation); login does a dummy bcrypt comparison for unknown e-mails so response timing does not reveal which e-mails exist; a failed transaction rolls back its booking so data stays consistent; malformed JSON returns a clean 400.
5. **Container hardening** — non-root users, no published database port, nginx security headers, secrets only via environment.

### Final security review

| Threat | How HustleHub+ addresses it |
|---|---|
| **Injection (NoSQL/SQL)** | MongoDB is accessed only through Mongoose models (parameterised queries — no string-built queries); `express-mongo-sanitize` strips `$`/`.` operator keys; express-validator enforces types (an object like `{"$gt":""}` for an e-mail is rejected with 400 — covered by a test); user text used in a regular expression (gig search) is escaped; IDs are validated with `isMongoId`. There is no SQL database, so classic SQL injection does not apply. |
| **Cross-site scripting (XSS)** | All input is stripped of HTML/script by the `xss` sanitiser before it reaches the database; React escapes output by default and the code base never uses `dangerouslySetInnerHTML` (enforced by an ESLint rule); API responses carry a `default-src 'none'` CSP and the client is served with a restrictive CSP (`script-src 'self'`). Tested with a `<script>` payload. |
| **Authentication weaknesses** | Strong password policy; bcrypt with per-user salt; JWT with expiry; rate-limited auth endpoints plus account lockout; identical error messages and timing for unknown e-mail vs wrong password; HTTPS + HSTS; secret length enforced in production. |
| **Access-control issues** | Role checks on every protected route (`requireRole`), resource-ownership checks for gig changes, admin role cannot be self-assigned, monitoring restricted to admins; every denial is logged (`access_denied`) and counted. Tested: client cannot create gigs, freelancer cannot book, other freelancer cannot edit a gig, non-admin cannot read monitoring. |
| **Sensitive data exposure** | Password hashes never serialised; secrets only in environment variables; logs redact credentials and mask e-mails; errors never include stack traces. |
| **Security misconfiguration / supply chain** | Helmet headers, `x-powered-by` removed, non-root containers, DB not exposed, `npm audit` and static analysis in the pipeline. |

**Known limitations (honest residual risks):** the JWT is kept in `localStorage` (vulnerable if an XSS bug is ever introduced — mitigated by CSP/sanitising; `httpOnly` cookies would be stronger); the Docker stack uses a self-signed certificate and an HTTP front door on localhost (use a real certificate/TLS terminator in production); in-memory rate limiting and counters reset on restart and are per-instance; payments are simulated.

---

## 10. Testing

| Suite | Command | Covers |
|---|---|---|
| Backend unit | `npm test` (in `hustlehub-backend`) | tax logic, logger (redaction, files, counters), env validation, XSS sanitiser |
| Backend API integration (Supertest) | included in `npm test` — needs MongoDB at `MONGO_URI_TEST` (default `mongodb://127.0.0.1:27017/hustlehub_test`; quick start: `docker run -d --name hh-test-mongo -p 27017:27017 mongo:7`) | auth, lockout, NoSQL injection, XSS, RBAC, ownership, bookings + transactions, tax summary, monitoring |
| Frontend (Vitest) | `npm test` (in `hustlehub-frontend`) | existing component/page tests + dashboard, charts, formatters |
| Postman/Newman | `npm run test:api` (API must be running) | existing Part 2 collection |

---

## 11. API reference (summary)

| Method & path | Access | Purpose |
|---|---|---|
| `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/profile` | public / public / authenticated | accounts |
| `GET/POST/PUT/DELETE /api/gigs…` | public read; freelancer write (owner only) | gigs |
| `POST /api/bookings` | client | create booking + simulated transaction |
| `GET /api/bookings/mine` · `/freelancer` · `/freelancer/income` | client / freelancer | bookings & income |
| `GET /api/bookings/freelancer/tax-summary` | freelancer | **new** — income, tax, net, charts data |
| `GET /api/health` | public | **new** — liveness + DB state |
| `GET /api/monitoring/summary` | admin | **new** — event counters |

## 12. Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `MONGO_URI` | – (required) | MongoDB connection string |
| `JWT_SECRET` | – (required, ≥ 32 chars in production) | JWT signing secret |
| `JWT_EXPIRES_IN` | `1h` | token lifetime |
| `CORS_ORIGIN` | allow all | comma-separated allowed origins |
| `LOGIN_MAX_ATTEMPTS` / `LOCKOUT_MINUTES` | `5` / `15` | account lockout |
| `AUTH_RATE_LIMIT_MAX` / `BOOKING_RATE_LIMIT_MAX` | `10` / `20` | rate limits |
| `LOG_DIR` | `<backend>/logs` | log directory |
| `TRUST_PROXY` | `0` | number of reverse-proxy hops |

## 13. Demonstration & evidence

* Demonstration video: see [demo-video/README.md](demo-video/README.md) (script + where to place the recording).
* Static-analysis, pipeline and logging evidence: [docs/evidence/README.md](docs/evidence/README.md).

---

## References

Docker (n.d.) *Compose file reference*. Available at: https://docs.docker.com/compose/ (Accessed: 15 October 2026).
ESLint (n.d.) *Configuration files (flat config)*. Available at: https://eslint.org/docs/latest/use/configure/ (Accessed: 15 October 2026).
eslint-plugin-security (n.d.) *eslint-plugin-security*. Available at: https://github.com/eslint-community/eslint-plugin-security (Accessed: 15 October 2026).
GitHub (n.d.) *GitHub Actions documentation*. Available at: https://docs.github.com/en/actions (Accessed: 15 October 2026).
OWASP Foundation (n.d.) *Top 10:2021*. Available at: https://owasp.org/Top10/ (Accessed: 15 October 2026).
OWASP Foundation (n.d.) *Logging Cheat Sheet*. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html (Accessed: 15 October 2026).
OWASP Foundation (n.d.) *Authentication Cheat Sheet*. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html (Accessed: 15 October 2026).
Express (n.d.) *Production best practices: security*. Available at: https://expressjs.com/en/advanced/best-practice-security.html (Accessed: 15 October 2026).

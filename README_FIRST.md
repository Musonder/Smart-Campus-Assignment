# Argos Smart Campus – Start Here ✅

This is the **main entrypoint** for running and understanding your Argos Smart Campus platform for the assignment **“Argos: A Federated, Adaptive Smart Campus Orchestration Platform”**.

Use this file first; other markdowns are supporting detail.

---

## 1. What’s in this project (very short)

- **Backend**: Python 3.11+, FastAPI microservices (`services/…`), shared domain models (`shared/domain`).
- **Frontend**: React + TypeScript + Vite (`frontend/`), role‑based dashboard for Student/Lecturer/Staff/Admin.
- **Databases & infra**: PostgreSQL, MongoDB, Redis, Kafka – all via Docker.
- **ML/Analytics**: Enrollment dropout predictor + room optimizer (with rule‑based fallback if ML deps not installed).
- **Assignment extras**: Event sourcing, Raft consensus, plugin system, audit chain, policy engine.

---

## 2. Requirements – Python & dependencies

### Python

- Use **Python 3.11** (recommended; ML stack is tested there).

### Backend dependencies

From the project root:

```bash
python -m venv venv
venv\Scripts\activate  # Windows
# or source venv/bin/activate on Linux/macOS

# Install EVERYTHING (runtime + ML + dev tools) from a single file:
pip install -r requirements.txt
```

**Important notes:**

- `requirements.txt` contains **all Python libraries** used in this project (core services, ML, dev tools).
- ML packages (`torch`, `ray[rllib]`) are **large** (~2–3 GB) and may take 10–30 minutes to install.
- If ML packages fail to install (e.g., on Python 3.14 or older systems), **the system still works**:
  - The Analytics service will use rule-based fallbacks instead of ML models.
  - All other services (API Gateway, User, Academic, etc.) work normally.
- If you want to skip ML packages entirely, you can install core dependencies manually or use `requirements-minimal.txt` (but `requirements.txt` is the canonical complete list).

Files that define dependencies:

- `requirements.txt` – **canonical full list** (use this for complete installation).
- `requirements-quick.txt` – optional fast install (unpinned, latest versions).
- `requirements-minimal.txt` – minimal set without ML (for testing without heavy packages).
- `pyproject.toml` – authoritative list (also defines extras like `[dev]`, but `requirements.txt` mirrors it).

---

## 3. Docker setup (databases & core infra)

All infra services run via Docker Compose.

### 3.1 Start infrastructure

From the project root:

```bash
docker compose up -d
```

This brings up:

- PostgreSQL, MongoDB, Redis, Kafka (+ Zookeeper), any other infra defined in `docker-compose.yml`.

For more detail (ports, troubleshooting), see:

- `READY_TO_RUN.md` – **Docker & environment setup guide**.

---

## 4. Start all backend services + frontend

After Docker is up and Python deps are installed:

```powershell
.\START_ALL.bat
```

This will:

- Start all FastAPI services (API Gateway, User, Academic, Analytics, Facility, Scheduler, Security, Consensus).
- Start the React frontend dev server.

Then open:

- Frontend UI: `http://localhost:5173`
- API Gateway docs: `http://localhost:8000/docs`

If you prefer manual control, see `READY_TO_RUN.md` for individual commands.

---

## 5. Running ML / Analytics

The system runs **without** heavy ML dependencies by using rule‑based fallbacks.

- To enable **full ML** (LSTM + PPO), run:

```powershell
.\INSTALL_PACKAGES.bat
```

- Analytics service endpoints:
  - `/api/v1/predict/enrollment` – dropout risk prediction (with explainability).
  - `/api/v1/optimize/rooms` – room allocation optimizer.

Admin UI has an **Analytics** page that calls these via:

- `GET /api/v1/admin/ml/models`
- `POST /api/v1/analytics/predict/enrollment`

---

## 7. Where to find important documentation

These are the key docs for the assignment; everything else is additional detail.

- **Assignment mapping**:  
  - `ASSIGNMENT_COMPLIANCE.md` – maps each assignment requirement to concrete code.
  - `ASSIGNMENT_VERIFICATION.md` – how you demonstrate features during marking.

- **APIs & flows**:  
  - `API_ENDPOINTS.md` – exhaustive REST endpoint list with examples.

- **Frontend behaviour**:  
  - `FRONTEND_FEATURES.md` – role‑based UI breakdown and routes.
  - `IMPLEMENTATION_SUMMARY.md` – summary of frontend implementation.

- **System status & architecture**:  
  - `SYSTEM_STATUS.md` – what's implemented and how to verify it.
  - `docs/README.md` – any additional deep‑dive technical notes.

---

## 6. How to run tests & CI

With the virtualenv active:

```bash
pytest
```

Includes:

- Policy unit tests (`tests/test_policies.py`) – checks enrollment policies & invariants.
- Analytics fallback test (`tests/test_analytics_fallback.py`) – ensures ML endpoint works even without deep ML.

GitHub Actions CI is configured in:

- `.github/workflows/ci.yml` – runs lint (`ruff`), type check (`mypy`), and tests on push/PR.

---

## 7. Optional tools (stress & security tests)

From project root (with API Gateway + services running):

- **Enrollment stress test**:

  ```bash
  STRESS_API_BASE=http://localhost:8000 \
  STRESS_ACCESS_TOKEN=... \
  STRESS_STUDENT_ID=... \
  STRESS_SECTION_ID=... \
  python -m scripts.enrollment_stress_test
  ```

- **Security pen‑test harness**:

  ```bash
  SEC_API_BASE=http://localhost:8000 \
  SEC_ADMIN_ACCESS_TOKEN=... \
  SEC_STUDENT_ACCESS_TOKEN=... \
  python -m scripts.security_pentest
  ```

These are **not mandatory for running** the system, but useful for producing the test/security reports required by the assignment.

---

If you only remember one thing: **run Docker, install Python deps, run `START_ALL.bat`, then open `http://localhost:5173` – everything else is documented from here.**



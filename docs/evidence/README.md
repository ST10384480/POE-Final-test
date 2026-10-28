# Evidence folder

Put your evidence here before submitting (screenshots or exported files). Suggested file names are in brackets.

## 1. Static analysis result  (`static-analysis-*.png`, `eslint-report.txt`)
* After the pipeline runs: GitHub → **Actions** → latest run → the run **Summary** shows a table with files analysed / errors / warnings; download the artifacts `static-analysis-backend` and `static-analysis-frontend` (they contain `eslint-report.json`, `eslint-report.txt`, `static-analysis-summary.md`).
* Or locally: `npm run lint:report` in each project and take a screenshot of the printed summary.
* Then update the paragraph "What the results indicate" in the root README with the real numbers.

## 2. CI/CD pipeline evidence  (`pipeline-green.png`)
Screenshot of the green workflow run showing the `backend`, `frontend` and `docker` jobs. A second screenshot of a deliberately failing run (e.g. break a test on a branch) proves that the pipeline fails when checks do not pass.

## 3. Logging evidence  (`logging-*.png` or `security.log` excerpt)
With the stack running (`docker compose up`), perform: one failed login, one successful login, create a gig, make a booking, then show:

```bash
docker compose exec api sh -c "tail -n 15 logs/security.log"
docker compose exec api sh -c "tail -n 5 logs/access.log"
```

You should see entries such as `login_failure`, `login_success`, `booking_created`, `transaction_recorded`. To show an error entry, request `http://localhost:8080/api/gigs/xyz` or stop MongoDB and call an endpoint, then `tail logs/app.log`.

Entry format (reference only — capture your own run):
```json
{"timestamp":"<ISO time>","level":"warn","event":"login_failure","reason":"wrong_password","userId":"<id>","attempts":1,"requestId":"<uuid>","ip":"<ip>"}
```

## 4. Containerised environment  (`docker-compose-ps.png`)
Screenshot of `docker compose ps` showing `mongo`, `api` and `client` as **healthy**.

## 5. Test results  (`tests-backend.png`, `tests-frontend.png`)
Screenshots of `npm test` in both projects (or of the pipeline test steps).

# Demonstration video

Save the recording in this folder (e.g. `hustlehub-final-demo.mp4`). If the file is larger than GitHub's 100 MB limit, upload it to Google Drive / OneDrive / YouTube (unlisted) and put the link in the root README, section 13.

## Suggested script (≈ 6–8 minutes)
1. **Containers (30 s)** — in a terminal: `docker compose up --build`, then `docker compose ps` showing `mongo`, `api`, `client` healthy. Open http://localhost:8080.
2. **Authentication (1 min)** — register a new *freelancer* (show the password policy message with a weak password first), log in. Show a wrong-password attempt.
3. **Gig creation (1 min)** — as the freelancer, create a gig (e.g. price 3000).
4. **Booking (1 min)** — log out, register/login as a *client*, browse gigs, book the gig.
5. **Transaction recording (1 min)** — show the booking in "My Bookings"; as the freelancer open "My Bookings" (income + simulated transaction).
6. **Tax dashboard (1 min)** — freelancer → "Income & Tax": cards, bar chart, donut, bracket table; explain the calculation (3000 → 330 tax).
7. **Logging & monitoring (1.5 min)** — `docker compose exec api sh -c "tail -n 15 logs/security.log"`; show lockout (3–5 wrong passwords → locked); log in as admin and open `GET /api/monitoring/summary`.
8. **CI/CD (1 min)** — GitHub Actions run page: jobs, static-analysis summary, green pipeline.

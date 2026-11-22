# Java Prat Booking Dashboard

Public static dashboard built with Adobe Spectrum Web Components.

Site: https://nicokiki.github.io/java-prat-booking-dashboard/

## Current Status

The dashboard reads saved booking reports from `data/executions.json`. An empty archive shows no recorded executions, not fictional bookings. The site cannot create or retry reservations.

Names and licencias are public when recorded. Missing identities are displayed as unrecorded. Unconfirmed submissions never claim a confirmed booking.

Displayed outcomes are **Confirmed**, **Unavailable**, **Technical Failure**, and
**Informational**. Historical `Uncertain` results and new unconfirmed submissions
appear as Technical Failure, retaining the warning to check TeeOne before retrying.
The saved source archive can still contain the historical label; publication
normalizes it on the next archive update. Existing records are not deleted.

### Rollout Status (2026-11-14)

**Steps 1-6 are complete; Step 7 is pending.**

1. **Public-data scope:** approved public booking details, names, and licencias; credentials and raw logs are excluded. Sanitized dropdown PNGs are described below.
2. **Dashboard setup:** created this public repository and enabled GitHub Pages.
3. **Structured results:** the Java application records outcomes, Madrid timestamps, participants, and observed availability before sending email.
4. **Publication pipeline:** artifact backup and allowlisted, execution-ID-based publishing are implemented. `DASHBOARD_PUBLISH_TOKEN` is configured in the booking repository's Actions secrets.
5. **Real-data dashboard:** replaced fictional records with saved JSON and pushed both integrations to `main`. Dashboard integration commit: `78e99ee`; booking integration commit: `ff61a48`.
6. **Safe validation:** local tests, the Java-to-publisher dry-run, and the final JAR build passed. The [no-booking check](https://github.com/nicokiki/java-prat-booking/actions/runs/43621477702) and [Pages deployment](https://github.com/nicokiki/java-prat-booking-dashboard/actions/runs/43621458180) succeeded. No real booking or email was triggered for these checks.
7. **Pending:** verify the next normal scheduled booking using the checklist below, including the token's actual write access, which has not yet been exercised.

At this checkpoint, the live archive is empty, as expected. No fictional records were published.

## Hosting

GitHub Pages serves the files from the root of the `main` branch. No deployment credentials or custom workflow are required.

The repository contains the static HTML and bundled Spectrum JavaScript, stylesheet, and Source Sans 3 fonts. Asset paths are relative so they work under the GitHub Pages project URL.

## Data Publication

The booking repository's workflow backs up each report, then publishes an allowlisted record using `DASHBOARD_PUBLISH_TOKEN`. This publishing secret belongs only in the booking repository's Actions secrets, never in this site or its JavaScript.

The archive preserves one entry per execution ID. Availability history filters by full play date, course and hole count (18 by default, or 9), showing all recorded player counts. Each execution column labels its player count; change indicators only compare matching player and hole counts. Only observed courses have snapshots. New availability-only schedules are not part of this integration.

When a valid Google Sheet has no row for the target play date, the existing run
inspects Rosa and Amarillo, plus Verde when offered in the course dropdown, for
**2 players**, preferring **18 holes**. Only informational inspections check
**9 holes** when a successful completed response confirms no eighteen-hole times
and nine is offered. Empty eighteen and subsequent nine observations remain
distinct. If only nine is offered, execution details say **18 holes not offered**;
no empty eighteen snapshot is fabricated. API/pending/closed/malformed failures do
not trigger the fallback. Booking runs remain eighteen-only.
Missing Verde is normal and does not make the run fail.
It is shown as **Not offered for this date**, without a fabricated empty snapshot.
A complete
inspection appears as **Informational**, with all offered times, no requested-time
window, participants, booked slot, or reservation attempt. These runs are shown
separately in the outcome filter/chart and excluded from the confirmed-booking
rate denominator and the not-booked count. Availability history includes their
snapshots alongside booking observations. An incomplete inspection is a
technical failure and can retain partial snapshots, including when Verde was
offered but could not be inspected.

Availability-only runs send no email. Matching-row booking emails remain
unchanged. Actual Sheets/configuration errors do not trigger this mode. This
feature does not add a new schedule or continuously poll TeeOne.

## Booking and Availability Analysis

The confirmation rate is confirmed bookings divided by runs with a requested
booking. Informational runs and failures before booking preferences were loaded
are excluded from the denominator. The two timing KPIs use Confirmed cases only:
form start to BLOQUEAR and form start to confirmation, with separate sample counts.
New reports save `bookingFormStartedAt`; older form starts are reconstructed from
`confirmedAt` minus `bookingDurationSeconds`. Workflow startup is not form startup.
Missing or inconsistent timestamps are excluded, never replaced with zero.

**Not bookable means not listed in the dropdown.** Listed options, including disabled
ones or options with too few places, do not increase that metric. The grid retains
those distinctions and marks the selected time. Each execution uses its actual
snapshot; daily summaries use the earliest saved snapshot per course, hole count and play date
so retries do not add sample days. Weekday groups use the play date, not the run
date. Friday, combined weekends, Saturday and Sunday are shown with sample counts.

The reference is the union of tee times actually recorded for the same course,
player count and hole count, within the selected time window. It uses all saved
dates, even when a narrower date range is selected. No ten-minute schedule or
official club timetable is assumed. The reference grows when new times are observed,
so historical counts can change as the archive grows. Times never observed cannot
be detected as missing. No snapshot for a course is not an empty dropdown; it is
excluded from counts. If no reference times are known, the median stays unknown.

Aggregate analysis uses two players and the selected hole count (18 by default).
Nine-hole samples are conditional fallback checks, not a complete survey; missing
observations are unknown, not unavailable. The reference and comparisons never
mix nine and eighteen holes. Hole count, course, play-date range, tee-time
window and Friday/weekend filters are responsive on mobile. Comparisons are of
snapshots, not all-day availability; capture times can vary. CSV export includes
capture timestamps, execution IDs, the reference method and reference time list so
the exported calculation remains auditable. It contains no participant identities.
Missing times cannot identify purchasers or establish non-member sales or allocation
reasons. This dashboard documents observations rather than proving a cause.

Run `node --test analysis.test.mjs screenshots.test.mjs` for calculation and
image-viewer regressions. The check workflow runs these tests on pushes and pull requests.

## Execution PNGs

The Tee times tab shows Initial/Recheck thumbnails when an execution has saved
`screenshots` references. Older executions without images have no gallery.
Each PNG contains all dropdown options on one full-height page; the viewer fits
the complete image first, with minus/plus zoom, a fit reset, and course/hole navigation.
Zoomed images scroll inside the viewer. Capture times are the original read times,
not the later rendering or publication time. Missing image files show an unavailable
state without changing booking outcomes or availability calculations.

The Java workflow renders PNGs only after booking/inspection, report saving and
email handling. It draws time/capacity labels and selected/disabled states only;
member-name suffixes and arbitrary text are removed or redacted. These are rendered
snapshots, not live screenshots taken during booking. Raw HTML logs are never copied.
The publisher checks execution/date/player provenance and PNG integrity, strips
embedded PNG metadata, and stores images at
`data/executions/EXECUTION_ID/screenshots/COURSE-STAGE.png` with relative JSON paths.
Nine-hole variants use `COURSE-9-STAGE.png` and have separate thumbnails/captions.
Legacy references without a hole count are treated as eighteen holes.
No GitHub artifact URLs, tokens or credentials are embedded in the page.

The publishing secret is configured. The first real record still depends on a normal booking run saving its report and successful publication; it need not be a confirmed booking.

## Deleting an Execution

1. Select the execution in **Execution history** and click **Delete** in its details.
2. Confirm the ID in the dialog. **Cancel** leaves everything unchanged; **Copy ID** copies the selected ID.
3. Choose **Continue in GitHub** to open the booking repository's [Delete dashboard execution (no booking)](https://github.com/nicokiki/java-prat-booking/actions/workflows/delete-dashboard-execution.yml) workflow. Click **Run workflow** on `main`, paste the ID into `execution_id`, and set `confirmation` to **yes**. The ID is not automatically prefilled.
4. Run it as the repository owner. After the deletion commit and Pages deployment succeed, refresh the dashboard.

The page does not contain a token or directly perform deletion. Only an explicit,
owner-approved workflow removes the matching execution, its embedded availability
snapshots and its PNG directory. It preserves other executions and fails without mutation
for invalid or missing IDs. A conflicting publication rejects the push safely;
inspect the failure before retrying the deletion workflow.

Deletion does not cancel a TeeOne reservation, remove an Actions artifact, or erase
Git history. Opening the dialog or running a fixture test never deletes real data.

## Step 7: First-Run Verification

Verify the next normal scheduled booking, not an extra test booking:

1. Check the saved `booking-result-*` artifact in the booking repository.
2. Confirm the dashboard checkout and publication steps succeed, exercising the token's write access. These steps are best-effort, so a green booking workflow alone does not prove publication succeeded.
3. Match the execution ID and outcome in `data/executions.json` and the live dashboard to the saved report. Check the actual course/time for confirmed bookings; uncertain results must not claim confirmation.
4. Verify participant names/licencias and observed course snapshots. Missing identities must remain unrecorded.
5. Confirm the new record is visible after Pages deployment. Inspect existing TeeOne reservations before recovering an uncertain booking; never rerun a booking just to test publication.

No extra booking or availability-only schedule has been added for this verification.
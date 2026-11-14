# Java Prat Booking Dashboard

Public static dashboard built with Adobe Spectrum Web Components.

Site: https://nicokiki.github.io/java-prat-booking-dashboard/

## Current Status

The dashboard reads saved booking reports from `data/executions.json`. An empty archive shows no recorded executions, not fictional bookings. The site cannot create or retry reservations.

Names and licencias are public when recorded. Missing identities are displayed as unrecorded. Uncertain executions never claim a confirmed booking.

### Rollout Status (2026-11-14)

**Steps 1-6 are complete; Step 7 is pending.**

1. **Public-data scope:** approved public booking details, names, and licencias; reports exclude credentials and screenshots.
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

The archive preserves one entry per execution ID. Availability comparisons filter by full play date, player count, and 18 holes; only observed courses have snapshots. New availability-only schedules are not part of this integration.

The publishing secret is configured. The first real record still depends on a normal booking run saving its report and successful publication; it need not be a confirmed booking.

## Step 7: First-Run Verification

Verify the next normal scheduled booking, not an extra test booking:

1. Check the saved `booking-result-*` artifact in the booking repository.
2. Confirm the dashboard checkout and publication steps succeed, exercising the token's write access. These steps are best-effort, so a green booking workflow alone does not prove publication succeeded.
3. Match the execution ID and outcome in `data/executions.json` and the live dashboard to the saved report. Check the actual course/time for confirmed bookings; uncertain results must not claim confirmation.
4. Verify participant names/licencias and observed course snapshots. Missing identities must remain unrecorded.
5. Confirm the new record is visible after Pages deployment. Inspect existing TeeOne reservations before recovering an uncertain booking; never rerun a booking just to test publication.

No extra booking or availability-only schedule has been added for this verification.
# Java Prat Booking Dashboard

Public static dashboard built with Adobe Spectrum Web Components.

Site: https://nicokiki.github.io/java-prat-booking-dashboard/

## Current Status

The dashboard reads saved booking reports from `data/executions.json`. An empty archive shows no recorded executions, not fictional bookings. The site cannot create or retry reservations.

Names and licencias are public when recorded. Missing identities are displayed as unrecorded. Uncertain executions never claim a confirmed booking.

## Hosting

GitHub Pages serves the files from the root of the `main` branch. No deployment credentials or custom workflow are required.

The repository contains the static HTML and bundled Spectrum JavaScript, stylesheet, and Source Sans 3 fonts. Asset paths are relative so they work under the GitHub Pages project URL.

## Data Publication

The booking repository's workflow backs up each report, then publishes an allowlisted record using `DASHBOARD_PUBLISH_TOKEN`. This publishing secret belongs only in the booking repository's Actions secrets, never in this site or its JavaScript.

The archive preserves one entry per execution ID. Availability comparisons filter by full play date, player count, and 18 holes; only observed courses have snapshots. New availability-only schedules are not part of this integration.

The first real result requires the publishing secret to be configured and the next normal booking to complete. Verify that next run rather than dispatching an extra booking for testing.
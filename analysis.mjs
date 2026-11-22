const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function median(values) {
  const sorted = values.filter(value => typeof value === 'number' && Number.isFinite(value)).sort((first, second) => first - second);
  return sorted.length ? (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.ceil((sorted.length - 1) / 2)]) / 2 : null;
}

export function courseName(value) {
  const match = String(value || '').match(/\b(ROSA|AMARILLO|VERDE)\b/i);
  return match ? match[1][0].toUpperCase() + match[1].slice(1).toLowerCase() : String(value || 'Not recorded');
}

export function inspectionVariants(snapshots,courses) {
  return courses.flatMap(course => {
    const eighteen = snapshots.find(snapshot => courseName(snapshot.course) === course && snapshot.holes === 18);
    const nine = snapshots.find(snapshot => courseName(snapshot.course) === course && snapshot.holes === 9);
    return [{course,holes:18,snapshot:eighteen,notOffered:!eighteen && nine?.fallbackReason === '18-not-offered'},
      ...(nine ? [{course,holes:9,snapshot:nine,notOffered:false}] : [])];
  });
}

export function bookingMetrics(reports) {
  const attempts = reports.filter(report => report.outcome !== 'Informational' && typeof report.requested === 'string' && report.requested.trim());
  const confirmed = attempts.filter(report => report.outcome === 'Confirmed');
  const blocks = [];
  const confirmations = [];
  for (const report of confirmed) {
    const confirmation = Date.parse(report.confirmedAt);
    const duration = report.bookingDurationSeconds;
    const start = report.bookingFormStartedAt != null ? Date.parse(report.bookingFormStartedAt)
      : Number.isFinite(confirmation) && typeof duration === 'number' && Number.isFinite(duration) && duration >= 0
        ? confirmation - duration * 1000 : NaN;
    if (!Number.isFinite(start) || !Number.isFinite(confirmation) || confirmation < start) continue;
    confirmations.push((confirmation - start) / 1000);
    const block = Date.parse(report.blockedAt);
    if (Number.isFinite(block) && block >= start && block <= confirmation) blocks.push((block - start) / 1000);
  }
  return {attempts: attempts.length, confirmed: confirmed.length, blockMedian: median(blocks), confirmationMedian: median(confirmations),
    blockSamples: blocks.length, confirmationSamples: confirmations.length};
}

export function playDay(date) {
  return new Date(date + 'T12:00:00Z').getUTCDay();
}

export function matchesDay(date, group) {
  const day = playDay(date);
  return group === 'friday' ? day === 5 : group === 'weekend' ? day === 0 || day === 6 : true;
}

export function snapshotObservation(snapshot, times) {
  const listed = new Map(snapshot.options.map(option => [option.time, option]));
  const slots = times.map(time => {
    const option = listed.get(time);
    return {time, option, state: !option ? 'missing' : !option.enabled || option.places != null && option.places < snapshot.players ? 'limited' : 'listed'};
  });
  return {snapshot, playDate: snapshot.playDate, slots, missing: times.length ? slots.filter(slot => slot.state === 'missing').length : null,
    limited: slots.filter(slot => slot.state === 'limited').length};
}

export function availabilityAnalysis(snapshots, {course, players = 2, holes = 18, from = '', through = '9999-12-31', start = '00:00', end = '23:59', days = 'all'} = {}) {
  const cohort = snapshots.filter(snapshot => courseName(snapshot.course) === course && snapshot.players === players && snapshot.holes === holes
    && datePattern.test(snapshot.playDate || '') && Number.isFinite(Date.parse(snapshot.capturedAt)) && Array.isArray(snapshot.options));
  const times = [...new Set(cohort.flatMap(snapshot => snapshot.options.map(option => option.time)))]
    .filter(time => timePattern.test(time) && time >= start && time <= end).sort();
  const firstByDate = new Map();
  for (const snapshot of [...cohort].sort((first, second) => Date.parse(first.capturedAt) - Date.parse(second.capturedAt)
      || String(first.executionId).localeCompare(String(second.executionId)))) {
    if (snapshot.playDate >= from && snapshot.playDate <= through && !firstByDate.has(snapshot.playDate)) firstByDate.set(snapshot.playDate, snapshot);
  }
  const allRows = [...firstByDate.values()].sort((first, second) => first.playDate.localeCompare(second.playDate))
    .map(snapshot => snapshotObservation(snapshot, times));
  const rows = allRows.filter(row => matchesDay(row.playDate, days));
  const groups = [['Mon-Thu', day => day >= 1 && day <= 4], ['Friday', day => day === 5], ['Weekends', day => day === 0 || day === 6],
    ['Saturday', day => day === 6], ['Sunday', day => day === 0]].map(([label, includes]) => {
    const group = allRows.filter(row => includes(playDay(row.playDate)) && row.missing !== null);
    return {label, count: group.length, median: median(group.map(row => row.missing))};
  });
  return {times, rows, groups, median: median(rows.map(row => row.missing)), referenceDates: new Set(cohort.map(snapshot => snapshot.playDate)).size};
}

export function observationsCsv(analysis) {
  const rows = [['play_date', 'course', 'players', 'holes', 'captured_at', 'execution_id', 'reference_method', 'reference_times', 'tee_time', 'state', 'places', 'enabled']];
  for (const row of analysis.rows) for (const slot of row.slots) rows.push([row.playDate, courseName(row.snapshot.course), row.snapshot.players,
    row.snapshot.holes, row.snapshot.capturedAt, row.snapshot.executionId, 'observed-union-first-snapshot-per-play-date', analysis.times.join(';'),
    slot.time, slot.state === 'missing' ? 'not-bookable-not-listed' : slot.state === 'limited' ? 'listed-limited' : 'listed', slot.option?.places ?? '', slot.option?.enabled ?? '']);
  return rows.map(row => row.map(value => {
    const text = String(value);
    return '"' + (/^[=+\-@\t\r]/.test(text) ? "'" : '') + text.replaceAll('"', '""') + '"';
  }).join(',')).join('\r\n');
}
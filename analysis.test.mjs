import test from 'node:test';
import assert from 'node:assert/strict';
import {median, bookingMetrics, availabilityAnalysis, snapshotObservation, observationsCsv, inspectionVariants} from './analysis.mjs';

const option = (time, places = 4, enabled = true) => ({time, places, enabled});
const snapshot = (playDate, options, extra = {}) => ({playDate, options, course: 'TEE 1 ROSA', players: 2, holes: 18,
  capturedAt: playDate + 'T20:00:03+01:00', executionId: 'fixture-' + playDate, ...extra});

test('not bookable equals missing, never listed-but-limited, and retries do not duplicate dates', () => {
  const result = availabilityAnalysis([
    snapshot('2026-11-13', [option('08:00'), option('08:20', 1, false)]),
    snapshot('2026-11-13', [option('08:00')], {capturedAt: '2026-11-13T20:02:00+01:00'}),
    snapshot('2026-11-14', [option('08:00'), option('08:10'), option('08:20')]),
    snapshot('2026-11-15', [option('07:00')], {players: 3})
  ], {course: 'Rosa'});
  assert.deepEqual(result.times, ['08:00', '08:10', '08:20']);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].missing, 1);
  assert.equal(result.rows[0].limited, 1);
  assert.equal(result.median, 0.5);
  assert.equal(result.groups.find(group => group.label === 'Friday').median, 1);
  assert.equal(result.groups.find(group => group.label === 'Weekends').count, 1);
});

test('missing course is not an empty observation, and no known reference is not zero missing', () => {
  assert.equal(availabilityAnalysis([snapshot('2026-11-13', [option('08:00')])], {course: 'Verde'}).rows.length, 0);
  const empty = availabilityAnalysis([snapshot('2026-11-13', [])], {course: 'Rosa'});
  assert.equal(empty.median, null);
  assert.equal(empty.rows[0].missing, null);
});

test('both observation views retain one-to-four capacity shades without changing eligibility or missing counts', () => {
  const source = snapshot('2026-11-13', [option('08:00',1), option('08:10',2), option('08:20',3), option('08:30',4),
    option('08:40',null), option('08:50',4,false)]);
  const times = source.options.map(entry => entry.time).concat('09:00');
  const execution = snapshotObservation(source,times);
  assert.deepEqual(execution.slots.map(slot => slot.capacity),[1,2,3,4,null,4,null]);
  assert.deepEqual(execution.slots.map(slot => slot.state),['limited','listed','listed','listed','listed','limited','missing']);
  assert.equal(execution.missing,1);
  const daily = availabilityAnalysis([source],{course:'Rosa'}).rows[0];
  assert.deepEqual(daily.slots.map(slot => slot.capacity),[1,2,3,4,null,4]);
  assert.deepEqual(snapshotObservation(snapshot('2026-11-13',[option('08:00',0),option('08:10',5),option('08:20','2')]),
    ['08:00','08:10','08:20']).slots.map(slot => slot.capacity),[null,null,null]);
});

test('reference is stable across date filters and weekday uses play date, not capture date', () => {
  const source = [snapshot('2026-11-13', [option('08:00')], {capturedAt: '2026-11-11T20:00:03+01:00'}),
    snapshot('2026-11-14', [option('08:00'), option('08:10'), option('08:20')])];
  const friday = availabilityAnalysis(source, {course: 'Rosa', from: '2026-11-13', through: '2026-11-13', start: '08:00', end: '08:10', days: 'friday'});
  assert.equal(friday.rows.length, 1);
  assert.equal(friday.rows[0].missing, 1);
  assert.equal(friday.groups.find(group => group.label === 'Friday').count, 1);
  assert.equal(availabilityAnalysis(source, {course: 'Rosa', days: 'weekend'}).rows.length, 1);
});

test('timing medians use confirmed cases only and attempted booking count excludes scans and pre-booking errors', () => {
  const confirmed = {outcome: 'Confirmed', requested: 'Rosa 08:00', confirmedAt: '2026-11-18T20:00:11+01:00',
    blockedAt: '2026-11-18T20:00:05+01:00', bookingDurationSeconds: 10};
  const stats = bookingMetrics([confirmed, {...confirmed, bookingFormStartedAt: '2026-11-18T20:00:03+01:00'},
    {...confirmed, outcome: 'Technical failure'}, {...confirmed, outcome: 'Informational'}, {outcome: 'Technical failure', requested: null}]);
  assert.equal(stats.confirmed, 2);
  assert.equal(stats.attempts, 3);
  assert.equal(stats.blockMedian, 3);
  assert.equal(stats.confirmationMedian, 9);
  assert.equal(stats.blockSamples, 2);
  assert.equal(bookingMetrics([{...confirmed, blockedAt: '2026-11-18T20:00:20+01:00'}]).blockMedian, null);
});

test('empty samples stay unknown, and CSV retains provenance without spreadsheet formulas', () => {
  assert.equal(median([]), null);
  assert.equal(median([null, NaN, 0, 4]), 2);
  const result = availabilityAnalysis([snapshot('2026-11-13', [option('08:00')], {executionId: '=fixture'})], {course: 'Rosa'});
  const csv = observationsCsv(result);
  assert.match(csv, /captured_at/);
  assert.match(csv, /observed-union-first-snapshot-per-play-date/);
  assert.match(csv, /"'=fixture"/);
});

test('execution view uses its own snapshot even when daily summary selected an earlier retry', () => {
  const first = snapshot('2026-11-13', [option('08:00'), option('08:10')]);
  const later = snapshot('2026-11-13', [option('08:00')], {capturedAt:'2026-11-13T20:03:00+01:00'});
  const result = availabilityAnalysis([first, later], {course:'Rosa'});
  assert.equal(result.rows[0].missing, 0);
  assert.equal(snapshotObservation(later, result.times).missing, 1);
  assert.match(observationsCsv({...result, rows:[snapshotObservation(later, result.times)]}), /not-bookable-not-listed/);
});

test('times never observed are not invented, and other courses or nine-hole rounds cannot inflate the reference', () => {
  const source = [snapshot('2026-11-13', [option('08:00'), option('08:20')]),
    snapshot('2026-11-14', [option('08:10')], {course:'TEE 1 AMARILLO'}),
    snapshot('2026-11-14', [option('08:30')], {holes:9})];
  assert.deepEqual(availabilityAnalysis(source, {course:'Rosa'}).times, ['08:00','08:20']);
  assert.equal(availabilityAnalysis(source, {course:'Rosa', start:'09:00', end:'10:00'}).median, null);
});

test('nine-hole analysis is isolated and retains its hole count in CSV',() => {
  const source = [snapshot('2026-11-13',[]),snapshot('2026-11-13',[option('09:00')],{holes:9})];
  assert.deepEqual(availabilityAnalysis(source,{course:'Rosa',holes:18}).times,[]);
  const nine = availabilityAnalysis(source,{course:'Rosa',holes:9});
  assert.deepEqual(nine.times,['09:00']);
  assert.equal(nine.rows.length,1);
  assert.match(observationsCsv(nine),/"Rosa","2","9"/);
});

test('execution variants distinguish empty eighteen, observed nine and eighteen not offered',() => {
  const eighteen = snapshot('2026-11-13',[]);
  const nine = snapshot('2026-11-13',[option('09:00')],{holes:9});
  const both = inspectionVariants([eighteen,nine],['Rosa']);
  assert.deepEqual(both.map(variant => variant.holes),[18,9]);
  assert.equal(both[0].snapshot,eighteen);
  const onlyNine = inspectionVariants([{...nine,fallbackReason:'18-not-offered'}],['Rosa']);
  assert.equal(onlyNine[0].snapshot,undefined);
  assert.equal(onlyNine[0].notOffered,true);
  assert.equal(inspectionVariants([],['Verde'])[0].notOffered,false);
});

test('invalid or incomplete timing samples are excluded without dropping legitimate zero-duration samples', () => {
  const report = {outcome:'Confirmed', requested:'Rosa 08:00', bookingFormStartedAt:'2026-11-18T20:00:01+01:00',
    confirmedAt:'2026-11-18T20:00:01+01:00', blockedAt:'2026-11-18T20:00:01+01:00'};
  assert.equal(bookingMetrics([report]).blockMedian, 0);
  assert.equal(bookingMetrics([report]).confirmationMedian, 0);
  assert.equal(bookingMetrics([{...report, bookingFormStartedAt:'invalid'}]).confirmationMedian, null);
  assert.equal(bookingMetrics([{...report, confirmedAt:null}]).confirmationMedian, null);
});
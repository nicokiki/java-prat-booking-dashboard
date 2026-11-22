import {test} from 'node:test';
import assert from 'node:assert/strict';
import {executionScreenshots,fitZoom,boundedZoom} from './screenshots.mjs';

const image = {course:'TEE 1 ROSA',stage:'initial',path:'data/executions/run-1/screenshots/rosa-initial.png',
  playDate:'2026-11-24',players:2,capturedAt:'2026-11-22T20:00:06+01:00',optionCount:52};
const report = {executionId:'run-1',playDate:'2026-11-24',players:2,screenshots:[image]};

test('older executions have no image gallery and valid metadata stays unchanged',() => {
  assert.deepEqual(executionScreenshots({...report,screenshots:undefined}),[]);
  assert.deepEqual(executionScreenshots(report),[image]);
});
test('images cannot load external URLs, another execution, unsafe paths or invalid metadata',() => {
  for (const change of [{path:'https://example.invalid/private.png'},{path:'data/executions/run-2/screenshots/rosa-initial.png'},
    {path:'../secret.png'},{stage:'raw'},{course:'PRIVATE NAME'},{players:3},{optionCount:501},{optionCount:'52'},
    {playDate:'2026-11-25'},{capturedAt:'2026-11-22T20:00:06'},{capturedAt:'invalid'}]) {
    assert.deepEqual(executionScreenshots({...report,screenshots:[{...image,...change}]}),[]);
  }
  assert.deepEqual(executionScreenshots({...report,executionId:'../secret'}),[]);
});
test('duplicates are excluded and stages/courses have stable ordering',() => {
  const recheck = {...image,stage:'recheck',path:'data/executions/run-1/screenshots/rosa-recheck.png'};
  assert.deepEqual(executionScreenshots({...report,screenshots:[recheck,image,image]}),[image,recheck]);
});
test('a full 52-option page fits both desktop and mobile without upscaling',() => {
  for (const [width,height] of [[1034,638],[336,620]]) {
    const scale = fitZoom(840,2688,width,height);
    assert.ok(840*scale <= width-24);
    assert.ok(2688*scale <= height-24);
    assert.ok(scale > 0 && scale <= 1);
  }
  assert.equal(fitZoom(840,2688,0,0),0);
  assert.equal(fitZoom(100,100,1000,1000),1);
});
test('plus/minus zoom is bounded and retains the fit value below 25 percent',() => {
  assert.equal(boundedZoom(5,.1),4);
  assert.equal(boundedZoom(-1,.1),.1);
  assert.equal(boundedZoom(.23,.1),.23);
});
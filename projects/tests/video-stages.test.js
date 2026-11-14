const test = require('node:test');
const assert = require('node:assert/strict');
const { videoStages, newVideoJob, videoStageParams, videoStageOutput } = require('../utils/video');

// Same cases as Tools/tests/video_pipeline/test_stages.py
const B = { procedure: 'brightness', params: { brightness: 0.5 } };
const C = { procedure: 'contrast', params: { contrastFactor: 1.2 } };
const T = { procedure: 'trim', params: { start: 0, end: 2 } };
const S = { procedure: 'speed', params: { factor: 2 } };
const SUB = { procedure: 'subtitles', params: {} };
const X = { procedure: 'extract_frames', params: { mode: 'count', count: 3, format: 'png' } };

const shape = (stages) => stages.map((s) => [s.service.split('_')[1], s.tools.map((t) => t.procedure), s.previewCut ?? null]);

const cases = [
  [[B], false, [['effects', ['brightness'], false]]],
  [[B], true, [['effects', ['brightness'], true]]],
  [[T, B, SUB], false, [['effects', ['trim', 'brightness'], false], ['subtitles', ['subtitles'], null]]],
  [[SUB, C], true, [['effects', [], true], ['subtitles', ['subtitles'], null], ['effects', ['contrast'], false]]],
  [[SUB, S, SUB], true, [['effects', [], false], ['subtitles', ['subtitles'], null],
    ['effects', ['speed'], true], ['subtitles', ['subtitles'], null]]],
  [[B, X], true, [['effects', ['brightness'], false], ['frames', ['extract_frames'], null]]],
  [[X], true, [['frames', ['extract_frames'], null]]],
  [[SUB, X], false, [['effects', [], false], ['subtitles', ['subtitles'], null], ['frames', ['extract_frames'], null]]],
  [[], false, [['effects', [], false]]],
];

test('a video pipeline is split into effects, captions and extraction stages', () => {
  for (const [tools, preview, expected] of cases) {
    assert.deepEqual(shape(videoStages(tools, preview)), expected, JSON.stringify(tools.map((t) => t.procedure)));
  }
});

test('only the last stage writes the final output; the others share one work directory', () => {
  const progress = { user: 'u1', projectId: 'p1', imgId: 'v1' };
  const job = newVideoJob([T, SUB, X], { preview: false, progress, finalUri: './images/users/u/projects/p/out/clip.mp4' });
  assert.equal(job.stages.length, 3);
  assert.match(job.work_dir, /^\.\/images\/users\/u\/projects\/p\/out\/video-stages-[0-9a-f-]{36}$/);
  assert.equal(videoStageOutput(job, 0), `${job.work_dir}/stage-0.mp4`);
  assert.equal(videoStageOutput(job, 1), `${job.work_dir}/stage-1.mp4`);
  assert.equal(videoStageOutput(job, 2), './images/users/u/projects/p/out/clip.mp4');
  assert.deepEqual(videoStageParams(job, 1), {
    tools: [SUB], preview: false, previewCut: false, stage: 1, stages: 3, progress,
  });
  const other = newVideoJob([B], { preview: true, progress, finalUri: './x/preview/clip.mp4' });
  assert.notEqual(other.work_dir, job.work_dir);
  assert.deepEqual(videoStageParams(other, 0), {
    tools: [B], preview: true, previewCut: true, stage: 0, stages: 1, progress,
  });
  assert.equal(videoStageOutput(other, 0), './x/preview/clip.mp4');
});

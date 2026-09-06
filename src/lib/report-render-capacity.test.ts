import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ReportRenderCapacity,
  ReportRenderCapacityError,
} from './report-render-capacity';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('report render capacity', () => {
  it('limits global and per-user concurrent renders', async () => {
    const capacity = new ReportRenderCapacity(2);
    const first = deferred();
    const second = deferred();
    const firstRun = capacity.run('user-1', () => first.promise);
    const secondRun = capacity.run('user-2', () => second.promise);

    await assert.rejects(
      capacity.run('user-3', async () => {}),
      ReportRenderCapacityError
    );
    await assert.rejects(
      capacity.run('user-1', async () => {}),
      ReportRenderCapacityError
    );
    first.resolve();
    second.resolve();
    await Promise.all([firstRun, secondRun]);
  });

  it('releases capacity after success and failure', async () => {
    const capacity = new ReportRenderCapacity(1);
    await assert.rejects(
      capacity.run('user-1', async () => {
        throw new Error('render failed');
      }),
      /render failed/
    );
    assert.equal(await capacity.run('user-1', async () => 'ok'), 'ok');
  });
});

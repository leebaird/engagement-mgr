import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertFindingCapacityCounts,
  MAX_FINDINGS_PER_ENGAGEMENT,
  MAX_TOTAL_FINDINGS,
} from './finding-capacity';

describe('finding creation capacity', () => {
  it('accepts a batch exactly at both limits', () => {
    assert.doesNotThrow(() =>
      assertFindingCapacityCounts({
        totalFindings: MAX_TOTAL_FINDINGS - 500,
        engagementFindings: MAX_FINDINGS_PER_ENGAGEMENT - 500,
        newFindings: 500,
        hasEngagement: true,
      })
    );
  });

  it('rejects total and per-engagement overflow', () => {
    assert.throws(
      () =>
        assertFindingCapacityCounts({
          totalFindings: MAX_TOTAL_FINDINGS,
          engagementFindings: 0,
          newFindings: 1,
          hasEngagement: false,
        }),
      /application can contain at most/
    );
    assert.throws(
      () =>
        assertFindingCapacityCounts({
          totalFindings: 100,
          engagementFindings: MAX_FINDINGS_PER_ENGAGEMENT,
          newFindings: 1,
          hasEngagement: true,
        }),
      /engagement can contain at most/
    );
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  HIGHLIGHT_COLOR_OPTIONS,
  highlightColorCssName,
  isHighlightColor,
} from './highlight-color';

describe('highlight colours', () => {
  it('offers the six configured presets', () => {
    assert.deepEqual(
      HIGHLIGHT_COLOR_OPTIONS.map((option) => option.id),
      ['Pink', 'Blue', 'Teal', 'Green', 'Purple', 'Amber'],
    );
  });

  it('accepts only configured database values', () => {
    assert.equal(isHighlightColor('Teal'), true);
    assert.equal(isHighlightColor('teal'), false);
    assert.equal(isHighlightColor('#14b8a6'), false);
    assert.equal(isHighlightColor(undefined), false);
  });

  it('maps valid values to CSS names and safely falls back to pink', () => {
    assert.equal(highlightColorCssName('Purple'), 'purple');
    assert.equal(highlightColorCssName('not-a-colour'), 'pink');
  });
});

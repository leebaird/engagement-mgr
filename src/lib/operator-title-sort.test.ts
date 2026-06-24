import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sortOperatorIds, sortOperatorsByTitle } from './operator-title-sort';

describe('sortOperatorsByTitle', () => {
  it('sorts by title rank then name', () => {
    const operators = [
      { id: '1', name: 'Zoe', title: 'Intern' },
      { id: '2', name: 'Zara', title: 'Red Team Operator' },
      { id: '3', name: 'Amy', title: 'Red Team Operator' },
      { id: '4', name: 'Carl', title: 'Junior Red Team Operator' },
      { id: '5', name: 'Dan', title: 'Director' },
    ];

    assert.deepEqual(
      sortOperatorsByTitle(operators).map((operator) => operator.id),
      ['5', '3', '2', '4', '1']
    );
  });

  it('places intern after red team operator titles', () => {
    const operators = [
      { id: 'intern', name: 'Pat', title: 'Intern' },
      { id: 'rto', name: 'Quinn', title: 'Red Team Operator' },
      { id: 'junior', name: 'Riley', title: 'Junior Red Team Operator' },
    ];

    assert.deepEqual(
      sortOperatorsByTitle(operators).map((operator) => operator.title),
      ['Red Team Operator', 'Junior Red Team Operator', 'Intern']
    );
  });
});

describe('sortOperatorIds', () => {
  it('reorders selected ids by title rank', () => {
    const operators = [
      { id: 'intern', name: 'Pat', title: 'Intern' },
      { id: 'rto', name: 'Quinn', title: 'Red Team Operator' },
      { id: 'director', name: 'Sam', title: 'Director' },
    ];

    assert.deepEqual(
      sortOperatorIds(['intern', 'director', 'rto'], operators),
      ['director', 'rto', 'intern']
    );
  });
});
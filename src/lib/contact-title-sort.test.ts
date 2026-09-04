import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sortContactIds, sortContactsByTitle } from './contact-title-sort';

describe('sortContactsByTitle', () => {
  it('sorts by title rank then name', () => {
    const contacts = [
      { id: '1', name: 'Zoe', title: 'Senior Consultant' },
      { id: '2', name: 'Amy', title: 'Director' },
      { id: '3', name: 'Bob', title: 'CISO' },
      { id: '4', name: 'Carl', title: 'VP' },
      { id: '5', name: 'Dan', title: 'VP' },
    ];

    assert.deepEqual(
      sortContactsByTitle(contacts).map((contact) => contact.id),
      ['4', '5', '3', '2', '1']
    );
  });

  it('ranks VP and CISO combined titles at the top', () => {
    const contacts = [
      { id: 'director', name: 'John', title: 'Director' },
      { id: 'vp-ciso', name: 'Sean', title: 'VP and CISO' },
      { id: 'director-long', name: 'William', title: 'Director Corporate Services' },
    ];

    assert.deepEqual(
      sortContactsByTitle(contacts).map((contact) => contact.id),
      ['vp-ciso', 'director', 'director-long']
    );
  });

  it('matches common title aliases', () => {
    const contacts = [
      { id: 'consultant', name: 'Pat', title: 'Sr. Consultant' },
      { id: 'vp', name: 'Sam', title: 'Vice President' },
      { id: 'ciso', name: 'Riley', title: 'Chief Information Security Officer' },
    ];

    assert.deepEqual(
      sortContactsByTitle(contacts).map((contact) => contact.id),
      ['vp', 'ciso', 'consultant']
    );
  });
});

describe('sortContactIds', () => {
  it('reorders selected ids by title rank', () => {
    const contacts = [
      { id: 'consultant', name: 'Pat', title: 'Senior Consultant' },
      { id: 'vp', name: 'Sam', title: 'VP' },
      { id: 'director', name: 'Quinn', title: 'Director' },
    ];

    assert.deepEqual(
      sortContactIds(['consultant', 'director', 'vp'], contacts),
      ['vp', 'director', 'consultant']
    );
  });
});

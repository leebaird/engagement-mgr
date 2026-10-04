import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sortContactIds, sortContactsByClient, sortContactsByTitle } from './contact-title-sort';

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

  it('sorts VP and Director extended titles alphabetically', () => {
    const contacts = [
      { id: 'vp-corp', name: 'Amy', title: 'VP Corporate Services' },
      { id: 'vp-consult', name: 'Zoe', title: 'VP Consulting Delivery' },
      { id: 'dir-sec', name: 'Adam', title: 'Director Security Operations' },
      { id: 'dir-corp', name: 'Zoe', title: 'Director Corporate Services' },
      { id: 'dir-corp-2', name: 'Amy', title: 'Director Corporate Services' },
    ];

    assert.deepEqual(
      sortContactsByTitle(contacts).map((contact) => contact.id),
      ['vp-consult', 'vp-corp', 'dir-corp-2', 'dir-corp', 'dir-sec']
    );
    assert.deepEqual(
      sortContactsByTitle(contacts, 'desc').map((contact) => contact.id),
      ['dir-sec', 'dir-corp', 'dir-corp-2', 'vp-corp', 'vp-consult']
    );
  });

  it('sorts Lead extended titles alphabetically', () => {
    const contacts = [
      { id: 'threat', name: 'Amy', title: 'Threat Hunting Team Lead' },
      { id: 'red', name: 'Zoe', title: 'Red Team Lead' },
      { id: 'ctac', name: 'Nora', title: 'CTAC Team Lead' },
      { id: 'mss', name: 'Bob', title: 'MSS SOC Team Lead' },
      { id: 'director', name: 'Adam', title: 'Director Corporate Services' },
    ];

    assert.deepEqual(
      sortContactsByTitle(contacts).map((contact) => contact.id),
      ['director', 'ctac', 'mss', 'red', 'threat']
    );
  });

  it('ranks SVP before VP', () => {
    const contacts = [
      { id: 'vp', name: 'Sam', title: 'VP' },
      { id: 'svp', name: 'Zoe', title: 'SVP' },
      { id: 'senior', name: 'Amy', title: 'Senior Vice President' },
      { id: 'ciso', name: 'Riley', title: 'CISO' },
    ];

    assert.deepEqual(
      sortContactsByTitle(contacts).map((contact) => contact.id),
      ['senior', 'svp', 'vp', 'ciso']
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

describe('sortContactsByClient', () => {
  it('sorts by client, then by the title rules', () => {
    const contacts = [
      { id: 'b-lead', name: 'Amy', title: 'Threat Hunting Team Lead', client: { company: 'Bravo' } },
      { id: 'b-dir-sec', name: 'Zoe', title: 'Director Security Operations', client: { company: 'Bravo' } },
      { id: 'a-vp-corp', name: 'Amy', title: 'VP Corporate Services', client: { company: 'Acme' } },
      { id: 'a-vp-consult', name: 'Zoe', title: 'VP Consulting Delivery', client: { company: 'Acme' } },
      { id: 'b-dir-corp', name: 'Nora', title: 'Director Corporate Services', client: { company: 'Bravo' } },
    ];

    assert.deepEqual(
      sortContactsByClient(contacts).map((contact) => contact.id),
      ['a-vp-consult', 'a-vp-corp', 'b-dir-corp', 'b-dir-sec', 'b-lead']
    );
    assert.deepEqual(
      sortContactsByClient(contacts, 'desc').map((contact) => contact.id),
      ['b-dir-corp', 'b-dir-sec', 'b-lead', 'a-vp-consult', 'a-vp-corp']
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

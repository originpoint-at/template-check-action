import { describe, expect, test } from 'vitest';
import { checkJson } from './json-diff';
import { jsonChangeRules } from './rule';

describe('not allowed', () => {
  test.each([
    [
      'should not update template',
      { template: 'default' },
      { template: 'png_composite' },
      [{ key: 'template' }],
    ],
    [
      'should not delete template',
      { template: 'default' },
      {},
      [{ key: 'template' }],
    ],
    [
      'should not delete engine',
      { engine: '0.1.0' },
      {},
      [{ key: 'engine' }],
    ],
    [
      'should not update config.size',
      { config: { size: { width: 100, height: 100 } } },
      { config: { size: { width: 200, height: 200 } } },
      [{ key: 'config.size' }],
    ],
    [
      'should not delete items',
      { items: [{ token_id: '1', image_uri: 'item_01.png' }] },
      { items: [] },
      [{ key: 'items.0' }],
    ],
    [
      'should not update items',
      { items: [{ token_id: '1', image_uri: 'item_01.png' }] },
      { items: [{ token_id: '1', image_uri: 'item_02.png' }] },
      [{ key: 'items.0' }],
    ],
    [
      'should not delete suites',
      { suites: [{ name: 'suite-1' }] },
      { suites: [] },
      [{ key: 'suites.0' }],
    ],
    [
      'should not delete suites.backgrounds',
      { suites: [{ backgrounds: [{}] }] },
      { suites: [{ backgrounds: [] }] },
      [{ key: 'suites.0.backgrounds.0' }],
    ],
    [
      'should not delete suites.*.layers.*',
      { suites: [{ layers: [{}] }] },
      { suites: [{ layers: [] }] },
      [{ key: 'suites.0.layers.0' }],
    ],
    [
      'should not update suites.layers.*.items.*',
      { suites: [{ layers: [{ items: [{ token_id: '1' }] }] }] },
      { suites: [{ layers: [{ items: [{ token_id: '2' }] }] }] },
      [{ key: 'suites.0.layers.0.items.0' }],
    ],
  ])('%s', (_, base, head, matches) => {
    const errors = checkJson(jsonChangeRules, base, head);
    expect(errors.length).greaterThanOrEqual(matches.length);
    matches.forEach((match, index) => {
      expect(errors.at(index)).toMatchObject(match);
    });
  });
});

describe('allowed', () => {
  test.each([
    [
      'allow update engine',
      { engine: '0.1.0' },
      { engine: '0.2.0' },
      [],
    ],
    [
      'allow add config.*',
      { config: {} },
      { config: { newConfiguration: 'new-value' } },
      [],
    ],
    [
      'allow add items.*',
      { items: [] },
      { items: [{ token_id: '1', image_uri: 'item_01.png' }] },
      [],
    ],
    [
      'allow add suites.*',
      { suites: [] },
      { suites: [{ name: 'suite-1' }] },
      [],
    ],
    [
      'allow add suites.backgrounds.*',
      { suites: [{ backgrounds: [] }] },
      { suites: [{ backgrounds: [{}] }] },
      [],
    ],
    [
      'allow add suites.*.layers.*',
      { suites: [{ layers: [] }] },
      { suites: [{ layers: [{ name: 'layer-1' }] }] },
      [],
    ],
    [
      'allow add suites.*.layers.*.items.*',
      { suites: [{ layers: [{ items: [] }] }] },
      { suites: [{ layers: [{ items: [{}] }] }] },
      [],
    ],
  ])('%s', (_, base, head, matches) => {
    const errors = checkJson(jsonChangeRules, base, head);
    expect(errors.length).greaterThanOrEqual(matches.length);
    matches.forEach((match, index) => {
      expect(errors.at(index)).toMatchObject(match);
    });
  });
});

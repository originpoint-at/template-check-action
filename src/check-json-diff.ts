import { diff, IChange, Operation } from 'json-diff-ts';

interface CheckResult {
  key: string;
  message: string;
}

export function checkJson(base: any, head: any): CheckResult[] {
  const changes = diff(base, head);
  return check(jsonChangeRules, changes);
}

function check(rules: JsonChangeRule[], changes: IChange[], parentKey?: string) {
  const errors: CheckResult[] = [];
  for (const change of changes) {
    const fullKey = parentKey ? `${parentKey}.${change.key}` : change.key;
    for (const rule of rules) {
      const matched = rule.key instanceof RegExp ? rule.key.test(change.key) : rule.key === change.key;
      if (matched) {
        if (!rule.allowedOperations.includes(change.type)) {
          // TODO: include old value and new value in error message
          errors.push({
            key: fullKey,
            message: `operation ${change.type} for key ${fullKey} is not allowed`,
          });
        }
        if (rule.subRules && change.changes) {
          errors.push(...check(rule.subRules, change.changes, fullKey));
        }
      }
    }
  }
  return errors;
}

type JsonChangeRule = {
  key: string | RegExp;
  allowedOperations: Operation[];
  subRules?: JsonChangeRule[];
};

const jsonChangeRules: JsonChangeRule[] = [
  { key: 'template', allowedOperations: [Operation.UPDATE] },
  { key: 'engine', allowedOperations: [Operation.UPDATE] },
  {
    key: 'config',
    allowedOperations: [Operation.UPDATE],
    subRules: [
      { key: 'size', allowedOperations: [] },
      { key: 'mime', allowedOperations: [] },
      { key: 'option', allowedOperations: [] },
      { key: /^\w+$/, allowedOperations: [Operation.ADD] },
    ],
  },
  {
    key: 'items',
    allowedOperations: [Operation.UPDATE],
    subRules: [
      { key: /^\d+$/, allowedOperations: [Operation.ADD] },
    ],
  },
  {
    key: 'suites',
    allowedOperations: [Operation.UPDATE],
    subRules: [
      {
        key: /^\d+$/,
        allowedOperations: [Operation.ADD, Operation.UPDATE],
        subRules: [
          { key: 'name', allowedOperations: [] },
          {
            key: 'backgrounds',
            allowedOperations: [Operation.UPDATE],
            subRules: [
              {
                key: /^\d+$/,
                allowedOperations: [Operation.ADD],
              },
            ],
          },
          {
            key: 'layers',
            allowedOperations: [Operation.UPDATE],
            subRules: [
              {
                key: /^\d+$/,
                allowedOperations: [Operation.ADD, Operation.UPDATE],
                subRules: [
                  { key: 'name', allowedOperations: [] },
                  {
                    key: 'items',
                    allowedOperations: [Operation.UPDATE],
                    subRules: [
                      {
                        key: /^\d+$/,
                        allowedOperations: [Operation.ADD],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

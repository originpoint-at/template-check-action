import { diff, IChange } from 'json-diff-ts';
import { JsonChangeRule } from './rule';

interface CheckResult {
  key: string;
  message: string;
}

export function checkJson(rules: JsonChangeRule[], base: any, head: any): CheckResult[] {
  const changes = diff(base, head);
  return check(rules, changes);
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

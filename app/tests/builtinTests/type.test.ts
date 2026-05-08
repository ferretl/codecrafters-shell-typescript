import { test } from 'bun:test';
import * as O from 'fp-ts/Option';
import { type } from '../../builtins/type';
import { expectOutput } from '../helpers';

const builtinNames = ['echo', 'cd', 'pwd', 'exit', 'type'];

test.each(builtinNames)('type identifies %s as a builtin', (name: string) => {
  expectOutput(type([name])(), O.some(`${name} is a shell builtin`));
});
test('type should correctly identify path commands', () => {
  const result = type(['ls'])();
  expectOutput(result, O.some('ls is /bin/ls'));
});

test('type should return an error for unknown commands', () => {
  const result = type(['unknowncommand'])();
  expectOutput(result, O.some('unknowncommand not found'));
});

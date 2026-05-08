import { afterEach, test } from 'bun:test';
import { realpathSync } from 'node:fs';
import * as cd from '../../builtins/cd';
import { expectError, expectOutput } from '../helpers';
import * as O from 'fp-ts/Option';
import { expect } from 'bun:test';

const original = process.cwd();
afterEach(() => process.chdir(original));

test('cd should change the current working directory', () => {
  expectOutput(cd.cd(['/tmp'])(), O.none);
  expect(process.cwd()).toBe(realpathSync('/tmp'));
});

test('cd with no arguments should change to the home directory', () => {
  const home = process.env.HOME || process.env.USERPROFILE;
  expectOutput(cd.cd([])(), O.none);
  expect(process.cwd()).toBe(realpathSync(home!));
});

test('cd should return an error if the target directory does not exist', () => {
  expectError(
    cd.cd(['/nonexistent'])(),
    'cd: /nonexistent: No such file or directory'
  );
});

test('cd should return an error if the target is not a directory', () => {
  expectError(
    cd.cd(['/etc/hosts'])(),
    'cd: /etc/hosts: No such file or directory'
  );
});

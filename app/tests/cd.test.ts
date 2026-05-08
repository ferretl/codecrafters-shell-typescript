import { afterEach, expect, test } from 'bun:test';
import { realpathSync } from 'node:fs';
import * as cd from '../builtins/cd';

const original = process.cwd();
afterEach(() => process.chdir(original));

test('cd should change the current working directory', () => {
  cd.cd(['/tmp'])();
  expect(process.cwd()).toBe(realpathSync('/tmp'));
});

test('cd with no arguments should change to the home directory', () => {
  const home = process.env.HOME || process.env.USERPROFILE;
  cd.cd([])();
  expect(process.cwd()).toBe(realpathSync(home!));
});

test('cd should return an error if the target directory does not exist', () => {
  const result = cd.cd(['/nonexistent'])();
  expect(result._tag).toBe('Left');
  if (result._tag === 'Left') {
    expect(result.left.message).toBe(
      'cd: /nonexistent: No such file or directory'
    );
  }
});

test('cd should return an error if the target is not a directory', () => {
  const result = cd.cd(['/etc/hosts'])();
  expect(result._tag).toBe('Left');
  if (result._tag === 'Left') {
    expect(result.left.message).toBe(
      'cd: /etc/hosts: No such file or directory'
    );
  }
});

import { createInterface } from 'readline';
import { findBuiltin, findExecutable } from './builtins';
import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/Option';
import * as IOE from 'fp-ts/IOEither';
import * as E from 'fp-ts/Either';
import type { CommandResult } from './types/Result';
import type { CommandArgs, IOEvalResult } from './types/Command';
import { spawnSync } from 'child_process';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '$ '
});

rl.prompt();

const parseLine = (line: string): { name: string; args: CommandArgs } => {
  const parts = line.trim().split(/\s+/).filter(Boolean);
  const [name = '', ...args] = parts;
  return { name, args };
};

const handleResult = (result: CommandResult) => {
  switch (result._tag) {
    case 'Output':
      console.log(result.text);
      return;

    case 'Exit':
      rl.close();
      process.exit(isFinite(result.code) ? result.code : 0);
  }
};

export const runBuiltin = (name: string, args: CommandArgs): IOEvalResult =>
  pipe(
    findBuiltin(name),
    O.match(
      () => IOE.left({ message: `${name}: command not found` }),
      (command) => command.eval(args)
    )
  );

export const runExecutable = (
  dir: string,
  name: string,
  args: CommandArgs
): IOEvalResult =>
  pipe(
    IOE.tryCatch(
      () =>
        spawnSync(`${dir}/${name}`, [...args], {
          argv0: name,
          stdio: ['pipe', 'pipe', 'inherit']
        }).stdout,
      (): { message: string } => ({ message: `${name}: command failed` })
    ),
    IOE.map(
      (output): CommandResult => ({ _tag: 'Output', text: output.trimEnd() })
    )
  );

rl.on('line', (line) => {
  const { name, args } = parseLine(line);
  if (name === '') return rl.prompt();

  const evalResult = pipe(
    findExecutable(name),
    O.match(
      () => runBuiltin(name, args),
      (dir) => runExecutable(dir, name, args)
    )
  )();

  E.isLeft(evalResult)
    ? console.error(evalResult.left.message)
    : handleResult(evalResult.right);

  rl.prompt();
});

import { createInterface } from 'readline';
import { findBuiltin, findExecutable } from './builtins';
import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/Option';
import * as IOE from 'fp-ts/IOEither';
import * as E from 'fp-ts/Either';
import * as S from 'fp-ts/string';
import {
  type CommandArgs,
  type IOEvalResult,
  type CommandResult,
  ResultTag
} from './types';
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
    case ResultTag.Output:
      pipe(result.text, O.map(console.log));
      return;

    case ResultTag.Exit:
      rl.close();
      process.exit(result.code);
  }
};

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
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'inherit']
        }).stdout,
      (): { message: string } => ({ message: `${name}: command failed` })
    ),
    IOE.map(
      (output): CommandResult => ({
        _tag: ResultTag.Output,
        text: O.fromNullable(output.trimEnd())
      })
    )
  );

rl.on('line', (line) => {
  const { name, args } = parseLine(line);
  if (S.isEmpty(name)) return rl.prompt();

  const evalResult = pipe(
    findBuiltin(name),
    O.match(
      () =>
        pipe(
          findExecutable(name),
          O.match(
            () => IOE.left({ message: `${name}: command not found` }),
            (dir) => runExecutable(dir, name, args)
          )
        ),
      (command) => command.eval(args)
    )
  )();

  pipe(
    evalResult,
    E.match((err) => console.error(err.message), handleResult)
  );

  rl.prompt();
});

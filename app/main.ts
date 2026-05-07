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
  ResultTag,
  output
} from './types';
import * as fs from 'fs';
import { spawnSync } from 'child_process';
import parseLine from './parser';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '$ '
});

rl.prompt();

export const runExecutable = (
  dir: string,
  name: string,
  args: CommandArgs
): IOEvalResult =>
  pipe(
    IOE.tryCatch(
      () => {
        const result = spawnSync(`${dir}/${name}`, [...args], {
          argv0: name,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
        return { stdout: result.stdout, stderr: result.stderr };
      },
      (): { message: string } => ({ message: `${name}: command failed` })
    ),
    IOE.map(({ stdout, stderr }) =>
      output(
        pipe(
          stdout.trimEnd(),
          O.fromPredicate((s) => s.length > 0)
        ),
        pipe(
          stderr.trimEnd(),
          O.fromPredicate((s) => s.length > 0)
        )
      )
    )
  );

const handleStream = (
  redirect: O.Option<string>,
  text: O.Option<string>,
  fallback: (s: string) => void
) =>
  pipe(
    redirect,
    O.match(
      () => {
        pipe(text, O.map(fallback));
      },
      (path) => {
        fs.writeFileSync(
          path,
          pipe(
            text,
            O.getOrElse(() => '')
          ) + '\n'
        );
      }
    )
  );

rl.on('line', (line) => {
  const { name, args, stdoutRedirect, stderrRedirect } = parseLine(line);
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
    E.match(
      (err) => console.error(err.message),
      (result) => {
        switch (result._tag) {
          case ResultTag.Output:
            handleStream(stdoutRedirect, result.text, console.log);
            handleStream(stderrRedirect, result.errorText, console.error);
            break;
          case ResultTag.Exit:
            rl.close();
            process.exit(result.code);
        }
      }
    )
  );

  rl.prompt();
});

import { createInterface } from 'readline';
import { builtins, type CommandRegistry } from './builtins';
import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/Option';
import * as IOE from 'fp-ts/IOEither';
import * as E from 'fp-ts/Either';
import type { CommandResult } from './types/Result';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '$ '
});

const parseLine = (
  line: string
): { name: string; args: ReadonlyArray<string> } => {
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
      process.exit(typeof result.code === 'number' ? result.code : 0);
  }
};

export const runBuiltin =
  (registry: CommandRegistry) => (name: string, args: ReadonlyArray<string>) =>
    pipe(
      O.fromNullable(registry[name]),
      O.match(
        () => IOE.left({ message: `command not found: ${name}` }),
        (cmd) => cmd.eval(args)
      )
    );

rl.prompt(); // inital prompt

rl.on('line', (line) => {
  const { name, args } = parseLine(line);
  if (name === '') return rl.prompt();

  const program = runBuiltin(builtins)(name, args);
  const either = program();

  E.isLeft(either)
    ? console.error(either.left.message)
    : handleResult(either.right);

  rl.prompt();
});

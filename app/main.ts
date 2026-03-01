import { createInterface } from 'readline';
import { builtins, type CommandRegistry } from './builtins';
import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/Option';
import * as IOE from 'fp-ts/IOEither';
import * as E from 'fp-ts/Either';
import type { CommandResult } from './types/Result';
import type { CommandArgs, EvalResult } from './types/Command';

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
      process.exit(typeof result.code === 'number' ? result.code : 0);
  }
};

export const runBuiltin =
  (registry: CommandRegistry) => (name: string, args: CommandArgs) =>
    pipe(
      O.fromNullable(registry[name]),
      O.match(
        () => IOE.left({ message: `${name}: command not found` }),
        (command) => command.eval(args)
      )
    );

rl.on('line', (line) => {
  const { name, args } = parseLine(line);
  if (name === '') return rl.prompt();

  const evalResult = runBuiltin(builtins)(name, args)();

  E.isLeft(evalResult)
    ? console.error(evalResult.left.message)
    : handleResult(evalResult.right);

  rl.prompt();
});

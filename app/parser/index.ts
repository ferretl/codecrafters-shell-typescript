import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import { type CommandArgs } from '../types';
import { tokenize } from './tokenize';
import { reduceTokens, type Redirect } from './redirects';

export type { Redirect } from './redirects';

export type ParseError = { message: string };

type parsedContents = {
  name: string;
  args: CommandArgs;
  stdout: O.Option<Redirect>;
  stderr: O.Option<Redirect>;
};

export default (line: string): E.Either<ParseError, parsedContents> => {
  const [name = '', ...tokens] = tokenize(line.trim());
  const { args, pendingOperator, redirects } = reduceTokens(tokens);

  return pipe(
    pendingOperator,
    O.match(
      () =>
        E.right<ParseError, parsedContents>({
          name,
          args,
          stdout: redirects.stdout,
          stderr: redirects.stderr
        }),
      (operator) =>
        E.left<ParseError, parsedContents>({
          message: `syntax error: missing target for redirect '${operator}'`
        })
    )
  );
};

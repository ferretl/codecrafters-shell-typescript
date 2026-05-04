import {
  type Command,
  type CommandArgs,
  ResultTag,
  type IOEvalResult
} from '../types';
import * as IOE from 'fp-ts/IOEither';
import fs from 'fs';

export const cd: Command<CommandArgs> = {
  eval: (args): IOEvalResult => {
    const targetDir = args[0];
    return IOE.tryCatch(
      () => {
        process.chdir(targetDir.replaceAll('~', process.env.HOME || ''));
        return {
          _tag: ResultTag.Output,
          text: null
        };
      },
      (_) => {
        return {
          message: `cd: ${targetDir}: No such file or directory`
        };
      }
    );
  }
};

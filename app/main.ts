import { createInterface } from 'readline';

const KNOWN_COMMANDS = new Set(['echo', 'exit', 'type']);

const getType = (command: string) =>
  KNOWN_COMMANDS.has(command)
    ? console.log(`${command} is a shell builtin`)
    : console.log(`${command}: not found`);

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '$ '
});

// initial prompt
rl.prompt();

rl.on('line', (stdin) => {
  const [command, ...args] = stdin.split(' ');
  switch (command) {
    case 'exit':
      rl.close();
      process.exit(0);
      break;
    case 'echo':
      console.log(args.join(' '));
      break;
    case 'type':
      getType(args[0]);
      break;
    default:
      console.log(`${stdin}: command not found`);
      break;
  }
  rl.prompt();
});

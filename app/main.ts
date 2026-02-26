import { createInterface } from 'readline';

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
      break;
    case 'echo':
      console.log(args.join(' '));
      rl.prompt();
      break;
    default:
      console.log(`${stdin}: command not found`);
      rl.prompt();
      break;
  }
});

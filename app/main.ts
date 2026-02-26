import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '$ '
});

// initial promprt
rl.prompt();

rl.on('line', (stdin) => {
  const [command, ...props] = stdin.split(' ');
  switch (command) {
    case 'exit':
      rl.close();
      break;
    case 'echo':
      console.log(props.join(' '));
      rl.prompt();
      break;
    default:
      console.log(`${stdin}: command not found`);
      rl.prompt();
      break;
  }
});

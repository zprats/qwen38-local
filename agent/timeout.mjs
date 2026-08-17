import { spawn } from "node:child_process";

const [duration, command, ...args] = process.argv.slice(2);
const match = duration?.match(/^(\d+(?:\.\d+)?)(ms|s|m|h)?$/);

if (!match || !command) {
  process.exit(125);
}

const multipliers = {
  ms: 1,
  s: 1000,
  m: 60000,
  h: 3600000
};
const milliseconds = Number(match[1]) * multipliers[match[2] ?? "s"];
const child = spawn(command, args, { stdio: "inherit" });
let timedOut = false;

const timer = setTimeout(() => {
  timedOut = true;
  child.kill("SIGTERM");
  setTimeout(() => child.kill("SIGKILL"), 1000).unref();
}, milliseconds);

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", () => {
  clearTimeout(timer);
  process.exit(127);
});

child.on("exit", (code, signal) => {
  clearTimeout(timer);
  if (timedOut) {
    process.exit(124);
  }
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

---
name: auto-test
description: Keep the test suite green — run it after every code change and fix every reported failure. Use when code was written or edited, when tests fail, or before reporting a coding task done.
---

One tight loop around the test suite, closed by green.

## The loop

1. **Find the command in the environment.** The test command is defined by the project: `package.json` scripts, `Makefile`, CI config. Run the full suite — the change's blast radius is what you are measuring. Done when: one full-suite run of the current code, output in hand.

2. **Run after every code change.** A change whose suite has not run on it is an unfinished change. Small edit or large, the run comes before the next edit.

3. **Read the failure before fixing.** From the output take the failing test's name, the error, and the assertion diff; diagnose the root cause, then fix the code under test. Every fix traces to a reported error. When the assertion itself contradicts the spec, fix the test and say so — a weakened test is not green.

4. **Re-run.** One fix batch, one full run. While any test fails, back to step 3.

Done means the full suite passes with exit code 0. Anything else is still inside the loop.

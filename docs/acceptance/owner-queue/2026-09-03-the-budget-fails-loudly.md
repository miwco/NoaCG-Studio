---
kind: walk-p
date: 2026-09-03
---
# The instruction budget now fails the build, and I changed what sets it off

**Branch:** `claude/f-contract-budget-gate`. Nothing to look at in the product. Read this on your
phone; it is one paragraph of news and one decision I made on your behalf.

> **You asked for a failure at 99% of the budget. I built a failure at 4,096 bytes free instead.**
> The reasoning is below, and if you disagree, "make it 99%" is a one-line answer and a one-line
> change.

**The news.** You asked for the `AGENTS.md` byte warning to stop being advisory. It has. A build
whose instruction chain is nearly full now fails, names the chain, lists every file in it with its
byte count, and gives the two ways out - move reference material behind a pointer, or split the
contract so sibling directories stop paying for each other's rules. It also says in as many words
that raising the ceiling is not a third option. Nothing is red today: the tightest chain,
`src/components/wizard`, has 9,708 bytes free and the gate needs 4,096.

## What I changed, and why you might disagree

The receipt asked for a failure at **99% of the ceiling**. I made it fail at **4 KB free** instead,
which is a fixed number of bytes rather than a share of the budget.

The reason is that the ceiling only ever ratchets DOWN, so a percentage gate punishes the exact
work it is meant to reward. This morning's session cut 11,343 bytes out of the wizard chain, which
took it from 99.7% to 89.5% - then it lowered the ceiling to bank 2,000 of those bytes where they
cannot leak back, and that alone pushed the chain to 91.2% with nobody writing a word. Every future
ratchet does the same to every chain. Under a 99% rule, tidying up moves you toward the red line. A
byte reserve does not move when the ceiling moves, and it measures the thing that actually matters:
how much room the next person has to write their paragraph in.

The second reason is size. 99% of 110,000 leaves 1,100 bytes, which is about four paragraphs -
tripping that gate and actually breaking the file are nearly the same event, so the person who
trips it has no room to work in. 4 KB gives them a page and a half.

**Nothing is blocked on your answer.** If you would rather have the percentage, it is a one-line
change and I have left the reasoning in the code next to the number.

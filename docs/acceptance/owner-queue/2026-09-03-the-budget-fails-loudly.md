---
kind: walk-p
date: 2026-09-03
---
# The instruction budget now fails the build instead of warning about it

**Branch:** `claude/f-contract-budget-gate`. Nothing to look at in the product - this is one
paragraph of news you can read on your phone.

**What changed.** The `AGENTS.md` byte warning was advisory and is now a gate. A build whose
instruction chain is nearly full fails, names the chain, lists every file in it with its byte
count, and gives the two ways out: move reference material behind a pointer, or split the contract
so sibling directories stop paying for each other's rules. It says in as many words that raising
the ceiling is not a third option.

**Where it trips.** At 4,096 bytes free, a fixed reserve rather than a share of the budget. The
ceiling only ever ratchets DOWN, so a percentage would tighten on exactly the work it should
reward - the session that cut 11,343 bytes out of the wizard chain then lowered the ceiling to
bank some of them, which pushed that chain's percentage UP with nobody writing a word. A byte
reserve does not move when the ceiling moves, and it measures the thing that matters: how much
room the next person has to write their paragraph in. 4 KB is about a page and a half.

**Nothing is red today.** The tightest chain, `src/components/wizard`, has 9,708 bytes free.

**What it does not do.** It cannot tell a chain that is full of rules from one that is full of
prose - it only says the room is gone. Deciding what to cut is still a person's job, or a
session's.

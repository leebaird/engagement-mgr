# AGENTS.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions in AI-ASSISTANT.md as needed.

**Trade-off:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface trade-offs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so.
- If something is unclear, stop. Name what's confusing. Ask.
- For auth, data access, file I/O, or admin features: consider OWASP Top 10 risks up front. See `AI-ASSISTANT.md` → **Security by Design (OWASP Top 10)**.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that was not requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is over complicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that are not broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Remove file-level orphans your change supersedes (empty dirs, replaced scripts, deleted routes). See `AI-ASSISTANT.md` → **Orphaned & Leftover Files**.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Security-Conscious Changes

This project holds confidential engagement data. Security is part of the task, not a separate pass.

- Enforce authorization in server-side code (actions, routes, layouts) — never rely on hidden UI alone.
- Validate and sanitise user input on the server; treat client-side checks as convenience only.
- Do not run destructive operations (database reset, restore, wipe) against real environments without explicit user approval.
- When unsure whether a change introduces an OWASP risk, say so before implementing.

Project-specific requirements: `AI-ASSISTANT.md` → **Security by Design (OWASP Top 10)**.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to over complication, and clarifying questions come before implementation rather than after mistakes.


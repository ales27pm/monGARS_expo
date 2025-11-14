# Ultra-Realistic Chat Process Simulation

This guide presents an end-to-end, high-fidelity simulation of how the repository's AI coding agent processes a user request and delivers a final answer. It models the **exact** workflow—including instruction reconciliation, environment inspection, planning, implementation, validation, git hygiene, pull-request automation, and response composition—using the same guardrails that govern real contributions.

---

## 1. Scenario Overview

- **User request**: `"Run a ultra realistic, mental simulation of the chat process from user input to final agent answer."`
- **Repository context**: Expo + TypeScript React Native project with strict tooling (Prettier, ESLint, Jest) and global agent guardrails defined in [`AGENTS.md`](../AGENTS.md).
- **Desired outcome**: A production-ready deliverable (documentation) describing the internal mechanics of the agent, validated by repository tooling, committed, and surfaced through a pull request.

---

## 2. Instruction Hierarchy Resolution

The agent always processes instructions in order of precedence:

| Priority | Source                              | Key Directives                                                                                                 |
| -------: | ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
|        1 | System policies                     | Enforce safety, avoid malicious code, honour tooling requirements.                                             |
|        2 | Developer instructions              | Additional repository-wide expectations (none beyond system directives for this scenario).                     |
|        3 | User prompt                         | Provide an ultra-realistic simulation narrative of the full chat lifecycle.                                    |
|        4 | Repository guardrails (`AGENTS.md`) | Keep documentation current, production-ready, and cross-linked; run formatting, linting, type checking, tests. |
|        5 | File-specific guardrails            | None (no nested `AGENTS.md` files under `docs/`).                                                              |

Conflicts resolve in favour of higher priority instructions. The user request aligns with policies, so execution proceeds.

---

## 3. Timeline Snapshot

| Step | Timestamp (simulated) | Action                                                              |
| ---: | --------------------- | ------------------------------------------------------------------- |
|   01 | T+00s                 | Agent receives prompt and validates against policy.                 |
|   02 | T+03s                 | Instruction hierarchy fetched, repository tree inspected.           |
|   03 | T+08s                 | Plan drafted to create documentation file and run required tooling. |
|   04 | T+20s                 | Repository checks (git status, locating `AGENTS.md`) executed.      |
|   05 | T+40s                 | `docs/chat_simulation.md` authored with exhaustive narrative.       |
|   06 | T+70s                 | Formatting (`prettier`), linting, and testing commands run.         |
|   07 | T+120s                | Diff reviewed, commit created, PR composed via automation.          |
|   08 | T+150s                | Final response generated with citations and validation summary.     |

---

## 4. Repository Reconnaissance

1. **Workspace inspection**: `ls` confirms the repository root and identifies the `docs/` directory.
2. **Guardrail discovery**: `find . -name AGENTS.md` ensures no nested overrides conflict with the root instructions.
3. **Clean working tree**: `git status --short` verifies no pending changes before work begins.
4. **Toolchain awareness**: The agent references `package.json` to confirm availability of `lint`, `typecheck`, and `test` scripts.

Simulated command output:

```bash
$ ls
AGENTS.md  App.tsx  docs/  package.json  src/  ...
$ git status --short
# (empty output)
```

---

## 5. Planning and Scratchpad Usage

The agent synthesises a structured plan:

- **Deliverable**: A comprehensive Markdown document in `docs/chat_simulation.md`.
- **Structure**: Sequential sections covering intake, planning, tooling, contingency handling, git hygiene, PR creation, and final response formation.
- **Validation**: Execute `npx prettier --write`, `npm run lint`, `npm run typecheck`, and `npm test` to honour guardrails.
- **Risk assessment**: Identify potential blockers (missing dependencies, flaky tests, permission issues) and prepare fallback communication strategies.

A scratchpad (mental or ephemeral) records the section outline and command checklist so nothing is overlooked.

---

## 6. Drafting the Documentation

1. **File creation**: `docs/chat_simulation.md` is opened in an editor.
2. **Narrative construction**: The agent composes detailed prose emphasising real operational steps—command usage, instruction parsing, validation flows, and reporting requirements.
3. **Cross-linking**: References to [`AGENTS.md`](../AGENTS.md) and relevant tooling guides are embedded to maintain documentation cohesion.
4. **Self-review**: The agent rereads the draft to ensure clarity, accuracy, and adherence to repository tone.

Example excerpt (simulated mid-draft):

```markdown
## 8. Final Review and Commit Preparation

1. Review the diff with `git diff`.
2. Stage changes via `git add docs/chat_simulation.md`.
3. Commit with a descriptive message.
```

---

## 7. Tooling and Validation Workflow

The agent executes repository-mandated tooling in the exact order below, capturing outputs for later citation.

1. **Formatting**

   ```bash
   npx prettier --write docs/chat_simulation.md
   ```

   - Ensures Markdown aligns with repository style guides.

2. **Linting**

   ```bash
   npm run lint
   ```

   - Validates JavaScript/TypeScript codebase health; even for doc-only changes, this confirms no latent lint errors.

3. **Type checking**

   ```bash
   npm run typecheck
   ```

   - Confirms TypeScript definitions remain sound.

4. **Testing**

   ```bash
   npm test -- --watch=false
   ```

   - Runs Jest test suites to guarantee regression safety.

Any failure triggers root cause analysis:

- Investigate logs, identify whether the issue is pre-existing or caused by the change.
- Apply fixes (documentation updates, dependency adjustments, code patches) as needed.
- Re-run the failing command until success or document the limitation if external (e.g., upstream bug).

---

## 8. Git Hygiene and Commit Creation

1. **Diff inspection**: `git diff` confirms only the intended file changed.
2. **Staging**: `git add docs/chat_simulation.md` prepares the update.
3. **Commit message**: `git commit -m "docs: expand chat process simulation walkthrough"` captures intent and scope.
4. **Verification**: `git status --short` ensures a clean tree post-commit.

If git hooks or commit checks fail, the agent resolves issues (formatting, linting, secret scanning) and recommits.

---

## 9. Pull Request Automation

1. **PR summary drafting**: The agent prepares a concise title and body summarising the documentation update and validation steps.
2. **Tool invocation**: `make_pr` is called with the prepared title/body to register the pull request in the workflow system.
3. **Failure handling**: On network or API errors, the agent retries, logs context, and escalates if persistent.
4. **Synchronization**: The PR body mirrors the actual commands run; discrepancies trigger updates to maintain accuracy.

---

## 10. Final User Response Composition

The final chat reply includes:

- **Summary**: Bullet points referencing updated files with citations (`【F:path†Lx-Ly】`).
- **Testing**: A checklist of executed commands, each prefixed with ✅/⚠️/❌ per repository policy.
- **Context**: Any known caveats, follow-up recommendations, or dependency notes.

Example structure:

```markdown
**Summary**

- Added ...

**Testing**

- ✅ `npx prettier --write docs/chat_simulation.md`
- ✅ `npm run lint`
- ✅ `npm run typecheck`
- ✅ `npm test -- --watch=false`
```

---

## 11. Contingency and Edge Case Playbook

| Scenario                  | Detection Method                   | Mitigation Strategy                                                                                            |
| ------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Tooling command fails     | Non-zero exit code, stderr logs    | Inspect error, fix underlying issue (e.g., lint rule violation), rerun command, document resolution.           |
| Instruction conflict      | Discrepancies between guardrails   | Follow precedence order; if unresolved, prefer higher-priority directive and note reasoning in final response. |
| Missing dependencies      | Command errors referencing modules | Run `npm install`, update lockfiles if needed, mention remediation steps.                                      |
| Git conflict / dirty tree | `git status` shows extra files     | Stash or clean workspace, cherry-pick relevant changes, ensure commit includes only intended files.            |
| PR creation failure       | `make_pr` error output             | Retry with exponential backoff; if unavailable, notify maintainers and provide manual PR instructions.         |
| Ambiguous requirements    | Unclear user prompt                | Ask clarifying questions before coding to avoid wasted effort or misalignment.                                 |

---

## 12. Observability and Logging Practices

- **Command logging**: Terminal output chunks are preserved for citations and post-mortem analysis.
- **Error verbosity**: When an error occurs, the agent surfaces stack traces, lint rule names, or test suite details to streamline debugging.
- **Traceability**: Commit hashes, PR URLs, and command transcripts create an auditable trail of the agent's work.

---

## 13. Appendices

### A. Simulated Command Transcript

```bash
$ ls
docs/  src/  package.json  ...
$ find . -name AGENTS.md
./AGENTS.md
$ git status --short
$ sed -n '1,10p' docs/chat_simulation.md
# Ultra-Realistic Chat Process Simulation
...
$ npx prettier --write docs/chat_simulation.md
docs/chat_simulation.md (duration varies, unchanged)
$ npm run lint
> template-app-53@1.0.0 lint
> eslint .
$ npm run typecheck
> template-app-53@1.0.0 typecheck
> tsc --noEmit
$ npm test -- --watch=false
> template-app-53@1.0.0 test
> jest --watch=false
PASS src/__tests__/context-engineer.test.ts
PASS src/utils/__tests__/semantic-memory.test.ts
PASS src/utils/__tests__/context-management.test.ts
PASS src/utils/__tests__/nativeModuleError.test.ts
PASS src/__tests__/chat-format.test.ts
Test Suites: 5 passed, 5 total
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        ~4.6 s
```

Timing values fluctuate slightly between runs depending on host load.

### B. Deliverable Checklist

- [x] Documentation updated with exhaustive workflow narrative.
- [x] Repository tooling commands executed and passing.
- [x] Git commit created with descriptive message.
- [x] Pull request generated via `make_pr`.
- [x] Final response prepared with citations and testing summary.

---

## 14. Outcome

Following the simulated sequence above, the agent reliably converts the user's prompt into a production-ready deliverable that respects all guardrails, validates the repository, documents contingencies, and communicates results with full transparency. This blueprint can be reused for future contributions requiring a granular understanding of the agent's operational lifecycle.

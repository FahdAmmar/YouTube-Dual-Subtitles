# Workflow and Delivery Rules

These rules come from the maintainer and override anything in the copied skills (for example their "commit" steps).

## Git

- Run **no git command** unless the user explicitly asks for it in the conversation. That includes read-only ones
  (`git status`, `git diff`, `git log`). Without git, work from the file paths you are given.
- `.claude/hooks/validate-bash.mjs` enforces this. When the user does ask for a git operation, they authorise it by
  setting `CLAUDE_ALLOW_GIT=1` (for example in the `env` block of `.claude/settings.local.json`); tell them if the
  hook blocks you. Force-push, `reset --hard` and `--no-verify` stay blocked even then.

## Markdown files

- No `.md` file may exceed **200 lines**. This applies to every Markdown file in the project: README, `docs/`,
  `CLAUDE.md`, rules, agents, skills and their `references/`.
- When a file grows past the limit, split it at a heading boundary and link the parts. For a skill, keep `SKILL.md`
  short and move the rest to `references/`. Never trim content just to fit.
- `node .claude/hooks/check-md-length.mjs --all` checks the whole project; a PostToolUse hook checks each `.md`
  file right after it is written.
- Files written for the AI assistant (`.claude/`, `CLAUDE.md`) are in English.

## README.md

The project `README.md` has exactly this shape, in this order, and stays under 200 lines:

1. Project title (with a one-line tagline).
2. Badges and icons for the technologies and libraries used.
3. Images of the project.
4. An explanation of the project.
5. Future additions that could be built.

Details that do not fit belong in `docs/`, linked from section 4. Use only real screenshots (the files in
`docs/images/`); never fabricate an image, a metric or a feature. A badge's version must match `package.json`.

## Delivering a ZIP

Before handing over any project ZIP, run the `verify` skill in `full` mode and confirm:

1. `npm test` passes **completely** (every file, not a subset), plus `typecheck`, `lint` and `build`.
2. The real-browser checks (`npm run e2e`, `npm run e2e:screens`) pass.
3. `node .claude/hooks/check-md-length.mjs --all` passes and the Markdown links resolve.

If any gate fails or cannot run, say so before delivering and do not call the project ready to upload. Build the ZIP
from the project folder without `node_modules`, `dist`, `.git`, `.env*` or caches, then check that it opens, lists the
expected files and contains no secrets.

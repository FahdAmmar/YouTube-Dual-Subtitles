# Third-Party Skills

Nine skills in `.claude/skills/` are copies of open-source skills (MIT). To keep every Markdown file under 200 lines,
the longer ones are split at heading boundaries into `SKILL.md` plus files in `references/`, linked from a
"Continued in other files" list at the end of `SKILL.md`; the upstream wording is unchanged. Their licence notices are
reproduced below, as the licence requires. All other files in `.claude/` are written for this project.

| Skill folder | Upstream | Commit | Licence |
|---|---|---|---|
| `test-driven-development` | https://github.com/addyosmani/agent-skills | `aeac41d4d005999432bb7312f7ff06383a91d59d` (2026-10-13) | MIT, Addy Osmani |
| `debugging-and-error-recovery` | same | same | MIT, Addy Osmani |
| `frontend-ui-engineering` | same | same | MIT, Addy Osmani |
| `code-review-and-quality` | same | same | MIT, Addy Osmani |
| `performance-optimization` | same | same | MIT, Addy Osmani |
| `security-and-hardening` | same | same | MIT, Addy Osmani |
| `incremental-implementation` | same | same | MIT, Addy Osmani |
| `code-simplification` | same | same | MIT, Addy Osmani |
| `verification-before-completion` | https://github.com/obra/superpowers | `2ce8aa15d05bd57213e6f746f953aafb7ded7a8b` (2026-10-21) | MIT, Jesse Vincent |

To update a skill, replace its folder with the upstream version, split it again under the 200-line limit, and
update the commit above. Do not edit these copies in place: project-specific guidance belongs in `.claude/rules/` or in the project skills (`fix-issue`,
`new-feature`, `review`, `verify`), which reference them.

---

## Licence: addyosmani/agent-skills

MIT License

Copyright (c) 2025 Addy Osmani

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Licence: obra/superpowers

MIT License

Copyright (c) 2025 Jesse Vincent

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

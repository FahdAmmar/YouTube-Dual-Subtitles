---
name: subtitle-parsing
description: Reference for SRT/VTT parsing, bilingual-file splitting, and sync-offset math in this codebase. Load when touching subtitle upload, parsing, sync, or export.
---

# Subtitle Parsing & Sync

- Parsers live in `src/lib/subtitles/`. Both SRT and VTT are normalized into one
  internal cue shape before anything else in the app touches them.
- Cue lookup during playback is `O(log n)` binary search, not linear scan — keep it
  that way if you touch the lookup function.
- Bilingual single-file upload: each cue is split into two tracks by per-line
  writing-direction detection (RTL → source, LTR → translation), falling back to
  position (line 1 / line 2) when both languages share direction. If you change
  this heuristic, add a fixture covering same-direction language pairs.
- Sync offset (±15s) is applied at read-time when resolving the active cue, not by
  mutating stored cue timestamps — keeps the original file data recoverable/exportable.
- `originalIndex` on each cue must be preserved through search/filtering so segment
  numbers (`SEG_047`) stay stable regardless of what's currently displayed.
- Export (SRT, source/translation/merged) re-serializes from the same normalized
  cue shape used for playback — don't build a separate export-only parser.

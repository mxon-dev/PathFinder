# Shared AI Instructions

`.ai/` is the single source of truth for AI-facing project instructions.
Tool-specific folders such as `.cursor/` should only expose these files through links.

## Structure

```txt
.ai/
├── rules/
│   └── project.md
└── skills/
    ├── branch-name/
    │   └── SKILL.md
    ├── commit-message/
    │   └── SKILL.md
    ├── gemini-docent/
    │   └── SKILL.md
    ├── kakao-api/
    │   ├── SKILL.md
    │   └── references/
    └── public-data-api/
        ├── SKILL.md
        └── references/
```

## Project Skills

| Skill | Use |
|---|---|
| `.ai/skills/kakao-api/SKILL.md` | Kakao Maps SDK, Kakao Local REST API, map components, Kakao Map URLs |
| `.ai/skills/public-data-api/SKILL.md` | Public data collection, normalization, static JSON generation, recommendation filtering |
| `.ai/skills/gemini-docent/SKILL.md` | Gemini AI docent prompts, route handlers, hooks, response types |
| `.ai/skills/branch-name/SKILL.md` | Git branch naming |
| `.ai/skills/commit-message/SKILL.md` | Commit message writing |

## Cursor Adapter

Cursor reads rules from `.cursor/rules/*.mdc` and skills from `.cursor/skills`.
Keep `.ai/` as the source and expose it to Cursor with links:

```powershell
Push-Location .cursor\rules
New-Item -ItemType SymbolicLink -Path project.mdc -Target ..\..\.ai\rules\project.md
Pop-Location

Push-Location .cursor
New-Item -ItemType SymbolicLink -Path skills -Target ..\.ai\skills
Pop-Location
```

On Windows, file symlinks may require Administrator privileges or Developer Mode.
If symlink creation is blocked, use this local fallback:

```powershell
Push-Location .cursor\rules
New-Item -ItemType HardLink -Path project.mdc -Target ..\..\.ai\rules\project.md
Pop-Location

Push-Location .cursor
New-Item -ItemType Junction -Path skills -Target ..\.ai\skills
Pop-Location
```

The fallback still gives Cursor and `.ai/` the same local contents, but it is Windows-specific.

## Claude Code Adapter

Claude Code reads `CLAUDE.md` at session start, and scans `.claude/rules/` and `.claude/skills/` automatically.

- `.claude/rules/` → Junction → `.ai/rules/` (rules load at session start)
- `.claude/skills/` → Junction → `.ai/skills/` (skills load on demand)
- `CLAUDE.md` imports `AGENTS.md` with `@AGENTS.md` and adds a brief Claude-specific note

Set up with:

```powershell
New-Item -ItemType Directory -Path ".claude" -Force
New-Item -ItemType Junction -Path ".claude\rules"  -Target (Resolve-Path ".ai\rules").Path
New-Item -ItemType Junction -Path ".claude\skills" -Target (Resolve-Path ".ai\skills").Path
```

## Adding A New Rule

1. Create `.ai/rules/{rule-name}.md`.
2. `.claude/rules/` picks it up automatically via junction.
3. Add a Cursor adapter at `.cursor/rules/{rule-name}.mdc` (symlink or hard link).
4. Update `AGENTS.md` if the new rule changes project-wide AI behavior.

## Adding A New Skill

1. Create `.ai/skills/{skill-name}/SKILL.md`.
2. `.claude/skills/` and `.cursor/skills/` pick it up automatically via junction/link.
3. Add the skill entry to the **Skill Files** and **Task Decision Guide** sections in `AGENTS.md`.
4. Update this README if the skill changes the shared instruction structure.

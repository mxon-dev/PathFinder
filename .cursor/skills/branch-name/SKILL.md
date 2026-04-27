# Branch Name Skill

## Purpose
Use this skill when creating, reviewing, or renaming Git branch names for the PathFinder project.
Keep branch names consistent, readable, and easy to understand in Pull Requests.

## Format
Use this format:

```txt
<type>/<short-description>
```

Examples:
```txt
feat/gemini-docent-api
fix/kakao-map-polyline-render
refactor/public-route-parser
```

## Language
- Use English by default.
- Do not use Korean in branch names.
- Use lowercase letters only.
- Use hyphens between words.
- Do not use spaces, underscores, or camelCase.

## Naming Rules
Branch names must:
- start with a valid type prefix
- describe one main purpose
- be short but specific
- use lowercase and hyphens
- avoid vague words like `test`, `update`, `work`, `temp`
- avoid special characters except `/` and `-`

## Allowed Types
```txt
feat      # new feature
fix       # bug fix
refactor  # code restructuring
docs      # documentation only
chore     # maintenance
style     # formatting only
test      # tests
perf      # performance improvement
build     # build or config
ci        # CI/CD
hotfix    # urgent production fix
revert    # revert previous change
```

## Recommended Branch Names
```txt
feat/gemini-docent-api
feat/gemini-docent-ui
feat/nearby-walking-routes
feat/kakao-map-polyline
feat/current-location-search
fix/gemini-json-parse-error
fix/kakao-map-script-load
fix/public-api-coordinate-normalize
refactor/gemini-prompt-builder
refactor/public-route-parser
docs/project-rules
chore/add-env-example
test/docent-prompt-builder
perf/reduce-map-polyline-redraw
```

## Issue Number Rule
If the project uses issue numbers, append the issue number at the end.

```txt
<type>/<short-description>-<issue-number>
```

Examples:
```txt
feat/gemini-docent-api-12
fix/kakao-map-polyline-render-18
```

Do not put the issue number first unless the team has agreed to it.

## Length Rule
Keep branch names short.

Good:
```txt
feat/gemini-docent-api
fix/empty-route-coordinates
```

Bad:
```txt
feat/add-gemini-docent-api-that-generates-ai-walking-guide-response
```

## Matching Commit Rule
The branch type should usually match the main commit type.

```txt
branch: feat/gemini-docent-api
commit: feat(docent): add Gemini guide generation API
```

```txt
branch: fix/kakao-map-polyline-render
commit: fix(map): prevent polyline render with empty coordinates
```

## Multi-Purpose Rule
Do not create one branch for unrelated work.

Bad:
```txt
feat/gemini-api-and-header-redesign
```

Good:
```txt
feat/gemini-docent-api
feat/header-navigation-layout
```

## Cursor Usage Rule
When asked to create a branch name:
1. Check the purpose of the work.
2. Choose the correct type prefix.
3. Summarize the work in 2 to 5 words.
4. Use lowercase and hyphens.
5. Avoid vague words.
6. Suggest multiple branches if work is unrelated.

## Output Format
One branch:
```txt
type/short-description
```

Git command:
```bash
git switch -c type/short-description
```

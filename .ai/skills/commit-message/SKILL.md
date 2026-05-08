commit-message-SKILL.md# Commit Message Skill

## Purpose
Use this skill when creating, reviewing, or rewriting Git commit messages for the PathFinder project.
Keep commit history readable, searchable, and consistent.

## Format
Use Conventional Commits.

```txt
<type>(<scope>): <summary>
```

Examples:
```txt
feat(docent): add Gemini guide generation API
fix(map): prevent polyline render with empty coordinates
refactor(routes): split public route parser
```

## Language
- Use English by default.
- Do not use Korean in the commit title.
- Korean is allowed in the body only when business context is needed.
- Keep the title short, clear, and action-based.

## Title Rules
- Start with a valid type.
- Use lowercase type and scope.
- Keep under 72 characters when possible.
- Use present tense.
- Describe what changed.
- Do not end with a period.
- Avoid vague summaries like `update code`, `fix bug`, `modify api`.

## Allowed Types
```txt
feat      # new feature
fix       # bug fix
refactor  # code change without behavior change
docs      # documentation only
style     # formatting only
test      # tests
chore     # maintenance
perf      # performance improvement
build     # build or config
ci        # CI/CD
revert    # revert previous commit
```

## Recommended Scopes
Use the most specific scope possible.

```txt
app, pages, widgets, features, docent, routes, map, public-api,
kakao, gemini, entities, shared, api, query, store, ui, config,
cursor, deps
```

Good:
```txt
feat(docent): add Gemini route handler
fix(map): clear previous polyline
refactor(public-api): extract walking route mapper
```

Avoid:
```txt
feat(features): add Gemini route handler
fix(ui): clear previous polyline
```

## Body Rules
Add a body only when the title is not enough.
Use the body to explain why, key details, side effects, or issue context.

```txt
feat(docent): add structured Gemini response schema

Use a fixed JSON schema so the UI can safely render AI guide fields.
```

## Breaking Changes
For breaking changes, add `!` and a `BREAKING CHANGE:` footer.

```txt
feat(docent)!: replace free text response with JSON schema

BREAKING CHANGE: The docent API now returns DocentGuideResponse.
```

## Multi-Change Rule
Prefer one logical change per commit.
Split unrelated changes into separate commits.

Bad:
```txt
feat(docent): add Gemini API and change header design
```

Good:
```txt
feat(docent): add Gemini guide generation flow
feat(header): update navigation layout
```

## Cursor Usage Rule
When asked to write a commit message:
1. Inspect the changed files or diff.
2. Identify the main purpose.
3. Choose one valid type.
4. Choose the most specific scope.
5. Write a concise title.
6. Add a body only if needed.
7. Suggest multiple commits if changes are unrelated.

## Output Format
Simple:
```txt
type(scope): summary
```

Detailed:
```txt
type(scope): summary

Body explaining reason and key details.
```

Multiple:
```txt
1. type(scope): summary
2. type(scope): summary
```

## PathFinder Examples
```txt
feat(routes): add nearby walking path query hook
feat(docent): add Gemini guide generation route handler
feat(map): render selected route on Kakao map
fix(docent): validate empty route description
fix(map): prevent polyline redraw on same route
refactor(routes): split API client and response mapper
docs(cursor): add project and Gemini skill instructions
chore(env): add Gemini and Kakao environment examples
```

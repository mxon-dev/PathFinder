# AI Agent Skill 파일

## 개요

이 디렉토리에는 PathFinder 프로젝트의 **AI Agent Skill** 파일이 있다.

Skill 파일은 AI 코딩 도구(Cursor, Claude Code 등)가 특정 작업 영역에서 따라야 할 규칙, 구현 패턴, 금지사항, 코드 템플릿을 명시한 지침 문서다. 특정 코드 영역 작업 전에 AI 에이전트가 이 파일을 읽고 context를 갖추도록 설계되어 있다.

## Skill 목록

| 파일 | 적용 영역 |
|---|---|
| `kakao-api.md` | Kakao Maps SDK, Kakao Local REST API, 지도 컴포넌트, Route Handler |
| `public-data-api.md` | 공공데이터 수집·정규화, 정적 JSON 생성, 추천 필터링 |

## AI 도구가 Skill을 활용하는 방식

Cursor와 Claude Code는 모두 프로젝트 루트의 `AGENTS.md`를 자동으로 읽는다.

`AGENTS.md`는 각 작업 영역별로 어떤 Skill 파일을 읽어야 하는지 안내한다. AI 도구는 사용자의 작업 요청을 분석해 해당 skill 파일을 먼저 읽고 작업을 수행한다.

```
사용자 작업 요청
       ↓
AGENTS.md 읽기 (자동)
       ↓
관련 Skill 파일 읽기 (docs/ai-skills/*.md)
       ↓
Skill 규칙에 따라 작업 수행
```

## 새 Skill 추가하기

1. `docs/ai-skills/` 에 `{skill-name}.md` 파일을 추가한다.
2. 파일 상단에 frontmatter를 작성한다.
   ```yaml
   ---
   name: skill-name
   description: 이 skill이 다루는 영역과 목적을 한 줄로 설명
   ---
   ```
3. 본문에 다음 내용을 포함한다.
   - Skill의 목적
   - 핵심 원칙 및 금지사항
   - 환경 변수와 설정
   - 프로젝트 내 사용 범위
   - 코드 템플릿
   - AI Agent 작업 규칙
4. `AGENTS.md`의 Skill 목록과 작업 판단 기준 표를 갱신한다.

## 기존 Skill 수정 시 주의사항

- 본문의 **코드 템플릿과 타입 정의는 실제 코드와 항상 동기화**해야 한다. 코드가 바뀌면 skill도 같이 갱신한다.
- 규칙을 추가하거나 삭제할 때는 팀원과 공유한다. Skill은 팀 전체가 AI에게 주는 공통 지침이기 때문이다.
- 금지사항을 제거하기 전에 그 이유가 여전히 유효한지 검토한다.

# PathFinder: AI Walking Docent Service

공공데이터와 AI 기술을 결합하여 사용자에게 최적화된 산책 경험을 제공하는 맞춤형 산책로 추천 서비스입니다.

## 1. 프로젝트 개요

**PathFinder**는 단순한 길 안내를 넘어, 선언적 데이터 페칭과 AI 기반 가이드를 통해 사용자에게 더 깊이 있는 산책 경험을 제공하는 서비스입니다.

### 핵심 방향

- **Data Driven**: 공공데이터 포털의 실시간 산책로 데이터 활용
- **AI Integrated**: Gemini 2.5를 통한 맞춤형 경로 요약 및 도슨트 기능 제공
- **Interactive**: Kakao Maps API를 활용한 동적 경로 시각화

## 2. 기술 스택

| 분류      | 기술                                         |
| --------- | -------------------------------------------- |
| Framework | Next.js (App Router)                         |
| Styling   | **Tailwind CSS** (`src/styles/globals.css`)  |
| State     | Zustand (Client), TanStack Query v5 (Server) |
| API / AI  | Axios, Gemini 2.5 API                        |
| Map       | Kakao Maps API                               |

스타일은 **Tailwind CSS**를 사용합니다. 전역 진입은 `src/styles/globals.css`의 `@import "tailwindcss";`이며, 컴포넌트에서는 유틸리티 클래스로 스타일을 적용합니다.

## 3. 시스템 아키텍처

본 프로젝트는 **Layered Architecture**를 기반으로 각 레이어의 책임을 명확히 분리합니다.

### View Layer

- Next.js 컴포넌트를 통해 UI 및 사용자 인터랙션 구현

### State Layer

- Zustand와 TanStack Query를 활용해 클라이언트/서버 상태를 분리 및 동기화

### Service Layer

- Gemini API 연동
- 산책로 데이터 가공 및 비즈니스 로직 처리

### Infrastructure Layer

- 공공데이터 API, Kakao Maps API 등 외부 인터페이스 관리

## 4. 폴더 구조

유지보수성과 관심사 분리를 위해 **FSD(Feature-Sliced Design)** 패턴을 채택합니다.

```plaintext
src/
├── app/          # Next.js App Router (라우팅 및 전역 설정)
├── pages/        # 페이지 단위 컴포지션
├── widgets/      # 독립적인 복합 UI 블록 (Header, Sidebar 등)
├── features/     # 도메인 기능 단위 (API, 모델, UI 포함)
├── entities/     # 비즈니스 엔티티 (재사용 가능한 모델/UI)
├── shared/       # 공통 유틸리티, 디자인 시스템, API 설정
```

## 5. 데이터 관리 규칙

TanStack Query를 효율적으로 관리하기 위해, 각 Feature 내 API 레이어를 다음 3개 파일로 엄격히 분리합니다.

### `FeatureAPI.ts`

- Axios를 이용한 순수 HTTP 요청 정의
- Class 기반으로 API 인터페이스 구성

### `queries.ts`

- `queryKey`, `queryOptions`, 공유 타입(Interfaces) 정의

### `useFeatureAPI.ts`

- 컴포넌트에서 사용하는 커스텀 훅 정의
- `useQuery`, `useMutation` 기반 비동기 로직 캡슐화

> 모든 비동기 로직은 훅으로 캡슐화하여 컴포넌트 내 복잡도를 낮추는 것을 원칙으로 합니다.

## 6. 핵심 기능

### AI Docent

- Gemini 2.5 API를 활용하여 산책로 데이터 기반 맞춤형 가이드 생성

### Dynamic Mapping

- 수집된 위경도 좌표를 활용하여 지도 위에 Polyline 렌더링

### Public Data Sync

- 주변 산책로 기본 데이터를 수집하고 실시간 필터링 제공

## 7. 역할 분담

| 이름      | 주요 업무                                                 |
| --------- | --------------------------------------------------------- |
| 희중 대리 | 아키텍처 설계, Gemini API 규격 정의, 인프라 환경 설정     |
| 민석 주임 | UI/UX 구현, 공공데이터 및 지도 API 연동, 산책 맵 인터랙션 |

## 8. 프로젝트 목표

PathFinder는 사용자의 위치와 주변 산책로 데이터를 바탕으로, 단순한 경로 탐색을 넘어 **설명 가능한 산책 경험**을 제공하는 것을 목표로 합니다.

사용자는 지도 위 경로를 직관적으로 확인할 수 있고, AI가 해당 산책로의 특징과 추천 포인트를 자연스럽게 안내함으로써 보다 풍부한 탐방 경험을 얻을 수 있습니다.

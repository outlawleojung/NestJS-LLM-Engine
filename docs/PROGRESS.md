# 진행 상황

이 문서는 작업 위치와 다음 할 일을 기록한다. 새 환경에서 clone/pull 받은 후 여기부터 읽으면 이어서 진행할 수 있다.

## 현재 단계

**설계 완료, 스캐폴딩 전.**

설계 문서: [`docs/specs/2026-07-27-nestjs-llm-engine-design.md`](specs/2026-07-27-nestjs-llm-engine-design.md)

## 확정된 결정 사항

| 항목 | 결정 | 근거 |
|---|---|---|
| 요청 처리 방식 | 비동기 큐 (BullMQ + Redis) | 상태 관리·재시도와 자연스러움 |
| RAG 검색 | pgvector + Voyage 임베딩 | 벡터 검색으로 실제 RAG 구현 |
| 임베딩 제공자 | Voyage AI (`voyage-3`, 1024차원) | Anthropic 공식 파트너 |
| Claude 기본 모델 | `claude-haiku-4-5-20251001` | 데모 비용 최소화, 품질 충분 |
| 인증 | 단일 API Key (`x-api-key`) | 데모 노출 시 최소 보호 |
| 재시도 정책 | 최대 3회, 지수 백오프 (429/5xx만) | 표준 관행 |

## 완료

- [x] 요구사항 정의
- [x] 기술 선택
- [x] 데이터 모델 설계
- [x] API 엔드포인트 설계
- [x] 비동기 흐름 설계
- [x] 설계 문서 작성

## 다음 할 일 (순서대로)

1. **NestJS 프로젝트 스캐폴딩** — `nest new`, TypeScript strict 모드, ESLint/Prettier
2. **핵심 의존성 설치** — `@nestjs/typeorm`, `pg`, `@nestjs/bullmq`, `bullmq`, `@nestjs/config`, `@nestjs/swagger`, `@anthropic-ai/sdk`, `class-validator`, `class-transformer`
3. **DB 스키마 및 마이그레이션** — pgvector 확장 활성화, `products`/`ai_requests` 테이블
4. **공통 인프라** — `ApiKeyGuard`, config 모듈, Swagger 세팅
5. **Products 모듈** — CRUD + 등록 시 Voyage 임베딩 생성
6. **AI 모듈 (Providers)** — `ClaudeProvider`, `VoyageProvider`
7. **AI 모듈 (Service/Controller)** — 요청 접수, 상태 조회, 사용량 조회
8. **AI 모듈 (Processor)** — BullMQ 워커, 성공/실패/재시도 처리
9. **비용 계산** — 모델별 단가표, cost 산출 로직
10. **단위 테스트** — 서비스/프로세서 주요 경로
11. **README 보강** — 실행 방법, API 예시, 아키텍처 다이어그램
12. **docker-compose** — 로컬 PostgreSQL(+pgvector)/Redis

## 환경 준비 필요

- Node.js LTS
- Docker (PostgreSQL + Redis)
- Anthropic API Key
- Voyage AI API Key

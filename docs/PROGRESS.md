# 진행 상황

이 문서는 작업 위치와 다음 할 일을 기록한다. 새 환경에서 clone/pull 받은 후 여기부터 읽으면 이어서 진행할 수 있다.

## 현재 단계

**초기 구현 완료.** 로컬 실행·검증 대기.

- 설계 문서: [`docs/specs/2026-07-27-nestjs-llm-engine-design.md`](specs/2026-07-27-nestjs-llm-engine-design.md)
- 실행 방법: [`README.md`](../README.md)

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

- [x] 요구사항 정의 · 기술 선택 · 설계 문서
- [x] NestJS 스캐폴딩 (TypeScript strict, ESLint/Prettier)
- [x] docker-compose (pgvector, Redis) + .env.example
- [x] 공통 인프라 (ConfigModule + env 검증, ApiKeyGuard, TypeORM DataSource)
- [x] 엔티티 및 마이그레이션 (`products` with vector(1024), `ai_requests`)
- [x] Voyage/Claude 프로바이더
- [x] Products 모듈 (CRUD + 등록 시 임베딩, pgvector 유사도 검색)
- [x] AI 모듈 (Service, Controller, BullMQ Processor)
- [x] 비용 계산기 + `/ai/usage` 엔드포인트
- [x] 단위 테스트 (pricing / AiService / AiRequestProcessor / ProductsService)
- [x] README 보강 (실행 방법, API 예시, 아키텍처)

## 남은 작업 / 다음 할 일

1. **로컬 실행 검증**
   - `npm install`
   - `docker compose up -d`
   - `.env` 채우고 `npm run migration:run`
   - `npm run start:dev` → Swagger 확인
   - 실제 상품 등록 → 카피 요청 → 결과 조회 흐름 e2e 확인
2. **테스트 실행 확인** — `npm test`
3. **선택적 개선**
   - e2e 테스트 (`test/`)
   - Rate limiting (`@nestjs/throttler`)
   - Health check 엔드포인트
   - Docker 이미지화 (앱까지 컨테이너화)
   - CI (GitHub Actions: lint + test)
   - RAG 품질 튜닝: reranker, hybrid search
4. **README에 실제 스크린샷 / 데모 GIF 추가** (선택)

## 알려진 결정 · 트레이드오프

- 임베딩 텍스트: `상품명 + 카테고리 + 특징`을 한 문자열로 합쳐 임베딩. 상품 수가 늘거나 특징 텍스트가 길어지면 청킹 고려.
- pgvector ivfflat 인덱스 `lists = 100`: 데이터가 많아지면 `lists = √N` 근방으로 재조정.
- Voyage 응답은 REST 직접 호출 (SDK가 안정 릴리스 전).
- 카피/Q&A 모두 동일한 `/ai/requests/:id`로 결과 조회 (엔드포인트 통합).

## 환경 준비 필요

- Node.js 20+
- Docker (PostgreSQL + Redis)
- Anthropic API Key, Voyage AI API Key

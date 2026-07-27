# NestJS LLM Engine — 설계 문서

작성일: 2026-07-27

## 1. 개요

커머스 상품 데이터를 기반으로 Claude API를 호출하는 백엔드 서비스.
두 가지 기능을 제공한다.

- 상품 정보를 넣으면 상세페이지 카피를 생성
- 사용자 질문에 대해 관련 상품을 벡터 검색으로 찾아 답변 (RAG)

모든 AI 호출은 비동기 큐로 처리하고 상태·토큰·비용을 DB에 남긴다.

## 2. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| Runtime | NestJS + TypeScript | |
| ORM | TypeORM | |
| DB | PostgreSQL + pgvector | 벡터 검색용 |
| Cache/Queue | Redis + BullMQ | 비동기 처리 |
| LLM | Anthropic Claude | 기본 `claude-haiku-4-5-20251001` |
| 임베딩 | Voyage AI `voyage-3` | 1024차원, Anthropic 공식 파트너 |
| 인증 | 단일 API Key (`x-api-key` 헤더) | |
| 문서화 | Swagger | |

Claude 기본 모델은 Haiku 4.5. 카피/Q&A 품질에 충분하고 데모 비용을 낮게 유지.
환경 변수로 오버라이드 가능.

## 3. 핵심 기능

### 3.1 상품 상세페이지 카피 생성
- 입력: 상품 ID
- 처리: 상품 정보(name, category, features)를 프롬프트에 넣어 Claude 호출
- 반환: `requestId` 즉시 반환 → 결과 조회 API로 확인

### 3.2 RAG 기반 Q&A
- 상품 등록 시점에 Voyage `voyage-3`으로 임베딩 생성 → `products.embedding` 저장
- 질문 수신 시 질문도 임베딩 → pgvector 코사인 유사도로 top-K 상품 검색
- 검색된 상품 정보를 컨텍스트로 프롬프트에 삽입하여 Claude 호출
- 결과 조회 흐름은 3.1과 동일

### 3.3 상태 관리 및 비용 추적
- 모든 AI 요청은 `ai_requests`에 기록 (status/tokens/cost/retry_count)
- 실패 시 BullMQ 재시도 (최대 3회, 지수 백오프)
- Claude 응답의 `usage.input_tokens` / `usage.output_tokens`를 기록
- 모델별 단가표로 cost 산출
- 기간별 사용량 조회 API 제공

## 4. 인증

- 모든 API는 `x-api-key` 헤더 필수
- `.env`의 `API_KEY`와 일치할 때만 통과
- NestJS Guard로 전역 적용
- Swagger UI에서 API Key 입력 UI 제공 (`addApiKey`)

## 5. 데이터 모델

### Product

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid (PK) | |
| name | varchar | |
| category | varchar | |
| features | text | |
| embedding | vector(1024) | voyage-3 차원 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

임베딩 인덱스: `USING ivfflat (embedding vector_cosine_ops)` (레코드 수 늘면 검토).

### AiRequest

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid (PK) | 내부 |
| request_id | varchar (unique) | 클라이언트에 노출되는 ID |
| type | enum | `COPY_GENERATION`, `QA` |
| status | enum | `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED` |
| input | jsonb | 요청 원본 |
| output | text (nullable) | 생성 결과 |
| error_message | text (nullable) | 실패 사유 |
| input_tokens | int (nullable) | |
| output_tokens | int (nullable) | |
| cost | numeric(12,6) (nullable) | USD |
| retry_count | int default 0 | |
| created_at | timestamptz | |
| completed_at | timestamptz (nullable) | |

## 6. API 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | /products | 상품 등록 (등록 시 임베딩 생성) |
| GET | /products | 상품 목록 |
| GET | /products/:id | 상품 상세 |
| POST | /ai/copy | 카피 생성 요청 → `requestId` |
| POST | /ai/qa | Q&A 요청 → `requestId` |
| GET | /ai/requests/:requestId | 요청 상태·결과 조회 |
| GET | /ai/usage?startDate=&endDate= | 기간별 토큰·비용·건수 |

## 7. 비동기 처리 흐름

```
Client → POST /ai/copy (또는 /ai/qa)
      → AiRequest(status=PENDING) 저장
      → BullMQ enqueue
      → requestId 즉시 반환

Worker → dequeue
       → status=PROCESSING
       → (Q&A인 경우) 질문 임베딩 + pgvector 검색
       → Claude 호출
       → 성공: output/tokens/cost 저장, status=COMPLETED, completed_at
       → 실패: error_message 저장, retry_count++
                  ├─ retry_count ≤ 3 → 재시도 (지수 백오프)
                  └─ retry_count > 3 → status=FAILED
```

재시도 대상: 429, 5xx, 네트워크 오류. 4xx(잘못된 요청/인증)는 즉시 FAILED.

## 8. 프로젝트 구조

```
src/
├── main.ts
├── app.module.ts
├── common/
│   ├── guards/api-key.guard.ts
│   └── config/
├── products/
│   ├── products.module.ts
│   ├── products.controller.ts
│   ├── products.service.ts
│   └── entities/product.entity.ts
└── ai/
    ├── ai.module.ts
    ├── ai.controller.ts
    ├── ai.service.ts
    ├── processors/ai-request.processor.ts    # BullMQ 워커
    ├── entities/ai-request.entity.ts
    └── providers/
        ├── claude.provider.ts
        └── voyage.provider.ts
```

## 9. 환경 변수

```
DATABASE_URL=
REDIS_URL=
ANTHROPIC_API_KEY=
VOYAGE_API_KEY=
API_KEY=
CLAUDE_MODEL=claude-haiku-4-5-20251001
VOYAGE_MODEL=voyage-3
```

## 10. 테스트 방침

- Jest (NestJS 기본)
- 단위 테스트: `products.service`, `ai.service`, 프로바이더 계층 (Claude/Voyage 호출은 mock)
- 프로세서 테스트: 성공/실패/재시도 상태 전이 검증

## 11. 기타

- 커밋 메시지: Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`)
- README에 아키텍처 설명, 설치 방법, API 사용 예시, 기술 선택 근거 포함

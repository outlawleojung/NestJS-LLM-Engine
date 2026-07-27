# NestJS LLM Engine

NestJS 기반 LLM 백엔드 서비스.
Claude API로 상품 상세페이지 카피를 생성하고, pgvector + Voyage 임베딩으로 RAG Q&A를 제공한다.
모든 AI 호출은 BullMQ 비동기 큐로 처리하며 상태·토큰·비용을 DB에 남긴다.

## 주요 기능

- **상세페이지 카피 생성** — 상품 정보 → Claude → 마케팅 카피
- **RAG Q&A** — 질문 → Voyage 임베딩 → pgvector 유사도 검색 → Claude 답변
- **비동기 처리** — 요청 즉시 `requestId` 반환, BullMQ 워커가 백그라운드 처리
- **상태 관리 & 재시도** — pending/processing/completed/failed, 지수 백오프 3회
- **비용 추적** — Claude 응답의 토큰 수 기록, 모델별 단가로 비용 산출, 기간별 조회

## 기술 스택

- **Runtime**: NestJS · TypeScript
- **DB**: PostgreSQL 16 + pgvector 확장
- **Queue**: Redis + BullMQ
- **LLM**: Anthropic Claude (기본 `claude-haiku-4-5-20251001`)
- **Embedding**: Voyage AI `voyage-3` (1024차원, Anthropic 공식 파트너)
- **Auth**: 단일 API Key (`x-api-key` 헤더)
- **Docs**: Swagger (`/docs`)

## 기술 선택 근거

| 선택 | 이유 |
|---|---|
| pgvector | 별도 벡터 DB 없이 PostgreSQL 내에서 처리 → 운영 단순화, 하나의 트랜잭션으로 상품·임베딩 관리 |
| Voyage AI | Anthropic이 공식 파트너로 추천하는 임베딩. Claude와 스택 일관성 |
| BullMQ | LLM 호출은 지연 편차가 크므로 동기 API로 두면 타임아웃 위험. 큐 기반 비동기 + 자동 재시도가 적합 |
| Claude Haiku 4.5 | 카피 생성/RAG 답변 수준에는 충분한 품질, 저비용 |

## 실행 방법

### 1. 사전 준비

- Node.js 20+
- Docker (PostgreSQL + Redis)
- API 키: Anthropic, Voyage AI

### 2. 셋업

```bash
git clone git@github.com:outlawleojung/NestJS-LLM-Engine.git
cd NestJS-LLM-Engine

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 ANTHROPIC_API_KEY, VOYAGE_API_KEY, API_KEY 등을 채운다

# PostgreSQL(pgvector) + Redis 기동
docker compose up -d

# DB 마이그레이션
npm run migration:run
```

### 3. 실행

```bash
npm run start:dev
```

- 서버: http://localhost:3000
- Swagger: http://localhost:3000/docs

## API 사용 예시

모든 요청에 `x-api-key` 헤더 필요.

### 상품 등록 (등록 시 임베딩 자동 생성)

```bash
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "name": "무선 노이즈캔슬링 헤드폰",
    "category": "오디오/헤드폰",
    "features": "액티브 노이즈 캔슬링, 30시간 배터리, 블루투스 5.3"
  }'
```

### 상세페이지 카피 생성 (비동기)

```bash
# 1. 요청 → requestId 즉시 반환
curl -X POST http://localhost:3000/ai/copy \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"productId": "<PRODUCT_UUID>"}'
# → {"requestId": "..."}

# 2. 결과 조회 (몇 초 뒤)
curl http://localhost:3000/ai/requests/<REQUEST_ID> \
  -H "x-api-key: your-api-key"
```

### RAG Q&A

```bash
curl -X POST http://localhost:3000/ai/qa \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"question": "노이즈 캔슬링 되고 배터리 오래가는 헤드폰 추천", "topK": 5}'
```

### 사용량 조회

```bash
curl "http://localhost:3000/ai/usage?startDate=2026-07-01&endDate=2026-07-31" \
  -H "x-api-key: your-api-key"
```

## 아키텍처

```
                       ┌────────────────┐
                       │  Client / cURL │
                       └────────┬───────┘
                                │  x-api-key
                                ▼
                       ┌────────────────┐
                       │  NestJS API    │
                       │  (Controller)  │
                       └────────┬───────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
        ┌──────────┐     ┌──────────┐     ┌──────────────┐
        │ Products │     │ AI enq.  │     │ AI query     │
        │ CRUD +   │     │ ─────────┼────▶│ (status/     │
        │ embed    │     │ Redis    │     │  usage)      │
        └────┬─────┘     └────┬─────┘     └──────┬───────┘
             │                │                  │
             ▼                ▼                  ▼
      ┌──────────────┐  ┌──────────────────────────────┐
      │ Voyage AI    │  │ PostgreSQL (pgvector)        │
      │ (embed)      │  │  products / ai_requests      │
      └──────────────┘  └──────────────────────────────┘
                                ▲
                                │
                       ┌────────┴───────┐
                       │ BullMQ Worker  │
                       │ (Processor)    │
                       └────┬───────┬───┘
                            │       │
                       Voyage   Claude
                       (embed)  (완성)
```

## 프로젝트 구조

```
src/
├── main.ts
├── app.module.ts
├── common/
│   ├── config/           # env 검증, TypeORM datasource
│   └── guards/           # ApiKeyGuard
├── products/             # 상품 CRUD + 임베딩 생성
├── ai/
│   ├── ai.controller.ts  # /ai/copy, /ai/qa, /ai/requests, /ai/usage
│   ├── ai.service.ts     # 요청 접수 (큐 push)
│   ├── processors/       # BullMQ 워커
│   ├── providers/        # Claude, Voyage 래퍼
│   ├── cost/pricing.ts   # 모델별 단가 및 비용 산출
│   └── prompts.ts        # 카피/QA 프롬프트 템플릿
└── migrations/           # TypeORM 마이그레이션
```

## 테스트

```bash
npm test              # 단위 테스트
npm run test:cov      # 커버리지 리포트
```

## 진행 상황

현재 상태와 다음 할 일은 [docs/PROGRESS.md](docs/PROGRESS.md), 전체 설계는 [docs/specs/2026-07-27-nestjs-llm-engine-design.md](docs/specs/2026-07-27-nestjs-llm-engine-design.md) 참고.

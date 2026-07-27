# NestJS LLM Engine

NestJS 기반 LLM 백엔드 서비스.
Claude API로 상품 상세페이지 카피를 생성하고, pgvector + Voyage 임베딩으로 RAG Q&A를 제공한다.
모든 AI 호출은 BullMQ 비동기 큐로 처리하며 상태·토큰·비용을 DB에 남긴다.

**BYOK (Bring Your Own Keys)** 방식으로 동작한다. 서버는 API 키를 보관하지 않으며, 사용자가 웹 UI에서 자신의 LLM(Claude 또는 Gemini)·Voyage 키를 입력하면 서버가 AES-256-GCM으로 암호화해 Redis 세션에 1시간 TTL로 저장하고, 큐 워커도 세션에서 키를 조회해 호출한다.

**LLM 제공자는 세션 등록 시 선택 가능**하다. 프로덕션에서 Claude를 쓰는 스토리를 유지하면서, 무료로 데모를 돌리고 싶으면 Gemini를 고를 수 있다.

## 주요 기능

- **상세페이지 카피 생성** — 상품 정보 → Claude → 마케팅 카피
- **RAG Q&A** — 질문 → Voyage 임베딩 → pgvector 유사도 검색 → Claude 답변
- **BYOK 세션** — 사용자 키를 서버에서 암호화 저장, 쿠키(`sid`) 기반
- **비동기 처리** — 요청 즉시 `requestId` 반환, BullMQ 워커가 백그라운드 처리
- **상태 관리 & 재시도** — pending/processing/completed/failed, 지수 백오프 3회
- **비용 추적** — Claude 응답의 토큰 수 기록, 모델별 단가로 비용 산출, 기간별 조회
- **웹 UI** — EJS로 렌더링되는 단일 페이지 데모

## 기술 스택

- **Runtime**: NestJS · TypeScript
- **DB**: PostgreSQL 16 + pgvector 확장
- **Queue**: Redis + BullMQ
- **View**: EJS
- **LLM**: 선택 가능 — Anthropic Claude (`claude-haiku-4-5-20251001`) 또는 Google Gemini (`gemini-1.5-flash`)
- **Embedding**: Voyage AI `voyage-3` (1024차원)
- **Auth**: BYOK — 사용자 API 키를 세션(Redis, AES-256-GCM)에 저장, 쿠키로 참조

## 기술 선택 근거

| 선택 | 이유 |
|---|---|
| pgvector | 별도 벡터 DB 없이 PostgreSQL 안에서 처리, 운영 단순화 |
| Voyage AI | Anthropic 공식 파트너, Claude와 스택 일관성 |
| BullMQ | LLM 호출은 지연 편차가 크므로 큐 기반 비동기 + 자동 재시도 |
| Claude Haiku 4.5 | 카피/RAG 답변 품질에 충분하면서 저비용 |
| BYOK + 세션 | 데모 서버에서 서버 소유 키 노출 위험 제거, 사용자가 자기 비용 부담 |
| LLM 제공자 인터페이스 | `LlmProvider` 추상화 + 팩토리로 Claude/Gemini 교체 가능, 세션에 저장된 값으로 선택 |
| EJS | 별도 프론트엔드 없이 서버가 세션 쿠키를 그대로 활용할 수 있어 통합 단순 |

## 실행 방법

### 1. 사전 준비

- Node.js 20+
- Docker (PostgreSQL + Redis)
- 본인의 API 키 (실행 후 웹 UI에서 입력):
  - LLM: **Google Gemini** (https://aistudio.google.com/apikey — 무료, 카드 등록 불필요) 또는 **Anthropic Claude** (https://console.anthropic.com — 유료 크레딧 필요)
  - Embedding: **Voyage AI** (https://dash.voyageai.com — 월 200M 토큰 무료 티어)

### 2. 셋업

```bash
git clone git@github.com:outlawleojung/NestJS-LLM-Engine.git
cd NestJS-LLM-Engine

npm install

# .env 만들기 (API 키는 여기에 넣지 않는다)
cp .env.example .env
# SESSION_SECRET을 32자 이상 랜덤 문자열로 바꾼다
# 예: openssl rand -hex 32

docker compose up -d
npm run migration:run
npm run start:dev
```

### 3. 사용

브라우저에서 http://localhost:3000 접속.

1. **API 키 세션** 섹션에서 **AI 제공자 선택** (Gemini 무료 권장) → 해당 키 + Voyage 키 입력 → "세션 시작"
2. **상품 등록** — 등록 시 Voyage 임베딩이 자동 생성돼 DB에 저장됨
3. **카피 생성** — 등록한 상품 ID 입력 → 요청 → 반환된 `requestId`를 하단에서 조회
4. **RAG Q&A** — 자연어 질문 입력 → 유사 상품 검색 + Claude 답변
5. **사용량** — 누적 토큰/비용/요청 수 조회

세션은 1시간 후 자동 만료된다. 각 요청마다 TTL이 갱신되므로 활발히 사용 중이면 만료되지 않는다.

## API 엔드포인트

| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| POST | /session | — | 사용자 키 등록, 세션 쿠키 발급 |
| DELETE | /session | 쿠키 | 세션 종료 |
| POST | /products | 세션 | 상품 등록 (Voyage 임베딩 생성) |
| GET | /products | — | 상품 목록 |
| GET | /products/:id | — | 상품 상세 |
| POST | /ai/copy | 세션 | 카피 생성 요청 (비동기) |
| POST | /ai/qa | 세션 | RAG Q&A 요청 (비동기) |
| GET | /ai/requests/:requestId | — | 요청 상태·결과 조회 |
| GET | /ai/usage | — | 기간별 사용량 |

## 아키텍처

```
                       ┌────────────────┐
                       │   Browser      │
                       │  (EJS page)    │
                       └────────┬───────┘
                                │  cookie: sid
                                ▼
                       ┌────────────────┐
                       │  NestJS API    │
                       │  Session Guard │
                       └────────┬───────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
      │ Products     │  │ AI enqueue   │  │ Session      │
      │ CRUD + embed │  │ (add to Q)   │  │ (AES + Redis)│
      └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
             │                 │                 │
             ▼                 ▼                 ▼
      ┌──────────────┐  ┌──────────────────────────────┐
      │ Voyage AI    │  │ PostgreSQL (pgvector)        │
      │ (embed)      │  │  products / ai_requests      │
      └──────────────┘  └──────────────────────────────┘
                                ▲
                                │
                       ┌────────┴───────┐
                       │ BullMQ Worker  │
                       │ (Processor)    │ ← 세션에서 키 조회
                       └────┬───────┬───┘
                            │       │
                       Voyage   Claude
```

## 프로젝트 구조

```
src/
├── main.ts               # cookie-parser + EJS 뷰 엔진 셋업
├── app.module.ts
├── common/
│   ├── config/           # env 검증, TypeORM datasource
│   ├── crypto/           # AES-256-GCM 서비스
│   └── redis/            # ioredis 클라이언트 (Global)
├── session/              # BYOK 세션 (컨트롤러, 서비스, 가드, 데코레이터)
├── products/             # 상품 CRUD + 임베딩 생성
├── ai/
│   ├── ai.controller.ts
│   ├── ai.service.ts
│   ├── processors/       # BullMQ 워커
│   ├── providers/        # Claude, Voyage 래퍼 (키는 호출 시 인자로)
│   ├── cost/pricing.ts   # 모델별 단가 및 비용 산출
│   └── prompts.ts
├── views/                # EJS 컨트롤러
└── migrations/
views/
└── index.ejs             # 단일 페이지 데모 UI
```

## 테스트

```bash
npm test              # 단위 테스트
npm run test:cov      # 커버리지
```

## 진행 상황

현재 상태와 다음 할 일은 [docs/PROGRESS.md](docs/PROGRESS.md), 전체 설계는 [docs/specs/2026-07-27-nestjs-llm-engine-design.md](docs/specs/2026-07-27-nestjs-llm-engine-design.md) 참고.

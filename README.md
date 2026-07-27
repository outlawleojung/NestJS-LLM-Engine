# NestJS LLM Engine

NestJS 기반 LLM 백엔드 서비스.
Claude API로 상품 상세페이지 카피를 생성하고, pgvector + Voyage 임베딩으로 RAG Q&A를 제공한다.
모든 AI 호출은 BullMQ 비동기 큐로 처리하며 토큰/비용을 DB에 남긴다.

## 주요 기능

- **상세페이지 카피 생성** — 상품 정보 → Claude → 마케팅 카피
- **RAG Q&A** — 질문 → 벡터 검색으로 관련 상품 조회 → Claude 답변
- **상태 관리 & 비용 추적** — pending/processing/completed/failed, 자동 재시도, 토큰·비용 기록

## 기술 스택

NestJS · TypeScript · TypeORM · PostgreSQL(pgvector) · Redis · BullMQ · Claude · Voyage AI · Swagger

## 상태

초기 설계 단계. 상세한 설계는 [docs/specs/2026-07-27-nestjs-llm-engine-design.md](docs/specs/2026-07-27-nestjs-llm-engine-design.md), 현재 작업 위치는 [docs/PROGRESS.md](docs/PROGRESS.md) 참고.

## 실행 방법

작성 예정 (스캐폴딩 후 추가).

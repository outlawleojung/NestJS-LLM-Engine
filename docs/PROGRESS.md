# 진행 상황

이 문서는 작업 위치와 다음 할 일을 기록한다. 새 환경에서 clone/pull 받은 후 여기부터 읽으면 이어서 진행할 수 있다.

## 현재 단계

**BYOK + EJS 데모 UI까지 구현 완료.** 로컬 실행·검증 대기.

- 설계 문서: [`docs/specs/2026-07-27-nestjs-llm-engine-design.md`](specs/2026-07-27-nestjs-llm-engine-design.md) (초기 설계, 인증 방식은 이후 BYOK로 전환)
- 실행 방법: [`README.md`](../README.md)

## 확정된 결정 사항

| 항목 | 결정 | 근거 |
|---|---|---|
| 요청 처리 방식 | 비동기 큐 (BullMQ + Redis) | 상태 관리·재시도와 자연스러움 |
| RAG 검색 | pgvector + Voyage 임베딩 | 벡터 검색으로 실제 RAG 구현 |
| 임베딩 제공자 | Voyage AI (`voyage-3`, 1024차원) | Anthropic 공식 파트너 |
| Claude 기본 모델 | `claude-haiku-4-5-20251001` | 데모 비용 최소화, 품질 충분 |
| Gemini 지원 | 세션에서 provider 선택 가능 (`claude` \| `gemini`), 기본 `gemini-1.5-flash` | 무료 티어로 결제 없이 데모 실행 가능 |
| LLM 추상화 | `LlmProvider` 인터페이스 + `LlmProviderFactory` | 제공자 교체가 컨트롤러/프로세서에 영향 없음 |
| 인증 방식 | **BYOK 세션** (Redis + AES-256-GCM, TTL 1h) | 서버가 사용자 키를 소유하지 않도록 |
| 서버 자체 API 키 (`x-api-key`) | **제거** | BYOK 도입으로 존재 이유 소멸 |
| 프론트 | EJS 단일 페이지 (`/`) | 세션 쿠키를 그대로 활용, 별도 프론트 프레임워크 없음 |
| 재시도 정책 | 최대 3회, 지수 백오프 | 표준 관행 |

## 완료

- [x] 요구사항 정의 · 기술 선택 · 설계 문서
- [x] NestJS 스캐폴딩 (TypeScript strict, ESLint/Prettier)
- [x] docker-compose (pgvector, Redis) + .env.example
- [x] 공통 인프라 (ConfigModule + env 검증, TypeORM DataSource)
- [x] 엔티티 및 마이그레이션 (`products` with vector(1024), `ai_requests`)
- [x] Voyage/Claude 프로바이더 (BYOK로 리팩터: 키는 호출 인자)
- [x] Products 모듈 (CRUD + 등록 시 임베딩, pgvector 유사도 검색)
- [x] AI 모듈 (Service, Controller, BullMQ Processor)
- [x] 비용 계산기 + `/ai/usage` 엔드포인트
- [x] 단위 테스트 (pricing / crypto / AiService / AiRequestProcessor / ProductsService)
- [x] **Crypto 서비스** (AES-256-GCM, SESSION_SECRET 파생)
- [x] **Redis 클라이언트 모듈** (ioredis, Global)
- [x] **세션 모듈** (POST/DELETE /session, 쿠키 `sid`, SessionGuard, @SessionKeys / @SessionId 데코레이터)
- [x] **EJS 뷰 엔진** + 단일 페이지 데모 UI (`views/index.ejs`)

## 남은 작업 / 다음 할 일

1. **로컬 실행 검증**
   - `npm install`
   - `docker compose up -d`
   - `.env`의 `SESSION_SECRET`을 32자 이상 랜덤값으로 (`openssl rand -hex 32`)
   - `npm run migration:run`
   - `npm run start:dev`
   - `http://localhost:3000` 접속 → 세션 시작 → 상품 등록 → 카피/Q&A → 결과 조회 e2e 확인
2. **`npm test`로 단위 테스트 통과 확인**
3. **선택적 개선**
   - 세션 재사용을 위한 슬라이딩 만료 시 사용자에게 남은 TTL 표시
   - `/health` 헬스 체크
   - Rate limiting (`@nestjs/throttler`)
   - Docker 이미지화 (앱까지 컨테이너)
   - CI (GitHub Actions: lint + test)
   - RAG 품질 튜닝 (reranker, hybrid search)

## 아키텍처 요점 (BYOK)

- 사용자가 `/`에서 API 키 입력 → `POST /session` → 서버가 `sessionId` 발급, Redis에 암호화 저장(TTL 3600s), 쿠키 `sid` 발급
- 인증이 필요한 엔드포인트(`POST /products`, `POST /ai/copy`, `POST /ai/qa`)는 `SessionGuard`가 쿠키에서 sessionId를 뽑아 Redis에서 키 조회 → `request.userKeys`에 부착
- 컨트롤러는 `@SessionKeys()` / `@SessionId()` 데코레이터로 키·세션 ID를 주입 받음
- 큐 잡 페이로드에는 `sessionId`만 담기고, 워커가 실행 시점에 세션에서 키를 조회함 (재시도 사이에 세션 만료 시 실패로 처리됨)
- `SESSION_SECRET`은 SHA-256으로 파생해 32바이트 AES 키로 사용, IV 12바이트 + Auth Tag 16바이트

## 환경 준비 필요

- Node.js 20+
- Docker (PostgreSQL + Redis)
- 사용자 본인의 Anthropic / Voyage 키 (실행 후 웹 UI에서 입력)

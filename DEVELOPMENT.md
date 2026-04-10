# Death Snail 개발 가이드

## 빠른 시작 (Phase 0)

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 서비스 설정

**Supabase (DB):**
1. [supabase.com](https://supabase.com) 가입
2. 새 프로젝트 생성
3. Project Settings > Database > Connection String 복사
4. `apps/api/.env` 파일 생성 (`.env.example` 참고)

**Upstash (Redis):**
1. [upstash.com](https://upstash.com) 가입
2. Redis 데이터베이스 생성
3. Connection String 복사 → `REDIS_URL` 설정

### 3. DB 마이그레이션

```bash
cd apps/api
pnpm db:generate
pnpm db:migrate
```

### 4. 개발 서버 실행

**터미널 1 - API 서버:**
```bash
pnpm dev:api
```

**터미널 2 - 모바일 앱:**
```bash
pnpm dev:mobile
```
→ QR 코드를 Expo Go 앱으로 스캔

### 5. 달팽이 이동 테스트 (수동 트리거)

```bash
curl -X POST http://localhost:3000/admin/trigger-movement
```

---

## 프로젝트 구조

```
deathSnail/
├── apps/
│   ├── mobile/          # Expo React Native 앱
│   └── api/             # Fastify 백엔드
│       ├── src/
│       │   ├── routes/  # REST API 엔드포인트
│       │   ├── jobs/    # BullMQ 크론 잡
│       │   ├── lib/     # 공유 유틸 (prisma, redis, socket, geo)
│       │   └── data/    # 정적 데이터 (대사, 업적, 육지 좌표)
│       └── prisma/      # DB 스키마
└── packages/
    └── shared/          # 공유 타입 + geo 수학 함수
```

## 핵심 파일

| 파일 | 설명 |
|---|---|
| `packages/shared/src/geo.ts` | 달팽이 이동 수학 (Great Circle) |
| `apps/api/src/jobs/snail-movement.ts` | 매일 자정 이동 크론 잡 |
| `apps/api/prisma/schema.prisma` | PostGIS DB 스키마 |
| `apps/mobile/app/(tabs)/index.tsx` | 메인 지도 화면 |
| `apps/mobile/stores/gameStore.ts` | 전역 상태 (Zustand) |

## 배포

**백엔드 (Railway):**
```bash
# railway.toml은 자동 감지됨
railway up
```

**모바일 앱 빌드 (Expo EAS):**
```bash
cd apps/mobile
npx eas build --platform all
```

## 환경변수

| 변수 | 위치 | 설명 |
|---|---|---|
| `DATABASE_URL` | `apps/api/.env` | Supabase PostgreSQL URL |
| `REDIS_URL` | `apps/api/.env` | Upstash Redis URL |
| `JWT_SECRET` | `apps/api/.env` | JWT 서명 키 |
| `EXPO_PUBLIC_API_URL` | `apps/mobile/.env` | API 서버 URL |

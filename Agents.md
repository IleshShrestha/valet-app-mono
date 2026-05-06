# Project Overview

This is a React Native + Go/Postgres valet operations app.

# Tech Stack

- Frontend: Expo React Native
- Backend: Go with chi router
- Database: PostgreSQL
- Migrations: goose
- Auth: JWT/Cognito/etc.

# How to Run backend with refresh

Backend:
air

# How to Run backend without refresh

Backend:
go run ./cmd/api

Frontend:
npx expo start

# How to Test

go test ./...
npm test

# Code Style

- Keep handlers thin
- Put database logic in repositories
- Use context.Context for DB calls
- Validate request bodies before writing to DB
- Do not change public API contracts unless asked

## Frontend TypeScript Rules

- Prefer explicit interfaces/types for component props.
- Do not use `any` unless there is a clear reason.
- Avoid unnecessary optional props.
- Props should be required when the component cannot render correctly without them.
- Keep optional props only for truly optional UI behavior.
- Keep API response types separate from UI/domain types.
- Do not remove optional chaining unless data is guaranteed to exist.
- Do not change UI behavior during refactors.
- Keep refactor diffs small and focused.

# Valet App

Monorepo containing the mobile frontend and Go backend.

## Structure

- `frontend-mobile/` - React Native / Expo app
- `backend/` - Go API server
- `docker-compose.yml` - local services such as PostgreSQL

## Run frontend

```bash
cd frontend-mobile
npm install
npx expo start
```

## Run Backend
```bash
cd backend
go mod tidy
go run ./cmd/api 
```


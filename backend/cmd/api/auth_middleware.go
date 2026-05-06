package main

import (
	"context"
	"net/http"
	"strings"
)

type ctxKey string

const authUserKey ctxKey = "auth_user"

type authCtxUser struct {
	UserID int64
	Email  string
	Role   string
}

func (app *application) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ah := r.Header.Get("Authorization")
		parts := strings.SplitN(ah, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			_ = writeJSONError(w, http.StatusUnauthorized, "missing or invalid authorization header")
			return
		}
		claims, err := app.tokenManager.ValidateAccessToken(parts[1])
		if err != nil {
			_ = writeJSONError(w, http.StatusUnauthorized, "invalid access token")
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), authUserKey, authCtxUser{UserID: claims.UserID, Email: claims.Email, Role: claims.Role})))
	})
}
func requireRole(roles ...string) func(http.Handler) http.Handler {
	allowed := map[string]struct{}{}
	for _, role := range roles {
		allowed[role] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if _, ok := allowed[authUserFromCtx(r.Context()).Role]; !ok {
				_ = writeJSONError(w, http.StatusForbidden, "forbidden")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
func authUserFromCtx(ctx context.Context) authCtxUser {
	v, _ := ctx.Value(authUserKey).(authCtxUser)
	return v
}

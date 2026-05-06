package main

import (
	"net/http"
	"strings"
	"time"
	"valet-backend-go/internal/auth"

	"golang.org/x/crypto/bcrypt"
)

func (app *application) loginHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email      string `json:"email"`
		Password   string `json:"password"`
		Platform   string `json:"platform"`
		DeviceName string `json:"device_name"`
	}
	if err := readJson(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	u, err := app.repository.Users.GetByEmailWithPassword(r.Context(), email)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(req.Password)) != nil {
		_ = writeJSONError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}
	accessToken, _ := app.tokenManager.GenerateAccessToken(u.ID, u.Email, u.Role)
	rawRefreshToken, _ := auth.GenerateRefreshToken()
	_ = app.repository.RefreshTokens.CreateRefreshToken(r.Context(), u.ID, auth.HashRefreshToken(rawRefreshToken), req.Platform, req.DeviceName, r.UserAgent(), r.RemoteAddr, time.Now().UTC().Add(app.tokenManager.RefreshTokenTTL()))
	_ = writeJSON(w, http.StatusOK, map[string]any{"access_token": accessToken, "refresh_token": rawRefreshToken, "user": map[string]any{"id": u.ID, "email": u.Email, "role": u.Role}})
}

func (app *application) refreshHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := readJson(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	hash := auth.HashRefreshToken(req.RefreshToken)
	rt, err := app.repository.RefreshTokens.GetRefreshTokenByHash(r.Context(), hash)
	if err != nil || rt.RevokedAt.Valid || rt.ExpiresAt.Before(time.Now().UTC()) {
		_ = writeJSONError(w, http.StatusUnauthorized, "invalid refresh token")
		return
	}
	_ = app.repository.RefreshTokens.MarkRefreshTokenUsed(r.Context(), hash)
	_ = app.repository.RefreshTokens.RevokeRefreshToken(r.Context(), hash)
	newRaw, _ := auth.GenerateRefreshToken()
	_ = app.repository.RefreshTokens.CreateRefreshToken(r.Context(), rt.UserID, auth.HashRefreshToken(newRaw), rt.Platform.String, rt.DeviceName.String, r.UserAgent(), r.RemoteAddr, time.Now().UTC().Add(app.tokenManager.RefreshTokenTTL()))
	accessToken, _ := app.tokenManager.GenerateAccessToken(rt.UserID, rt.UserEmail, rt.UserRole)
	_ = writeJSON(w, http.StatusOK, map[string]string{"access_token": accessToken, "refresh_token": newRaw})
}

func (app *application) logoutHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	_ = readJson(w, r, &req)
	if req.RefreshToken != "" {
		_ = app.repository.RefreshTokens.RevokeRefreshToken(r.Context(), auth.HashRefreshToken(req.RefreshToken))
	}
	_ = writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
func (app *application) logoutAllHandler(w http.ResponseWriter, r *http.Request) {
	au := authUserFromCtx(r.Context())
	_ = app.repository.RefreshTokens.RevokeAllRefreshTokensForUser(r.Context(), au.UserID)
	_ = writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
func (app *application) meHandler(w http.ResponseWriter, r *http.Request) {
	au := authUserFromCtx(r.Context())
	_ = writeJSON(w, http.StatusOK, map[string]any{"user": map[string]any{"id": au.UserID, "email": au.Email, "role": au.Role}})
}

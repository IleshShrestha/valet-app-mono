package api

import (
	"log"
	"net/http"
)

func (app *Application) internalServerError(w http.ResponseWriter, r *http.Request, err error) {

	log.Printf("internal server error: %s path: %s error %s ", r.Method, r.URL.Path, err)
	writeJSONError(w, http.StatusInternalServerError, "The server encountered a problem.")
}

func (app *Application) badRequestResponse(w http.ResponseWriter, r *http.Request, err error) {

	log.Printf("bad request error: %s path: %s error %s ", r.Method, r.URL.Path, err)
	writeJSONError(w, http.StatusBadRequest, err.Error())
}

func (app *Application) notFoundResponse(w http.ResponseWriter, r *http.Request, err error) {

	log.Printf("requested material not found: %s path: %s error %s ", r.Method, r.URL.Path, err)
	writeJSONError(w, http.StatusNotFound, "not found")
}

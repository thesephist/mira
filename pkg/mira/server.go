package mira

import (
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
)

const dataFilePath = "./data/mira.txt"

func getData(w http.ResponseWriter, r *http.Request) {
	dataFile, err := os.Open(dataFilePath)
	if err != nil {
		io.WriteString(w, "error reading file")
		return
	}
	defer dataFile.Close()

	io.Copy(w, dataFile)
}

func postData(w http.ResponseWriter, r *http.Request) {
	dataFile, err := os.Open(dataFilePath)
	if err != nil {
		io.WriteString(w, "error reading file")
		return
	}
	defer dataFile.Close()

	io.Copy(w, dataFile)
	io.Copy(dataFile, r.Body)
}

func handleHome(w http.ResponseWriter, r *http.Request) {
	indexFile, err := os.Open("./static/index.html")
	if err != nil {
		io.WriteString(w, "error reading index")
		return
	}
	defer indexFile.Close()

	io.Copy(w, indexFile)
}

func Start() {
	r := mux.NewRouter()

	srv := &http.Server{
		Handler:      r,
		Addr:         "127.0.0.1:8998",
		WriteTimeout: 60 * time.Second,
		ReadTimeout:  60 * time.Second,
	}

	r.HandleFunc("/", handleHome)
	r.Methods("GET").Path("/data").HandlerFunc(getData)
	r.Methods("POST").Path("/data").HandlerFunc(postData)
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("./static"))))

	log.Printf("Plume listening on %s\n", srv.Addr)
	log.Fatal(srv.ListenAndServe())
}

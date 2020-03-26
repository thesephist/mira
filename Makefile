MIRA = ./cmd/mira.go

all: run


# initialize development workspace
init:
	go get github.com/rakyll/statik


run:
	go run -race ${MIRA}


# build for specific OS target
build-%:
	GOOS=$* GOARCH=amd64 go build -o xin-$* ${MIRA}


build:
	go build -o mira ${MIRA}


# clean any generated files
clean:
	rm -rvf xin xin-*

MIRA = ./cmd/mira.go

all: run


run:
	go run -race ${MIRA}


# build for specific OS target
build-%:
	GOOS=$* GOARCH=amd64 go build -o mira-$* ${MIRA}


build:
	go build -o mira ${MIRA}


# clean any generated files
clean:
	rm -rvf mira mira-*

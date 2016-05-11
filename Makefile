# temporary Makefile for use while figuring out the test rig
DOCKER_CERT_PATH ?=
DOCKER_HOST ?=
DOCKER_TLS_VERIFY ?=
LOG_LEVEL ?= DEBUG
SDC_ACCOUNT ?=

ifeq ($(DOCKER_CERT_PATH),)
	DOCKER_CTX := -v /var/run/docker.sock:/var/run/docker.sock
else
	DOCKER_CTX := -e DOCKER_TLS_VERIFY=$(DOCKER_TLS_VERIFY) -e DOCKER_CERT_PATH=$(DOCKER_CERT_PATH) -e DOCKER_HOST=$(DOCKER_HOST)
endif

build:
	cd tests && docker build -t="test" .

test-triton:
	docker run --rm \
		-e DOCKER_TLS_VERIFY=1 \
		-e DOCKER_CERT_PATH=/.sdc/docker/$(SDC_ACCOUNT) \
		-e DOCKER_HOST=$(DOCKER_HOST) \
		-v $(HOME)/.sdc:/.sdc \
		-v $(shell pwd):/src \
		-w /src test python tests/tests.py

test:
	docker run --rm $(DOCKER_CTX) \
		-e LOG_LEVEL=$(LOG_LEVEL) \
		-v $(shell pwd):/src \
		-w /src test python tests/tests.py

shell:
	docker run -it --rm $(DOCKER_CTX) \
		-e LOG_LEVEL=$(LOG_LEVEL) \
		-v $(shell pwd):/src \
		-w /src test python

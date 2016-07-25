SHELL := /bin/bash

NODE_VERSION=6.0.0
JSON_VERSION=9.0.3
NODEENV_VERSION=0.13.6
TRITON_VERSION=4.11.0
DOCKER_CERT_PATH ?=
DOCKER_HOST ?=
DOCKER_TLS_VERIFY ?=
LOG_LEVEL ?= INFO

# we get these from shippable if available
COMMIT ?= $(shell git rev-parse --short HEAD)
BRANCH ?= $(shell git rev-parse --abbrev-ref HEAD)
TAG := $(BRANCH)-$(COMMIT)

ifeq ($(DOCKER_CERT_PATH),)
        DOCKER_CTX := -v /var/run/docker.sock:/var/run/docker.sock
else
        DOCKER_CTX := -e DOCKER_TLS_VERIFY=1 -e DOCKER_CERT_PATH=$(DOCKER_CERT_PATH:$(HOME)%=%) -e DOCKER_HOST=$(DOCKER_HOST)
endif

help:
	@echo "'make localnode' builds and activates a local nodejs ${NODE_VERSION} environment"
	@echo "under venv/ directory."
	@echo
	@echo "'source venv/bin/activate' to activate the virtualenv"
	@echo "'deactivate' to disable the virtualenv"
	@echo "'make clean' to destroy virtualenv"
	@echo
	@echo "'make build' to build docker environment"
	@echo "'make ship' to docker push"

build:
	docker-compose -f local-compose.yml build
	docker tag -f workshop_nginx autopilotpattern/workshop-nginx:$(TAG)
	docker tag -f workshop_customers autopilotpattern/workshop-customers:$(TAG)
	docker tag -f workshop_sales autopilotpattern/workshop-sales:$(TAG)

ship:
	docker push autopilotpattern/workshop-nginx:$(TAG)
	docker push autopilotpattern/workshop-customers:$(TAG)
	docker push autopilotpattern/workshop-sales:$(TAG)

# Run tests by running the test container. Currently only runs locally
# but takes your DOCKER environment vars to use as the test runner's
# environment (ex. the test runner runs locally but starts containers
# on Triton if you're pointed to Triton)
TEST_RUN := python -m trace
ifeq ($(TRACE),)
	TEST_RUN := python
endif

test-runner:
	docker build -f tests/Dockerfile -t="joyent/test" .

KEY := ~/.ssh/TritonTestingKey

# configure triton profile
~/.triton/profiles.d/us-sw-1.json:
	{ \
	  cp /tmp/ssh/TritonTestingKey $(KEY) ;\
	  ssh-keygen -y -f $(KEY) > $(KEY).pub ;\
	  FINGERPRINT=$$(ssh-keygen -l -f $(KEY) | awk '{print $$2}' | sed 's/MD5://') ;\
	  printf '{"url": "https://us-sw-1.api.joyent.com", "name": "TritonTesting", "account": "timgross", "keyId": "%s"}' $${FINGERPRINT} > profile.json ;\
	}
	cat profile.json | triton profile create -f -
	-rm profile.json

test: ~/.triton/profiles.d/us-sw-1.json
	cp tests/tests.py . && \
		DOCKER_TLS_VERIFY=1 \
		DOCKER_CERT_PATH=~/.triton/docker/timgross@us-sw-1_api_joyent_com \
		DOCKER_HOST=tcp://us-sw-1.docker.joyent.com:2376 \
		COMPOSE_HTTP_TIMEOUT=300 \
		python tests.py

shell:
	docker run -it --rm $(DOCKER_CTX) \
		-e LOG_LEVEL=$(LOG_LEVEL) \
		-v $(shell pwd):/src \
		-w /src test python

localnode: venv/bin/json venv/bin/triton
	@echo
	@echo
	@echo "'source venv/bin/activate' to activate the virtualenv"
	@echo "'deactivate' to disable the virtualenv"
	@echo

clean:
	rm -rf venv

venv:
	virtualenv venv

venv/bin/nodeenv: | venv
	venv/bin/pip install nodeenv==${NODEENV_VERSION}

venv/bin/node: | venv/bin/nodeenv
	venv/bin/nodeenv --prebuilt -p -n ${NODE_VERSION}

venv/bin/json: | venv/bin/node
	. venv/bin/activate; venv/bin/npm install -g json@${JSON_VERSION}

venv/bin/triton: | venv/bin/node
	. venv/bin/activate; venv/bin/npm install -g triton@${TRITON_VERSION}

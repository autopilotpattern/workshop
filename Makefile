SHELL := /bin/bash
.PHONY: build ship test

## Display this help message
help:
	@awk '/^##.*$$/,/[a-zA-Z_-]+:/' $(MAKEFILE_LIST) | awk '!(NR%2){print $$0p}{p=$$0}' | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' | sort

# ------------------------------------------------
# Container builds

# we get these from shippable if available, otherwise from git
COMMIT ?= $(shell git rev-parse --short HEAD)
BRANCH ?= $(shell git rev-parse --abbrev-ref HEAD)
TAG := $(BRANCH)-$(COMMIT)

## Builds the application container images
build:
	docker-compose -f local-compose.yml build
	docker tag -f workshop_nginx autopilotpattern/workshop-nginx:$(TAG)
	docker tag -f workshop_customers autopilotpattern/workshop-customers:$(TAG)
	docker tag -f workshop_sales autopilotpattern/workshop-sales:$(TAG)

## Pushes the application container images to the Docker Hub
ship:
	docker push autopilotpattern/workshop-nginx:$(TAG)
	docker push autopilotpattern/workshop-customers:$(TAG)
	docker push autopilotpattern/workshop-sales:$(TAG)


# ------------------------------------------------
# Test running

LOG_LEVEL ?= INFO
KEY := ~/.ssh/TritonTestingKey

# if you pass `TRACE=1` into the call to `make` then the Python tests will
# run under the `trace` module (provides detailed call logging)
PYTHON := $(shell if [ -z ${TRACE} ]; then echo "python"; else echo "python -m trace"; fi)

# sets up the Docker context for running the build container locally
# `make test` runs in the build container on Shippable where the boot script
# will pull the source from GitHub first, but if we want to debug locally
# we'll need to mount the local source into the container.
# TODO: remove mount to ~/src/autopilotpattern/testing
LOCALRUN := \
	-e PATH=/root/venv/3.5/bin \
	-e COMPOSE_HTTP_TIMEOUT=300 \
	-w /src \
	-v ~/.triton:/root/.triton \
	-v ~/src/autopilotpattern/testing/testcases.py:/usr/local/lib/python2.7/dist-packages/testcases.py \
	-v $(shell pwd)/tests:/tests \
	-v $(shell pwd)/docker-compose.yml:/docker-compose.yml \
	-v $(shell pwd)/Makefile:/Makefile \
	joyent/test


## Build the test running container
test-runner:
	docker build -f tests/Dockerfile -t="joyent/test" .

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

# TODO: replace this user w/ a user specifically for testing
## Run the build container (on Shippable) and deploy tests on Triton
test: ~/.triton/profiles.d/us-sw-1.json
	cp tests/tests.py . && \
		DOCKER_TLS_VERIFY=1 \
		DOCKER_CERT_PATH=~/.triton/docker/timgross@us-sw-1_api_joyent_com \
		DOCKER_HOST=tcp://us-sw-1.docker.joyent.com:2376 \
		COMPOSE_HTTP_TIMEOUT=300 \
		PATH=/root/venv/3.5/bin \
		$(PYTHON) tests.py

## Run the build container locally and deploy tests on Triton.
test-local-triton: ~/.triton/profiles.d/us-sw-1.json
	docker run -it --rm \
		-e DOCKER_TLS_VERIFY=1 \
		-e DOCKER_CERT_PATH=~/.triton/docker/timgross@us-sw-1_api_joyent_com \
		-e DOCKER_HOST=tcp://us-sw-1.docker.joyent.com:2376 \
		$(LOCALRUN) $(PYTHON) tests.py


## Run the build container locally and deploy tests on local Docker too.
test-local-docker:
	docker run -it --rm \
		-v /var/run/docker.sock:/var/run/docker.sock \
		$(LOCALRUN) $(PYTHON) tests.py

## Run the build container locally but run a Python shell
shell:
	docker run -it --rm \
		-v /var/run/docker.sock:/var/run/docker.sock \
		$(LOCALRUN) python


# ------------------------------------------------
# Node.js local development environment helpers

NODE_VERSION=6.0.0
JSON_VERSION=9.0.3
NODEENV_VERSION=0.13.6
TRITON_VERSION=4.11.0


## Build and activate a local Node.js environment
localnode: venv/bin/json venv/bin/triton
	@echo
	@echo
	@echo "'source venv/bin/activate' to activate the virtualenv"
	@echo "'deactivate' to disable the virtualenv"
	@echo

## Destroy Node.js virtualenv
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

NODE_VERSION=6.0.0
JSON_VERSION=9.0.3
NODEENV_VERSION=0.13.6
TRITON_VERSION=4.11.0
DOCKER_CERT_PATH ?=
DOCKER_HOST ?=
DOCKER_TLS_VERIFY ?=
LOG_LEVEL ?= INFO
SDC_ACCOUNT ?=

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


#ifeq ($(DOCKER_CERT_PATH),)
#	DOCKER_CTX := -v /var/run/docker.sock:/var/run/docker.sock
#else
#	DOCKER_CTX := -e DOCKER_TLS_VERIFY=1 -e DOCKER_CERT_PATH=$(DOCKER_CERT_PATH:$(HOME)%=%) -e DOCKER_HOST=$(DOCKER_HOST)
#endif

build:
	docker-compose -f local-compose.yml build
	docker tag workshop_nginx autopilotpattern/workshop-nginx
	docker tag workshop_customers autopilotpattern/workshop-customers
	docker tag workshop_sales autopilotpattern/workshop-sales
	docker build -f tests/Dockerfile -t="test" .

ship:
	docker push autopilotpattern/workshop-nginx
	docker push autopilotpattern/workshop-customers
	docker push autopilotpattern/workshop-sales

# Run tests by running the test container. Currently only runs locally
# but takes your DOCKER environment vars to use as the test runner's
# environment (ex. the test runner runs locally but starts containers
# on Triton if you're pointed to Triton)
TEST_RUN := python -m trace
ifeq ($(TRACE),)
	TEST_RUN := python
endif

test:
	unset DOCKER_HOST \
	&& unset DOCKER_CERT_PATH \
	&& unset DOCKER_TLS_VERIFY \
	&& docker run --rm $(DOCKER_CTX) \
		-e LOG_LEVEL=$(LOG_LEVEL) \
		-e COMPOSE_HTTP_TIMEOUT=300 \
		-v ${HOME}/.triton:/.triton \
		-v ${HOME}/src/autopilotpattern/testing/testcases.py:/usr/lib/python2.7/site-packages/testcases.py \
		-v $(shell pwd)/tests/tests.py:/src/tests.py \
		-w /src test $(TEST_RUN) tests.py

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

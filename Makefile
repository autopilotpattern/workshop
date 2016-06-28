# temporary Makefile for use while figuring out the test rig
DOCKER_CERT_PATH ?=
DOCKER_HOST ?=
DOCKER_TLS_VERIFY ?=
LOG_LEVEL ?= DEBUG
SDC_ACCOUNT ?=

ifeq ($(DOCKER_CERT_PATH),)
	DOCKER_CTX := -v /var/run/docker.sock:/var/run/docker.sock
else
	DOCKER_CTX := -e DOCKER_TLS_VERIFY=1 -e DOCKER_CERT_PATH=$(DOCKER_CERT_PATH:$(HOME)%=%) -e DOCKER_HOST=$(DOCKER_HOST)
endif

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
		-w /src test python tests.py

shell:
	docker run -it --rm $(DOCKER_CTX) \
		-e LOG_LEVEL=$(LOG_LEVEL) \
		-v $(shell pwd):/src \
		-w /src test python

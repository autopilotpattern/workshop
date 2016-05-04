NODE_VERSION=6.0.0
JSON_VERSION=9.0.3
NODEENV_VERSION=0.13.6
TRITON_VERSION=4.11.0

localnode: venv/bin/json venv/bin/triton
	@echo
	@echo
	@echo "'source venv/bin/activate' to activate the virtualenv"
	@echo "'deactivate' to disable the virtualenv"
	@echo

help:
	@echo 'make localnode' builds and activates a local nodejs ${NODE_VERSION} environment
	@echo 'under venv/ directory.'
	@echo
	@echo "'source venv/bin/activate' to activate the virtualenv"
	@echo "'deactivate' to disable the virtualenv"
	@echo "'make clean' to destroy virtualenv"
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

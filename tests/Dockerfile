FROM drydock/u14pyt:prod

RUN apt-get install nodejs git

RUN git clone https://github.com/autopilotpattern/testing.git \
    && cd testing \
    && pip install -r requirements.txt \
    && python setup.py install \
    && npm install -g triton json

COPY tests/tests.py /src/tests.py
COPY docker-compose.yml /src/docker-compose.yml

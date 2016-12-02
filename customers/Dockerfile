# a Node.js application container including ContainerPilot
FROM alpine:3.4

# install curl
RUN apk update && apk add \
    nodejs \
    curl \
    && rm -rf /var/cache/apk/*

# install all dependencies
COPY package.json /opt/customers/
RUN cd /opt/customers && npm install

# get ContainerPilot release
ENV CONTAINERPILOT_VERSION 2.4.1
RUN export CP_SHA1=198d96c8d7bfafb1ab6df96653c29701510b833c \
    && curl -Lso /tmp/containerpilot.tar.gz \
         "https://github.com/joyent/containerpilot/releases/download/${CONTAINERPILOT_VERSION}/containerpilot-${CONTAINERPILOT_VERSION}.tar.gz" \
    && echo "${CP_SHA1}  /tmp/containerpilot.tar.gz" | sha1sum -c \
    && tar zxf /tmp/containerpilot.tar.gz -C /bin \
    && rm /tmp/containerpilot.tar.gz

# add our application
COPY customers.js /opt/customers/
COPY lib/ /opt/customers/lib/

# add ContainerPilot configuration and scripts
COPY reload.sh /usr/local/bin/reload.sh
COPY containerpilot.json /etc/containerpilot.json
ENV CONTAINERPILOT=file:///etc/containerpilot.json

EXPOSE 4000
CMD [ "/bin/containerpilot", \
      "node", \
      "/opt/customers/customers.js" \
]

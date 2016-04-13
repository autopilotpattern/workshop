# a Node.js application container including ContainerPilot
FROM gliderlabs/alpine:3.3

# install curl
RUN apk update && apk add \
    nodejs \
    curl \
    && rm -rf /var/cache/apk/*

# install the Express.js dependency
COPY package.json /opt/sales/
RUN cd /opt/sales && npm install

# get ContainerPilot release
ENV CONTAINERPILOT_VERSION 2.0.0
RUN export CP_SHA1=a82b1257328551eb93fc9a8cc1dd3f3e64664dd5 \
    && curl -Lso /tmp/containerpilot.tar.gz \
         "https://github.com/joyent/containerpilot/releases/download/${CONTAINERPILOT_VERSION}/containerpilot-${CONTAINERPILOT_VERSION}.tar.gz" \
    && echo "${CP_SHA1}  /tmp/containerpilot.tar.gz" | sha1sum -c \
    && tar zxf /tmp/containerpilot.tar.gz -C /bin \
    && rm /tmp/containerpilot.tar.gz

# add our application
COPY sales.js /opt/sales/

# add ContainerPilot configuration
COPY containerpilot.json /etc/containerpilot.json
ENV CONTAINERPILOT=file:///etc/containerpilot.json

EXPOSE 3000
CMD [ "/bin/containerpilot", \
      "node", \
      "/opt/sales/sales.js" \
]

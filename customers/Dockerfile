# a Node.js application container including Containerbuddy
FROM node:slim

# install curl
RUN apt-get update && \
    apt-get install -y \
    curl && \
    rm -rf /var/lib/apt/lists/*

# install the Express.js dependency
COPY package.json /opt/customers/
RUN cd /opt/customers && npm install

# get Containerbuddy release
RUN export CB=containerbuddy-0.1.1 &&\
   curl -Lo /tmp/${CB}.tar.gz \
   https://github.com/joyent/containerbuddy/releases/download/0.1.1/${CB}.tar.gz && \
   tar -xf /tmp/${CB}.tar.gz && \
   mv /containerbuddy /bin/

# add our application
COPY customers.js /opt/customers/

# add Containerbuddy configuration
COPY containerbuddy.json /etc/containerbuddy.json
ENV CONTAINERBUDDY=file:///etc/containerbuddy.json

EXPOSE 4000
CMD [ "/bin/containerbuddy", \
      "node", \
      "/opt/customers/customers.js" \
]

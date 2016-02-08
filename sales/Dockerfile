# a Node.js application container
FROM gliderlabs/alpine:3.3

# install curl
RUN apk update && apk add \
    nodejs \
    && rm -rf /var/cache/apk/*

# install the Express.js dependency
COPY package.json /opt/sales/
RUN cd /opt/sales && npm install

# add our application
COPY sales.js /opt/sales/

EXPOSE 3000
CMD [ "node", \
      "/opt/sales/sales.js" \
]

# a minimal Nginx container
FROM gliderlabs/alpine:3.3

# install nginx
RUN apk update && apk add \
    nginx \
    && rm -rf /var/cache/apk/*

# add static Nginx content
COPY index.* /usr/share/nginx/html/

# add Nginx virtualhost configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

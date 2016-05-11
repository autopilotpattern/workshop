# a minimal Nginx container including ContainerPilot and a simple virtulhost config
FROM gliderlabs/alpine:3.3

# install nginx and tooling we need
RUN apk update && apk add \
    nginx \
    curl \
    unzip \
    && rm -rf /var/cache/apk/*

# we use consul-template to re-write our Nginx virtualhost config
RUN curl -Lo /tmp/consul_template_0.14.0_linux_amd64.zip https://releases.hashicorp.com/consul-template/0.14.0/consul-template_0.14.0_linux_amd64.zip && \
    unzip /tmp/consul_template_0.14.0_linux_amd64.zip && \
    mv consul-template /bin

# get ContainerPilot release
ENV CONTAINERPILOT_VERSION 2.0.1
RUN export CP_SHA1=a4dd6bc001c82210b5c33ec2aa82d7ce83245154 \
    && curl -Lso /tmp/containerpilot.tar.gz \
         "https://github.com/joyent/containerpilot/releases/download/${CONTAINERPILOT_VERSION}/containerpilot-${CONTAINERPILOT_VERSION}.tar.gz" \
    && echo "${CP_SHA1}  /tmp/containerpilot.tar.gz" | sha1sum -c \
    && tar zxf /tmp/containerpilot.tar.gz -C /bin \
    && rm /tmp/containerpilot.tar.gz

# add ContainerPilot configuration and onChange handler
COPY containerpilot.json /etc/containerpilot/
COPY reload-nginx.sh /bin

# add static Nginx content
COPY index.* /usr/share/nginx/html/

# add Nginx virtualhost configuration
COPY nginx.conf /etc/nginx/nginx.conf

# add Nginx virtualhost template that we'll overwrite
COPY nginx.conf.ctmpl /etc/containerpilot/

EXPOSE 80

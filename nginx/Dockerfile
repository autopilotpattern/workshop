# a minimal Nginx container including Containerbuddy and a simple virtulhost config
FROM nginx:latest

# install some tooling we need for the build
RUN apt-get update && \
    apt-get install -y \
    curl \
    unzip && \
    rm -rf /var/lib/apt/lists/*

# we use consul-template to re-write our Nginx virtualhost config
RUN curl -Lo /tmp/consul_template_0.11.0_linux_amd64.zip https://github.com/hashicorp/consul-template/releases/download/v0.11.0/consul_template_0.11.0_linux_amd64.zip && \
    unzip /tmp/consul_template_0.11.0_linux_amd64.zip && \
    mv consul-template /bin

# get Containerbuddy release
RUN export CB=containerbuddy-0.1.1 &&\
   curl -Lo /tmp/${CB}.tar.gz \
   https://github.com/joyent/containerbuddy/releases/download/0.1.1/${CB}.tar.gz && \
   tar -xf /tmp/${CB}.tar.gz && \
   mv /containerbuddy /bin/

# add Containerbuddy configuration and onChange handler
COPY containerbuddy.json /etc/containerbuddy/

# add static Nginx content
COPY index.* /usr/share/nginx/html/

# add Nginx virtualhost configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# add Nginx virtualhost template that we'll overwrite
COPY nginx.conf.ctmpl /etc/containerbuddy/

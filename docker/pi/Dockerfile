FROM resin/rpi-raspbian

MAINTAINER Nico Janssens, nico.b.janssens@gmail.com

# install missing packages
RUN apt-get update
RUN apt-get -y install python-setuptools rsyslog

# install supervisor
RUN easy_install supervisor
RUN mkdir -p /var/log/supervisor
# create directory for child images to store configuration in
RUN mkdir -p /etc/supervisor/conf.d

# create nocloud user
RUN /usr/sbin/useradd --create-home --home-dir /home/nocloud --shell /bin/bash nocloud
RUN echo 'nocloud:nocloud' |chpasswd

# download nodejs
RUN wget -O node.tar.gz http://nodejs.org/dist/v0.10.24/node-v0.10.24-linux-arm-pi.tar.gz
RUN tar -C /usr/local/ --strip-components=1 -zxvf node.tar.gz
RUN rm node.tar.gz

# create nodejs user
RUN /usr/sbin/useradd --create-home --home-dir /home/nodejs --shell /bin/false nodejs

# copy kadserver code
ADD ../.././ /home/nodejs/

# copy supervisor config files
ADD ../../config/supervisor.conf /etc/supervisor.conf
ADD ../../config/nodejs.sv.ini /etc/supervisor/conf.d/

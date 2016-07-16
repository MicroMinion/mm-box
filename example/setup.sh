  #!/bin/bash
sudo apt-get install docker docker-compose &&
wget https://download.elastic.co/beats/filebeat/filebeat_1.2.3_amd64.deb &&
sudo dpkg --install filebeat_1.2.3_amd64.deb &&
sudo docker build -f Dockerfile.elk -t mm/elk .

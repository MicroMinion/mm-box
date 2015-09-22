#!/bin/bash

# Exit upon errors
set -e

# register Ox Tales' key
eval `ssh-agent -s`
ssh-add ./docker/key_bitbucket_flunky_kad

# create ~/.ssh/config and disable StrictHostKeyChecking
if [ ! -f ~/.ssh/config ]; then
  touch ~/.ssh/config
fi
echo -e "Host *\n\tStrictHostKeyChecking no\n" >> ~/.ssh/config

# install app dependencies
echo 'npm install'
npm install -g node-gyp --verbose
npm install --verbose

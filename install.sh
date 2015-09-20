#!/bin/bash

# Exit upon errors
set -e

eval `ssh-agent -s`
ssh-add ./docker/key_bitbucket_flunky_kad

# install app dependencies
echo 'npm install'
npm install -g node-gyp
npm install

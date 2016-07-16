#!/bin/bash

./start-elk.sh &
./start-filebeat.sh &
node example.js 4 &> out.log

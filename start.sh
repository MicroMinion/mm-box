#!/bin/bash

# Exit upon errors
set -e

function log_info {
  if [ "$QUIET" == "" ]; then
    echo -e "`basename $0`: [\e[32mINFO\e[0m] " $1
  fi
}

if [ $# -eq 0 ]; then
    log_info "launching node index.js"
    node index.js
fi

if [ $# -eq 1 ]; then
    log_info "launching NODE_APP_INSTANCE=$1 node index.js"
    NODE_APP_INSTANCE=$1 node index.js
fi

if [ $# -eq 2 ]; then
    log_info "NODE_ENV=$1 NODE_APP_INSTANCE=$2 node index.js"
    NODE_ENV=$1 NODE_APP_INSTANCE=$2 node index.js
fi

#!/usr/bin/env bash
NODE_TLS_REJECT_UNAUTHORIZED=0 ROUTER_BASE_PATH=/spoke BASE_ASSETS_PATH=https://localhost:9090/ HUBS_SERVER=localhost:4000 RETICULUM_SERVER=localhost:4000 yarn start

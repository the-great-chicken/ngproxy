
# nodejs-reverse-proxy / ngproxy

The goal of this project is to provide tools to create a simple TCP reverse proxy in node js, with the following goals

- the reverse proxy could serve either as a reverse proxy server (further referred to as an RPS), or a reverse proxy client (further referred to as an RPC). The RPC would connect to the RPS, acquire the lock on the reverse proxy, and then any client connecting to the RPS would open a connection between the RPC and the true server.
- from this rule, one can see that a client connecting to the RPS should have an authorized API key
- if the server needs to have data, the RPC should commit it and fetch it from another server (using a push / pull engine, either the localhost pull / push engine or the git (and/or github) pull / push engine)

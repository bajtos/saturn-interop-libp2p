# saturn-interop-libp2p

A proof of concept for using libp2p as the communication channel between Saturn L1 and L2 nodes

## Setup

Create TLS private key and certificate for the HTTPS server.

```bash
$ openssl req -nodes -new -x509 -keyout bench/.cache/server.key -out bench/.cache/server.cert

openssl genrsa -out bench/.cache/server-key.pem 2048
openssl req -new -sha256 -key bench/.cache/server-key.pem -out bench/.cache/server-csr.pem
openssl x509 -req -in bench/.cache/server-csr.pem -signkey bench/.cache/server-key.pem -out bench/.cache/server-cert.pem
rm bench/.cache/server-csr.pem
```

Remember to set the `Common Name` to `localhost`.

## Basic use

In terminal 1, start the L1 node:

```shell
$ node l1-node.js
```

In terminal 2, start the L2 node:

```shell
$ node l2-node.js
```

## Generating a new peer id

Run the following command to generate a new private & public key.

```shell
$ node generate-peer-id.js
```

The string output can be unmarshalled back into a peer id using the following code.

```js
await createFromProtobuf(Buffer.from(peerIdString, 'base64'))
```

## TODO

- [ ] Benchmark performance of large file transfer: HTTP vs libp2p

- [ ] Add HTTP GW-like API to L1 node

- [ ] Rework L1 to keep a swarm of L2 nodes

- [ ] Forward HTTP response headers from L2 node, or at least content type

- [ ] Deploy L1 node to Fly.io via Docker:
  - https://fly.io/docs/languages-and-frameworks/node/
  - https://fly.io/docs/app-guides/udp-and-tcp/

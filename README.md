# saturn-interop-libp2p

A proof of concept for using libp2p as the communication channel between Saturn L1 and L2 nodes

## Basic use

1. The L1 node is deployed to Fly.io. Open the following URL in your browser.

   [https://saturn-link-poc.fly.dev](https://saturn-link-poc.fly.dev)

   The page should show an empty list of nodes.

2. In your terminal, start the L2 node:

   ```shell
   $ node l2-node.js
   ```

3. Return back to the website. Check that your L2 node is listed on the page.

4. Open one of the example links or create your own using your favourite CID.

## Generating a new peer id

Run the following command to generate a new private & public key.

```shell
$ node generate-peer-id.js
```

The string output can be unmarshalled back into a peer id using the following code.

```js
await createFromProtobuf(Buffer.from(peerIdString, 'base64'))
```

## Benchmarking

### Setup

Create TLS private key and certificate for the HTTPS server.

```bash
$ openssl req -nodes -new -x509 -keyout bench/.cache/server.key -out bench/.cache/server.cert

openssl genrsa -out bench/.cache/server-key.pem 2048
openssl req -new -sha256 -key bench/.cache/server-key.pem -out bench/.cache/server-csr.pem
openssl x509 -req -in bench/.cache/server-csr.pem -signkey bench/.cache/server-key.pem -out bench/.cache/server-cert.pem
rm bench/.cache/server-csr.pem
```

Remember to set the `Common Name` to `localhost`.

### Execution

Run the following command to compare the performance of libp2p (TCP+noise) vs HTTPS.

```shell
$ node bench/main.js
```

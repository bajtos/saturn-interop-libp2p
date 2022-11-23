# saturn-interop-libp2p

A proof of concept for using libp2p as the communication channel between Saturn L1 and L2 nodes

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

import { createEd25519PeerId, exportToProtobuf } from '@libp2p/peer-id-factory'

const peerId = await createEd25519PeerId()
const bytes = exportToProtobuf(peerId)
console.log(Buffer.from(bytes).toString('base64'))

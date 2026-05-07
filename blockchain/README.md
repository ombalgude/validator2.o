# Blockchain Integration

The running backend integration uses the EVM contract in `contract.sol` through
`ethers` from `backend/config/blockchain.js`.

## Active Flow

- Upload records call `addDocument(bytes32)` with the trusted certificate hash.
- Candidate validation calls `verifyDocument(bytes32)` with the candidate
  certificate hash.
- Admin blockchain routes are protected by backend JWT auth and the `admin`
  role.

Set these backend environment variables to enable chain calls:

```env
BLOCKCHAIN_ENABLED=true
RPC_URL=<rpc-url>
PRIVATE_KEY=<issuer-private-key>
CONTRACT_ADDRESS=<deployed-contract-address>
```

When blockchain variables are not configured, backend routes continue to run
and return `blockchainRecorded: false` or `blockchainVerification.available:
false`.

## Contract API

`contract.sol` exposes:

- `addIssuer(address issuer)`
- `removeIssuer(address issuer)`
- `addDocument(bytes32 hash)`
- `revokeDocument(bytes32 hash)`
- `verifyDocument(bytes32 hash)`

Run the active contract/API consistency check with:

```sh
npm test
```

## Anchor Program

`programs/lib.rs` and `Anchor.toml` are still present as an experimental Solana
implementation. They are not the code path used by the current backend.
Run the Anchor suite with `npm run test:anchor` after installing the Anchor CLI.

import { SuiJsonRpcClient, JsonRpcHTTPTransport } from "@mysten/sui/jsonRpc";

export const TATUM_RPC_URL = "https://sui-testnet.gateway.tatum.io";
export const TATUM_API_KEY = process.env.NEXT_PUBLIC_TATUM_API_KEY!;

// Standard public testnet node — CORS-open, used for all browser-side reads
const PUBLIC_RPC = "https://fullnode.testnet.sui.io:443";

export const suiClient = new SuiJsonRpcClient({
  network: "testnet",
  transport: new JsonRpcHTTPTransport({ url: PUBLIC_RPC }),
});

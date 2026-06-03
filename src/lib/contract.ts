import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { suiClient } from "./tatum";

export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID ?? "";
export const MODULE = "fuse";

export const COND = {
  PING:     0,
  DATE:     1,
  GUARDIAN: 2,
  WALLET:   3,
  COMBINED: 4,
} as const;

export const RULE = {
  REVEAL: 0,
  BURN:   1,
} as const;

export interface CreateVaultArgs {
  blobId:            string;
  heir:              string;
  deliveryMethod:    string;
  heirContact:       string;
  conditionType:     number;
  intervalMs:        number;
  gracePeriodMs:     number;
  fireDateMs:        number;
  triggerWallet:     string | null;
  guardians:         string[];
  guardianThreshold: number;
  rule:              number;
  conditionLabel:    string;
}

export function buildCreateVaultTx(args: CreateVaultArgs): Transaction {
  const tx = new Transaction();

  const optionAddressBytes = args.triggerWallet
    ? bcs.option(bcs.Address).serialize(args.triggerWallet).toBytes()
    : bcs.option(bcs.Address).serialize(null).toBytes();

  const guardianBytes = bcs.vector(bcs.Address).serialize(args.guardians).toBytes();

  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::create_vault`,
    arguments: [
      tx.pure.string(args.blobId),
      tx.pure.address(args.heir),
      tx.pure.string(args.deliveryMethod),
      tx.pure.string(args.heirContact),
      tx.pure.u8(args.conditionType),
      tx.pure.u64(args.intervalMs),
      tx.pure.u64(args.gracePeriodMs),
      tx.pure.u64(args.fireDateMs),
      tx.pure(optionAddressBytes),
      tx.pure(guardianBytes),
      tx.pure.u64(args.guardianThreshold),
      tx.pure.u8(args.rule),
      tx.pure.string(args.conditionLabel),
      tx.object("0x6"),
    ],
  });

  return tx;
}

export function buildCheckInTx(vaultId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::check_in`,
    arguments: [tx.object(vaultId), tx.object("0x6")],
  });
  return tx;
}

export function buildMarkDormantTx(vaultId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::mark_dormant`,
    arguments: [tx.object(vaultId), tx.object("0x6")],
  });
  return tx;
}

export function buildSettleTx(vaultId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::settle`,
    arguments: [tx.object(vaultId), tx.object("0x6")],
  });
  return tx;
}

export function buildGuardianConfirmTx(vaultId: string): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE}::guardian_confirm`,
    arguments: [tx.object(vaultId), tx.object("0x6")],
  });
  return tx;
}

export async function fetchVaultsByOwner(owner: string) {
  const res = await suiClient.queryEvents({
    query: { MoveEventType: `${PACKAGE_ID}::${MODULE}::VaultCreated` },
    limit: 50,
  });

  const ownerVaults = res.data.filter(
    (e) => (e.parsedJson as { owner: string })?.owner === owner
  );

  const vaultIds = ownerVaults.map(
    (e) => (e.parsedJson as { vault_id: string })?.vault_id
  );

  const objects = await Promise.all(
    vaultIds.map((id) =>
      suiClient.getObject({ id, options: { showContent: true } })
    )
  );

  return objects
    .filter((o) => o.data?.content?.dataType === "moveObject")
    .map((o) => ({
      id: o.data!.objectId,
      ...(o.data!.content as { fields: Record<string, unknown> }).fields,
    }));
}

export async function fetchVault(vaultId: string) {
  const obj = await suiClient.getObject({
    id: vaultId,
    options: { showContent: true },
  });
  if (obj.data?.content?.dataType !== "moveObject") return null;
  return {
    id: obj.data.objectId,
    ...(obj.data.content as { fields: Record<string, unknown> }).fields,
  };
}

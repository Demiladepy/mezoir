import {
  Deposit as VeBTCDeposit,
  Transfer as VeBTCTransfer,
} from "../generated/VeBTC/VeBTC";
import {
  Deposit as VeMEZODeposit,
  Transfer as VeMEZOTransfer,
} from "../generated/VeMEZO/VeMEZO";
import { Voted } from "../generated/MockGauge/MockGauge";
import { VePosition, VoteCast } from "../generated/schema";
import { Address } from "@graphprotocol/graph-ts";

const ZERO = Address.fromString("0x0000000000000000000000000000000000000000");

export function handleVeBTCDeposit(event: VeBTCDeposit): void {
  let id = "vebtc-" + event.params.tokenId.toString();
  let pos = VePosition.load(id);
  if (pos == null) {
    pos = new VePosition(id);
    pos.createdAt = event.block.timestamp;
  }
  pos.contract = "veBTC";
  pos.tokenId = event.params.tokenId;
  pos.owner = event.params.provider;
  pos.amount = event.params.value;
  pos.unlockTime = event.params.locktime;
  pos.updatedAt = event.block.timestamp;
  pos.active = true;
  pos.save();
}

export function handleVeBTCTransfer(event: VeBTCTransfer): void {
  let id = "vebtc-" + event.params.tokenId.toString();
  if (event.params.to.equals(ZERO)) {
    let pos = VePosition.load(id);
    if (pos != null) {
      pos.active = false;
      pos.updatedAt = event.block.timestamp;
      pos.save();
    }
  } else {
    let pos = VePosition.load(id);
    if (pos != null) {
      pos.owner = event.params.to;
      pos.updatedAt = event.block.timestamp;
      pos.save();
    }
  }
}

export function handleVeMEZODeposit(event: VeMEZODeposit): void {
  let id = "vemezo-" + event.params.tokenId.toString();
  let pos = VePosition.load(id);
  if (pos == null) {
    pos = new VePosition(id);
    pos.createdAt = event.block.timestamp;
  }
  pos.contract = "veMEZO";
  pos.tokenId = event.params.tokenId;
  pos.owner = event.params.provider;
  pos.amount = event.params.value;
  pos.unlockTime = event.params.locktime;
  pos.updatedAt = event.block.timestamp;
  pos.active = true;
  pos.save();
}

export function handleVeMEZOTransfer(event: VeMEZOTransfer): void {
  let id = "vemezo-" + event.params.tokenId.toString();
  if (event.params.to.equals(ZERO)) {
    let pos = VePosition.load(id);
    if (pos != null) {
      pos.active = false;
      pos.updatedAt = event.block.timestamp;
      pos.save();
    }
  } else {
    let pos = VePosition.load(id);
    if (pos != null) {
      pos.owner = event.params.to;
      pos.updatedAt = event.block.timestamp;
      pos.save();
    }
  }
}

export function handleVoted(event: Voted): void {
  let id =
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let vote = new VoteCast(id);
  vote.gauge = event.address;
  vote.tokenId = event.params.tokenId;
  vote.voter = event.params.voter;
  vote.weight = event.params.weight;
  vote.timestamp = event.block.timestamp;
  vote.save();
}

import { NS } from '@ns'
import { doProgramBuys } from "lib/util";

export async function main(ns : NS) : Promise<void> {
	doProgramBuys(ns);
}
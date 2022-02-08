import { NS } from '@ns'
import { doProgramBuys } from "bbutil";

export async function main(ns : NS) : Promise<void> {
	doProgramBuys(ns);
}
import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
	for (const faction of ns.getPlayer().factions) {
		ns.corporation.bribe(faction, ns.corporation.getCorporation().funds * 0.001, 0)
	}
}
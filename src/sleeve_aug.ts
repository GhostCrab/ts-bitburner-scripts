import { NS, AugmentationStats } from "@ns";

function isHackUseful(stats: AugmentationStats): boolean {
    return true;
    if (stats.company_rep_mult) return true;
    if (stats.faction_rep_mult) return true;
    if (stats.hacking_chance_mult) return true;
    if (stats.hacking_exp_mult) return true;
    if (stats.hacking_grow_mult) return true;
    if (stats.hacking_money_mult) return true;
    if (stats.hacking_mult) return true;
    if (stats.hacking_speed_mult) return true;
	if (stats.crime_money_mult) return true;

    return false;
}

export async function main(ns: NS): Promise<void> {
    let purchaseableAugs: {
        sleeveId: number;
        cost: number;
        name: string;
        stats: AugmentationStats;
    }[] = [];
    for (let sleeveId = 0; sleeveId < ns.sleeve.getNumSleeves(); sleeveId++) {
        for (const aug of ns.sleeve.getSleevePurchasableAugs(sleeveId)) {
            const stats = ns.getAugmentationStats(aug.name);
            if (isHackUseful(stats)) {
                purchaseableAugs.push({
                    sleeveId: sleeveId,
                    cost: aug.cost,
                    name: aug.name,
                    stats: stats,
                });
            }
        }
    }

	purchaseableAugs = purchaseableAugs.sort((a, b) => a.cost - b.cost)

	for (const aug of purchaseableAugs) {
		// ns.tprintf("%d - %s [%s]", aug.sleeveId, aug.name, ns.nFormat(aug.cost, "$0.000a"))
		if (aug.cost > ns.getPlayer().money)
			break;
		ns.sleeve.purchaseSleeveAug(aug.sleeveId, aug.name);
	}
}

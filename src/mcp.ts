import { NS, AugmentationStats } from "@ns";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { doBuyAndSoftenAll, doBackdoors, ALL_FACTIONS, stFormat } from "bbutil";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function printAugStats(ns: NS, stats: AugmentationStats) {
    for (const [key, val] of Object.entries(stats)) {
        ns.tprintf("%30s %s", key, val);
    }
}

class Augmentation {
    name: string;
    faction: string;
    price: number;
    rep: number;
    stats: AugmentationStats;
    owned: boolean;
    installed: boolean;
    purchaseable: boolean;
    dep: string;
    str: string;

    constructor(ns: NS, name: string, faction: string) {
        const ownedAugs = ns.getOwnedAugmentations(true);
        const installedAugs = ns.getOwnedAugmentations();
        const factionRep =
            (ns.getPlayer().currentWorkFactionName === faction ? ns.getPlayer().workRepGained : 0) +
            ns.getFactionRep(faction);
        this.name = name;
        this.faction = faction;
        this.price = ns.getAugmentationPrice(this.name);
        this.rep = ns.getAugmentationRepReq(this.name);
        this.stats = ns.getAugmentationStats(this.name);
        this.owned = ownedAugs.includes(this.name);
        this.installed = installedAugs.includes(this.name);
        this.purchaseable = factionRep >= this.rep;
        let dep = ns.getAugmentationPrereq(this.name)[0];
        if (dep !== undefined && (ownedAugs.includes(dep) || installedAugs.includes(dep))) dep = "";
        this.dep = dep;
        let installedStr = this.installed
            ? "INSTALLED"
            : this.owned
            ? "OWNED"
            : this.purchaseable
            ? "PURCHASEABLE"
            : "";

        if (ns.getPlayer().currentWorkFactionName === faction && installedStr === "") {
            const repGainPerMs = (ns.getPlayer().workRepGainRate * 5) / 1000;
            installedStr = stFormat(ns, (this.rep - factionRep) / repGainPerMs);
        }
        this.str = ns.sprintf(
            "%s: %s - %s [%s] %s",
            this.faction,
            this.name,
            ns.nFormat(this.price, "$0.000a"),
            ns.nFormat(this.rep, "0.000a"),
            installedStr
        );
    }

    toString() {
        return this.str;
    }

    isHackUseful() {
        if (this.name === "Neuroflux Governor") return false;
        //return true;
        // if (this.stats.company_rep_mult) return true;
        // if (this.stats.faction_rep_mult) return true;
        if (this.stats.hacking_chance_mult) return true;
        if (this.stats.hacking_exp_mult) return true;
        if (this.stats.hacking_grow_mult) return true;
        if (this.stats.hacking_money_mult) return true;
        if (this.stats.hacking_mult) return true;
        if (this.stats.hacking_speed_mult) return true;
        if (this.stats.hacknet_node_core_cost_mult) return true;
        if (this.stats.hacknet_node_level_cost_mult) return true;
        if (this.stats.hacknet_node_money_mult) return true;
        if (this.stats.hacknet_node_purchase_cost_mult) return true;
        if (this.stats.hacknet_node_ram_cost_mult) return true;
        if (
            this.name === "BitRunners Neurolink" ||
            this.name === "CashRoot Starter Kit" ||
            this.name === "PCMatrix" ||
            this.name === "Neuroreceptor Management Implant" ||
            this.name === "The Red Pill"
        )
            return true;

        return false;
    }
}

export async function main(ns: NS): Promise<void> {
    doBuyAndSoftenAll(ns);
    await doBackdoors(ns);

    const player = ns.getPlayer();

    const checkFactions = player.factions.concat(ns.checkFactionInvitations());
    const sortedFactions = checkFactions.sort(
        (a, b) =>
            (ns.getPlayer().currentWorkFactionName === b ? ns.getPlayer().workRepGained : 0) +
            ns.getFactionRep(b) -
            ((ns.getPlayer().currentWorkFactionName === a ? ns.getPlayer().workRepGained : 0) + ns.getFactionRep(a))
    );
    //let sortedFactions = ALL_FACTIONS.sort((a, b) => ns.getFactionRep(b) - ns.getFactionRep(a));

    let allPurchaseableAugs = [];
    let topFaction = true;
    for (const faction of sortedFactions) {
        const augs = ns
            .getAugmentationsFromFaction(faction)
            .map((name) => {
                return new Augmentation(ns, name, faction);
            })
            .sort((a, b) => a.rep - b.rep);
        const augsToBuy = [];
        for (const aug of augs) {
            if (aug.isHackUseful() && !aug.owned) {
                augsToBuy.push(aug);
            }
            if (aug.isHackUseful() && aug.purchaseable && !aug.owned && !aug.installed) {
                allPurchaseableAugs.push(aug);
            }
        }

        if (augsToBuy.length === 0 && !topFaction) continue;

        ns.tprintf(
            "%s (rep: %d):",
            faction,
            (ns.getPlayer().currentWorkFactionName === faction ? ns.getPlayer().workRepGained : 0) +
                ns.getFactionRep(faction)
        );
        for (const aug of augsToBuy) {
            ns.tprintf("  %s", aug);
            // printAugStats(aug.stats);
        }

        topFaction = false;
    }

    for (let i = 0; i < allPurchaseableAugs.length; i++) {
        const checkName = allPurchaseableAugs[i].name;
        let j = i + 1;
        while (j < allPurchaseableAugs.length) {
            if (allPurchaseableAugs[j].name === checkName) {
                allPurchaseableAugs.splice(j, 1);
            } else {
                j++;
            }
        }
    }

    allPurchaseableAugs = allPurchaseableAugs.sort((a, b) => b.price - a.price);

    // reorder array to buy dependent augs first and purge augs that cant be bought
    // because of a missing dependency, need to loop multiple times until no more dependencies are found
    while (true) {
        let didDepMove = false;
        for (let i = 0; i < allPurchaseableAugs.length; i++) {
            const augName = allPurchaseableAugs[i].name;
            const depName = allPurchaseableAugs[i].dep;
            if (depName === "") continue;

            let foundDep = false;
            // check to see if we've already re-organized this dep and it is placed higher in the queue
            for (let k = 0; k < i; k++) {
                if (allPurchaseableAugs[k].name === depName) {
                    foundDep = true;
                }
            }
            if (foundDep) continue;

            const depLoc = allPurchaseableAugs.findIndex((a) => a.name === depName);
            if (depLoc >= 0) {
                const tmp = allPurchaseableAugs[depLoc];
                // remove aug from current place
                allPurchaseableAugs.splice(depLoc, 1);
                // place it before the main aug
                const curLoc = allPurchaseableAugs.findIndex((a) => a.name === augName);
                allPurchaseableAugs.splice(curLoc, 0, tmp);
                foundDep = true;
                didDepMove = true;
            }

            // if we dont have the dependency queued, remove this aug from the buy list
            if (!foundDep) {
                ns.tprintf(
                    "WARNING: Unable to find dependency %s:%s in the queue",
                    allPurchaseableAugs[i].name,
                    allPurchaseableAugs[i].dep
                );
                allPurchaseableAugs.splice(i, 1);
            }
        }

        if (!didDepMove) break;
    }

    // if (allPurchaseableAugs.length > 0) {
    //     ns.tprintf("============================");
    //     let mult = 1;
    //     let total = 0;
    //     for (let aug of allPurchaseableAugs) {
    //         //if (ns.args[0]) ns.purchaseAugmentation(aug.faction, aug.name);
    //         ns.tprintf(
    //             "%40s - %9s %s",
    //             aug.name,
    //             ns.nFormat(aug.price * mult, "$0.000a"),
    //             aug.dep !== undefined ? aug.dep : ""
    //         );
    //         total += aug.price * mult;
    //         mult *= 1.9;
    //     }
    //     ns.tprintf("\n%40s - %9s", "Total", ns.nFormat(total, "$0.000a"));
    // }

    const buysafe = ns.getPlayer().currentWorkFactionName !== sortedFactions[0];
    if (!buysafe && ns.args[0]) {
        ns.tprintf("WARNING: Unable to buy augmentations when actively working for the top faction");
    }

    ns.tprintf("============================");
    let mult = 1;
    const srcFile11 = ns.getOwnedSourceFiles().find((x) => x.n === 11);
    const srcFile11Lvl = srcFile11 ? srcFile11.lvl : 0;
    const multmult = 1.9 * [1, 0.96, 0.94, 0.93][srcFile11Lvl];
    let total = Number.MAX_SAFE_INTEGER;
    let startAug = 0;
    const purchaseableAugs = allPurchaseableAugs.filter((a) => a.name !== "The Red Pill");
    while (startAug < purchaseableAugs.length) {
        total = 0;
        mult = 1;
        for (let augIdx = startAug; augIdx < purchaseableAugs.length; augIdx++) {
            total += purchaseableAugs[augIdx].price * mult;
            mult *= multmult;
        }

        if (total < ns.getPlayer().money) break;

        startAug++;
    }

    let affordableAugs = purchaseableAugs.slice(startAug);

    // check if affordableAugs includes deps if they're not already installed
    let redoUpdate = false;
    for (const aug of affordableAugs) {
        const depName = aug.dep;
        if (depName === "") continue;
        if (ns.getOwnedAugmentations(true).includes(depName)) continue;

        let depAug = affordableAugs.find((a) => a.name === depName);
        if (depAug === undefined) {
            // dependency is not installed, and not in the list to be installed, pull it from purchaseableAugs
            depAug = purchaseableAugs.find((a) => a.name === depName);
            if (depAug === undefined) {
                ns.tprintf(
                    "ERROR: Unable to find dependency aug in the purchaseableAugs " +
                        "array even though it should be there %s | %s"
                );
                return;
            }
            const thisAugIdx = affordableAugs.findIndex((a) => a.name === aug.name);
            affordableAugs.splice(thisAugIdx, 0, depAug);
            redoUpdate = true;
        }
    }

    if (redoUpdate) {
        startAug = 0;
        while (startAug < affordableAugs.length) {
            total = 0;
            mult = 1;
            for (let augIdx = startAug; augIdx < affordableAugs.length; augIdx++) {
                total += affordableAugs[augIdx].price * mult;
                mult *= multmult;
            }

            if (total < ns.getPlayer().money) break;

            startAug++;
        }

        affordableAugs = affordableAugs.slice(startAug);
    }

    total = 0;
    mult = 1;
    const startmoney = ns.getPlayer().money;
    for (const aug of affordableAugs) {
        if (ns.args[0] && buysafe) ns.purchaseAugmentation(aug.faction, aug.name);
        ns.tprintf("%50s - %9s %s", aug.name, ns.nFormat(aug.price * mult, "$0.000a"), aug.dep);
        total += aug.price * mult;
        mult *= multmult;
    }

    // see how many Neuroflux Governors we can buy
    const topFactionRep =
        (ns.getPlayer().currentWorkFactionName === sortedFactions[0] ? ns.getPlayer().workRepGained : 0) +
        ns.getFactionRep(sortedFactions[0]);
    let ngPrice = ns.getAugmentationPrice("NeuroFlux Governor") * (ns.args[0] && buysafe ? 1 : mult);
    let ngRepReq = ns.getAugmentationRepReq("NeuroFlux Governor");
    let nfCount = 1;
    while (true) {
        if (total + ngPrice < startmoney && ngRepReq <= topFactionRep) {
            if (ns.args[0] && buysafe) {
                const result = ns.purchaseAugmentation(sortedFactions[0], "NeuroFlux Governor");
                if (!result) ns.tprintf("ERROR, could not buy Neuroflux governor");
            }
            ns.tprintf(
                "%50s - %9s %s",
                "NeuroFlux Governor +" + nfCount.toString(),
                ns.nFormat(ngPrice, "$0.000a"),
                ns.nFormat(ngRepReq, "0.000a")
            );
            nfCount++;
            total += ngPrice;
            ngPrice = ngPrice * 1.14 * multmult;
            ngRepReq *= 1.14;
        } else {
            break;
        }
    }

    ns.tprintf("\n%50s - %9s", "Total", ns.nFormat(total, "$0.000a"));
}

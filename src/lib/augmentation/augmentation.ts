import { NS, AugmentationStats } from "@ns";
import { stFormat } from "lib/util";

// AUG NOTES:
// CyberSec - Cranial Signal Processors - $70m [10k]
// NiteSec - CRTX42-AA Gene Modification - $225m [45k]
// The Black Hand - The Black Hand - $550m [100k]

export class Augmentation {
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
        if (dep === undefined || ownedAugs.includes(dep) || installedAugs.includes(dep)) dep = "";
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

    printAugStats(ns: NS): void {
        for (const [key, val] of Object.entries(this.stats)) {
            ns.tprintf("%30s %s", key, val);
        }
    }

    toString(): string {
        return this.str;
    }

    isHackUseful(): boolean {
		if (this.name === "Neuroflux Governor") return false;
        //return true;
        // if (this.stats.crime_money_mult) return true;
        // if (this.stats.crime_success_mult) return true;                    
        // if (this.stats.company_rep_mult) return true;
        // if (this.stats.faction_rep_mult) return true;
        if (this.stats.hacking_chance_mult) return true;
        if (this.stats.hacking_exp_mult) return true;
        if (this.stats.hacking_grow_mult) return true;
        // if (this.stats.hacking_money_mult) return true;
        if (this.stats.hacking_mult) return true;
        if (this.stats.hacking_speed_mult) return true;
        // if (this.stats.hacknet_node_core_cost_mult) return true;
        // if (this.stats.hacknet_node_level_cost_mult) return true;
        // if (this.stats.hacknet_node_money_mult) return true;
        // if (this.stats.hacknet_node_purchase_cost_mult) return true;
        // if (this.stats.hacknet_node_ram_cost_mult) return true;
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

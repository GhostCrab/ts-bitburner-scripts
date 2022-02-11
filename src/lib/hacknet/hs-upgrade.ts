import { NS } from "@ns";
import { stFormat } from "lib/util";
import { HSUpgradeType } from "lib/hacknet/hs-upgrade-type";
import { ExtendedNodeStats } from "lib/hacknet/extended-node-stats";

export interface HSUpgradeInterface {
    id: number;
    type: HSUpgradeType;
    upgradeCost: number;
    upgradeProductionTotal: number;
    cacheIncrease: number;
    cacheCostPerHash: number;
    upgradeProductionIncrease: number;
    upgradeCashProduction: number;
    upgradePayoffTime: number;
    upgradeValue: number;

	toString(ns: NS, totalProduction: number): string;
    buy(ns: NS): boolean;
}

export class HSUpgrade implements HSUpgradeInterface {
    id: number;
    type: HSUpgradeType;
    upgradeCost = 0;
    upgradeProductionTotal = 0;
    cacheIncrease = 0;
    cacheCostPerHash = 0;
    upgradeProductionIncrease = 0;
    upgradeCashProduction = 0;
    upgradePayoffTime = 0;
    upgradeValue = 0;

    constructor(ns: NS, id: number, type: HSUpgradeType, _stats: ExtendedNodeStats) {
        const hashBuyCost = ns.hacknet.hashCost("Sell for Money");
        const prodMult = ns.getPlayer().hacknet_node_money_mult;
        const coreCostMult = ns.getPlayer().hacknet_node_core_cost_mult;
        const levelCostMult = ns.getPlayer().hacknet_node_level_cost_mult;
        const ramCostMult = ns.getPlayer().hacknet_node_ram_cost_mult;

        let stats;
        if (_stats) stats = _stats;
        else {
            stats = new ExtendedNodeStats(ns.hacknet.getNodeStats(id));
            stats.ramUsed = 0;
            stats.updateProduction(ns);
        }

        this.id = id;
        this.type = type;

        switch (this.type) {
            case HSUpgradeType.LEVEL: {
                this.upgradeCost = ns.formulas.hacknetServers.levelUpgradeCost(stats.level, 1, levelCostMult);
                this.upgradeProductionTotal = ns.formulas.hacknetServers.hashGainRate(
                    stats.level + 1,
                    0,
                    stats.ram,
                    stats.cores,
                    prodMult
                );
                break;
            }
            case HSUpgradeType.RAM: {
                this.upgradeCost = ns.formulas.hacknetServers.ramUpgradeCost(stats.ram, 1, ramCostMult);
                this.upgradeProductionTotal = ns.formulas.hacknetServers.hashGainRate(
                    stats.level,
                    0,
                    stats.ram * 2,
                    stats.cores,
                    prodMult
                );
                break;
            }
            case HSUpgradeType.CORES: {
                this.upgradeCost = ns.formulas.hacknetServers.coreUpgradeCost(stats.cores, 1, coreCostMult);
                this.upgradeProductionTotal = ns.formulas.hacknetServers.hashGainRate(
                    stats.level,
                    0,
                    stats.ram,
                    stats.cores + 1,
                    prodMult
                );
                break;
            }
            case HSUpgradeType.CACHE: {
                this.upgradeCost = ns.formulas.hacknetServers.cacheUpgradeCost(stats.cache);
                this.upgradeProductionTotal = stats.production;
                this.cacheIncrease = stats.cache;
                this.cacheCostPerHash = this.upgradeCost / this.cacheIncrease;
                break;
            }
        }

        this.upgradeProductionIncrease = this.upgradeProductionTotal - stats.production;
        this.upgradeCashProduction = (this.upgradeProductionTotal / hashBuyCost) * 1000000;
        this.upgradePayoffTime = (this.upgradeCost / this.upgradeCashProduction) * 1000;
        this.upgradeValue = this.upgradeProductionIncrease / this.upgradeCost;
    }

    toString(ns: NS, totalProduction: number): string {
        const hashBuyCost = ns.hacknet.hashCost("Sell for Money");
        const totalUpgradeCashProduction = ((totalProduction + this.upgradeProductionIncrease) / hashBuyCost) * 1000000;
        const totalUpgradePayoffTime = (this.upgradeCost / totalUpgradeCashProduction) * 1000;

        return ns.sprintf(
            "%02d => %6s %9s +%s h/s %6s %5.2f h/s/$bn",
            this.id,
            this.type,
            ns.nFormat(this.upgradeCost, "($0.000a)"), // cost
            ns.nFormat(this.upgradeProductionIncrease, "(0.000a)"), // hash increase
            stFormat(ns, totalUpgradePayoffTime), // upgrade payoff time
            this.upgradeValue * 1000000000
        );
    }

    buy(ns: NS): boolean {
        const hashBuyCost = ns.hacknet.hashCost("Sell for Money");
        const numHashBuys = Math.floor(ns.hacknet.numHashes() / hashBuyCost);
        const effectiveMoneyAvailable = ns.getPlayer().money + numHashBuys * 1000000;

        if (effectiveMoneyAvailable < this.upgradeCost) {
            ns.print("WARNING: Attempted to buy an upgrade you can't afford");
            return false;
        }

        while (ns.getPlayer().money < this.upgradeCost) {
            ns.hacknet.spendHashes("Sell for Money");
        }

        switch (this.type) {
            case HSUpgradeType.LEVEL: {
                return ns.hacknet.upgradeLevel(this.id, 1);
            }
            case HSUpgradeType.RAM: {
                return ns.hacknet.upgradeRam(this.id, 1);
            }
            case HSUpgradeType.CORES: {
                return ns.hacknet.upgradeCore(this.id, 1);
            }
            case HSUpgradeType.CACHE: {
                return ns.hacknet.upgradeCache(this.id, 1);
            }
            case HSUpgradeType.SERVER: {
                return ns.hacknet.purchaseNode() !== -1;
            }
        }
    }
}

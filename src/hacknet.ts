import { NS, NodeStats } from "@ns";
import { cleanLogs, stFormat } from "bbutil";

enum HSUpgradeType {
    LEVEL = "LEVEL",
    RAM = "RAM",
    CORES = "CORES",
    CACHE = "CACHE",
    SERVER = "SERVER",
}

class ExtendedNodeStats {
    name: string;
    level: number;
    ram: number;
    ramUsed: number;
    cores: number;
    cache: number;
    hashCapacity: number;
    production: number;
    timeOnline: number;
    totalCost: number;
    totalValue: number;

    constructor(stats: NodeStats) {
        this.name = stats.name;
        this.level = stats.level;
        this.ram = stats.ram;
        this.ramUsed = stats.ramUsed;
        this.cores = stats.cores;
        this.cache = stats.cache;
        this.hashCapacity = stats.hashCapacity;
        this.production = stats.production;
        this.timeOnline = stats.timeOnline;
        this.totalCost = 0;
        this.totalValue = 0;
    }

    updateProduction(ns: NS, zeroRamUsed = true) {
        this.production = ns.formulas.hacknetServers.hashGainRate(
            this.level,
            zeroRamUsed ? 0 : this.ramUsed,
            this.ram,
            this.cores,
            ns.getPlayer().hacknet_node_money_mult
        );
    }
}

class HSUpgrade {
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

    toString(ns: NS, totalProduction: number) {
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

    buy(ns: NS) {
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
                return ns.hacknet.purchaseNode();
            }
        }
    }
}

function generateNewServerValue(ns: NS): HSUpgrade | undefined {
    const stats = new ExtendedNodeStats(ns.hacknet.getNodeStats(0));
    stats.cache = 1;
    stats.cores = 1;
    stats.hashCapacity = 64;
    stats.level = 1;
    stats.ram = 1;
    stats.timeOnline = 1;
    stats.totalCost = ns.hacknet.getPurchaseNodeCost();
    stats.updateProduction(ns);

    // ns.tprintf("New Server Production: %s", stats.production);
    // ns.tprintf("New Server Cost: %s", ns.nFormat(stats.totalCost, "($0.000a)"));
    // ns.tprintf("New Server Total Value: %.2f h/s/$bn", (stats.production / stats.totalCost) * 1000000000);

    let bestUpgrade: HSUpgrade | undefined;
    while (true) {
        const hashServerUpgrades = Object.keys(HSUpgradeType)
            .map((key) => new HSUpgrade(ns, ns.hacknet.numNodes(), HSUpgradeType[key as HSUpgradeType], stats))
            .sort((a, b) => b.upgradeValue - a.upgradeValue);

        const newBestUpgrade = hashServerUpgrades[0];

        switch (newBestUpgrade.type) {
            case HSUpgradeType.CORES:
                stats.cores += 1;
                break;
            case HSUpgradeType.LEVEL:
                stats.level += 1;
                break;
            case HSUpgradeType.RAM:
                stats.ram *= 2;
                break;
        }

        const newProduction = ns.formulas.hacknetServers.hashGainRate(
            stats.level,
            0,
            stats.ram,
            stats.cores,
            ns.getPlayer().hacknet_node_money_mult
        );
        const newCost = stats.totalCost + newBestUpgrade.upgradeCost;
        const newValue = newProduction / newCost;

        if (newValue < stats.totalValue) break;

        stats.production = newProduction;
        stats.totalCost = newCost;
        stats.totalValue = newValue;
        bestUpgrade = newBestUpgrade;

        // ns.tprintf(
        //     "%s => Total Value: %s",
        //     hashServerUpgrades[0].toString(ns, stats.production),
        //     stats.totalValue * 1000000000
        // );

        const checkStats = ns.hacknet.getNodeStats(0);
        if (stats.cores >= checkStats.cores && stats.level >= checkStats.level && stats.ram >= checkStats.ram) break;
    }

    if (bestUpgrade === undefined) return bestUpgrade;

    bestUpgrade.upgradeCost = ns.hacknet.getPurchaseNodeCost();
    bestUpgrade.upgradeValue = stats.totalValue;
    bestUpgrade.type = HSUpgradeType.SERVER;
    bestUpgrade.upgradeProductionIncrease = stats.production;

    return bestUpgrade;
}

export async function main(ns: NS): Promise<void> {
    cleanLogs(ns);

    let prodCalc = 0;
    for (let idx = 0; idx < ns.hacknet.numNodes(); idx++) {
        const stats = ns.hacknet.getNodeStats(idx);
        stats.ramUsed = 0;
        stats.production = ns.formulas.hacknetServers.hashGainRate(
            stats.level,
            0,
            stats.ram,
            stats.cores,
            ns.getPlayer().hacknet_node_money_mult
        );

        prodCalc += stats.production;
    }

    const prodIncome = (prodCalc / ns.hacknet.hashCost("Sell for Money")) * 1000000;
    ns.tprintf("Income: %.2f h/s | %s/s", prodCalc, ns.nFormat(prodIncome, "($0.000a)"));

    if (ns.hacknet.numNodes() === 0) {
        ns.print(
            ns.sprintf(
                "%s | 0 hacknet nodes available, waiting for funds to buy one for %s",
                new Date().toLocaleTimeString("it-IT"),
                ns.nFormat(ns.hacknet.getPurchaseNodeCost(), "($0.000a)")
            )
        );
    }

    while (ns.hacknet.numNodes() === 0) {
        if (ns.getPlayer().money >= ns.hacknet.getPurchaseNodeCost()) {
            ns.hacknet.purchaseNode();
        } else {
            await ns.sleep(1000);
        }
    }

    let buyServerUpgrade = generateNewServerValue(ns);

    if (ns.args[0]) {
        let hashServerUpgrades: HSUpgrade[] = [];
        if (buyServerUpgrade !== undefined) hashServerUpgrades.push(buyServerUpgrade);

        let totalProduction = 0;
        for (let idx = 0; idx < ns.hacknet.numNodes(); idx++) {
            const stats = new ExtendedNodeStats(ns.hacknet.getNodeStats(idx));
            stats.ramUsed = 0;
            stats.updateProduction(ns);

            Object.keys(HSUpgradeType).forEach((key) => {
                if (key !== "CACHE" && key != "SERVER")
                    hashServerUpgrades.push(new HSUpgrade(ns, idx, HSUpgradeType[key as HSUpgradeType], stats));
            });

            totalProduction += stats.production;
        }

        hashServerUpgrades = hashServerUpgrades.sort((a, b) => b.upgradeValue - a.upgradeValue); //.filter(a => (a.upgradeValue * 1000000000) > 1.5);

        for (const upg of hashServerUpgrades) ns.tprintf(upg.toString(ns, totalProduction));

        return;
    }

    while (true) {
        let hashServerUpgrades: HSUpgrade[] = [];
        if (buyServerUpgrade !== undefined) hashServerUpgrades.push(buyServerUpgrade);
        let totalProduction = 0;
        for (let idx = 0; idx < ns.hacknet.numNodes(); idx++) {
            const stats = new ExtendedNodeStats(ns.hacknet.getNodeStats(idx));
            stats.ramUsed = 0;
            stats.updateProduction(ns);

            Object.keys(HSUpgradeType).forEach((key) => {
                if (key !== "CACHE" && key != "SERVER")
                    hashServerUpgrades.push(new HSUpgrade(ns, idx, HSUpgradeType[key as HSUpgradeType], stats));
            });

            totalProduction += stats.production;
        }

        hashServerUpgrades = hashServerUpgrades.sort((a, b) => b.upgradeValue - a.upgradeValue); //.filter(a => (a.upgradeValue * 1000000000) > 0.15);
        //hashServerUpgrades.sort((a, b) => b.upgradeValue - a.upgradeValue);

        const targetUpgrade = hashServerUpgrades[0];
        if (targetUpgrade) {
            const hashBuyCost = ns.hacknet.hashCost("Sell for Money");
            let numHashBuys = Math.floor(ns.hacknet.numHashes() / hashBuyCost);
            let effectiveMoneyAvailable = ns.getPlayer().money + numHashBuys * 1000000;

            ns.print(
                ns.sprintf(
                    "%s | %s",
                    new Date().toLocaleTimeString("it-IT"),
                    targetUpgrade.toString(ns, totalProduction)
                )
            );
            while (effectiveMoneyAvailable < targetUpgrade.upgradeCost) {
                numHashBuys = Math.floor(ns.hacknet.numHashes() / hashBuyCost);
                effectiveMoneyAvailable = ns.getPlayer().money + numHashBuys * 1000000;

                while (ns.hacknet.numHashes() > ns.hacknet.hashCost("Sell for Money"))
                    ns.hacknet.spendHashes("Sell for Money");

                await ns.sleep(1000);
            }

            targetUpgrade.buy(ns);
        } else {
            while (ns.hacknet.numHashes() > ns.hacknet.hashCost("Sell for Money"))
                ns.hacknet.spendHashes("Sell for Money");

            await ns.sleep(1000);
        }

        buyServerUpgrade = generateNewServerValue(ns);

        await ns.sleep(20);
    }

    ns.print(ns.sprintf("%s | Leeching...", new Date().toLocaleTimeString("it-IT")));
    while (true) {
        while (ns.hacknet.numHashes() > ns.hacknet.hashCost("Sell for Money")) ns.hacknet.spendHashes("Sell for Money");

        await ns.sleep(1000);
    }

    while (true) {
        //let studyCost = ns.hacknet.hashCost("Increase Maximum Money");
        const studyCost = ns.hacknet.hashCost("Improve Studying");

        while (ns.hacknet.hashCapacity() < studyCost) {
            while (ns.hacknet.numHashes() > ns.hacknet.hashCost("Sell for Money"))
                ns.hacknet.spendHashes("Sell for Money");

            // find the cheapest cache upgrade and attempt to buy it
            let targetIdx = -1;
            let targetIdxCost = Number.MAX_SAFE_INTEGER;
            for (let idx = 0; idx < ns.hacknet.numNodes(); idx++) {
                const idxCost = ns.hacknet.getCacheUpgradeCost(idx, 1);
                if (idxCost < targetIdxCost) {
                    targetIdx = idx;
                    targetIdxCost = idxCost;
                }
            }

            if (ns.getPlayer().money > targetIdxCost) {
                ns.hacknet.upgradeCache(targetIdx, 1);
                continue;
            }

            await ns.sleep(1000);
        }

        while (ns.hacknet.numHashes() < studyCost) await ns.sleep(1000);

        //ns.hacknet.spendHashes("Increase Maximum Money", "phantasy");
        ns.hacknet.spendHashes("Improve Studying");

        await ns.sleep(20);
    }
}

import { NS } from "@ns";
import { cleanLogs } from "lib/util";
import { HSUpgradeType } from "lib/hacknet/hs-upgrade-type";
import { ExtendedNodeStats } from "lib/hacknet/extended-node-stats";
import { HSUpgrade } from "lib/hacknet/hs-upgrade";

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

        hashServerUpgrades = hashServerUpgrades
            .sort((a, b) => b.upgradeValue - a.upgradeValue)
            .filter((a) => a.upgradeValue * 1000000000 > 0.15);

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

        hashServerUpgrades = hashServerUpgrades
            .sort((a, b) => b.upgradeValue - a.upgradeValue)
            //.filter((a) => a.upgradeValue * 1000000000 > 0.15);

        const targetUpgrade = hashServerUpgrades[0];
        if (targetUpgrade) {
            const port = ns.getPortHandle(2);
            port.clear();
            port.write(JSON.stringify([totalProduction, targetUpgrade]));

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

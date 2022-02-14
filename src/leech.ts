import { NS } from "@ns";

// Reduce Minimum Security
// Increase Maximum Money
// Generate Coding Contract
// Sell for Money

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data: string, args: string): string[] {
    return ["sec", "money", "cct"]; // Autocomplete 3 specific strings.
}

export async function main(ns: NS): Promise<void> {
    let buy;
    switch (ns.args[0]) {
        case "sec": {
            buy = "Reduce Minimum Security";
            break;
        }
        case "money": {
            buy = "Increase Maximum Money";
            break;
        }
        case "cct": {
            buy = "Generate Coding Contract";
            break;
        }
        case "sell":
        default: {
            buy = "Sell for Money"
            break;
        }
    }
    const target = ns.args[1]?.toString();

    while (true) {
        const studyCost = ns.hacknet.hashCost(buy);

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

        ns.hacknet.spendHashes(buy, target);

        await ns.sleep(20);
    }
}

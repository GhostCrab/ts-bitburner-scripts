import { NS } from "@ns";

// returns the actual number of servers to buy that would be better than the ones we already have
function compareToActualServers(ns: NS, ram: number, numServers: number): number {
    // find the number of servers we own that have ram sizes > ram
    const betterServerCount = ns.getPurchasedServers().filter((x) => ns.getServerMaxRam(x) >= ram).length;
    return numServers - betterServerCount;
}

function getFinalRamSize(ns: NS, ram: number, numServers: number): number {
    const pservers = ns.getPurchasedServers().sort((a, b) => ns.getServerMaxRam(a) - ns.getServerMaxRam(b));
    const numToDelete = Math.max(pservers.length + numServers - ns.getPurchasedServerLimit(), 0);

    for (let i = 0; i < numToDelete; i++) {
        pservers.shift();
    }

    return pservers.reduce((tally, serverName) => tally + ns.getServerMaxRam(serverName), 0) + ram * numServers;
}

export async function main(ns: NS): Promise<void> {
    let maxPow = 8; // Minimum ram is 256
    const sizes: [number, number][] = [];
    const cash = ns.getPlayer().money;
    while (true) {
        const curRam = Math.pow(2, maxPow);
        const cost = ns.getPurchasedServerCost(curRam);

        if (cost <= cash) {
            const numServers = compareToActualServers(
                ns,
                curRam,
                Math.min(Math.floor(cash / cost), ns.getPurchasedServerLimit())
            );
            if (numServers > 0) sizes.push([curRam, numServers]);
            maxPow++;
        } else {
            break;
        }
    }

    for (const [ram, numServers] of sizes) {
        ns.tprintf("%d: %d (%d)", ram, numServers, getFinalRamSize(ns, ram, numServers));
    }
}

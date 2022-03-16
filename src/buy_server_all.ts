import { NS } from "@ns";

// returns the actual number of servers to buy that would be better than the ones we already have
function compareToActualServers(ns: NS, ram: number, numServers: number): number {
    // find the number of servers we own that have ram sizes > ram
    ns.tprintf("comparing %s %s", ram, numServers);
    const betterServerCount = ns.getPurchasedServers().filter((x) => ns.getServerMaxRam(x) >= ram).length;
    const freeSpots = ns.getPurchasedServerLimit() - betterServerCount;
    return Math.min(numServers, freeSpots);
}

function getCurrentRamSize(ns: NS) {
    return ns.getPurchasedServers().reduce((tally, serverName) => tally + ns.getServerMaxRam(serverName), 0);
}

function getFinalRamSize(ns: NS, ram: number, numServers: number): number {
    const pservers = ns.getPurchasedServers().sort((a, b) => ns.getServerMaxRam(a) - ns.getServerMaxRam(b));
    const numToDelete = Math.max(pservers.length + numServers - ns.getPurchasedServerLimit(), 0);

    for (let i = 0; i < numToDelete; i++) {
        pservers.shift();
    }

    return pservers.reduce((tally, serverName) => tally + ns.getServerMaxRam(serverName), 0) + ram * numServers;
}

function buyServers(ns: NS, ram: number, numServers: number): number {
    const pservers = ns.getPurchasedServers().sort((a, b) => ns.getServerMaxRam(a) - ns.getServerMaxRam(b));
    const numToDelete = Math.max(pservers.length + numServers - ns.getPurchasedServerLimit(), 0);

    const deleteServers: string[] = [];
    for (let i = 0; i < numToDelete; i++) {
        deleteServers.push(pservers.shift());
    }

    for (const server of deleteServers) {
        ns.tprintf("Deleting %s with %d RAM", server, ns.getServerMaxRam(server));
        ns.killall(server);
        ns.deleteServer(server);
    }

    let serverIndex = 0;

    function getNextServerName() {
        while (true) {
            const serverName = "pserv-" + serverIndex;
            if (!ns.getPurchasedServers().includes(serverName)) return serverName;
            else serverIndex++;
        }
        return "";
    }

    const cost = ns.getPurchasedServerCost(ram);
    for (let i = 0; i < numServers; i++) {
        const serverName = getNextServerName();
        ns.tprintf("Buying %s with %d RAM for %s", serverName, ram, ns.nFormat(cost, "($0.000a)"));
        ns.purchaseServer(serverName, ram);
    }

    return cost * numServers;
}

export async function main(ns: NS): Promise<void> {
    let maxPow = 8; // Minimum ram is 256
    let sizes: [number, number][] = [];
    const cash = ns.getPlayer().money;
    const currentSize = getCurrentRamSize(ns);

    while (true) {
        const curRam = Math.pow(2, maxPow);
        const cost = ns.getPurchasedServerCost(curRam);

        if (cost <= cash) {
            const numServers = compareToActualServers(
                ns,
                curRam,
                Math.min(Math.floor(cash / cost), ns.getPurchasedServerLimit())
            );
            if (numServers > 0) sizes.push([curRam, numServers, getFinalRamSize(ns, curRam, numServers)]);
            maxPow++;
        } else {
            break;
        }
    }

    if (sizes.length === 0) {
        ns.tprintf("Not enough cash to buy an upgrade");
        return;
    }

    sizes = sizes.sort((a, b) => b[2] - a[2]);
    const [ram, numServers, finalSize] = sizes[0];

    for (const [ram, numServers, finalSize] of sizes) {
        ns.tprintf("%s %s %s", ram, numServers, finalSize);
    }

    if (ns.args[0]) {
        ns.tprintf(
            "Check: Buying %d %dGB servers, increasing the size from %d to %d for %s",
            numServers,
            ram,
            currentSize,
            finalSize,
            ns.nFormat(numServers * ns.getPurchasedServerCost(ram), "($0.000a)")
        );
        return;
    }

    const cost = buyServers(ns, ram, numServers);

    ns.tprintf(
        "Increased available server ram from %d to %d for %s",
        currentSize,
        finalSize,
        ns.nFormat(numServers * ns.getPurchasedServerCost(ram), "($0.000a)")
    );
}

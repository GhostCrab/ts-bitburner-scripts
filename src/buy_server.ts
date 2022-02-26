import { NS } from "@ns";
export async function main(ns: NS): Promise<void> {
    let ram = Number(ns.args[0]);
    let count = Number(ns.args[1]);

    const cash = ns.getServerMoneyAvailable("home");

    if (isNaN(count)) {
		ns.tprintf("count was not a number")
		count = 1;
	}

    if (isNaN(ram) && ns.args[0] !== "max") {
        // ns.tprintf("Calculating maximum ram allocation for new server (Cash: %s)", ns.nFormat(cash, '($0.000a)'))
        ram = 0;
        for (let i = 0; i <= 20; i++) {
            const curRam = Math.pow(2, i);
            const cost = ns.getPurchasedServerCost(curRam);
            if (cost <= cash) ram = curRam;
            else break;
        }

        let cost = ns.getPurchasedServerCost(ram);
        let maxServers = Math.min(Math.floor(cash / cost), 25);
        ns.tprintf("run buy_server.js %d %d %s", ram, maxServers, ns.nFormat(cost * maxServers, "($0.000a)"));

        ram /= 2;
        if (ram < 256) return;
        cost = ns.getPurchasedServerCost(ram);
        maxServers = Math.min(Math.floor(cash / cost), 25);
        ns.tprintf("run buy_server.js %d %d %s", ram, maxServers, ns.nFormat(cost * maxServers, "($0.000a)"));

        ram /= 2;
        if (ram < 256) return;
        cost = ns.getPurchasedServerCost(ram);
        maxServers = Math.min(Math.floor(cash / cost), 25);
        ns.tprintf("run buy_server.js %d %d %s", ram, maxServers, ns.nFormat(cost * maxServers, "($0.000a)"));

        ram /= 2;
        if (ram < 256) return;
        cost = ns.getPurchasedServerCost(ram);
        maxServers = Math.min(Math.floor(cash / cost), 25);
        ns.tprintf("run buy_server.js %d %d %s", ram, maxServers, ns.nFormat(cost * maxServers, "($0.000a)"));

        ram /= 2;
        if (ram < 256) return;
        cost = ns.getPurchasedServerCost(ram);
        maxServers = Math.min(Math.floor(cash / cost), 25);
        ns.tprintf("run buy_server.js %d %d %s", ram, maxServers, ns.nFormat(cost * maxServers, "($0.000a)"));

        ram /= 2;
        if (ram < 256) return;
        cost = ns.getPurchasedServerCost(ram);
        maxServers = Math.min(Math.floor(cash / cost), 25);
        ns.tprintf("run buy_server.js %d %d %s", ram, maxServers, ns.nFormat(cost * maxServers, "($0.000a)"));

        return;
    }

    if (ns.args[0] === "max") {
        ram = 0;
        for (let i = 0; i <= 20; i++) {
            const curRam = Math.pow(2, i);
            const cost = ns.getPurchasedServerCost(curRam);
            if (cost <= cash) ram = curRam;
            else break;
        }
    }

    const cost = ns.getPurchasedServerCost(ram) * count;
    if (cash < cost) {
        ns.tprintf(
            "Unable to purchase %d server%s with %d ram (%s < %s)",
            count,
			count > 1 ? "s" : '',
            ram,
            ns.nFormat(cash, "($0.000a)"),
            ns.nFormat(cost, "($0.000a)")
        );
        return;
    }

    for (let i = 0; i < count; i++) {
        const pservers = ns.getPurchasedServers().sort((a, b) => ns.getServerMaxRam(a) - ns.getServerMaxRam(b));
        const nextIdx = pservers.length;
        let nextServerName = "pserv-" + nextIdx;
        if (pservers.length === ns.getPurchasedServerLimit()) {
            const delServer = ns.getServer(pservers[0]);
            if (delServer.maxRam >= ram) {
                ns.tprintf(
                    "Max servers reached and new server is not an improvement (%dGB/%dGB ram)",
                    delServer.maxRam,
                    ram
                );
                return;
            }
            ns.tprintf("Deleting server %s with %dGB ram", delServer.hostname, delServer.maxRam);
            nextServerName = delServer.hostname;
            ns.killall(delServer.hostname);
            ns.deleteServer(delServer.hostname);
        }
        const hostname = ns.purchaseServer(nextServerName, ram);
        ns.tprintf("Purchased server %s with %d ram for %s", hostname, ram, ns.nFormat(cost / count, "($0.000a)"));

        return;
    }
}

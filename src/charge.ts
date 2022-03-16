import { NS } from "@ns";
import { allHosts, canExecuteOnServer } from "/lib/util";

const CHARGEJS = "/lib/stanek/charge.js";

export async function main(ns: NS): Promise<void> {
    const fragments = ns.stanek.activeFragments().filter((x) => x.id < 100);

    const allHostnames = allHosts(ns);
    const executableHosts = allHostnames
        .filter(canExecuteOnServer.bind(null, ns))
        .filter((x) => x.indexOf("hacknet-node") === -1);

    const availableRam = executableHosts.reduce(
        (input, hostname) => input + (ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname)),
        0
    );

    for (const hostname of executableHosts) {
        if (hostname === "home") continue;
        await ns.scp(CHARGEJS, "home", hostname);
    }

    ns.tprintf("available ram: %d", availableRam);
    const fragSplit = availableRam / fragments.length;
    const fragThreads = Math.floor(fragSplit / 2);

    ns.tprintf("Frags %d", fragments.length);
    ns.tprintf("Split %f %d", fragSplit, fragThreads);

    for (const fragment of fragments) {
        let threadsRemaining = fragThreads;
        for (const hostname of executableHosts) {
            const availableThreads = Math.floor((ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname)) / 2);
            const usingThreads = Math.min(threadsRemaining, availableThreads);

            if (usingThreads <= 0) continue;

            ns.exec(CHARGEJS, hostname, usingThreads, fragment.x, fragment.y);

            threadsRemaining -= usingThreads;

            if (threadsRemaining <= 0)
                break;
        }
    }
}

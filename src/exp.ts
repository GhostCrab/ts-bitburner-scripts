import { NS } from "@ns";
import { allHosts, canExecuteOnServer } from "/lib/util";

export async function main(ns: NS): Promise<void> {
    const allHostnames = allHosts(ns);
    const executableHosts = allHostnames
        .filter(canExecuteOnServer.bind(null, ns))
        .filter((x) => x.indexOf("hacknet-node") === -1);

    for (const hostname of executableHosts) {
        if (hostname === "home") continue;
        await ns.scp("/lib/exec/const_weaken.js", "home", hostname);
    }

    for (const hostname of executableHosts) {
        let availableRam = ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname);
        if (hostname === "home") availableRam -= 128;
        const availableThreads = Math.floor(availableRam / ns.getScriptRam("/lib/exec/const_weaken.js"));

        if (availableThreads <= 0) continue;

        ns.exec("/lib/exec/const_weaken.js", hostname, availableThreads, "joesguns");
    }
}

import { NS } from "@ns";
import { allHosts } from "bbutil";

export async function main(ns: NS): Promise<void> {
    for (const hostname of allHosts(ns)) {
        if (hostname === "home") continue;
        ns.killall(hostname);
    }

    for (const ps of ns.ps("home")) {
        if (
            ps.filename === "ka.js" ||
            ps.filename === "clock.js" ||
            ps.filename === "leech.js" ||
            ps.filename === "hacknet.js" ||
            ps.filename === "hacking_gang.js" ||
            ps.filename === "corp.js" ||
            ps.filename === "cct.js"
        )
            continue;
        ns.kill(ps.pid);
    }
}

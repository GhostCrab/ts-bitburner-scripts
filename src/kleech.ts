import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    for (const ps of ns.ps("home")) {
        if (ps.filename === "leech.js" ) {
            ns.kill(ps.pid);
            return;
        }
    }
}

import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    function favorToRep(f: number) {
        const raw = 25000 * (Math.pow(1.02, f) - 1);
        return Math.round(raw * 10000) / 10000; // round to make things easier.
    }

    function repToFavor(r: number) {
        const raw = Math.log(r / 25000 + 1) / Math.log(1.02);
        return Math.round(raw * 10000) / 10000; // round to make things easier.
    }

    for (const faction of ns.getPlayer().factions) {
        const favor = ns.getFactionFavor(faction);
        const targetRep = favorToRep(150);
        const currentRep =
            ns.getFactionRep(faction) +
            (ns.getPlayer().currentWorkFactionName === faction ? ns.getPlayer().workRepGained : 0);
        const storedRep = Math.max(0, favorToRep(favor));
        const totalRep = currentRep + storedRep;

        const fTotal = repToFavor(currentRep + storedRep);
        const fGain = fTotal - favor;

        if (favor > 75) continue;

        let successStr = "";
        if (favor + fGain > 75) {
            successStr = " (SUCCESS)";
        }

        let needStr = " ";
        if (totalRep < targetRep) {
            needStr = ns.sprintf(" | Need +%s Rep", ns.nFormat(targetRep - totalRep, "0.000a"));
        }

        ns.tprintf("%s => %.2f + %.2f = %.2f%s%s", faction, favor, fGain, favor + fGain, needStr, successStr);
    }
}

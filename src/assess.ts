import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const targetServer = ns.getServer(ns.args[0]);
    const availableFunds = targetServer.moneyAvailable <= 1 ? 1 : targetServer.moneyAvailable;
    const growthRequired = targetServer.moneyMax / availableFunds;
    let growThreadsNeeded = 0;
    if (growthRequired > 1) growThreadsNeeded = Math.ceil(ns.growthAnalyze(targetServer.hostname, growthRequired));

    const targetGrowTime = ns.getGrowTime(targetServer.hostname);
    const targetWeakenTime = ns.getWeakenTime(targetServer.hostname);

    ns.tprintf("%s:", targetServer.hostname);
    ns.tprintf(
        "  %25s: %s/%s",
        "Target Funds",
        ns.nFormat(targetServer.moneyAvailable, "($0.000a)"),
        ns.nFormat(targetServer.moneyMax, "($0.000a)")
    );
    ns.tprintf("  %25s: %.2fx, %d Threads", "Growth Required", growthRequired, growThreadsNeeded);
    ns.tprintf("  %25s: %s @ %s", "Server Growth", targetServer.serverGrowth, ns.tFormat(targetGrowTime));
    ns.tprintf("  %25s: %s", "Weaken Time", ns.tFormat(targetWeakenTime));
    ns.tprintf(
        "  %25s: %s / %s / %s",
        "Hack Difficulty [M/B/H]",
        targetServer.minDifficulty,
        targetServer.baseDifficulty,
        targetServer.hackDifficulty
    );
    ns.tprintf("  %25s: %d/%d", "Ram Available", targetServer.maxRam - targetServer.ramUsed, targetServer.maxRam);
}

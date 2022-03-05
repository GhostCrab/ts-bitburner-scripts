import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    ns.tprintf("TEST: %s", ns.heart.break());

    await ns.grow("ecorp");
    // ns.tprintf("getWeakenTime %s", ns.getWeakenTime("ecorp"));
    // ns.tprintf("getServerSuppression %s", ns.getServerSuppression("ecorp"));
    // ns.tprintf("suppressAnalyze %s", ns.suppressAnalyze("ecorp", 100, 100));
}

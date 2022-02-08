import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    ns.disableLog("sleep");

    // const crimes = [
    //     "shoplift",
    //     "rob store",
    //     "mug",
    //     "larceny",
    //     "drugs",
    //     "bond forge",
    //     "traffick arms",
    //     "homicide",
    //     "grand auto",
    //     "kidnap",
    //     "assassinate",
    //     "heist",
    // ];

    // for (const crimename of crimes) {
    //     const crimeStats = ns.getCrimeStats(crimename);
    //     ns.tprintf("%16s  %9s %5s %9s/s", crimeStats.name, ns.nFormat(crimeStats.money, "($0.000a)"), stFormat(ns, crimeStats.time, false), ns.nFormat(crimeStats.money / (crimeStats.time / 1000), "($0.000a)"));
    // }

    let dynamic = true;
    let crime = "shoplift";
    if (ns.args[0]) {
        crime = ns.args[0].toString();
        dynamic = false;
    }

    while (true) {
        if (dynamic) {
            if (ns.getCrimeChance("mug") > 0.7) crime = "mug";
            if (ns.getCrimeChance("homicide") > 0.7) crime = "homicide";
        }

        // (!ns.getPlayer().factions.includes("NiteSec")) {
        await ns.sleep(ns.commitCrime(crime) + 200);

        // let allFactions = ns.getPlayer().factions.concat(ns.checkFactionInvitations());
        // if (allFactions.includes("NiteSec")) {
        //     ns.joinFaction("NiteSec")
        // }
    }

    ns.workForFaction("NiteSec", "Field Work");
}

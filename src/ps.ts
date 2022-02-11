import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const processInfoArr = ns
        .ps()
        .filter((a) => a.filename.indexOf("/lib") === -1 && a.filename.indexOf("ps.js") === -1);

    let maxScriptFileLength = 0;
    processInfoArr.map(function (pi) {
        const len = pi.filename.length - 2;
        if (len > maxScriptFileLength) maxScriptFileLength = len;
    });

    for (const pi of processInfoArr) {
        const info = ns.getRunningScript(pi.pid);
        let incomeStr = "";

        if (info.onlineMoneyMade > 0)
            incomeStr = ns.sprintf(" %9s/s", ns.nFormat(info.onlineMoneyMade / info.onlineRunningTime, "$0.000a"));

        if ((info.filename === "gang.js" || info.filename === "hacking_gang.js") && ns.gang.inGang()) {
            // let gangIncome = 0;
            // let gangRep = 0;
            // const members = ns.gang.getMemberNames().map((name) => ns.gang.getMemberInformation(name));
            // for (const member of members) {
            //     gangIncome += member.moneyGain;
            //     gangRep += member.respectGain;
            // }

            incomeStr = ns.sprintf(
                " %9s/s %8s Respect/s",
                ns.nFormat(ns.gang.getGangInformation().moneyGainRate, "$0.000a"),
                ns.nFormat(ns.gang.getGangInformation().respectGainRate, "0.000a")
            );
        }

        ns.tprintf(
            `  %6d %-${maxScriptFileLength}s %7.2fGB%s`,
            pi.pid,
            pi.filename.slice(0, pi.filename.length - 3),
            info.ramUsage,
            incomeStr
        );
    }

    if (processInfoArr.length > 0) {
        const maxRam = ns.getServerMaxRam(ns.getHostname());
        const usedRam = ns.getServerUsedRam(ns.getHostname());

        ns.tprintf(
            `\n         %-${maxScriptFileLength}s %7.2fGB / %7.2fGB (%.2fGB Available)`,
            "Total",
            usedRam,
            maxRam,
            maxRam - usedRam
        );
    } else {
        ns.tprintf(`  %s RAM Available: %dGB`, ns.getHostname(), ns.getServerMaxRam(ns.getHostname()));
    }
}

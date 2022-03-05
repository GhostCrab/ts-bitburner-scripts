import { NS } from "@ns";
import { allHosts, serverIsHackable, canExecuteOnServer, cleanLogs, doBuyAndSoftenAll } from "lib/util";
import { ModHackEnv } from "lib/hack/mod_hack_env";

async function calcIncome(ns: NS, target: string, hosts: string[], simMinutes = 2) {
    return await new ModHackEnv(ns, target, hosts).fastSim(ns, 1000 * 60 * simMinutes);
}

type targetIncome = {
    target: string;
    income: number;
};

export async function main(ns: NS): Promise<void> {
    cleanLogs(ns);
    doBuyAndSoftenAll(ns);

    const allHostnames = allHosts(ns);
    const executableHosts = allHostnames
        .filter(canExecuteOnServer.bind(null, ns))
        .filter((x) => x.indexOf("hacknet-node") === -1);
    const targetArr = allHostnames.filter(serverIsHackable.bind(null, ns)).filter((x) => ns.getServerMaxMoney(x) > 1);
    
    let minutes = Number.MAX_SAFE_INTEGER / 60 / 1000;
    if (ns.args[0] && !isNaN(Number(ns.args[0]))) minutes = Number(ns.args[0]);

    let orderedTargetArr: targetIncome[] = [];
    for (const target of targetArr) {
        const income = await calcIncome(ns, target, executableHosts, minutes);
        orderedTargetArr.push({ target: target, income: income });
    }

    orderedTargetArr = orderedTargetArr.sort((a, b) => b.income - a.income);

    for (const ti of orderedTargetArr) {
        ns.tprintf("%15s: %s/s", ti.target, ns.nFormat(ti.income, "($0.000a)"));
    }

    if (ns.args[1] === "check") {
        return;
    }

    const env = new ModHackEnv(ns, orderedTargetArr[0].target, executableHosts);

    await env.init(ns, true);
    while (await env.refresh(ns, minutes * 60 * 1000));
}

import { NS } from "@ns";
import { allHosts, serverIsHackable, canExecuteOnServer, cleanLogs, doBuyAndSoftenAll } from "lib/util";
import { SmartHackEnv } from "lib/hack/smart_hack_env";

async function calcIncome(ns: NS, target: string, hosts: string[], simMinutes = 2) {
    return await new SmartHackEnv(ns, target, hosts).fastSim(ns, 1000 * 60 * simMinutes);
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

    let orderedTargetArr: targetIncome[] = [];
    for (const target of targetArr) {
        let minutes = 2;
        if (ns.args[0] && !isNaN(Number(ns.args[0]))) minutes = Number(ns.args[0]);

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

    const env = new SmartHackEnv(ns, orderedTargetArr[0].target, executableHosts);
    // const env = new SmartHackEnv(ns, orderedTargetArr[0].target, ["pserv-3"]);
    // const env = new SmartHackEnv(ns, orderedTargetArr[1].target, ["pserv-4"]);
    // const env = new SmartHackEnv(ns, orderedTargetArr[2].target, ["pserv-5"]);
    // const env = new SmartHackEnv(ns, orderedTargetArr[3].target, ["pserv-6"]);
    // const env = new SmartHackEnv(ns, orderedTargetArr[4].target, ["pserv-7"]);
    // const env = new SmartHackEnv(ns, orderedTargetArr[5].target, ["pserv-8"]);
    // const env = new SmartHackEnv(ns, orderedTargetArr[6].target, ["pserv-9"]);
    await env.init(ns, true);
    while (await env.refresh(ns));
}

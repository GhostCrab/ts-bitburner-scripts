import { NS } from "@ns";
import { allHosts, serverIsHackable, canExecuteOnServer, cleanLogs, doBuyAndSoftenAll } from "bbutil";
import { SmartHackEnv } from "smart_hack_env";

async function calcIncome(ns: NS, target: string, hosts: string[], simMinutes = 2) {
    return await new SmartHackEnv(ns, target, hosts).fastSim(ns, 1000 * 60 * simMinutes);
}

type targetIncome = {
	target: string;
	income: number;
}

export async function main(ns: NS): Promise<void> {
    cleanLogs(ns);
	doBuyAndSoftenAll(ns);

    const allHostnames = allHosts(ns);
    const executableHosts = allHostnames
        .filter(canExecuteOnServer.bind(null, ns))
        //.filter((x) => x.indexOf("hacknet-node") === -1);
    const targetArr = allHostnames.filter(serverIsHackable.bind(null, ns)).filter((x) => ns.getServerMaxMoney(x) > 1);

    let orderedTargetArr: targetIncome[] = [];
    for (const target of targetArr) {
		let minutes = 2;
		if (ns.args[0] && !isNaN(Number(ns.args[0])))
			minutes = Number(ns.args[0])

        const income = await calcIncome(ns, target, executableHosts, minutes);
        orderedTargetArr.push({target: target, income: income});
    }

    orderedTargetArr = orderedTargetArr.sort((a, b) => b.income - a.income);

    for (const ti of orderedTargetArr) {
        ns.tprintf("%15s: %s/s", ti.target, ns.nFormat(ti.income, "($0.000a)"));
    }

    if (ns.args[1] === "check") {
        return;
    }

    const env = new SmartHackEnv(ns, orderedTargetArr[0].target, executableHosts);
    //const env = new SmartHackEnv(ns, "ecorp", executableHosts);
    await env.init(ns);
    while (await env.refresh(ns));
}

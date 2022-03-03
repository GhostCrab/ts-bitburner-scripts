import { NS } from "@ns";
import { allHosts, canExecuteOnServer, cleanLogs, doBuyAndSoftenAll } from "lib/util";
import { ModHackEnv } from "/lib/hack/mod_hack_env";

export async function main(ns: NS): Promise<void> {
    cleanLogs(ns);
    doBuyAndSoftenAll(ns);

    const allHostnames = allHosts(ns);
    const executableHosts = allHostnames
        .filter(canExecuteOnServer.bind(null, ns))
        .filter((x) => x.indexOf("hacknet-node") === -1);

    try {
        const env = new ModHackEnv(ns, "phantasy", executableHosts);
        await env.init(ns, true);
        while (await env.refresh(ns, 60 * 20 * 1000)) {
            await ns.sleep(env.tspacer / 2);
        }
    } catch (e) {
        //
    }
}

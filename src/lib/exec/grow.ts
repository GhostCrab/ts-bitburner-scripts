import { NS } from "@ns";
import { writeOut } from "lib/util";
import { ReservedScriptCall } from "lib/hack/host";

export async function main(ns: NS): Promise<void> {
    const data: ReservedScriptCall = JSON.parse(ns.args[0].toString());

    const startTime = new Date().getTime();
    const startSec = ns.getServerSecurityLevel(data.target);
    const startCash = ns.getServerMoneyAvailable(data.target);
    const result = await ns.grow(data.target, {
        hackOverrideEffect: data.hackLevelEffect,
        hackOverrideTiming: data.hackLevelTiming,
    });
    const endTime = new Date().getTime();

    await writeOut(ns, data, startTime, endTime, result.toFixed(2), startSec, startCash);
}

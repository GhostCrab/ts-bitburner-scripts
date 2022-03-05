import { NS } from "@ns";
import { ReservedScriptCall } from "lib/hack/host";

export async function main(ns: NS): Promise<void> {
    const data: ReservedScriptCall = JSON.parse(ns.args[0].toString());

    await ns.weaken(data.target, {
        hackOverrideEffect: data.hackLevelEffect,
        hackOverrideTiming: data.hackLevelTiming,
    });
}

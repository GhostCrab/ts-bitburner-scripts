import { NS } from "@ns";
import { SmartHackEnv } from "lib/hack/smart_hack_env";

export type CycleProduction = {
    totalThreads: number;
    hackTotal: number;
    hackThreads: number;
    growThreads: number;
    weakenHackThreads: number;
    weakenGrowThreads: number;
};

// {targetname: {hack stat, production lookup table}}
const CYCLE_PRODUCTION_LOOKUP: Record<
    string,
    {
        hack: number;
        prod: CycleProduction[];
    }
> = {};

export function getCycleProductionLookup(ns: NS, env: SmartHackEnv): CycleProduction[] {
    if (
        CYCLE_PRODUCTION_LOOKUP[env.targetname] &&
        CYCLE_PRODUCTION_LOOKUP[env.targetname].hack === ns.getPlayer().hacking
    ) {
        return CYCLE_PRODUCTION_LOOKUP[env.targetname].prod;
    }

    // memoize cycle production statistics indexed by cycleThreadAllowance
    const cycleProductionLookup = new Array(env.maxThreads + 1).fill(null);

    let hackThreads = Math.min(env.maxThreads, Math.floor(0.95 / env.hackPercentPerThread));

    while (hackThreads > 0) {
        hackThreads--;
        const hackTotal = env.hackPercentPerThread * hackThreads * env.highMoney;
        const hackSecIncrease = ns.hackAnalyzeSecurity(hackThreads);

        const growMult = Math.max(env.highMoney / (env.highMoney - hackTotal), 1);
        const growThreads = env.calcGrowThreads(ns, growMult, true);

        if (hackThreads + growThreads > env.maxThreads) {
            //ns.tprintf("h %d | g %d", hackThreads, growThreads)
            continue;
        }

        const growSecIncrease = ns.growthAnalyzeSecurity(growThreads);

        const weakenHackThreads = Math.ceil(hackSecIncrease / env.weakenAmountPerThread);
        const weakenGrowThreads = Math.ceil(growSecIncrease / env.weakenAmountPerThread);

        const totalThreads = hackThreads + weakenHackThreads + growThreads + weakenGrowThreads;

        if (totalThreads > env.maxThreads) continue;

        if (cycleProductionLookup[totalThreads] !== null) {
            // do nothing
        } else {
            cycleProductionLookup[totalThreads] = {
                totalThreads: totalThreads,
                hackTotal: hackTotal,
                hackThreads: hackThreads,
                growThreads: growThreads,
                weakenHackThreads: weakenHackThreads,
                weakenGrowThreads: weakenGrowThreads,
            };
        }
    }

    // Fill in the blanks
    const zeroThread = {
        totalThreads: 0,
        hackTotal: 0,
        hackThreads: 0,
        growThreads: 0,
        weakenHackThreads: 0,
        weakenGrowThreads: 0,
    };
    let fillDict = zeroThread;
    for (let idx = 0; idx < cycleProductionLookup.length; idx++) {
        if (cycleProductionLookup[idx] === null) cycleProductionLookup[idx] = fillDict;
        else fillDict = cycleProductionLookup[idx];
    }

    // const endTime = new Date().getTime();

    // ns.tprintf(
    //     "Calculated %20s:%d in %4dms | %d values | %4d",
    //     env.targetname,
    //     ns.getPlayer().hacking,
    //     endTime - startTime,
    //     env.maxThreads,
    //     Math.floor(1 / env.hackPercentPerThread)
    // );

    CYCLE_PRODUCTION_LOOKUP[env.targetname] = { hack: ns.getPlayer().hacking, prod: cycleProductionLookup };
    return CYCLE_PRODUCTION_LOOKUP[env.targetname].prod;
}

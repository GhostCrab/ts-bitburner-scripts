import { NS } from "@ns";
import { stFormat } from "/lib/util";

export async function main(ns: NS): Promise<void> {
    ns.tprintf("%s", ns.heart.break());

    // for (let hackOverride = 1; hackOverride <= ns.getPlayer().hacking; hackOverride++) {
    //     ns.tprintf("%d: %s", hackOverride, stFormat(ns, ns.getHackTime("phantasy", hackOverride), true));
    // }

    
    // const calculateIntelligenceBonus = function (intelligence: number, weight = 1): number {
    //     return 1 + (weight * Math.pow(intelligence, 0.8)) / 600;
    // }

    // const calculateHackLevelForTime2 = function (server: any, player: any, ms: number): number {
    //     const difficultyMult = server.requiredHackingSkill * server.hackDifficulty;
      
    //     const hackTime = ms / 1000;
    //     const baseDiff = 500;
    //     const baseSkill = 50;
    //     const diffFactor = 2.5;
    //     const hackTimeMultiplier = 5;

    //     const difficultyFactor = (diffFactor * difficultyMult + baseDiff)
    //     const speedFactor = (player.hacking_speed_mult * calculateIntelligenceBonus(player.intelligence, 1));
      
    //     const hackLvl = ((hackTimeMultiplier * difficultyFactor) / (hackTime * speedFactor)) - baseSkill;
      
    //     return hackLvl;
    // }

    ns.tprintf("%s", stFormat(ns, ns.formulas.hacking.weakenTime(ns.getServer("phantasy"), ns.getPlayer(), Number.MIN_VALUE), true))

    for (let ms = 0; ms < 200000; ms += 5000)
        ns.tprintf("%s: %s", stFormat(ns, ms), ns.formulas.hacking.hackLevelForTime(ns.getServer("phantasy"), ns.getPlayer(), ms).toFixed(2));
}

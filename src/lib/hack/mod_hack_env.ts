import { NS, Server, Player } from "@ns";
import { stFormat, stdFormat, WEAKENJS, GROWJS, HACKJS, llog } from "lib/util";
import { getCycleProductionLookup } from "lib/hack/cycle_production";
import {
    Host,
    generateHosts,
    reserveThreadsForExecution,
    reserveThreadsForExecutionSloppy,
    getMaxThreads,
    ReservedScriptCall,
    clearOperationsByBatchId,
} from "lib/hack/host";

export const TSPACER = 400;

type Cycle = {
    cycleTotal: number;
    hackTotal: number;
    production: number;
    fullCycleTime: number;
    hackThreads: number;
    growThreads: number;
    weakenHackThreads: number;
    weakenGrowThreads: number;
    percentPerCycle: number;
};

function sloppyPrimaryBatch(
    ns: NS,
    env: ModHackEnv,
    playerHackLvlGrowTiming: number,
    playerHackLvlWeakenTiming: number,
    playerHackLvlEffect: number,
    growOffsetTime: number,
    weakenGrowOffsetTime: number,
    primaryGrowThreads: number,
    primaryWeakenThreads: number
): void {
    if (primaryGrowThreads > 0)
        reserveThreadsForExecutionSloppy(
            ns,
            GROWJS,
            env.hosts,
            primaryGrowThreads,
            env.targetname,
            playerHackLvlGrowTiming,
            playerHackLvlEffect,
            0,
            growOffsetTime,
            env.growTime,
            "0PG",
            env.writeFile
        );
    if (primaryWeakenThreads > 0)
        reserveThreadsForExecutionSloppy(
            ns,
            WEAKENJS,
            env.hosts,
            primaryWeakenThreads,
            env.targetname,
            playerHackLvlWeakenTiming,
            playerHackLvlEffect,
            0,
            weakenGrowOffsetTime,
            env.weakenTime,
            "1PW",
            env.writeFile
        );
}

function cleanPrimaryBatch(
    ns: NS,
    env: ModHackEnv,
    playerHackLvlGrowTiming: number,
    playerHackLvlWeakenTiming: number,
    playerHackLvlEffect: number,
    growOffsetTime: number,
    weakenGrowOffsetTime: number,
    primaryGrowThreads: number,
    primaryWeakenThreads: number
): boolean {
    let threadsReserved = true;

    if (primaryGrowThreads > 0)
        threadsReserved =
            threadsReserved &&
            reserveThreadsForExecution(
                ns,
                GROWJS,
                env.hosts,
                primaryGrowThreads,
                env.targetname,
                playerHackLvlGrowTiming,
                playerHackLvlEffect,
                0,
                growOffsetTime,
                env.growTime,
                "0PG",
                env.writeFile
            );
    if (primaryWeakenThreads > 0)
        threadsReserved =
            threadsReserved &&
            reserveThreadsForExecutionSloppy(
                ns,
                WEAKENJS,
                env.hosts,
                primaryWeakenThreads,
                env.targetname,
                playerHackLvlWeakenTiming,
                playerHackLvlEffect,
                0,
                weakenGrowOffsetTime,
                env.weakenTime,
                "1PW",
                env.writeFile
            );

    return threadsReserved;
}

function sloppyBatch(
    ns: NS,
    env: ModHackEnv,
    batchId: number,
    playerHackLvlHackTiming: number,
    playerHackLvlGrowTiming: number,
    playerHackLvlWeakenTiming: number,
    playerHackLvlEffect: number,
    hackOffsetTime: number,
    growOffsetTime: number,
    weakenHackOffsetTime: number,
    weakenGrowOffsetTime: number
): void {
    const cycleOffsetTime = batchId * env.cycleSpacer;
    reserveThreadsForExecutionSloppy(
        ns,
        HACKJS,
        env.hosts,
        env.hackThreads,
        env.targetname,
        playerHackLvlHackTiming,
        playerHackLvlEffect,
        batchId,
        cycleOffsetTime + hackOffsetTime,
        env.hackTime,
        "0H",
        env.writeFile
    );
    reserveThreadsForExecutionSloppy(
        ns,
        GROWJS,
        env.hosts,
        env.growThreads,
        env.targetname,
        playerHackLvlGrowTiming,
        playerHackLvlEffect,
        batchId,
        cycleOffsetTime + growOffsetTime,
        env.growTime,
        "2G",
        env.writeFile
    );
    reserveThreadsForExecutionSloppy(
        ns,
        WEAKENJS,
        env.hosts,
        env.weakenHackThreads,
        env.targetname,
        playerHackLvlWeakenTiming,
        playerHackLvlEffect,
        batchId,
        cycleOffsetTime + weakenHackOffsetTime,
        env.weakenTime,
        "1WH",
        env.writeFile
    );
    reserveThreadsForExecutionSloppy(
        ns,
        WEAKENJS,
        env.hosts,
        env.weakenGrowThreads,
        env.targetname,
        playerHackLvlWeakenTiming,
        playerHackLvlEffect,
        batchId,
        cycleOffsetTime + weakenGrowOffsetTime,
        env.weakenTime,
        "3WG",
        env.writeFile
    );
}

function cleanBatch(
    ns: NS,
    env: ModHackEnv,
    batchId: number,
    playerHackLvlHackTiming: number,
    playerHackLvlGrowTiming: number,
    playerHackLvlWeakenTiming: number,
    playerHackLvlEffect: number,
    hackOffsetTime: number,
    growOffsetTime: number,
    weakenHackOffsetTime: number,
    weakenGrowOffsetTime: number
): boolean {
    const cycleOffsetTime = batchId * env.cycleSpacer;
    let threadsReserved = true;
    threadsReserved =
        threadsReserved &&
        reserveThreadsForExecution(
            ns,
            HACKJS,
            env.hosts,
            env.hackThreads,
            env.targetname,
            playerHackLvlHackTiming,
            playerHackLvlEffect,
            batchId,
            cycleOffsetTime + hackOffsetTime,
            env.hackTime,
            "0H",
            env.writeFile
        );
    threadsReserved =
        threadsReserved &&
        reserveThreadsForExecution(
            ns,
            GROWJS,
            env.hosts,
            env.growThreads,
            env.targetname,
            playerHackLvlGrowTiming,
            playerHackLvlEffect,
            batchId,
            cycleOffsetTime + growOffsetTime,
            env.growTime,
            "2G",
            env.writeFile
        );
    threadsReserved =
        threadsReserved &&
        reserveThreadsForExecutionSloppy(
            ns,
            WEAKENJS,
            env.hosts,
            env.weakenHackThreads,
            env.targetname,
            playerHackLvlWeakenTiming,
            playerHackLvlEffect,
            batchId,
            cycleOffsetTime + weakenHackOffsetTime,
            env.weakenTime,
            "1WH",
            env.writeFile
        );
    threadsReserved =
        threadsReserved &&
        reserveThreadsForExecutionSloppy(
            ns,
            WEAKENJS,
            env.hosts,
            env.weakenGrowThreads,
            env.targetname,
            playerHackLvlWeakenTiming,
            playerHackLvlEffect,
            batchId,
            cycleOffsetTime + weakenGrowOffsetTime,
            env.weakenTime,
            "3WG",
            env.writeFile
        );

    return threadsReserved;
}

export class ModHackEnv {
    targetname: string;
    highMoney: number;
    lowMoney: number;
    tspacer: number;

    weakenRam: number;
    growRam: number;
    hackRam: number;
    threadSize: number;

    cores: number;
    hosts: Host[];
    maxThreads: number;

    waitPID: number;

    security: number;
    lowSecurity: number;
    money: number;

    // Weaken Info
    weakenStartSec: number;
    weakenAmountPerThread: number;
    weakenThreads: number;
    weakenGrowThreads: number;
    weakenHackThreads: number;
    weakenTime: number;
    weakenTimeFullCycle: number;

    // Grow Info
    growStartMoney: number;
    growMult: number;
    growThreads: number;
    growSecIncrease: number;
    growTime: number;

    // Hack Info
    hackStartMoney: number;
    hackTotal: number;
    hackThreads: number;
    hackSecIncrease: number;
    hackTime: number;
    hackPercentPerThread: number;

    // Batch Cycle Info
    threadsPerCycle: number;
    cycleSpacer: number;
    fullBatchTime: number;
    cycleMax: number;
    cycleTotal: number;
    fullCycleTime: number;

    primaryStats: {
        primaryThreadsTotal: number;
        primaryGrowThreads: number;
        primaryWeakenThreads: number;
    };

    // Simulator Info
    simEnabled: boolean;
    simTarget: Server;
    simPlayer: Player;

    writeFile = "";

    constructor(ns: NS, targetname: string, hostnames: string[]) {
        this.targetname = targetname;
        this.highMoney = ns.getServerMaxMoney(this.targetname);
        this.lowMoney = ns.getServerMaxMoney(this.targetname) * 0.5;
        this.tspacer = TSPACER; // CONST

        this.weakenRam = ns.getScriptRam(WEAKENJS);
        this.growRam = ns.getScriptRam(GROWJS);
        this.hackRam = ns.getScriptRam(HACKJS);
        this.threadSize = Math.max(this.weakenRam, this.growRam, this.hackRam);

        this.cores = 1; // Simplify
        [this.hosts, this.maxThreads] = generateHosts(ns, hostnames, this.threadSize);

        this.waitPID = 0;

        // Target Info
        this.security = 0;
        this.lowSecurity = 0;
        this.money = 0;

        // Weaken Info
        this.weakenStartSec = 0;
        this.weakenAmountPerThread = 0;
        this.weakenThreads = 0;
        this.weakenGrowThreads = 0;
        this.weakenHackThreads = 0;
        this.weakenTime = 0;
        this.weakenTimeFullCycle = 0;

        // Grow Info
        this.growStartMoney = 0;
        this.growMult = 0;
        this.growThreads = 0;
        this.growSecIncrease = 0;
        this.growTime = 0;

        // Hack Info
        this.hackStartMoney = 0;
        this.hackTotal = 0;
        this.hackThreads = 0;
        this.hackSecIncrease = 0;
        this.hackTime = 0;
        this.hackPercentPerThread = 0;

        // Batch Cycle Info
        this.threadsPerCycle = 0;
        this.cycleSpacer = this.tspacer * 4;
        this.fullBatchTime = 0; // this.weakenTime + this.tspacer * 2;
        this.cycleMax = 0; // Math.floor(this.cycleFitTime / this.cycleSpacer)
        this.cycleTotal = 0;
        this.fullCycleTime = 0; // this.cycleFullTime + this.cycleSpacer * this.cycleTotal

        this.primaryStats = {
            primaryThreadsTotal: 0,
            primaryGrowThreads: 0,
            primaryWeakenThreads: 0,
        };

        // Simulator Info
        this.simEnabled = false;
        this.simTarget = ns.getServer(this.targetname);
        this.simPlayer = ns.getPlayer();

        //this.writeFile = ns.sprintf("%s-%d.txt", this.targetname, new Date().getTime());
    }

    async init(ns: NS, force = false): Promise<void> {
        for (const host of this.hosts) {
            await host.prep(ns, force);
        }

        if (this.writeFile !== "") {
            await ns.write(
                this.writeFile,
                ns.sprintf(
                    "%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
                    "Target Name",
                    "UID",
                    "Batch ID",
                    "Start Time",
                    "End Time",
                    "Operation Time",
                    "Real Start Time",
                    "Real End Time",
                    "Real Operation Time",
                    "Start Time Diff",
                    "End Time Diff",
                    "Operation Time Diff",
                    "Result",
                    "Security Before",
                    "Security After",
                    "Cash Before",
                    "Cash After"
                ),
                "w"
            );
        }
    }

    getServerSecurityLevel(ns: NS): number {
        if (this.simEnabled) return this.simTarget.hackDifficulty;

        return ns.getServerSecurityLevel(this.targetname);
    }

    getServerMoneyAvailable(ns: NS): number {
        if (this.simEnabled) return Math.max(this.simTarget.moneyAvailable, 1);

        return Math.max(ns.getServerMoneyAvailable(this.targetname), 1);
    }

    getWeakenTime(ns: NS, hackOverride?: number): number {
        if (this.simEnabled)
            return Math.ceil(ns.formulas.hacking.weakenTime(this.simTarget, this.simPlayer, hackOverride));

        return Math.ceil(ns.getWeakenTime(this.targetname, hackOverride));
    }

    getWeakenLevelForTime(ns: NS, ms: number): number {
        if (this.simEnabled) return ns.formulas.hacking.weakenLevelForTime(this.simTarget, ns.getPlayer(), ms);
        return ns.formulas.hacking.weakenLevelForTime(ns.getServer(this.targetname), ns.getPlayer(), ms);
    }

    getGrowTime(ns: NS, hackOverride?: number): number {
        if (this.simEnabled)
            return Math.ceil(ns.formulas.hacking.growTime(this.simTarget, this.simPlayer, hackOverride));

        return Math.ceil(ns.getGrowTime(this.targetname, hackOverride));
    }

    getHackTime(ns: NS, hackOverride?: number): number {
        if (this.simEnabled)
            return Math.ceil(ns.formulas.hacking.hackTime(this.simTarget, this.simPlayer, hackOverride));

        return Math.ceil(ns.getHackTime(this.targetname, hackOverride));
    }

    hackAnalyze(ns: NS, assumeMinSec = false, hackOverride?: number): number {
        if (this.simEnabled) {
            if (assumeMinSec) {
                const simTarget = Object.assign({}, this.simTarget);
                simTarget.hackDifficulty = simTarget.minDifficulty;
                return ns.formulas.hacking.hackPercent(simTarget, this.simPlayer, hackOverride);
            }
            return ns.formulas.hacking.hackPercent(this.simTarget, this.simPlayer, hackOverride);
        }

        if (assumeMinSec) {
            const simTarget = ns.getServer(this.targetname);
            simTarget.hackDifficulty = simTarget.minDifficulty;
            return ns.formulas.hacking.hackPercent(simTarget, ns.getPlayer(), hackOverride);
        }

        return ns.hackAnalyze(this.targetname, hackOverride);
    }

    numCycleForGrowth(ns: NS, server: Server, growth: number, player: Player, cores = 1): number {
        let ajdGrowthRate = 1 + (1.03 - 1) / server.hackDifficulty;
        if (ajdGrowthRate > 1.0035) {
            ajdGrowthRate = 1.0035;
        }

        const serverGrowthPercentage = server.serverGrowth / 100;

        const coreBonus = 1 + (cores - 1) / 16;
        const cycles =
            Math.log(growth) /
            (Math.log(ajdGrowthRate) *
                player.hacking_grow_mult *
                serverGrowthPercentage *
                ns.getBitNodeMultipliers().ServerGrowthRate *
                coreBonus);

        return cycles;
    }

    calcGrowThreads(ns: NS, _growMult: number, assumeMinSec = false): number {
        const growMult = _growMult === undefined ? this.growMult : _growMult;
        let threads = 0;
        if (growMult >= 1) {
            if (this.simEnabled) {
                if (assumeMinSec) {
                    const simTarget = Object.assign({}, this.simTarget);
                    simTarget.hackDifficulty = simTarget.minDifficulty;
                    threads = this.numCycleForGrowth(ns, simTarget, growMult, this.simPlayer);
                } else {
                    threads = this.numCycleForGrowth(ns, this.simTarget, growMult, this.simPlayer);
                }
            } else {
                if (assumeMinSec) {
                    const simTarget = ns.getServer(this.targetname);
                    simTarget.hackDifficulty = simTarget.minDifficulty;
                    threads = this.numCycleForGrowth(ns, simTarget, growMult, ns.getPlayer());
                } else {
                    threads = ns.growthAnalyze(this.targetname, growMult, this.cores);
                }
            }
        }
        return Math.ceil(threads);
    }

    hackLevelForHackTime(ns: NS, ms: number): number {
        if (this.simEnabled) return ns.formulas.hacking.hackLevelForTime(this.simTarget, this.simPlayer, ms);

        return ns.formulas.hacking.hackLevelForTime(ns.getServer(this.targetname), ns.getPlayer(), ms);
    }

    hackLevelForGrowTime(ns: NS, ms: number): number {
        if (this.simEnabled) return ns.formulas.hacking.growLevelForTime(this.simTarget, this.simPlayer, ms);

        return ns.formulas.hacking.growLevelForTime(ns.getServer(this.targetname), ns.getPlayer(), ms);
    }

    hackLevelForWeakenTime(ns: NS, ms: number): number {
        if (this.simEnabled) return ns.formulas.hacking.weakenLevelForTime(this.simTarget, this.simPlayer, ms);

        return ns.formulas.hacking.weakenLevelForTime(ns.getServer(this.targetname), ns.getPlayer(), ms);
    }

    async refresh(ns: NS, targetMs = Number.MAX_SAFE_INTEGER): Promise<boolean> {
        if (this.isWRunning(ns)) {
            // process in progress, wait for next refresh to update
            await ns.sleep(1000);
            return true;
        }

        // Player State
        const playerHackLvlEffect = ns.getPlayer().hacking;

        // Host state
        this.maxThreads = getMaxThreads(ns, this.hosts);

        // Target Info
        this.highMoney = ns.getServerMaxMoney(this.targetname);
        this.lowMoney = ns.getServerMaxMoney(this.targetname) * 0.5;
        this.money = this.getServerMoneyAvailable(ns);
        this.lowSecurity = ns.getServerMinSecurityLevel(this.targetname);
        this.security = this.getServerSecurityLevel(ns);

        // Hack Info
        this.hackPercentPerThread = this.hackAnalyze(ns, true, playerHackLvlEffect);

        this.hackThreads = 1 / this.hackPercentPerThread - 1;
        this.hackTotal = this.hackPercentPerThread * this.hackThreads * this.money;
        this.hackSecIncrease = ns.hackAnalyzeSecurity(this.hackThreads);

        // Weaken Info
        this.weakenAmountPerThread = ns.weakenAnalyze(1, this.cores);

        // Cycle Info
        this.cycleMax = Math.max(Math.floor((this.hackTime - this.tspacer) / this.cycleSpacer), 1);

        this.threadsPerCycle = this.hackThreads + this.weakenHackThreads + this.growThreads + this.weakenGrowThreads;

        /////////////////////////////////////
        // space HWGW operations out such that they start 400ms apart and they finish 400ms apart
        // stretch Hack time to the longest possbible time
        // batch starts take spacer * 4 time, how many batch starts can fit in the length of maxHackTime
        //
        // create an array of hack levels for each cycle count
        /////////////////////////////////////

        // what is the hack level required to achieve 1 cycle?
        // timing would be such that hack would finish 400ms after grow-weaken started
        // each hack level timing implies first hack finishes <spacer> ms after last grow-weaken starts

        // batch time = spacer * 4
        // cycle 1: hack time = batch time
        // cycle 2: hack time = batch time * 2

        // if the result of hackLevelForTime is > player.hacking, limit it to player.hacking (these will be low cycle counts)
        // if the result of hackLevelForTime is <= 0, discard this result and cycleMax is one less than this iteration.

        const cycleLevels: { [key: string]: { hackLevel: number; fullBatchTime: number; fullCycleTime: number } } = {};

        let cycleCount = 0;
        const fastWeakenTime = this.getWeakenTime(ns);
        while (true) {
            cycleCount++;
            const targetHackTime = Math.max(this.cycleSpacer * cycleCount, fastWeakenTime);
            const hackLevel = Math.min(this.hackLevelForHackTime(ns, targetHackTime), ns.getPlayer().hacking);

            if (hackLevel <= 0) {
                break;
            }

            const actualHackTime = this.getHackTime(ns, hackLevel);
            const fullBatchTime = actualHackTime + this.cycleSpacer * 3;
            const fullCycleTime = fullBatchTime + this.cycleSpacer * (cycleCount - 1);

            if (fullCycleTime > targetMs || targetHackTime > fastWeakenTime) break;

            cycleLevels[cycleCount] = {
                hackLevel: hackLevel,
                fullBatchTime: fullBatchTime,
                fullCycleTime: fullCycleTime,
            };
        }

        // for (const [_cycleTotal, data] of Object.entries(cycleLevels)) {
        //     const cycleTotal = Number(_cycleTotal);
        //     ns.tprintf("%d: %.2f - %s %s", _cycleTotal, data.hackLevel, stFormat(ns, data.fullBatchTime, true), stFormat(ns, data.fullCycleTime, true));
        // }

        this.cycleMax = Object.keys(cycleLevels).length;

        // Primary Cycle Info
        const primaryGrowMult = Math.max(this.highMoney / this.money, 1);
        let primaryGrowThreads = this.calcGrowThreads(ns, primaryGrowMult);
        let primaryGrowSecIncrease = ns.growthAnalyzeSecurity(primaryGrowThreads);
        let primarySecDiff = this.security - this.lowSecurity;
        let primaryWeakenThreads = Math.ceil((primaryGrowSecIncrease + primarySecDiff) / this.weakenAmountPerThread);
        let primaryThreadsTotal = primaryGrowThreads + primaryWeakenThreads;
        if (primarySecDiff < 1 && primaryGrowMult < 1.05) primaryThreadsTotal = 0; // dont bother with the grow/weaken cycle if we're already very close to optimal

        while (primaryThreadsTotal > this.maxThreads) {
            primaryGrowThreads--;
            primaryGrowSecIncrease = ns.growthAnalyzeSecurity(primaryGrowThreads);
            primarySecDiff = this.security - this.lowSecurity;
            primaryWeakenThreads = Math.ceil((primaryGrowSecIncrease + primarySecDiff) / this.weakenAmountPerThread);
            primaryThreadsTotal = primaryGrowThreads + primaryWeakenThreads;
        }

        // memoize cycle production statistics indexed by cycleThreadAllowance
        const cycleProductionLookup = await getCycleProductionLookup(ns, this, playerHackLvlEffect);

        // Get all cycle combination production statistics
        let allCycles: Cycle[] = [];
        for (const [_cycleTotal, data] of Object.entries(cycleLevels)) {
            const cycleTotal = Number(_cycleTotal);
            const usableThreads = this.maxThreads - primaryThreadsTotal;
            const usableCycles = primaryThreadsTotal > 0 ? cycleTotal - 1 : cycleTotal;
            const fullCycleTime = data.fullCycleTime;

            const cycleThreadAllowance = Math.floor(usableThreads / usableCycles);

            const cycleStats = cycleProductionLookup[cycleThreadAllowance];

            if (cycleTotal === 1 && primaryThreadsTotal > 0) {
                allCycles.push({
                    cycleTotal: cycleTotal,
                    hackTotal: 1,
                    production: 1,
                    fullCycleTime: fullCycleTime,
                    hackThreads: 0,
                    growThreads: 0,
                    weakenHackThreads: 0,
                    weakenGrowThreads: 0,
                    percentPerCycle: 0,
                });
                continue;
            }

            if (cycleStats === undefined) {
                ns.print(ns.sprintf("WARNING: Thread Total %s is undefined", cycleThreadAllowance));
                continue;
            }
            allCycles.push({
                cycleTotal: cycleTotal,
                hackTotal: cycleStats.hackTotal,
                production: (usableCycles * cycleStats.hackTotal) / (fullCycleTime / 1000),
                fullCycleTime: fullCycleTime,
                hackThreads: cycleStats.hackThreads,
                growThreads: cycleStats.growThreads,
                weakenHackThreads: cycleStats.weakenHackThreads,
                weakenGrowThreads: cycleStats.weakenGrowThreads,
                percentPerCycle: (cycleStats.hackTotal / ns.getServerMaxMoney(this.targetname)) * 100,
            });
        }

        allCycles = allCycles.sort((a, b) => b.production - a.production);

        //this.debugPrintCycleStats(ns, primaryThreadsTotal, allCycles);

        const cycleTarget = allCycles[0];

        if (!cycleTarget) {
            this.hackTotal = 0;
            this.hackThreads = 0;
            this.growThreads = 0;
            this.weakenHackThreads = 0;
            this.weakenGrowThreads = 0;
            this.cycleTotal = 1;
            this.fullCycleTime = Number.MAX_SAFE_INTEGER;
            this.primaryStats = {
                primaryThreadsTotal: primaryThreadsTotal,
                primaryGrowThreads: primaryGrowThreads,
                primaryWeakenThreads: primaryWeakenThreads,
            };

            return false;
        }

        this.hackTotal = cycleTarget.hackTotal;
        this.hackThreads = cycleTarget.hackThreads;
        this.growThreads = cycleTarget.growThreads;
        this.weakenHackThreads = cycleTarget.weakenHackThreads;
        this.weakenGrowThreads = cycleTarget.weakenGrowThreads;
        this.cycleTotal = cycleTarget.cycleTotal;
        this.fullCycleTime = cycleTarget.fullCycleTime;
        this.primaryStats = {
            primaryThreadsTotal: primaryThreadsTotal,
            primaryGrowThreads: primaryGrowThreads,
            primaryWeakenThreads: primaryWeakenThreads,
        };

        this.fullBatchTime = cycleLevels[this.cycleTotal].fullBatchTime;
        const playerHackLvlHackTiming = cycleLevels[this.cycleTotal].hackLevel;
        this.hackTime = this.getHackTime(ns, playerHackLvlHackTiming);
        const playerHackLvlGrowTiming = this.hackLevelForGrowTime(ns, this.hackTime);
        this.growTime = this.getGrowTime(ns, playerHackLvlGrowTiming);
        const playerHackLvlWeakenTiming = this.hackLevelForWeakenTime(ns, this.hackTime);
        this.weakenTime = this.getGrowTime(ns, playerHackLvlWeakenTiming);

        // dont do thread reservation and execution if this is a simulation
        if (this.simEnabled) return true;

        const hackOffsetTime = 0;
        const weakenHackOffsetTime = this.tspacer * 1;
        const growOffsetTime = this.tspacer * 2;
        const weakenGrowOffsetTime = this.tspacer * 3;

        if (primaryThreadsTotal > 0) {
            const threadsReserved = cleanPrimaryBatch(
                ns,
                this,
                playerHackLvlGrowTiming,
                playerHackLvlWeakenTiming,
                playerHackLvlEffect,
                growOffsetTime,
                weakenGrowOffsetTime,
                primaryGrowThreads,
                primaryWeakenThreads
            );

            if (!threadsReserved) {
                llog(ns, "WARNING: Unable to reserve primary threads cleanly");
                clearOperationsByBatchId(this.hosts, 0);

                sloppyPrimaryBatch(
                    ns,
                    this,
                    playerHackLvlGrowTiming,
                    playerHackLvlWeakenTiming,
                    playerHackLvlEffect,
                    growOffsetTime,
                    weakenGrowOffsetTime,
                    primaryGrowThreads,
                    primaryWeakenThreads
                );
            }
        }

        const allCycleTotal = this.cycleTotal;
        for (let i = 0; i < allCycleTotal; i++) {
            if (primaryThreadsTotal > 0 && i === 0) continue;
            const threadsReserved = cleanBatch(
                ns,
                this,
                i,
                playerHackLvlHackTiming,
                playerHackLvlGrowTiming,
                playerHackLvlWeakenTiming,
                playerHackLvlEffect,
                hackOffsetTime,
                growOffsetTime,
                weakenHackOffsetTime,
                weakenGrowOffsetTime
            );

            if (!threadsReserved) {
                if (this.cycleTotal > 1) {
                    llog(ns, "WARNING: Unable to Reserve batch %d", i);
                    this.cycleTotal--;
                    clearOperationsByBatchId(this.hosts, i);
                } else {
                    llog(ns, "WARNING: Only reserving one bad batch");
                    sloppyBatch(
                        ns,
                        this,
                        0,
                        playerHackLvlHackTiming,
                        playerHackLvlGrowTiming,
                        playerHackLvlWeakenTiming,
                        playerHackLvlEffect,
                        hackOffsetTime,
                        growOffsetTime,
                        weakenHackOffsetTime,
                        weakenGrowOffsetTime
                    );
                }
            }
        }

        const port = ns.getPortHandle(1);
        port.clear();
        port.write(
            JSON.stringify([
                new Date(),
                this.fullCycleTime,
                this.targetname,
                ns.getScriptIncome(ns.getScriptName(), ns.getHostname(), ...ns.args).toString(),
                "SMART",
            ])
        );

        this.logStats(ns);

        await this.execute(ns);
        this.resetThreads();

        return true;
    }

    debugPrintCycleStats(ns: NS, primaryThreadsTotal: number, allCycles: Cycle[]): void {
        let counter = 0;
        for (const cycle of allCycles) {
            if (++counter > 400) return;
            let batchThreads =
                cycle.hackThreads + cycle.growThreads + cycle.weakenHackThreads + cycle.weakenGrowThreads;
            if (cycle.hackThreads === undefined) batchThreads = 0;
            let cycleThreads = primaryThreadsTotal + batchThreads * (cycle.cycleTotal - 1);
            if (primaryThreadsTotal === 0) {
                cycleThreads = batchThreads * cycle.cycleTotal;
            }
            const cycleMem = cycleThreads * this.threadSize;
            ns.tprintf(
                "%3d;%s  %9s/s %5.2f %d/%4d/%5d %6dGB, %s|%s|%s|%s %s",
                cycle.cycleTotal,
                this.targetname,
                ns.nFormat(cycle.production, "($0.000a)"),
                cycle.percentPerCycle ? cycle.percentPerCycle : 0,
                primaryThreadsTotal,
                batchThreads,
                cycleThreads,
                cycleMem,
                cycle.hackThreads,
                cycle.growThreads,
                cycle.weakenHackThreads,
                cycle.weakenGrowThreads,
                stFormat(ns, cycle.fullCycleTime)
            );
        }
    }

    logStats(ns: NS): void {
        if (this.primaryStats.primaryThreadsTotal > 0) {
            llog(
                ns,
                "SMART-PRIMARY: %s => Grow %d; Weaken %d; Total Threads %d",
                this.targetname,
                this.primaryStats.primaryGrowThreads,
                this.primaryStats.primaryWeakenThreads,
                this.primaryStats.primaryThreadsTotal
            );
        }

        const percentPerCycle = (this.hackTotal / ns.getServerMaxMoney(this.targetname)) * 100;

        llog(
            ns,
            "SMART: %s => H %d|%d; G %d|%d; T %d|%d(%d)/%d; Cycles %s/%s",
            this.targetname,
            this.hackThreads,
            this.weakenHackThreads,
            this.growThreads,
            this.weakenGrowThreads,
            this.threadsPerCycle,
            this.threadsPerCycle * this.cycleTotal,
            this.threadsPerCycle * this.cycleTotal + this.primaryStats.primaryThreadsTotal,
            this.maxThreads,
            this.cycleTotal,
            this.cycleMax
        );

        llog(
            ns,
            "SMART: %s => Income %s|%s (%.2f%%|%.2f%%) %s/s",
            this.targetname,
            ns.nFormat(this.hackTotal, "($0.000a)"),
            ns.nFormat(this.hackTotal * this.cycleTotal, "($0.000a)"),
            percentPerCycle,
            percentPerCycle * this.cycleTotal,
            ns.nFormat(((this.hackTotal * this.cycleTotal) / this.fullCycleTime) * 1000, "($0.000a)")
        );

        llog(
            ns,
            "SMART: %s => Complete %s; Total %s; Active -%s",
            this.targetname,
            stdFormat(ns, this.fullCycleTime, true),
            stFormat(ns, this.fullCycleTime, true),
            stFormat(ns, this.fullCycleTime - this.weakenTime, true)
        );
    }

    async execute(ns: NS): Promise<void> {
        let execs: ReservedScriptCall[] = [];
        this.hosts.map((host) => host.reservedScriptCalls.map((sc) => execs.push(sc)));
        execs = execs.sort((a, b) => b.offset - a.offset);

        this.waitPID = 0;
        let waitPIDFinishTime = 0;
        const startTime = new Date().getTime();
        execs.map((exec) => (exec.realTimeStart = startTime));
        while (execs.length > 0) {
            const exec = execs.pop();

            if (exec === undefined) break;

            while (new Date().getTime() - startTime < exec.offset) await ns.sleep(5);

            // script call has come up, make sure it is starting and finishing within +- tspacer / 2
            const curTOffset = new Date().getTime() - startTime;
            const offsetDiff = Math.abs(curTOffset - exec.offset);
            if (offsetDiff > this.tspacer / 2) {
                execs = execs.filter((a) => a.batchId !== exec.batchId);
                ns.print(
                    ns.sprintf(
                        "WARNING: %s:%s #%d start time was off by %dms (limit is +- %d) and the batch was canceled s: %s c: %s",
                        exec.target,
                        exec.script,
                        exec.batchId,
                        curTOffset - exec.offset,
                        this.tspacer / 2,
                        stFormat(ns, exec.offset, true),
                        stFormat(ns, curTOffset, true)
                    )
                );
                continue;
            }

            // let finishTOffset = curTOffset;
            // if (exec.script === WEAKENJS) finishTOffset += ns.getWeakenTime(exec.target, exec.hackLevelTiming);
            // if (exec.script === GROWJS) finishTOffset += ns.getGrowTime(exec.target, exec.hackLevelTiming);
            // if (exec.script === HACKJS) finishTOffset += ns.getHackTime(exec.target, exec.hackLevelTiming);

            // const finishDiff = Math.abs(finishTOffset - exec.finish);
            // if (finishDiff > this.tspacer / 2) {
            //     execs = execs.filter((a) => a.batchId !== exec.batchId);
            //     ns.print(
            //         ns.sprintf(
            //             "WARNING: %s:%s #%d finish time was off by %dms (limit is +- %d) and the batch was canceled  e: %s c: %s",
            //             exec.target,
            //             exec.script,
            //             exec.batchId,
            //             finishTOffset - exec.finish,
            //             this.tspacer / 2,
            //             stFormat(ns, exec.finish, true),
            //             stFormat(ns, finishTOffset, true)
            //         )
            //     );
            //     continue;
            // }

            const pid = ns.exec(exec.script, exec.host, exec.numThreads, JSON.stringify(exec));
            if (waitPIDFinishTime <= exec.finish) {
                this.waitPID = pid;
                waitPIDFinishTime = exec.finish;
            }
        }
    }

    resetThreads(): void {
        for (const host of this.hosts) {
            host.reset();
        }
    }

    isWRunning(ns: NS): boolean {
        if (this.simEnabled) return false;
        if (this.waitPID === 0) return false;

        if (ns.getRunningScript(this.waitPID)) {
            return true;
        }

        this.waitPID = 0;
        return false;
    }

    resetSim(ns: NS): void {
        this.simTarget = ns.getServer(this.targetname);
        this.simPlayer = ns.getPlayer();
    }

    async fastSim(ns: NS, time: number): Promise<number> {
        this.resetSim(ns);
        this.simEnabled = true;

        let simIncome = 0;
        let simTime = 0;
        let simState = 0; // 0: primary, 1: no-primary

        while (true) {
            if (simState === 0) {
                const result = await this.refresh(ns, time - simTime);
                if (!result) break;

                if (this.primaryStats.primaryThreadsTotal === 0) simState = 1;
                this.simTarget.moneyAvailable *= ns.formulas.hacking.growPercent(
                    this.simTarget,
                    this.primaryStats.primaryGrowThreads,
                    this.simPlayer
                );
                this.simTarget.moneyAvailable = Math.min(this.simTarget.moneyAvailable, this.simTarget.moneyMax);
                this.simTarget.hackDifficulty += ns.growthAnalyzeSecurity(this.primaryStats.primaryGrowThreads);
                this.simTarget.hackDifficulty -= ns.weakenAnalyze(this.primaryStats.primaryWeakenThreads);
                this.simTarget.hackDifficulty = Math.max(this.simTarget.minDifficulty, this.simTarget.hackDifficulty);

                simIncome += this.hackTotal * (this.cycleTotal - 1);
                simTime += this.fullCycleTime;
            } else {
                const timeRemaining = time - simTime;
                const cyclesRemaining = Math.floor(timeRemaining / this.fullCycleTime);

                simIncome += this.hackTotal * this.cycleTotal * cyclesRemaining;
                simTime += this.fullCycleTime * cyclesRemaining;

                break;
            }
        }

        this.simEnabled = false;

        if (simIncome === 0) {
            ns.tprintf(
                "%s - %s (%s / %s)",
                this.targetname,
                stFormat(ns, this.fullCycleTime),
                this.simTarget.hackDifficulty,
                this.simTarget.minDifficulty
            );
            return 0;
        }

        return simIncome / (simTime / 1000);
    }
}

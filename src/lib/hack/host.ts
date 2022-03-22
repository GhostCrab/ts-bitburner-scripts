import { NS } from "@ns";
import { ModHackEnv } from "/lib/hack/mod_hack_env";
import { SmartHackEnv } from "/lib/hack/smart_hack_env";
import { WEAKENJS, GROWJS, HACKJS, UTILJS } from "lib/util";

export type ReservedScriptCall = {
    script: string;
    host: string;
    numThreads: number;
    target: string;
    hackLevelTiming: number;
    hackLevelEffect: number;
    batchId: number;
    offset: number;
    operationTime: number;
    finish: number;
    realTimeStart: number;
    uid: string;
    writeFile: string;
};

export class Host {
    hostname: string;
    threadSize: number;
    maxThreads: number;
    reservedScriptCalls: ReservedScriptCall[];

    constructor(ns: NS, hostname: string, threadSize: number) {
        this.hostname = hostname;
        this.threadSize = threadSize;
        this.reservedScriptCalls = [];
        this.maxThreads = 0;
        this.getMaxThreads(ns);
    }

    reset(): void {
        this.reservedScriptCalls = [];
    }

    getReservedThreads(): number {
        return this.reservedScriptCalls.reduce((a, b) => a + b.numThreads, 0);
    }

    getAvailableThreads(): number {
        return this.reservedScriptCalls.reduce((a, b) => a - b.numThreads, this.maxThreads);
    }

    // return # of threads successfully allocated
    tryReserveThreads(
        ns: NS,
        script: string,
        host: string,
        numThreads: number,
        target: string,
        hackLevelTiming: number,
        hackLevelEffect: number,
        batchId: number,
        offset: number,
        operationTime: number,
        uid: string,
        writeFile: string
    ): number {
        const allocateThreads = Math.min(this.getAvailableThreads(), numThreads);

        if (allocateThreads === 0) return allocateThreads;

        this.reservedScriptCalls.push({
            script: script,
            host: host,
            numThreads: allocateThreads,
            target: target,
            hackLevelTiming: hackLevelTiming,
            hackLevelEffect: hackLevelEffect,
            batchId: batchId,
            offset: offset,
            operationTime: operationTime,
            finish: offset + operationTime,
            realTimeStart: 0,
            uid: uid,
            writeFile: writeFile,
        });

        return allocateThreads;
    }

    // update max threads in case server size has changed
    getMaxThreads(ns: NS): number {
        this.maxThreads = Math.floor(ns.getServerMaxRam(this.hostname) / this.threadSize);

        // if this host is home, reserve 64GB of ram for other stuff
        if (this.hostname === "home") {
            //const homeram = ns.getServerMaxRam(this.hostname) - 1024 - 128;
            const homeram = ns.getServerMaxRam(this.hostname) - 128;
            this.maxThreads = Math.max(0, Math.floor(homeram / this.threadSize));
        }

        this.maxThreads = Math.min(1000000, this.maxThreads);

        return this.maxThreads;
    }

    async prep(ns: NS, force = false): Promise<void> {
        if (force || !ns.fileExists(GROWJS, this.hostname)) await ns.scp(GROWJS, "home", this.hostname);
        if (force || !ns.fileExists(WEAKENJS, this.hostname)) await ns.scp(WEAKENJS, "home", this.hostname);
        if (force || !ns.fileExists(HACKJS, this.hostname)) await ns.scp(HACKJS, "home", this.hostname);
        if (force || !ns.fileExists(UTILJS, this.hostname)) await ns.scp(UTILJS, "home", this.hostname);
    }
}

export function generateHosts(ns: NS, hostnames: string[], threadSize: number): [Host[], number] {
    let hosts: Host[] = [];
    let maxThreads = 0;
    if (hostnames)
        hosts = hostnames
            .map((x) => new Host(ns, x, threadSize))
            .filter((x) => x.maxThreads > 0)
            .sort((a, b) => b.maxThreads - a.maxThreads);

    hosts.map((x) => (maxThreads += x.maxThreads));

    // Too many threads causes problems
    maxThreads = Math.min(1000000, maxThreads);

    return [hosts, maxThreads];
}

export function getMaxThreads(ns: NS, hosts: Host[]): number {
    let maxThreads = 0;
    hosts.map((x) => (maxThreads += x.getMaxThreads(ns)));

    // Too many threads causes problems
    maxThreads = Math.min(1000000, maxThreads);

    return maxThreads;
}

export function mockReserveThreads(ns: NS, hosts: Host[], numThreads: number, batchId: number, sloppy = false): boolean {
    if (sloppy) return reserveThreadsForExecutionSloppy(ns, "", hosts, numThreads, "", 0, 0, 0, 0, 0, "", "");
    else return reserveThreadsForExecution(ns, "", hosts, numThreads, "", 0, 0, 0, 0, 0, "", "");
}

export function reserveThreadsForExecution(
    ns: NS,
    script: string,
    hosts: Host[],
    numThreads: number,
    target: string,
    hackLevelTiming: number,
    hackLevelEffect: number,
    batchId: number,
    offset: number,
    operationTime: number,
    uid: string,
    writeFile: string
): boolean {
    for (const host of hosts) {
        if (host.getAvailableThreads() >= numThreads) {
            host.tryReserveThreads(
                ns,
                script,
                host.hostname,
                numThreads,
                target,
                hackLevelTiming,
                hackLevelEffect,
                batchId,
                offset,
                operationTime,
                ns.sprintf("%03d-%s-%s", batchId, uid, host.hostname),
                writeFile
            );
            return true;
        }
    }

    return false;
}

export function reserveThreadsForExecutionSloppy(
    ns: NS,
    script: string,
    hosts: Host[],
    numThreads: number,
    target: string,
    hackLevelTiming: number,
    hackLevelEffect: number,
    batchId: number,
    offset: number,
    operationTime: number,
    uid: string,
    writeFile: string
): boolean {
    let unallocatedThreads = numThreads;
    for (const host of hosts) {
        unallocatedThreads -= host.tryReserveThreads(
            ns,
            script,
            host.hostname,
            unallocatedThreads,
            target,
            hackLevelTiming,
            hackLevelEffect,
            batchId,
            offset,
            operationTime,
            ns.sprintf("%03d-%s-%s", batchId, uid, host.hostname),
            writeFile
        );
        if (unallocatedThreads === 0) {
            return true;
        }
    }

    ns.tprintf("WARNING: Only able to allocate %d/%d %s threads", numThreads - unallocatedThreads, numThreads, script);
    return false;
}

export function clearOperationsByBatchId(hosts: Host[], batchId: number): void {
    for (const host of hosts) {
        host.reservedScriptCalls = host.reservedScriptCalls.filter((a) => a.batchId !== batchId);
    }
}

export function clearAllBatches(hosts: Host[]): void {
    for (const host of hosts) {
        host.reset();
    }
}

export function mockPrimaryBatch(ns: NS, hosts: Host[], primaryGrowThreads: number, primaryWeakenThreads: number): boolean {
    let threadsReserved = true;
    if (primaryGrowThreads > 0)
        threadsReserved = threadsReserved && mockReserveThreads(ns, hosts, primaryGrowThreads, 0, true);
    if (primaryWeakenThreads > 0)
        threadsReserved = threadsReserved && mockReserveThreads(ns, hosts, primaryWeakenThreads, 0, true);

    return threadsReserved;
}

export function mockBatch(
    ns: NS,
    hosts: Host[],
    batchID: number,
    hackThreads: number,
    growThreads: number,
    weakenHackThreads: number,
    weakenGrowThreads: number
): boolean {
    let threadsReserved = true;
    if (hackThreads > 0) threadsReserved = threadsReserved && mockReserveThreads(ns, hosts, hackThreads, batchID);
    if (growThreads > 0) threadsReserved = threadsReserved && mockReserveThreads(ns, hosts, growThreads, batchID);
    if (weakenHackThreads > 0)
        threadsReserved = threadsReserved && mockReserveThreads(ns, hosts, weakenHackThreads, batchID, true);
    if (weakenGrowThreads > 0)
        threadsReserved = threadsReserved && mockReserveThreads(ns, hosts, weakenGrowThreads, batchID, true);

    return threadsReserved;
}

export function sloppyPrimaryBatch(
    ns: NS,
    env: (ModHackEnv | SmartHackEnv),
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

export function cleanPrimaryBatch(
    ns: NS,
    env: (ModHackEnv | SmartHackEnv),
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

export function sloppyBatch(
    ns: NS,
    env: (ModHackEnv | SmartHackEnv),
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

export function cleanBatch(
    ns: NS,
    env: (ModHackEnv | SmartHackEnv),
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

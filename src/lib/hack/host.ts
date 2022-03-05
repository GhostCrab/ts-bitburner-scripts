import { NS } from "@ns";
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
            const homeram = ns.getServerMaxRam(this.hostname) - 1024 - 64;
            //const homeram = ns.getServerMaxRam(this.hostname) - 64;
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
        host.reservedScriptCalls = host.reservedScriptCalls.filter(a => a.batchId !== batchId);
    }
}

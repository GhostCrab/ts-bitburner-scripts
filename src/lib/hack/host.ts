import { NS } from "@ns";
import { WEAKENNS, GROWNS, HACKNS } from "lib/util"

type ReservedScriptCall = {
    script: string;
    threads: number;
    offset: number;
    length: number;
    batchId: number;
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
        return this.reservedScriptCalls.reduce((a, b) => a + b.threads, 0);
    }

    getAvailableThreads(): number {
        return this.reservedScriptCalls.reduce((a, b) => a - b.threads, this.maxThreads);
    }

    // return # of threads successfully allocated
    tryReserveThreads(
        ns: NS,
        script: string,
        threads: number,
        offset: number,
        length: number,
        batchId: number
    ): number {
        const allocateThreads = Math.min(this.getAvailableThreads(), threads);

        if (allocateThreads === 0) return allocateThreads;

        this.reservedScriptCalls.push({
            script: script,
            threads: allocateThreads,
            offset: offset,
            length: length,
            batchId: batchId,
        });

        return allocateThreads;
    }

    // update max threads in case server size has changed
    getMaxThreads(ns: NS): number {
        this.maxThreads = Math.floor(ns.getServerMaxRam(this.hostname) / this.threadSize);

        // if this host is home, reserve 64GB of ram for other stuff
        if (this.hostname === "home") {
            const homeram = ns.getServerMaxRam(this.hostname) - 1024 - 64;
            this.maxThreads = Math.max(0, Math.floor(homeram / this.threadSize));
        }

        this.maxThreads = Math.min(1000000, this.maxThreads);

        return this.maxThreads;
    }

    async prep(ns: NS, force = false): Promise<void> {
        if (force || !ns.fileExists(GROWNS, this.hostname)) await ns.scp(GROWNS, "home", this.hostname);
        if (force || !ns.fileExists(WEAKENNS, this.hostname)) await ns.scp(WEAKENNS, "home", this.hostname);
        if (force || !ns.fileExists(HACKNS, this.hostname)) await ns.scp(HACKNS, "home", this.hostname);
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
    hosts: Host[],
    script: string,
    threads: number,
    offset: number,
    length: number,
    batchId: number
): boolean {
    let unallocatedThreads = threads;
    for (const host of hosts) {
        unallocatedThreads -= host.tryReserveThreads(ns, script, unallocatedThreads, offset, length, batchId);
        if (unallocatedThreads === 0) {
            return true;
        }
    }

    ns.tprintf("WARNING: Only able to allocate %d/%d %s threads", threads - unallocatedThreads, threads, script);
    return false;
}

import { NS } from "@ns";
import { ReservedScriptCall } from "lib/hack/host";

export const WEAKENJS = "/lib/exec/weaken.js";
export const GROWJS = "/lib/exec/grow.js";
export const HACKJS = "/lib/exec/hack.js";
export const UTILJS = "/lib/util.js";

export function llog(ns: NS, str: string, ...args: (string | number)[]): void {
    ns.print(ns.sprintf("%8s " + str, new Date().toLocaleTimeString("it-IT"), ...args));
}

export function softenServer(ns: NS, hostname: string): void {
    if (ns.hasRootAccess(hostname)) {
        return;
    }

    let ports = 0;
    if (ns.fileExists("BruteSSH.exe", "home")) {
        ns.brutessh(hostname);
        ports++;
    }

    if (ns.fileExists("FTPCrack.exe", "home")) {
        ns.ftpcrack(hostname);
        ports++;
    }

    if (ns.fileExists("HTTPWorm.exe", "home")) {
        ns.httpworm(hostname);
        ports++;
    }

    if (ns.fileExists("relaySMTP.exe", "home")) {
        ns.relaysmtp(hostname);
        ports++;
    }

    if (ns.fileExists("SQLInject.exe", "home")) {
        ns.sqlinject(hostname);
        ports++;
    }

    if (ports >= ns.getServerNumPortsRequired(hostname)) {
        ns.nuke(hostname);
    }
}

export function serverIsHackable(ns: NS, hostname: string): boolean {
    return ns.hasRootAccess(hostname) && ns.getHackingLevel() >= ns.getServerRequiredHackingLevel(hostname);
}

export function canExecuteOnServer(ns: NS, hostname: string): boolean {
    return ns.hasRootAccess(hostname) && ns.getServerMaxRam(hostname) > 0;
}

export function mapHosts(
    ns: NS,
    hosts: Record<string, string[]> = {},
    parents: string[] = [],
    current = "home"
): Record<string, string[]> {
    const newParents = parents.concat(current);
    hosts[current] = newParents;

    const children = ns.scan(current).filter((element) => !parents.includes(element));
    for (const child of children) {
        mapHosts(ns, hosts, newParents, child);
    }
    return hosts;
}

export function allHosts(ns: NS): string[] {
    return Object.keys(mapHosts(ns));
}

export function doProgramBuys(ns: NS): void {
    const player = ns.getPlayer();

    if (!player.tor && player.money > 200e3) ns.purchaseTor();

    if (!ns.fileExists("BruteSSH.exe", "home") && player.money > 500e3) ns.purchaseProgram("BruteSSH.exe");

    if (!ns.fileExists("FTPCrack.exe", "home") && player.money > 1500e3) ns.purchaseProgram("FTPCrack.exe");

    if (!ns.fileExists("relaySMTP.exe", "home") && player.money > 5e6) ns.purchaseProgram("relaySMTP.exe");

    if (!ns.fileExists("HTTPWorm.exe", "home") && player.money > 30e6) ns.purchaseProgram("HTTPWorm.exe");

    if (!ns.fileExists("SQLInject.exe", "home") && player.money > 250e6) ns.purchaseProgram("SQLInject.exe");
}

export function doBuyAndSoftenAll(ns: NS): void {
    doProgramBuys(ns);
    for (const hostname of allHosts(ns)) {
        softenServer(ns, hostname);
    }
}

export function stFormat(ns: NS, ms: number, showms = false, showfull = false): string {
    let timeLeft = ms;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    timeLeft -= hours * (1000 * 60 * 60);
    const minutes = Math.floor(timeLeft / (1000 * 60));
    timeLeft -= minutes * (1000 * 60);
    const seconds = Math.floor(timeLeft / 1000);
    timeLeft -= seconds * 1000;
    const milliseconds = timeLeft;

    if (showms) {
        if (hours > 0 || showfull) return ns.sprintf("%02d:%02d:%02d.%03d", hours, minutes, seconds, milliseconds);
        if (minutes > 0) return ns.sprintf("%02d:%02d.%03d", minutes, seconds, milliseconds);
        return ns.sprintf("%02d.%03d", seconds, milliseconds);
    } else {
        if (hours > 0 || showfull) return ns.sprintf("%02d:%02d:%02d", hours, minutes, seconds);
        if (minutes > 0) return ns.sprintf("%02d:%02d", minutes, seconds);
        return ns.sprintf("%02d", seconds);
    }
}

export function stdFormat(ns: NS, offset = 0, showms = false): string {
    const date = new Date(new Date().getTime() + offset);

    if (showms) {
        const ms = ns.sprintf("%03d", date.getUTCMilliseconds());
        return date.toLocaleTimeString("it-IT") + "." + ms;
    } else {
        return date.toLocaleTimeString("it-IT");
    }
}

export async function doBackdoors(ns: NS): Promise<void> {
    //const targetHosts = ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z", "w0r1d_d43m0n", "b-and-a", "ecorp", "fulcrumassets", "fulcrumtech"];
    //const targetHosts = ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z", "omnitek", "kuai-gong", "megacorp"];
    const targetHosts = ["CSEC", "avmnite-02h", "I.I.I.I", "run4theh111z", "w0r1d_d43m0n"];

    const hosts = mapHosts(ns);

    for (const [hostName, trail] of Object.entries(hosts)) {
        const server = ns.getServer(hostName);
        if (
            !targetHosts.includes(hostName) ||
            server.backdoorInstalled ||
            server.requiredHackingSkill > ns.getHackingLevel() ||
            !server.hasAdminRights
        )
            continue;

        ns.print(hostName);
        for (const hostHopName of trail) {
            ns.connect(hostHopName);
        }

        await ns.installBackdoor();
        ns.connect("home");
    }
}

export function cleanLogs(ns: NS): void {
    ns.disableLog("disableLog");
    ns.disableLog("ALL");
    // ns.disableLog("sleep")
    // ns.disableLog("exec")
    // ns.disableLog("getServerMaxRam")
    // ns.disableLog("getServerSecurityLevel")
    // ns.disableLog("getServerMinSecurityLevel")
    // ns.disableLog("getServerMaxMoney")
    // ns.disableLog("getHackingLevel")
    // ns.disableLog("getServerRequiredHackingLevel")
    // ns.disableLog("scan")
    // ns.disableLog("getServerMoneyAvailable")
    // ns.disableLog("getServerUsedRam")
}

export const ALL_FACTIONS = [
    "Illuminati",
    "Daedalus",
    "The Covenant",
    "ECorp",
    "MegaCorp",
    "Bachman & Associates",
    "Blade Industries",
    "NWO",
    "Clarke Incorporated",
    "OmniTek Incorporated",
    "Four Sigma",
    "KuaiGong International",
    "Fulcrum Secret Technologies",
    "BitRunners",
    "The Black Hand",
    "NiteSec",
    "Aevum",
    "Chongqing",
    "Ishima",
    "New Tokyo",
    "Sector-12",
    "Volhaven",
    "Speakers for the Dead",
    "The Dark Army",
    "The Syndicate",
    "Silhouette",
    "Tetrads",
    "Slum Snakes",
    "Netburners",
    "Tian Di Hui",
    "CyberSec",
    "Bladeburners",
    "Church of the Machine God",
];

export async function writeOut(
    ns: NS,
    data: ReservedScriptCall,
    startTime: number,
    endTime: number,
    result: string,
	startSec: number,
	startCash: number
): Promise<void> {
    if (data.writeFile !== "") {
        const outstr = ns.sprintf(
            "%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s\n",
            data.target,
            data.uid,
            data.batchId,
            data.realTimeStart + data.offset,
            data.realTimeStart + data.finish,
            data.operationTime,
            startTime,
            endTime,
            endTime - startTime,
            startTime - (data.realTimeStart + data.offset),
            endTime - (data.realTimeStart + data.finish),
            endTime - startTime - data.operationTime,
            result,
			startSec.toFixed(2),
			ns.getServerSecurityLevel(data.target).toFixed(2),
			ns.nFormat(startCash, "($0.000a)"),
			ns.nFormat(ns.getServerMoneyAvailable(data.target), "($0.000a)")
        );
        await ns.write(data.writeFile, outstr, "a");
    }
}

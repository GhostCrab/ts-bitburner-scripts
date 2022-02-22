import { NS } from "@ns";
import { ReservedPorts } from "/lib/util";

export async function main(ns: NS): Promise<void> {
    while (true) {
        const data: [string, string] | "NULL PORT DATA" = ns.readPort(ReservedPorts.HACK_WRITE_INFO);
        if (data !== "NULL PORT DATA") {
            await ns.write(data[0], data[1]);
        }

        await ns.sleep(10);
    }
}

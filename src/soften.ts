import { NS } from '@ns'
import { allHosts, doBackdoors, softenServer } from "lib/util";

export async function main(ns : NS) : Promise<void> {
    for (const hostName of allHosts(ns)) {
        softenServer(ns, hostName);
    }

    await doBackdoors(ns);
}
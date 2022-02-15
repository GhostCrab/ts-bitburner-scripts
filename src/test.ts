import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    // eslint-disable-next-line
    ns.tprintf("%s", ns.heart.break());
}

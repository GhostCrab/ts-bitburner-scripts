import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    ns.tprintf("%s", ns.heart.break());
}

import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    await ns.suppress(ns.args[0].toString());
}
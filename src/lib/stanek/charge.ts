import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    while (true) {
        await ns.stanek.chargeFragment(ns.args[0], ns.args[1])
    }
}
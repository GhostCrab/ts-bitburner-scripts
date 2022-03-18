import { NS } from "@ns";
import { llog } from "/lib/util";

export async function main(ns: NS): Promise<void> {
    ns.disableLog("sleep");

    let members;
    while (true) {
        ns.print(ns.sprintf("=================================="));
        let memberIndex = ns.gang.getMemberNames().length;

        while (ns.gang.canRecruitMember()) {
            const name = "g" + memberIndex.toString();
            ns.gang.recruitMember(name);
            ns.gang.setMemberTask(name, "Train Hacking");
            memberIndex++;
        }

        ns.print(ns.sprintf("=================================="));

        members = ns.gang.getMemberNames().map((name) => ns.gang.getMemberInformation(name));

        for (const member of members) {
            const ascmem = ns.gang.getAscensionResult(member.name);
            let hack1str = "--";
            let hack2str = "--";
            let cha1str = "--";
            let cha2str = "--";

            if (ascmem?.hack) {
                hack1str = ns.nFormat(ascmem.hack * member.hack_asc_mult, "0.0");
                hack2str = ns.nFormat(ascmem.hack, "0.0");
            }

            if (ascmem?.cha) {
                cha1str = ns.nFormat(ascmem.cha * member.cha_asc_mult, "0.0");
                cha2str = ns.nFormat(ascmem.cha, "0.0");
            }

            llog(
                ns,
                "%3s:  Hacking: %7s  %5s => %5s (%s)",
                member.name,
                ns.nFormat(member.hack, "0,0"),
                ns.nFormat(member.hack_asc_mult, "(0.0)"),
                hack1str,
                hack2str
            );

            llog(
                ns,
                "     Charisma: %7s  %5s => %5s (%s)",
                ns.nFormat(member.cha, "0,0"),
                ns.nFormat(member.cha_asc_mult, "(0.0)"),
                cha1str,
                cha2str
            );

            if (ascmem !== undefined && (ascmem.hack > 2 || ascmem.cha > 2)) {
                ns.print(
                    ns.sprintf(
                        "Ascending %s %.2f => %.2f hack multiplier",
                        member.name,
                        member.hack_asc_mult,
                        member.hack_asc_mult * ascmem.hack
                    )
                );

                ns.gang.ascendMember(member.name);
            }
        }

        ns.print(ns.sprintf("=================================="));

        const combatEquipment = ns.gang
            .getEquipmentNames()
            .map((_name) =>
                Object.assign(
                    { name: _name, price: ns.gang.getEquipmentCost(_name), type: ns.gang.getEquipmentType(_name) },
                    ns.gang.getEquipmentStats(_name)
                )
            )
            //.filter((eq) => eq.hack !== undefined || eq.cha !== undefined)
            .filter((eq) => eq.hack !== undefined)
            .sort((a, b) => a.price - b.price);

        // for (const eq of combatEquipment) {
        //     ns.print(ns.sprintf(
        //         "%-13s %20s  %.2f  %9s",
        //         eq.type,
        //         eq.name,
        //         eq.hack !== undefined ? eq.hack : 0,
        //         ns.nFormat(eq.price, "($0.000a)")
        //     ));
        // }

        const newBuys = [];
        for (const member of members) {
            for (const eq of combatEquipment) {
                if (!member.upgrades.includes(eq.name)) {
                    newBuys.push({
                        member: member,
                        equipment: eq,
                    });
                }
            }
        }

        newBuys.sort((a, b) => a.equipment.price - b.equipment.price);

        if (ns.getPlayer().money >= ns.getUpgradeHomeRamCost()) {
            ns.upgradeHomeRam();
        }

        for (const buy of newBuys) {
            if (
                (ns.getPlayer().money * 0.25 > buy.equipment.price && buy.equipment.price < 1000000000) ||
                ns.getPlayer().money * 0.01 > buy.equipment.price
            ) {
                const result = ns.gang.purchaseEquipment(buy.member.name, buy.equipment.name);
                if (result)
                    ns.print(
                        ns.sprintf(
                            "Buying %s:%s for %s",
                            buy.member.name,
                            buy.equipment.name,
                            ns.nFormat(buy.equipment.price, "($0.000a)")
                        )
                    );
            }
        }

        await ns.sleep(10000);

        ns.print(ns.sprintf("=================================="));
    }

    const tasks = ns.gang
        .getTaskNames()
        .map((_name) => ns.gang.getTaskStats(_name))
        .filter((task) => task.isCombat)
        .sort((a, b) => b.baseMoney - a.baseMoney);

    for (const task of tasks) {
        ns.tprintf(
            "%22s %3s %3s %9s %s",
            task.name,
            task.baseMoney,
            task.difficulty,
            task.baseRespect,
            task.baseWanted
        );
    }
}

import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    ns.disableLog("sleep");

    let members;
    while (true) {
        ns.print(ns.sprintf("=================================="));
        let memberIndex = ns.gang.getMemberNames().length;

        while (ns.gang.canRecruitMember()) {
            const name = "g" + memberIndex.toString();
            ns.gang.recruitMember(name);
            ns.gang.setMemberTask(name, "Train Combat");
            memberIndex++;
        }

        ns.print(ns.sprintf("=================================="));

        members = ns.gang.getMemberNames().map((name) => ns.gang.getMemberInformation(name));

        for (const member of members) {
            const ascmem = ns.gang.getAscensionResult(member.name);
            ns.print(
                ns.sprintf(
                    "%3s:  %10s  %s  %s  %s %10s %s",
                    member.name,
                    member.str_exp.toFixed(2),
                    member.str_mult.toFixed(2),
                    member.str_asc_mult.toFixed(2),
                    ascmem !== undefined ? ascmem.str : 0,
                    member.str_asc_points.toFixed(2),
                    member.upgrades
                )
            );

            if (ascmem !== undefined && ascmem.str > 2) {
                ns.print(
                    ns.sprintf(
                        "Ascending %s %.2f => %.2f hack multiplier",
                        member.name,
                        member.str_asc_mult,
                        member.str_asc_mult * ascmem.str
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
            .filter(
                (eq) =>
                    eq.str !== undefined ||
                    eq.dex !== undefined ||
                    eq.agi !== undefined ||
                    eq.def !== undefined ||
                    eq.cha !== undefined
            )
            .sort((a, b) => a.price - b.price);

        // for (const eq of combatEquipment) {
        //     ns.print(ns.sprintf(
        //         "%-13s %20s  %.2f  %9s",
        //         eq.type,
        //         eq.name,
        //         eq.str !== undefined ? eq.str : 0,
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

        for (const buy of newBuys) {
            if (ns.getPlayer().money > buy.equipment.price) {
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
        break;
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

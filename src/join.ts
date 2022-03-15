import { NS } from "@ns";
import { doBuyAndSoftenAll, doBackdoors } from "lib/util";

export async function main(ns: NS): Promise<void> {
    doBuyAndSoftenAll(ns);
    await doBackdoors(ns);

    const findProp = function (propName: string) {
        for (const div of eval("document").querySelectorAll("div")) {
            const propKey = Object.keys(div)[1];
            if (!propKey) continue;
            const props = div[propKey];
            if (props.children?.props && props.children.props[propName]) return props.children.props[propName];
            if (props.children instanceof Array)
                for (const child of props.children)
                    if (child?.props && child.props[propName]) return child.props[propName];
        }
    };

    const playerProp = findProp("player");

    if (!playerProp) return;

    // city priority:
    //   Chongqing [Neuregen Gene Modification]
    //   Sector-12 [CashRoot Starter Kit]
    //   Aevum [PCMatrix]
    //   New Tokyo --
    //   Ishima --
    //   Volhaven --

    for (const city of ["Aevum", "Chongqing", "New Tokyo", "Ishima", "Volhaven", "Sector-12"]) {
        //ns.tprintf("Traveling to %s", city);
        ns.travelToCity(city);

        const factions = playerProp.checkForFactionInvitations();

        for (const faction of factions) {
            if (!faction.alreadyInvited) {
                ns.tprintf("Getting invite to %s", faction.name);
                playerProp.receiveInvite(faction.name);
                faction.alreadyInvited = true;
            }
        }
    }

    if (ns.args[0])
        return;

    if (
        ns.checkFactionInvitations().includes("Chongqing") &&
        !ns.getOwnedAugmentations(true).includes("Neuregen Gene Modification")
    ) {
        ns.joinFaction("Chongqing");
    }

    if (
        ns.checkFactionInvitations().includes("Sector-12") &&
        !ns.getOwnedAugmentations(true).includes("CashRoot Starter Kit")
    ) {
        ns.joinFaction("Sector-12");
    }

    if (ns.checkFactionInvitations().includes("Aevum") && !ns.getOwnedAugmentations(true).includes("PCMatrix")) {
        ns.joinFaction("Aevum");
    }

    for (const faction of ns.checkFactionInvitations()) {
        ns.joinFaction(faction);
    }
}

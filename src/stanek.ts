import { NS } from "@ns";

enum FragmentType {
    // Special fragments for the UI
    None,
    Delete,

    // Stats boosting fragments
    HackingChance,
    HackingSpeed,
    HackingMoney,
    HackingGrow,
    Hacking,
    Strength,
    Defense,
    Dexterity,
    Agility,
    Charisma,
    HacknetMoney,
    HacknetCost,
    Rep,
    WorkMoney,
    Crime,
    Bladeburner,

    // utility fragments.
    Booster,
}

function fragmentTypeEffect(tpe: FragmentType): string {
    switch (tpe) {
        case FragmentType.HackingChance: {
            return "+x% hack() success chance";
            break;
        }
        case FragmentType.HackingSpeed: {
            return "+x% faster hack(), grow(), and weaken()";
            break;
        }
        case FragmentType.HackingMoney: {
            return "+x% hack() power";
            break;
        }
        case FragmentType.HackingGrow: {
            return "+x% grow() power";
            break;
        }
        case FragmentType.Hacking: {
            return "+x% hacking skill";
            break;
        }
        case FragmentType.Strength: {
            return "+x% strength skill";
            break;
        }
        case FragmentType.Defense: {
            return "+x% defense skill";
            break;
        }
        case FragmentType.Dexterity: {
            return "+x% dexterity skill";
            break;
        }
        case FragmentType.Agility: {
            return "+x% agility skill";
            break;
        }
        case FragmentType.Charisma: {
            return "+x% charisma skill";
            break;
        }
        case FragmentType.HacknetMoney: {
            return "+x% hacknet production";
            break;
        }
        case FragmentType.HacknetCost: {
            return "x% cheaper hacknet cost";
            break;
        }
        case FragmentType.Rep: {
            return "+x% reputation from factions and companies";
            break;
        }
        case FragmentType.WorkMoney: {
            return "+x% work money";
            break;
        }
        case FragmentType.Crime: {
            return "+x% crime money";
            break;
        }
        case FragmentType.Bladeburner: {
            return "+x% all bladeburner stats";
            break;
        }
        case FragmentType.Booster: {
            return "Booster";
            break;
        }
    }
    throw new Error("Calling effect for fragment type that doesn't have an effect " + tpe);
}

export async function main(ns: NS): Promise<void> {
    const fragmentDefs = ns.stanek.fragmentDefinitions();
    for (const fragmentDef of fragmentDefs) {
        ns.tprintf(
            "%s %s %s %s %s",
            fragmentDef.id,
            fragmentDef.limit,
            fragmentDef.power,
            fragmentDef.shape,
            fragmentTypeEffect(fragmentDef.type)
        );
    }

    // useful hack fragment id's are
    // 0 1    S  +x% hacking skill  0,1
    // 1 1    Z  +x% hacking skill  0,1
    // 5 1.3  T  +x% faster HGW     0,1,2,3
    // 6 2    I  +x% hack() power   0,1
    // 7 0.5  J  +x% grow() power   0,1,2,3

    // array of fragments, each fragment is an ID and an array of valid rotations
    const fragmentIDs = [
        //[100, [0, 1, 2, 3]], // 4
        [0, [0, 1]], // 0
        //[101, [0, 1, 2, 3]], // 4
        [1, [0, 1]], // 1
        //[102, [0, 1, 2, 3]], // 4
        [5, [0, 1, 2, 3]], // 2
        //[103, [0, 1, 2, 3]], // 4
        [6, [0, 1]], // 3
        //[104, [0, 1, 2, 3]], // 4
        [7, [0, 1, 2, 3]], // 4
        //[105, [0, 1, 2, 3]], // 4
        [25, [0, 1, 2, 3]], // 4
        //[106, [0, 1, 2, 3]], // 4
        [28, [0, 1, 2, 3]], // 4
        // [107, [0, 1, 2, 3]], // 4
    ];

    // a valid configuration is if all pieces can be placed
    // try to place each piece
    // if we hit a piece that cant be placed, iterate over all rotations
    // if all rotations cant be placed, move to next cell and iterate over all rotations
    // if all cells have been checked, roll back to earlier piece and rotate it.

    ns.stanek.clearGift();

    let watchdog = 0;

    async function doPlacement(frag, x, y, rot) {
        if (watchdog++ % 1000 === 0) {
            await ns.sleep(0);
        }
        //ns.tprintf("Attempting to place %d at %d,%d,%d", fragmentIDs[frag][0], x, y, rot);

        if (ns.stanek.placeFragment(x, y, rot, fragmentIDs[frag][0])) {
            if (frag === fragmentIDs.length - 1) return true;

            //ns.tprintf("Placed %d at %d,%d,%d", fragmentIDs[frag][0], x, y, rot);

            if (!(await doPlacement(frag + 1, 0, 0, 0))) {
                // ns.tprintf(
                //     "Failed to place %d in current board, rolling back %d at %d,%d,%d",
                //     fragmentIDs[frag + 1][0],
                //     fragmentIDs[frag][0],
                //     x,
                //     y,
                //     rot
                // );
                ns.stanek.removeFragment(x, y);
            } else {
                return true;
            }
        }

        if (rot + 1 < fragmentIDs[frag][1].length) return await doPlacement(frag, x, y, rot + 1);

        if (x + 1 < ns.stanek.giftWidth()) return await doPlacement(frag, x + 1, y, 0);

        if (y + 1 < ns.stanek.giftHeight()) return await doPlacement(frag, 0, y + 1, 0);

        return false;
    }

    await doPlacement(0, 0, 0, 0);

    for (const fragment of ns.stanek.activeFragments()) {
        ns.tprintf("%s %s %s %s", fragment.id, fragment.x, fragment.y, fragment.rotation);
    }
}

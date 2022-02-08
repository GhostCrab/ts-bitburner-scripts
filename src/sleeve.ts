import { NS } from '@ns'

function help(ns: NS) {
    ns.tprintf("Sleeve Modes:");
    ns.tprintf("  h     : show help text");
    ns.tprintf("  all   : all stats");
    ns.tprintf("  hack  : all hack");
    ns.tprintf("  str   : all str");
    ns.tprintf("  def   : all def");
    ns.tprintf("  dex   : all dex");
    ns.tprintf("  agi   : all agi");
    ns.tprintf("  cha   : all cha");
    ns.tprintf("  mug   : all mug");
    ns.tprintf("  hom   : all homicide");
    ns.tprintf("  shock : all shock recovery");
}

export async function main(ns : NS) : Promise<void> {
    if (ns.args[0] === "h" || ns.args[0] === undefined) {
        help(ns);
        return;
    }

    switch (ns.args[0]) {
        case "all":
            ns.sleeve.travel(0, "Sector-12");
            ns.sleeve.setToGymWorkout(0, "Powerhouse Gym", "str");
            ns.sleeve.travel(1, "Sector-12");
            ns.sleeve.setToGymWorkout(1, "Powerhouse Gym", "def");
            ns.sleeve.travel(2, "Sector-12");
            ns.sleeve.setToGymWorkout(2, "Powerhouse Gym", "dex");
            ns.sleeve.travel(3, "Sector-12");
            ns.sleeve.setToGymWorkout(3, "Powerhouse Gym", "agi");

            ns.sleeve.travel(4, "Volhaven");
            ns.sleeve.setToUniversityCourse(4, "ZB Institute of Technology", "Algorithms");
            ns.sleeve.travel(5, "Volhaven");
            ns.sleeve.setToUniversityCourse(5, "ZB Institute of Technology", "Leadership");
            break;
        case "hack":
            for (let i = 0; i < ns.sleeve.getNumSleeves(); i++) {
                ns.sleeve.travel(i, "Volhaven");
                ns.sleeve.setToUniversityCourse(i, "ZB Institute of Technology", "Algorithms");
            }
            break;
        case "cha":
            for (let i = 0; i < ns.sleeve.getNumSleeves(); i++) {
                ns.sleeve.travel(i, "Volhaven");
                ns.sleeve.setToUniversityCourse(i, "ZB Institute of Technology", "Leadership");
            }
            break;
        case "str":
        case "def":
        case "dex":
        case "agi":
            for (let i = 0; i < ns.sleeve.getNumSleeves(); i++) {
                ns.sleeve.travel(i, "Sector-12");
                ns.sleeve.setToGymWorkout(i, "Powerhouse Gym", ns.args[0]);
            }
            break;
        case "mug":
            for (let i = 0; i < ns.sleeve.getNumSleeves(); i++) {
                ns.sleeve.setToCommitCrime(i, "Mug");
            }
            break;
        case "hom":
            for (let i = 0; i < ns.sleeve.getNumSleeves(); i++) {
                ns.sleeve.setToCommitCrime(i, "Homicide");
            }
            break;
        case "shock":
            for (let i = 0; i < ns.sleeve.getNumSleeves(); i++) {
                ns.sleeve.setToShockRecovery(i);
            }
            break;
        default:
            ns.tprintf(`ERROR: Unknown sleeve mode: ${ns.args[0]}`);
            help(ns);
            break;
    }
}

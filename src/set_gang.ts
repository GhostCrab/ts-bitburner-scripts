import { NS } from "@ns";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autocomplete(data: string, args: string): string[] {
    return ["hack", "terror"];
}

export async function main(ns: NS): Promise<void> {
    const members = ns.gang
        .getMemberNames()
        .map((name) => ns.gang.getMemberInformation(name))
        .sort((a, b) => a.hack - b.hack);
    if (ns.args[0] === undefined || ns.args[0] === "hack") {
        for (const member of members) {
            ns.gang.setMemberTask(member.name, "Train Hacking");
        }
    }

    if (ns.args[0] === "terror") {
        let start = 0;
        while (true) {
            let wantedLevelGain = 0;
            for (let memberIdx = 0; memberIdx < members.length; memberIdx++) {
                const member = members[memberIdx];
                if (memberIdx <= start) {
                    ns.gang.setMemberTask(member.name, "Ethical Hacking");
                } else {
                    ns.gang.setMemberTask(member.name, "Cyberterrorism");
                }

                wantedLevelGain += ns.gang.getMemberInformation(member.name).wantedLevelGain
            }

            if (wantedLevelGain <= 0 || start >= members.length) break;

            start++;
        }
    }
}

import { NS } from "@ns";
import { stFormat, CITIES, llog, cleanLogs } from "lib/util";

function checkLevel(obj: IMapNum<number>, level: number) {
    return Object.prototype.hasOwnProperty.call(obj, level);
}

function findProp(propName: string) {
    for (const div of eval("document").querySelectorAll("div")) {
        const propKey = Object.keys(div)[1];
        if (!propKey) continue;
        const props = div[propKey];
        if (props.children?.props && props.children.props[propName]) return props.children.props[propName];
        if (props.children instanceof Array)
            for (const child of props.children) if (child?.props && child.props[propName]) return child.props[propName];
    }
}

function joinBladeburner(): boolean {
    const p = findProp("player");
    if (!p.inBladeburner()) {
        // Apply for Bladeburner division
        if (p.strength >= 100 && p.defense >= 100 && p.dexterity >= 100 && p.agility >= 100) {
            p.startBladeburner({ new: true });
            return true;
        }
    } else {
        return true;
    }

    return false;
}

interface IMapNum<T> {
    [key: number]: T;
}

interface LevelInfo {
    repPerMs: number;
    level: number;
    avgChance: number;
}

class Action {
    type: string;
    name: string;
    city: string;
    autoLevel = false;
    countRemaining = 0;
    successChanceMin: IMapNum<number> = {};
    successChanceMax: IMapNum<number> = {};
    maxLevel = 1;
    repGain: IMapNum<number> = {};
    actionTime: IMapNum<number> = {};
    best: LevelInfo = { repPerMs: 0, level: 1, avgChance: 0 };
    boRank = -1;

    constructor(ns: NS, type: string, name: string, city: string) {
        this.type = type;
        this.name = name;
        this.city = city;

        this.refresh(ns);
    }

    refresh(ns: NS) {
        ns.bladeburner.switchCity(this.city);
        ns.bladeburner.setActionAutolevel(this.type, this.name, false);

        this.autoLevel = ns.bladeburner.getActionAutolevel(this.type, this.name);
        this.countRemaining = ns.bladeburner.getActionCountRemaining(this.type, this.name);
        this.maxLevel = ns.bladeburner.getActionMaxLevel(this.type, this.name);
        if (this.type === "BlackOps") this.boRank = ns.bladeburner.getBlackOpRank(this.name);

        for (let level = 1; level <= this.maxLevel; level++) {
            ns.bladeburner.setActionLevel(this.type, this.name, level);
            const [successChanceMin, successChanceMax] = ns.bladeburner.getActionEstimatedSuccessChance(
                this.type,
                this.name
            );
            this.successChanceMin[level] = successChanceMin;
            this.successChanceMax[level] = successChanceMax;
            this.repGain[level] = ns.bladeburner.getActionRepGain(this.type, this.name, level);
            this.actionTime[level] = ns.bladeburner.getActionTime(this.type, this.name);
        }
    }

    avgChance(level: number): number {
        if (!checkLevel(this.successChanceMin, level) || !checkLevel(this.successChanceMax, level)) return 0;

        return this.successChanceMin[level] + (this.successChanceMax[level] - this.successChanceMin[level]) / 2;
    }

    repPerMs(level: number): number {
        if (!checkLevel(this.repGain, level) || !checkLevel(this.actionTime, level)) return 0;

        if (this.actionTime[level] === 0) return 0;

        return this.repGain[level] / this.actionTime[level];
    }

    calcBestRepPerMs(ns: NS, successThreshold: number): LevelInfo {
        this.refresh(ns);
        this.best = {
            repPerMs: 0,
            level: 1,
            avgChance: 0,
        };

        if (this.countRemaining <= 0) return this.best;
        if (ns.bladeburner.getRank() < this.boRank) return this.best;

        for (let level = 1; level <= this.maxLevel; level++) {
            const repPerMs = this.repPerMs(level);
            const avgChance = this.avgChance(level);
            if (repPerMs > this.best.repPerMs && avgChance > successThreshold) {
                this.best = {
                    repPerMs: repPerMs,
                    level: level,
                    avgChance: avgChance,
                };
            }
        }

        return this.best;
    }

    runBest(ns: NS): number {
        const time = this.bestTime();
        llog(ns,
            "Running %s:%s:%s:%d for %s (%s Rep/s)",
            this.city,
            this.type,
            this.name,
            this.best.level,
            stFormat(ns, time, false, false),
            ns.nFormat(this.best.repPerMs * 1000, "0.000a")
        );
        ns.bladeburner.switchCity(this.city);
        ns.bladeburner.setActionLevel(this.type, this.name, this.best.level);
        ns.bladeburner.startAction(this.type, this.name);

        return time;
    }

    bestTime(): number {
        if (!checkLevel(this.actionTime, this.best.level)) return 0;

        return this.actionTime[this.best.level];
    }

    toString(ns: NS) {
        let str = "";
        str += ns.sprintf("%s:%s:%s:\n", this.city, this.type, this.name);
        if (this.boRank !== -1) str += ns.sprintf("  Required Rank: %d\n", this.boRank);
        if (this.countRemaining < Number.MAX_SAFE_INTEGER)
            str += ns.sprintf("  Count Remaining: %d\n", this.countRemaining);
        str += ns.sprintf("  Autolevel: %s\n", this.autoLevel ? "ON" : "OFF");

        for (let level = 1; level <= this.maxLevel; level++) {
            str += ns.sprintf(
                "  Level %d: %d - %d, rep +%.3f, time %s %s\n",
                level,
                this.successChanceMin[level] * 100,
                this.successChanceMax[level] * 100,
                this.repGain[level],
                stFormat(ns, this.actionTime[level], false, false),
                this.best.level === level ? `(BEST ${ns.nFormat(this.best.repPerMs * 1000, "0.000a")} Rep/s)` : ""
            );
        }

        return str;
    }
}

function getRecoveryAction(ns: NS): Action {
    const p = findProp("player");
    let bestCity = "Sector-12";
    let bestDiffRatio = 0;

    for (const [city, data] of Object.entries(p.bladeburner.cities)) {
        // llog(ns,
        //     "%10s: %8s / %8s diff: %8s (%.2f)",
        //     city,
        //     ns.nFormat(data.pop, "0.000a"),
        //     ns.nFormat(data.popEst, "0.000a"),
        //     ns.nFormat(Math.abs(data.pop - data.popEst), "0.000a"),
        //     Math.abs((data.pop - data.popEst) / data.pop)
        // );

        const diffRatio = Math.abs((data.pop - data.popEst) / data.pop);
        if (diffRatio > bestDiffRatio) {
            bestDiffRatio = diffRatio;
            bestCity = city;
        }
    }

	if (bestDiffRatio < 0.001)
		return new Action(ns, "General", "Training", "Sector-12");

    return new Action(ns, "General", "Field Analysis", bestCity);
}

export async function main(ns: NS): Promise<void> {
	cleanLogs(ns);

    if (!joinBladeburner()) return;

    const allActions: Action[] = [];
    for (const city of CITIES) {
        for (const actionName of ns.bladeburner.getBlackOpNames()) {
            allActions.push(new Action(ns, "BlackOps", actionName, city));
        }

        for (const actionName of ns.bladeburner.getContractNames()) {
            allActions.push(new Action(ns, "Contracts", actionName, city));
        }

        for (const actionName of ns.bladeburner.getGeneralActionNames()) {
            allActions.push(new Action(ns, "General", actionName, city));
        }

        for (const actionName of ns.bladeburner.getOperationNames()) {
            allActions.push(new Action(ns, "Operations", actionName, city));
        }
    }

    let actionEndTime = 0;
    while (true) {
        const currentTime = new Date().getTime();

        if (currentTime > actionEndTime) {
            const [curStam, maxStam] = ns.bladeburner.getStamina();
            if (curStam < maxStam / 2) {
                actionEndTime = currentTime + getRecoveryAction(ns).runBest(ns) + 50;
            } else {
                let threshold = 0.75;
                let runnableActions: Action[] = [];
                while (runnableActions.length === 0) {
                    threshold -= 0.05;
                    for (const action of allActions) action.calcBestRepPerMs(ns, threshold);
                    runnableActions = allActions
                        .filter((a) => a.best.repPerMs > 0)
                        .sort((a, b) =>
                            b.best.repPerMs === a.best.repPerMs
                                ? b.best.avgChance - a.best.avgChance
                                : b.best.repPerMs - a.best.repPerMs
                        );
                }

                //for (const action of runnableActions) llog(ns,action.toString(ns));

                actionEndTime = currentTime + runnableActions[0].runBest(ns) + 50;
            }

			// do skill check
			const skillNames = [
				"Blade's Intuition",
				"Cloak",
				"Short-Circuit",
				"Digital Observer",
				"Tracer",
				"Overclock",
				"Reaper"
			]

			for(const skillName of skillNames) {
				if(skillName === "Overclock" && ns.bladeburner.getSkillLevel(skillName) >= 90)
					continue;

				const skillPoints = ns.bladeburner.getSkillPoints();
				const skillCost = ns.bladeburner.getSkillUpgradeCost(skillName);
				if (skillCost <= skillPoints) {
					llog(ns, "Upgrading %s for %d skill points", skillName, skillCost)
					ns.bladeburner.upgradeSkill(skillName);
				}
			}
        }
        await ns.sleep(100);

        // for (const skillName of ns.bladeburner.getSkillNames()) {
        //     //
        // }
    }

    while (true) {
        break;
        await ns.sleep(100);
    }
}

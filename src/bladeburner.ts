import { NS } from "@ns";
import { stFormat, CITIES, llog, cleanLogs } from "lib/util";

function lerp(start: number, end: number, dist: number): number {
    return start + (end - start) * dist;
}

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

interface IMap<T> {
    [key: string]: T;
}

interface LevelInfo {
    rankPerMs: number;
    level: number;
    chance: number;
}

export interface IActionIdentifier {
    name: string;
    type: number;
}

export interface ISuccessChanceParams {
    est: boolean;
}

export interface IAction {
    level: number;
    rewardFac: number;
    rankGain: number;
    getSuccessChance(inst: IBladeburner, params: ISuccessChanceParams): number;
}

export class City {
	name = "";
	pop = 0;
	popEst = 0;
	comms = 0;
	chaos = 0;
}

export interface IBladeburner {
	cities: IMap<City>
    getActionIdFromTypeAndName(type: string, name: string): IActionIdentifier | null;
    getActionObject(actionId: IActionIdentifier): IAction | null;
}

class Action {
    type: string;
    name: string;
    city: string;
    autoLevel = false;
    countRemaining = 0;
    successChanceMin: IMapNum<number> = {};
    successChanceMax: IMapNum<number> = {};
    successChance: IMapNum<number> = {};
    maxLevel = 1;
    rankGain: IMapNum<number> = {};
    actionTime: IMapNum<number> = {};
    best: LevelInfo = { rankPerMs: 0, level: 1, chance: 0 };
    boRank = -1;
    rawAction: IAction | null = null;

    constructor(ns: NS, type: string, name: string, city: string) {
        this.type = type;
        this.name = name;
        this.city = city;

        const bb: IBladeburner = findProp("player").bladeburner;
        const rawActionId = bb.getActionIdFromTypeAndName(this.type, this.name);
        if (rawActionId) this.rawAction = bb.getActionObject(rawActionId);

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
            this.actionTime[level] = ns.bladeburner.getActionTime(this.type, this.name);

            // rank gain
            this.rankGain[level] = 0;
            if (this.rawAction && this.rawAction.rankGain) {
                const rewardMultiplier = Math.pow(this.rawAction.rewardFac, level - 1);
                this.rankGain[level] =
                    this.rawAction.rankGain * rewardMultiplier * ns.getBitNodeMultipliers().BladeburnerRank;
            }
        }
    }

    avgChance(level: number): number {
        if (!checkLevel(this.successChanceMin, level) || !checkLevel(this.successChanceMax, level)) return 0;

        return lerp(this.successChanceMin[level], this.successChanceMax[level], 0.25);
    }

    chance(level: number): number {
        if (this.rawAction) {
            this.rawAction.level = level;
            return this.rawAction.getSuccessChance(findProp("player").bladeburner, { est: false });
        }

        return this.avgChance(level);
    }

    rankPerMs(level: number): number {
        if (!checkLevel(this.rankGain, level) || !checkLevel(this.actionTime, level)) return 0;

        if (this.actionTime[level] === 0) return 0;

        return this.rankGain[level] / this.actionTime[level];
    }

    calcBestRankPerMs(ns: NS, successThreshold: number): LevelInfo {
        this.refresh(ns);
        this.best = {
            rankPerMs: 0,
            level: 1,
            chance: 0,
        };

        if (this.countRemaining <= 0) return this.best;
        if (ns.bladeburner.getRank() < this.boRank) return this.best;

        for (let level = 1; level <= this.maxLevel; level++) {
            const rankPerMs = this.rankPerMs(level);
            const chance = this.chance(level);
            if (rankPerMs > this.best.rankPerMs && chance > successThreshold) {
                this.best = {
                    rankPerMs: rankPerMs,
                    level: level,
                    chance: chance,
                };
            }
        }

        return this.best;
    }

    runBest(ns: NS): number {
        const time = this.bestTime();
        llog(
            ns,
            "Running %s:%s:%s:%d for %s (%s Rank/s)",
            this.city,
            this.type,
            this.name,
            this.best.level,
            stFormat(ns, time, false, false),
            ns.nFormat(this.best.rankPerMs * 1000, "0.000a")
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
            const ranksStr = ns.nFormat(this.rankPerMs(level) * 1000, "0.000a");
            str += ns.sprintf(
                "  Level %d: %d - %d (%d), rank +%.3f, time %s, rank/s %s %s\n",
                level,
                this.successChanceMin[level] * 100,
                this.successChanceMax[level] * 100,
                this.chance(level) * 100,
                this.rankGain[level],
                stFormat(ns, this.actionTime[level], false, false),
                ranksStr,
                this.best.level === level ? `(BEST ${ranksStr} Rank/s)` : ""
            );
        }

        return str;
    }
}

function getRecoveryAction(ns: NS): [Action, number] {
    const bb: IBladeburner = findProp("player").bladeburner;
    let bestCity = "Sector-12";
    let bestDiffRatio = 0;

    for (const [city, data] of Object.entries(bb.cities)) {
        llog(
            ns,
            "%10s: %8s / %8s diff: %8s (%.2f)",
            city,
            ns.nFormat(data.pop, "0.000a"),
            ns.nFormat(data.popEst, "0.000a"),
            ns.nFormat(Math.abs(data.pop - data.popEst), "0.000a"),
            Math.abs((data.pop - data.popEst) / data.pop)
        );

        const diffRatio = Math.abs((data.pop - data.popEst) / data.pop);
        if (diffRatio > bestDiffRatio) {
            bestDiffRatio = diffRatio;
            bestCity = city;
        }
    }

    if (bestDiffRatio < 0.001) return [new Action(ns, "General", "Training", "Sector-12"), 0];

    return [new Action(ns, "General", "Field Analysis", bestCity), bestDiffRatio];
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
            allActions.push(new Action(ns, "Contract", actionName, city));
        }

        for (const actionName of ns.bladeburner.getGeneralActionNames()) {
            allActions.push(new Action(ns, "General", actionName, city));
        }

        for (const actionName of ns.bladeburner.getOperationNames()) {
            allActions.push(new Action(ns, "Operation", actionName, city));
        }
    }

    let actionEndTime = 0;
    while (true) {
        const currentTime = new Date().getTime();

        if (currentTime > actionEndTime) {
            const [recoveryAction, diffRatio] = getRecoveryAction(ns);
            const [curStam, maxStam] = ns.bladeburner.getStamina();
            if (curStam < maxStam / 2) {
                actionEndTime = currentTime + recoveryAction.runBest(ns) + 50;
            } else {
                let threshold = 0.85;
                let runnableActions: Action[] = [];
                while (runnableActions.length === 0) {
                    threshold -= 0.05;
                    for (const action of allActions) action.calcBestRankPerMs(ns, threshold);
                    runnableActions = allActions
                        .filter((a) => a.best.rankPerMs > 0)
                        .sort((a, b) =>
                            b.best.rankPerMs === a.best.rankPerMs
                                ? b.best.chance - a.best.chance
                                : b.best.rankPerMs - a.best.rankPerMs
                        );
                }

                //for (const action of runnableActions) llog(ns,action.toString(ns));

                actionEndTime = currentTime + runnableActions[0].runBest(ns) + 50;
            }

            // do skill check
            const skillNames = [
                "Overclock",
                "Blade's Intuition",
                "Cloak",
                "Short-Circuit",
                "Digital Observer",
                "Tracer",
                "Reaper"
            ];

            for (const skillName of skillNames) {
                if (skillName === "Overclock" && ns.bladeburner.getSkillLevel(skillName) >= 90) continue;

                const skillPoints = ns.bladeburner.getSkillPoints();
                const skillCost = ns.bladeburner.getSkillUpgradeCost(skillName);
                if (skillCost <= skillPoints) {
                    llog(ns, "Upgrading %s for %d skill points", skillName, skillCost);
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

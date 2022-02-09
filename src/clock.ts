import { NS } from "@ns";

let lastEl: HTMLElement;
const roots: HTMLElement[] = [];

function stFormat(ns: NS, ms: number, showms = true, showfull = false) {
    let timeLeft = ms;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    timeLeft -= hours * (1000 * 60 * 60);
    const minutes = Math.floor(timeLeft / (1000 * 60));
    timeLeft -= minutes * (1000 * 60);
    const seconds = Math.floor(timeLeft / 1000);
    timeLeft -= seconds * 1000;
    const milliseconds = timeLeft;

    if (showms) {
        if (hours > 0 || showfull) return ns.sprintf("%dh%02dm%02d.%03ds", hours, minutes, seconds, milliseconds);
        if (minutes > 0) return ns.sprintf("%dm%02d.%03ds", minutes, seconds, milliseconds);
        return ns.sprintf("%d.%03ds", seconds, milliseconds);
    } else {
        if (hours > 0 || showfull) return ns.sprintf("%dh%02dm%02ds", hours, minutes, seconds);
        if (minutes > 0) return ns.sprintf("%dm%02ds", minutes, seconds);
        return ns.sprintf("%ds", seconds);
    }
}

function insertAfter(newNode: HTMLElement, existingNode: HTMLElement) {
    if (!existingNode.parentNode) throw 'insertAfter init failed'
    if (existingNode.nextSibling) return existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
    else return existingNode.parentNode.appendChild(newNode);
}

function addBottomLine() {
    const self = globalThis;
    const doc = self["document"];
    const hook0 = doc?.getElementById("overview-extra-hook-0");
    const hookRootEl = hook0?.parentElement?.parentElement;

    const newRootEl = <HTMLElement>hookRootEl?.cloneNode(true);

    if (!hookRootEl || !newRootEl) throw "addBottomLine init failed";

    const child1 = <HTMLElement>newRootEl?.children[0]?.children[0]
    if (child1) {
        child1.innerText = "";
    }

    const child2 = <HTMLElement>newRootEl?.children[0]?.children[0]
    if (child2) {
        child2.innerText = "";
        child2.removeAttribute("id");
    }

    if (lastEl === undefined) lastEl = hookRootEl;

    try {
        lastEl = insertAfter(newRootEl, lastEl);
    } catch (e) {
        throw `${e}; addBottomLine init failed`
    }

    roots.push(newRootEl);

    return newRootEl;
}

function addSingle() {
    const self = globalThis;
    const doc = self["document"];
    const hook0 = doc?.getElementById("overview-extra-hook-0");
    const hookRootEl = hook0?.parentElement?.parentElement;
    const overviewEl = hookRootEl?.parentElement;
    const hackRootEl = overviewEl?.children[2];
    const newRootEl = <HTMLElement>hackRootEl?.cloneNode(true);
    const newEl = <HTMLElement>newRootEl?.children[0]?.firstChild;

    if (!hookRootEl || !newRootEl || !newEl) throw "addSingle init failed";

    if (newRootEl?.childNodes[1]) newRootEl.removeChild(newRootEl.childNodes[1]);

    newEl.removeAttribute("id");
    newEl.innerText = "";

    if (lastEl === undefined) lastEl = hookRootEl;

    try {
        lastEl = insertAfter(newRootEl, lastEl);
    } catch (e) {
        throw `${e}; addSingle init failed`
    }

    roots.push(newRootEl);

    return newEl;
}

function addDouble() {
    const self = globalThis;
    const doc = self["document"];
    const hook0 = doc.getElementById("overview-extra-hook-0");
    const hookRootEl = hook0?.parentElement?.parentElement;
    const overviewEl = hookRootEl?.parentElement;
    const hackRootEl = overviewEl?.children[2];

    const newRootEl = <HTMLElement>hackRootEl?.cloneNode(true);
    const newEl1 = <HTMLElement>newRootEl?.children[0]?.children[0];
    const newEl2 = <HTMLElement>newRootEl?.children[1]?.children[0];

    // check if anything failed
    if (!hookRootEl || !newRootEl || !newEl1 || !newEl2) throw "addDouble init failed";

    newEl1.removeAttribute("id");
    newEl1.innerText = "";

    newEl2.removeAttribute("id");
    newEl2.innerText = "";

    if (lastEl === undefined) lastEl = hookRootEl;

    try {
        lastEl = insertAfter(newRootEl, lastEl);
    } catch (e) {
        throw `${e}; addDouble init failed`
    }

    roots.push(newRootEl);

    return [newEl1, newEl2];
}

function addProgress() {
    const self = globalThis;
    const doc = self["document"];
    const hook0 = doc.getElementById("overview-extra-hook-0");

    const hookRootEl = hook0?.parentElement?.parentElement;
    const overviewEl = hookRootEl?.parentElement;

    const hackProgressEl = <HTMLElement>overviewEl?.children[3];

    const newRootEl = <HTMLElement>hackProgressEl?.cloneNode(true);

    const newSub1 = <HTMLElement>newRootEl?.children[0]?.children[0];
    const newSub2 = <HTMLElement>newRootEl?.children[0];

    // check if anything failed
    if (!newRootEl || !newSub1 || !newSub2) throw "addProgress init failed";

    if (lastEl === undefined) lastEl = newRootEl;

    try {
        lastEl = insertAfter(newRootEl, lastEl);
    } catch (e) {
        throw `${e}; addProgress init failed`
    }

    roots.push(newRootEl);

    return [newSub1, newSub2];
}

export async function main(ns: NS): Promise<void> {
    const args = ns.flags([["help", false]]);
    if (args.help) {
        ns.tprint("This script will enhance your HUD (Heads up Display) with custom statistics.");
        ns.tprint(`Usage: run ${ns.getScriptName()}`);
        ns.tprint("Example:");
        ns.tprint(`> run ${ns.getScriptName()}`);
        return;
    }

    ns.atExit(function () {
        for (const root of roots) {
            root.parentNode?.removeChild(root);
        }
    });

    try {
        const clockEl = addSingle();
        const targetEl = addSingle();
        const incomeEl = addSingle();
        const [stateEl, countdownEl] = addDouble();
        const [hackProgressEl1, hackProgressEl2] = addProgress();

        addBottomLine();

        const port = ns.getPortHandle(1);
        let startTime = 0;
        let endTime = 1000;
        let fullTime = 1000;
        while (true) {
            if (!port.empty()) {
                const data = JSON.parse(port.peek().toString());
                startTime = new Date(data[0]).getTime();
                endTime = new Date(startTime + data[1]).getTime();
                fullTime = endTime - startTime;

                const date = new Date();
                const curTime = date.getTime();

                // Update Clock
                // let ms = ns.sprintf("%03d", date.getUTCMilliseconds());
                // clockEl.innerText = date.toLocaleTimeString("it-IT") + "." + ms;
                clockEl.innerText = date.toLocaleTimeString("it-IT");

                // Update Target & Income
                targetEl.innerText = data[2];
                incomeEl.innerText = `${ns.nFormat(data[3], "($0.0a)")}/s`;

                // Update State & Countdown
                stateEl.innerText = data[4];
                countdownEl.innerText = stFormat(ns, endTime - curTime, false);

                // Update Progress
                const tvalue = curTime - startTime;
                const nvalue = (tvalue / fullTime) * 100;
                let transform = 100 - nvalue;
                let wholeValue = Math.floor(nvalue);

                if (startTime === 0 || wholeValue > 100) {
                    port.clear();
                    transform = 100;
                    wholeValue = 0;
                }

                hackProgressEl1.setAttribute("aria-valuenow", `${wholeValue}`);
                hackProgressEl2.setAttribute("style", `transform: translateX(${-transform.toFixed(3)}%);`);
            } else {
                const date = new Date();
                clockEl.innerText = date.toLocaleTimeString("it-IT");

                targetEl.innerText = "NO TARGET";
                incomeEl.innerText = "";
                stateEl.innerText = "";
                countdownEl.innerText = "";
                hackProgressEl1.setAttribute("aria-valuenow", "0");
                hackProgressEl2.setAttribute("style", "transform: translateX(-100%);");
            }

            await ns.sleep(1000);
        }
    } catch (e) {
        ns.tprintf("ERROR: %s", e)
    }
}

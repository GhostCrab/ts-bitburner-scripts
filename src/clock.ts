import { NS } from '@ns'

let lastEl: Element;
const roots: Element[] = [];

function stFormat(ns, ms, showms = true, showfull = false) {
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

function addBottomLine() {
    const self = globalThis;
    const doc = self["document"];
    const hook0 = doc.getElementById("overview-extra-hook-0");
    const hookRootEl = hook0.parentElement.parentElement;

    const newRootEl = hookRootEl.cloneNode(true);
    newRootEl.children[0].firstChild.innerText = "";
    newRootEl.children[1].firstChild.innerText = "";
    newRootEl.children[1].firstChild.removeAttribute("id");

    if (lastEl === undefined) lastEl = hookRootEl;

    lastEl.after(newRootEl);

    roots.push(newRootEl);

    return newRootEl;
}

function addSingle() {
    const self = globalThis;
    const doc = self["document"];
    const hook0 = doc.getElementById("overview-extra-hook-0");
    const hookRootEl = hook0.parentElement.parentElement;
    const overviewEl = hookRootEl.parentElement;
    const hackRootEl = overviewEl.children[2];

    const newRootEl = hackRootEl.cloneNode(true);
    newRootEl.removeChild(newRootEl.childNodes.item(1));

    const newEl = newRootEl.children[0].firstChild;
    newEl.removeAttribute("id");
    newEl.innerText = "";

    if (lastEl === undefined) lastEl = hookRootEl;

    lastEl.after(newRootEl);
    lastEl = newRootEl;

    roots.push(newRootEl);

    return newEl;
}

function addDouble() {
    const self = globalThis;
    const doc = self["document"];
    const hook0 = doc.getElementById("overview-extra-hook-0");
    const hookRootEl = hook0.parentElement.parentElement;
    const overviewEl = hookRootEl.parentElement;
    const hackRootEl = overviewEl.children[2];

    const newRootEl = hackRootEl.cloneNode(true);

    const newEl1 = newRootEl.children[0].firstChild;
    newEl1.removeAttribute("id");
    newEl1.innerText = "";

    const newEl2 = newRootEl.children[1].firstChild;
    newEl2.removeAttribute("id");
    newEl2.innerText = "";

    if (lastEl === undefined) lastEl = hookRootEl;

    lastEl.after(newRootEl);
    lastEl = newRootEl;

    roots.push(newRootEl);

    return [newEl1, newEl2];
}

function addProgress(): [(Element | null), (Element | null)] {
    const self = globalThis;
    const doc = self["document"];
    const hook0 = doc.getElementById("overview-extra-hook-0");
    let hookRootEl: Element;
    if(hook0 && hook0.parentElement && hook0.parentElement.parentElement)
        hookRootEl = hook0.parentElement.parentElement
    else
        return [null, null]
    const overviewEl = hookRootEl.parentElement;
    const hackProgressEl = overviewEl.children[3];

    const newRootEl: Element = hackProgressEl.cloneNode(true);

    const newSub1 = newRootEl.children[0].children[0]
    const newSub2 = newRootEl.children[0].children[0].children[0];

    if (lastEl === undefined) lastEl = hookRootEl;

    lastEl.after(newRootEl);
    lastEl = newRootEl;

    roots.push(newRootEl);

    return [newSub1, newSub2];
}

export async function main(ns : NS) : Promise<void> {
    const args = ns.flags([["help", false]]);
    if (args.help) {
        ns.tprint("This script will enhance your HUD (Heads up Display) with custom statistics.");
        ns.tprint(`Usage: run ${ns.getScriptName()}`);
        ns.tprint("Example:");
        ns.tprint(`> run ${ns.getScriptName()}`);
        return;
    }

    const clockEl = addSingle();
    const targetEl = addSingle();
    const incomeEl = addSingle();
    const [stateEl, countdownEl] = addDouble();
    const [hackProgressEl1, hackProgressEl2] = addProgress();
    if (hackProgressEl1 === null || hackProgressEl2 === null)
        return

    addBottomLine();

    ns.atExit(function () {
        for (const root of roots) {
            if (root.parentNode)
                root.parentNode.removeChild(root);
        }
    });

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
}
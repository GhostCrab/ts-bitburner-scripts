import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    ns.tprintf("%s", ns.heart.break());

    function findProp(propName: string) {
        for (const div of eval("document").querySelectorAll("div")) {
            const propKey = Object.keys(div)[1];
            if (!propKey) continue;
            const props = div[propKey];
            if (props.children?.props && props.children.props[propName]) return props.children.props[propName];
            if (props.children instanceof Array)
                for (const child of props.children)
                    if (child?.props && child.props[propName]) return child.props[propName];
        }
    }

    const p = findProp("player");

    for (const [city, data] of Object.entries(p.bladeburner.cities)) {
        ns.tprintf(
            "%10s: %8s / %8s diff: %8s (%.2f)",
            city,
            ns.nFormat(data.pop, "0.000a"),
            ns.nFormat(data.popEst, "0.000a"),
            ns.nFormat(Math.abs(data.pop - data.popEst), "0.000a"),
            Math.abs((data.pop - data.popEst) / data.pop)
        );
    }

    console.log(p);
}

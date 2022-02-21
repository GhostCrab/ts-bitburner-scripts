import { NS } from "@ns";

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

export async function main(ns: NS): Promise<void> {
    // eslint-disable-next-line
    ns.tprintf("%s", ns.heart.break());

    const playerProp = findProp("player");

    console.log(playerProp);
}

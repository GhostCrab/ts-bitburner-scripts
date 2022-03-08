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
    ns.tprintf("TEST: %s", ns.heart.break());

    const playerProp = findProp("player");
    const agDivName = "Tobacco";

    if (playerProp?.corporation?.divisions) {
        const agDiv: Industry = playerProp.corporation.divisions.find((a: { type: string }) => a.type === agDivName);

        if (agDiv) {
            for (const [city, product] of Object.entries(agDiv.products)) {
                if (product)
                    product.marketTa2 = false;
            }
        }
    }
}

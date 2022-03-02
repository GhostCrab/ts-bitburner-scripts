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

function growOffice(ns: NS, divisionName: string, city: string, size: number) {
    // Hire and assign jobs
    let spentFunds = 0;
    const startSize = ns.corporation.getOffice(divisionName, city).size;
	if (startSize >= size) {
        while (ns.corporation.getOffice(divisionName, city).employees.length < size) {
            ns.corporation.hireEmployee(divisionName, city);
        }
        return;
    }
    let newSize = startSize;
    while (true) {
        const upgradeCost = ns.corporation.getOfficeSizeUpgradeCost(divisionName, city, 1);
        const corpFunds = ns.corporation.getCorporation().funds;

        if (corpFunds < upgradeCost) break;

        spentFunds += upgradeCost;

        ns.corporation.upgradeOfficeSize(divisionName, city, 1);

        newSize = ns.corporation.getOffice(divisionName, city).size;

        if (newSize >= size) break;
    }

    if (newSize < size) {
        llog(ns, "WARNING: Unable to purchase office size upgrade %d => %d (target %d)", startSize, newSize, size);
    }

    llog(
        ns,
        "Upgraded %s %s's office size from %s to %s for %s",
        divisionName,
        city,
        ns.nFormat(startSize, "(0.000a)"),
        ns.nFormat(newSize, "(0.000a)"),
        ns.nFormat(spentFunds, "($0.000a)")
    );

    while (ns.corporation.getOffice(divisionName, city).employees.length < size) {
        ns.corporation.hireEmployee(divisionName, city);
    }
}

function assignEmployees(ns: NS, divisionName: string, city: string, assignments: [string, number | string][]): void {
    const playerProp = findProp("player");
    
	if (playerProp?.corporation?.divisions) {
        const division: Industry = playerProp.corporation.divisions.find((a: { type: string }) => a.type === divisionName);
        if (division) {
            const office = division.offices[city];
            if (office) {
                for (const employee of office.employees) {
                    employee.pos = "Unassigned";
                }
                for (const assignment of assignments) {
                    const employeeCount = office.employees.length;
                    const job = assignment[0];
                    const num: number = Math.floor(eval((assignment[1] + "").replace(/ec/g, employeeCount + "")));
                    office.setEmployeeToJob(job, num);
                }
            }
        }
    }
}

export async function main(ns: NS): Promise<void> {
    ns.tprintf("TEST: %s", ns.heart.break());

    const tbDivName = "Tobacco";
    const tbRDCity = "Aevum";

    const newSize = ns.corporation.getOffice(tbDivName, tbRDCity).size;
    growOffice(ns, tbDivName, tbRDCity, newSize);
    assignEmployees(ns, tbDivName, tbRDCity, [
        ["Operations", newSize / 5],
        ["Engineer", newSize / 5],
        ["Business", newSize / 5],
        ["Management", newSize / 5],
        ["Research & Development", newSize / 5],
    ])
}

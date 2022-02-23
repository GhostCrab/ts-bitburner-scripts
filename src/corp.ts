import { NS } from "@ns";
import { cleanLogs, llog } from "lib/util";
import { getMaterialPrice, Industry } from "/lib/corp/sale";

const CITIES = ["Aevum", "Chongqing", "Sector-12", "New Tokyo", "Ishima", "Volhaven"];

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

// 10:22:01 Offer: 252.191b 2.274m - All Warehouses, selling at MP

function unassignEmployees(divisionName: string, cityName: string): void {
    const playerProp = findProp("player");

    if (playerProp?.corporation?.divisions) {
        const division: Industry = playerProp.corporation.divisions.find(
            (a: { type: string }) => a.type === divisionName
        );

        if (division) {
            const office = division.offices[cityName];
            if (office) {
                for (const employee of office.employees) {
                    employee.pos = "Unassigned";
                }
            }
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function unassignAllEmployees(divisionName: string): void {
    const playerProp = findProp("player");

    if (playerProp?.corporation?.divisions) {
        const division: Industry = playerProp.corporation.divisions.find(
            (a: { type: string }) => a.type === divisionName
        );

        if (division) {
            for (const cityName of Object.keys(division.offices)) {
                unassignEmployees(divisionName, cityName);
            }
        }
    }
}

function assignEmployees(ns: NS, divisionName: string, city: string, assignments: [string, number | string][]): void {
    const playerProp = findProp("player");
    const agDivName = "Agriculture";

    if (playerProp?.corporation?.divisions) {
        const agDiv: Industry = playerProp.corporation.divisions.find((a: { type: string }) => a.type === agDivName);
        if (agDiv) {
            const office = agDiv.offices[city];
            if (office) {
                for (const employee of office.employees) {
                    employee.pos = "Unassigned";
                }
                for (const assignment of assignments) {
                    const employeeCount = office.employees.length;
                    const job = assignment[0];
                    const num: number = eval((assignment[1] + "").replace(/ec/g, employeeCount + ""));
                    office.setEmployeeToJob(job, num);
                }
            }
        }
    }
}

function assignAllEmployees(ns: NS, divisionName: string, assignments: [string, number | string][]): void {
    for (const city of ns.corporation.getDivision(divisionName).cities) {
        assignEmployees(ns, divisionName, city, assignments);
    }
}

async function doAgSell(ns: NS, selloff: boolean): Promise<void> {
    const playerProp = findProp("player");
    const agDivName = "Agriculture";

    if (playerProp?.corporation?.divisions) {
        const agDiv: Industry = playerProp.corporation.divisions.find((a: { type: string }) => a.type === agDivName);

        if (agDiv) {
            if (selloff) {
                assignAllEmployees(ns, agDivName, [
                    ["Engineer", 1],
                    ["Business", "ec-1"],
                ]);
            } else {
                assignAllEmployees(ns, agDivName, [
                    ["Operations", "ec-2"],
                    ["Engineer", 1],
                    ["Management", 1],
                ]);
            }

            for (const [city, warehouse] of Object.entries(agDiv.warehouses)) {
                if (warehouse) {
                    for (const matName of Object.keys(warehouse.materials)) {
                        if (!Object.prototype.hasOwnProperty.call(warehouse.materials, matName)) continue;
                        const mat = warehouse.materials[matName];

                        if (mat.name === "Plants") mat.marketTa2 = true;

                        if (mat.name === "Food") {
                            if (selloff) {
                                mat.marketTa2 = false;
                                const sellPrice = getMaterialPrice(agDivName, city, mat.name) + "";
                                ns.tprintf("selling for %s", sellPrice);
                                ns.corporation.sellMaterial(agDivName, city, mat.name, "MAX", sellPrice);
                            } else {
                                mat.marketTa2 = false;
                                ns.corporation.sellMaterial(agDivName, city, mat.name, "0", "0");
                            }
                        }
                    }
                }
            }
        }
    }
}

function buyOneTimeUpgrades(ns: NS, _upgrades: string | string[]) {
    let upgrades: string[];
    if (typeof _upgrades === "string") {
        upgrades = [_upgrades];
    } else {
        upgrades = _upgrades;
    }

    for (const upgrade of upgrades) {
        if (!ns.corporation.hasUnlockUpgrade(upgrade)) {
            const upgradeCost = ns.corporation.getUnlockUpgradeCost(upgrade);
            const corpFunds = ns.corporation.getCorporation().funds;

            if (corpFunds < upgradeCost) {
                llog(
                    ns,
                    "WARNING: Insufficient funds to purchase %s %s < %s",
                    upgrade,
                    ns.nFormat(corpFunds, "($0.000a)"),
                    ns.nFormat(upgradeCost, "($0.000a)")
                );
            } else {
                llog(ns, "Purchasing %s upgrade for %s", upgrade, ns.nFormat(upgradeCost, "($0.000a)"));
                ns.corporation.unlockUpgrade(upgrade);
            }
        }
    }
}

function buyLeveledUpgrades(ns: NS, _upgrades: string | string[], _amount: number, threshold = 1) {
    let upgrades: string[];
    if (typeof _upgrades === "string") {
        upgrades = [_upgrades];
    } else {
        upgrades = _upgrades;
    }
    const amount = _amount <= 0 ? Number.MAX_SAFE_INTEGER : _amount;

    for (const upgrade of upgrades) {
        let upgradeCount = 0;
        let upgradeCost = 0;
        while (
            ns.corporation.getUpgradeLevelCost(upgrade) < ns.corporation.getCorporation().funds * threshold &&
            ns.corporation.getUpgradeLevel(upgrade) < amount
        ) {
            upgradeCost += ns.corporation.getUpgradeLevelCost(upgrade);
            upgradeCount++;
            ns.corporation.levelUpgrade(upgrade);
        }

        if (upgradeCount > 0) {
            llog(ns, "Purchased %dx of %s for %s", upgradeCount, upgrade, ns.nFormat(upgradeCost, "($0.000a)"));
        }
    }
}

function buyAllWarehouseUpgrades(ns: NS, divisionName: string, size: number): void {
    for (const city of ns.corporation.getDivision(divisionName).cities) {
        buyWarehouseUpgrades(ns, divisionName, city, size);
    }
}

function buyWarehouseUpgrades(ns: NS, divisionName: string, city: string, size: number): void {
    let spentFunds = 0;
    const startSize = ns.corporation.getWarehouse(divisionName, city).size;

	if (startSize >= size) return;

    let newSize = startSize;
    while (true) {
        const upgradeCost = ns.corporation.getUpgradeWarehouseCost(divisionName, city);
        const corpFunds = ns.corporation.getCorporation().funds;

        if (corpFunds < upgradeCost) break;

        spentFunds += upgradeCost;

        ns.corporation.upgradeWarehouse(divisionName, city);

        newSize = ns.corporation.getWarehouse(divisionName, city).size;

        if (newSize >= size) break;
    }

    if (newSize < size) {
        llog(ns, "WARNING: Unable to purchase warehouse upgrades %d => %d (target %d)", startSize, newSize, size);
    }

    llog(
        ns,
        "Upgraded %s %s's warehouse size from %s to %s for %s",
        divisionName,
        city,
        ns.nFormat(startSize, "(0.000a)"),
        ns.nFormat(newSize, "(0.000a)"),
        ns.nFormat(spentFunds, "($0.000a)")
    );
}

async function waitForState(ns: NS, state = "START", next = true) {
    if (next) while (ns.corporation.getCorporation().state === state) await ns.sleep(20);

    while (ns.corporation.getCorporation().state !== state) await ns.sleep(20);
}

async function buyMaterials(ns: NS, divisionName: string, materials: [string, number][]): Promise<boolean> {
    // Check to see if we already have the materials we need
    let materialCheck = true;
    for (const city of ns.corporation.getDivision(divisionName).cities) {
        for (const data of materials) {
            const name = data[0];
            const qty = data[1];
            const material = ns.corporation.getMaterial(divisionName, city, name);

            if (material.qty < qty) {
                materialCheck = false;
                break;
            }
        }

        if (!materialCheck) break;
    }

    if (materialCheck) return false;

    // Wait for start state
    await waitForState(ns, "START", false);

    // Set up all material buys
    for (const city of ns.corporation.getDivision(divisionName).cities) {
        for (const data of materials) {
            const name = data[0];
            const qty = data[1];
            const material = ns.corporation.getMaterial(divisionName, city, name);

            if (material.qty < qty) {
                const tickBuy = (qty - material.qty) / 10;
                ns.corporation.buyMaterial(divisionName, city, name, tickBuy);
            }
        }
    }

    await waitForState(ns, "START");

    // Clear all material buys
    for (const city of ns.corporation.getDivision(divisionName).cities) {
        for (const data of materials) {
            const name = data[0];
            ns.corporation.buyMaterial(divisionName, city, name, 0);
        }
    }

    // Check it
    materialCheck = true;
    for (const city of ns.corporation.getDivision(divisionName).cities) {
        for (const data of materials) {
            const name = data[0];
            const qty = data[1];
            const material = ns.corporation.getMaterial(divisionName, city, name);

            if (material.qty < qty) {
                llog(ns, "WARNING: Expected %d %s:%s but found %d", qty, city, name, material.qty);
            }
        }
    }

    return true;

    /*
		Hardware at 12.5/s for one tick to 125 total
		AI Cores at 7.5/s for one tick to 75 total
		Real Estate at 2.7k/s (that’s twenty-seven hundred, 2 700, 2.7×103) for one tick to 27k total

		Hardware at 267.5/s for one tick to get to 125 + 2675 = 2800
		Robots at 9.6/s for one tick to get to 96
		AI Cores at 244.5/s for one tick to get to 75 + 2445 = 2520
		Real Estate at 11940/s for one tick to get to 27000 + 119400 = 146400

		Hardware at 650/s for one tick to 2800 + 6500 = 9300
		Robots at 63/s for one tick to 96 + 630 = 726
		AI Cores at 375/s for one tick to 2520 + 3750 = 6270
		Real Estate at 8400/s for one tick to 146400 + 84000 = 230400
	*/
}

function growOffice(ns: NS, divisionName: string, city: string, size: number) {
    // Hire and assign jobs
    let spentFunds = 0;
    const startSize = ns.corporation.getOffice(divisionName, city).size;
	if (startSize >= size) return;
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

function growAllOffices(ns: NS, divisionName: string, size: number) {
    for (const city of ns.corporation.getDivision(divisionName).cities) {
        growOffice(ns, divisionName, city, size);
    }
}

export async function main(ns: NS): Promise<void> {
    cleanLogs(ns);

    const playerProp = findProp("player");
    const agDivName = "Agriculture";
    const tbDivName = "Tobacco";
    const tbRDCity = "Aevum";

    let waitForBuy = true;
    while (waitForBuy) {
        try {
            ns.corporation.getCorporation();
            waitForBuy = false;
        } catch (e) {
            const bought = ns.corporation.createCorporation("Corporation", true);
            if (bought) {
                llog(ns, "Created Corporation for $150b");
                waitForBuy = false;
            } else {
                llog(ns, "Waiting to buy Corporation for $150b");
                await ns.sleep(1000);
            }
        }
    }

    // open the Agriculture division
    if (ns.corporation.getCorporation().divisions.find((div) => div.type === agDivName) === undefined) {
        const divCost = ns.corporation.getExpandIndustryCost(agDivName);

        llog(ns, "Starting %s division for %s", agDivName, ns.nFormat(divCost, "($0.000a)"));

        ns.corporation.expandIndustry(agDivName, agDivName);

        // buy one time upgrades Smart Supply
        buyOneTimeUpgrades(ns, ["Smart Supply", "Warehouse API"]);

        // buy advert
        ns.corporation.hireAdVert(agDivName);

        // buy levelable upgrades FocusWires, Neural Accelerators, Speech Processor Implants,
        // Nuoptimal Nootropic Injector Implants, and Smart Factories
        buyLeveledUpgrades(
            ns,
            [
                "FocusWires",
                "Neural Accelerators",
                "Speech Processor Implants",
                "Nuoptimal Nootropic Injector Implants",
                "Smart Factories",
            ],
            2
        );
    }

    // Expand to additional cities
    for (const city of CITIES.filter((a) => !ns.corporation.getDivision(agDivName).cities.includes(a))) {
        const expandCost = ns.corporation.getExpandCityCost();
        const corpFunds = ns.corporation.getCorporation().funds;

        if (corpFunds < expandCost) {
            llog(
                ns,
                "ERROR: Insufficient funds to expand %s to %s %s < %s",
                agDivName,
                city,
                ns.nFormat(corpFunds, "($0.000a)"),
                ns.nFormat(expandCost, "($0.000a)")
            );

            return;
        } else {
            llog(ns, "Expanding %s to %s for %s", agDivName, city, ns.nFormat(expandCost, "($0.000a)"));
            ns.corporation.expandCity(agDivName, city);
        }
    }

    // Hire in all offices
    growAllOffices(ns, agDivName, 3);

    // Buy warehouses in all cities
    for (const city of ns.corporation.getDivision(agDivName).cities) {
        if (!ns.corporation.hasWarehouse(agDivName, city)) {
            const warehouseCost = ns.corporation.getPurchaseWarehouseCost();
            const corpFunds = ns.corporation.getCorporation().funds;

            if (warehouseCost <= corpFunds) {
                llog(
                    ns,
                    "Purchasing a %s warehouse in %s for %s",
                    agDivName,
                    city,
                    ns.nFormat(warehouseCost, "($0.000a)")
                );
                ns.corporation.purchaseWarehouse(agDivName, city);
            } else {
                llog(
                    ns,
                    "Insufficient funds to purchase a %s warehouse in %s %s < %s",
                    agDivName,
                    city,
                    ns.nFormat(corpFunds, "($0.000a)"),
                    ns.nFormat(warehouseCost, "($0.000a)")
                );
                return;
            }

            ns.corporation.setSmartSupply(agDivName, city, true);
            ns.corporation.sellMaterial(agDivName, city, "Food", "MAX", "MP");
            ns.corporation.sellMaterial(agDivName, city, "Plants", "MAX", "MP");
        }
    }

    // upgrade the size of the warehouses in all of the cities to 300
    buyAllWarehouseUpgrades(ns, agDivName, 300);

    // buy production materials for all cities
    const round1Mats = await buyMaterials(ns, agDivName, [
        ["Hardware", 125],
        ["AI Cores", 75],
        ["Real Estate", 27000],
    ]);

    if (round1Mats) llog(ns, "Purchased Round 1 of production materials");

    // Attempt to get first round of funding
    if (ns.corporation.getInvestmentOffer().round < 2) {
        llog(ns, "Investment round 1: %s warehoses are empty, beginning stockpile", agDivName);
        let invState: "growing" | "selling" = "growing";
        await doAgSell(ns, false);

        let tookOffer = false;
        while (!tookOffer) {
            if (invState === "growing") {
                // growing, set all sale prices to food 0, plants max and wait until all warehouses are > 95% full
                let countFullWarehouses = 0;
                for (const city of ns.corporation.getDivision(agDivName).cities) {
                    const warehouse = ns.corporation.getWarehouse(agDivName, city);
                    if (warehouse.sizeUsed > warehouse.size * 0.95) countFullWarehouses++;
                }

                if (countFullWarehouses === ns.corporation.getDivision(agDivName).cities.length) {
                    await doAgSell(ns, true);

                    llog(
                        ns,
                        "Investment round 1: %s warehouses are full, initiating bulk sell-off to woo investors",
                        agDivName
                    );

                    invState = "selling";
                }
            } else {
                // selling - bulk sell everything at market price until all warehouses are empty
                let countEmptyWarehouses = 0;
                for (const city of ns.corporation.getDivision(agDivName).cities) {
                    const warehouse = ns.corporation.getWarehouse(agDivName, city);
                    if (warehouse.sizeUsed < 160) countEmptyWarehouses++;
                }

                if (countEmptyWarehouses === ns.corporation.getDivision(agDivName).cities.length) {
                    await doAgSell(ns, false);

                    llog(ns, "Investment round 1: %s warehoses are empty, beginning stockpile", agDivName);

                    invState = "growing";
                }
            }

            const offer = ns.corporation.getInvestmentOffer();
            llog(
                ns,
                "Offer: %s  (Revenue: %s)",
                ns.nFormat(offer.funds, "(0.000a)"),
                ns.nFormat(ns.corporation.getCorporation().revenue, "(0.000a)")
            );

            // only take offers over $800b
            if (offer.funds > 800000000000) {
                ns.corporation.acceptInvestmentOffer();
                llog(
                    ns,
                    "Investment round 1: Taking offer of %s for %d%%",
                    ns.nFormat(offer.funds, "(0.000a)"),
                    (offer.shares / 1000000000) * 100
                );
                tookOffer = true;
                break;
            }

            await waitForState(ns, "START");
        }
    }

    // upgrade the office size in every city to 9
    growAllOffices(ns, agDivName, 9);

    // Upgrade Smart Factories and Smart Storage
    buyLeveledUpgrades(ns, ["Smart Factories", "Smart Storage"], 10);

    // Increase Warehouse Sizes to 3000
    buyAllWarehouseUpgrades(ns, agDivName, 3000);

    const round2Mats = await buyMaterials(ns, agDivName, [
        ["Hardware", 2800],
        ["AI Cores", 2520],
        ["Robots", 96],
        ["Real Estate", 146400],
    ]);

    if (round2Mats) llog(ns, "Purchased Round 2 of production materials");

    // Attempt to get first round of funding
    if (ns.corporation.getInvestmentOffer().round < 3) {
        llog(ns, "Investment round 2: %s warehoses are empty, beginning stockpile", agDivName);
        let invState: "growing" | "selling" = "growing";
        await doAgSell(ns, false);

        let tookOffer = false;
        while (!tookOffer) {
            if (invState === "growing") {
                // growing, set all sale prices to food 0, plants max and wait until all warehouses are > 95% full
                let countFullWarehouses = 0;
                for (const city of ns.corporation.getDivision(agDivName).cities) {
                    const warehouse = ns.corporation.getWarehouse(agDivName, city);
                    if (warehouse.sizeUsed > warehouse.size * 0.95) countFullWarehouses++;
                }

                if (countFullWarehouses === ns.corporation.getDivision(agDivName).cities.length) {
                    await doAgSell(ns, true);

                    llog(
                        ns,
                        "Investment round 2: %s warehouses are full, initiating bulk sell-off to woo investors",
                        agDivName
                    );

                    invState = "selling";
                }
            } else {
                // selling - bulk sell everything at market price until all warehouses are empty
                let countEmptyWarehouses = 0;
                for (const city of ns.corporation.getDivision(agDivName).cities) {
                    const warehouse = ns.corporation.getWarehouse(agDivName, city);
                    if (warehouse.sizeUsed < 1300) countEmptyWarehouses++;
                }

                if (countEmptyWarehouses === ns.corporation.getDivision(agDivName).cities.length) {
                    await doAgSell(ns, false);

                    llog(ns, "Investment round 2: %s warehoses are empty, beginning stockpile", agDivName);

                    invState = "growing";
                }
            }

            const offer = ns.corporation.getInvestmentOffer();
            llog(
                ns,
                "Offer: %s %s",
                ns.nFormat(offer.funds, "(0.000a)"),
                ns.nFormat(ns.corporation.getCorporation().revenue, "(0.000a)")
            );

            //only take offers over $10t
            if (offer.funds > 10000000000000) {
                ns.corporation.acceptInvestmentOffer();
                llog(
                    ns,
                    "Investment round 2: Taking offer of %s for %d%%",
                    ns.nFormat(offer.funds, "(0.000a)"),
                    (offer.shares / 1000000000) * 100
                );
                tookOffer = true;
                break;
            }
            await waitForState(ns, "START");
        }
    }

    // open the Tobacco division
    if (ns.corporation.getCorporation().divisions.find((div) => div.type === tbDivName) === undefined) {
        const divCost = ns.corporation.getExpandIndustryCost(tbDivName);
        llog(ns, "Starting %s division for %s", tbDivName, ns.nFormat(divCost, "($0.000a)"));

        ns.corporation.expandIndustry(tbDivName, tbDivName);
    }

    // Expand to additional cities
    for (const city of CITIES.filter((a) => !ns.corporation.getDivision(tbDivName).cities.includes(a))) {
        const expandCost = ns.corporation.getExpandCityCost();
        const corpFunds = ns.corporation.getCorporation().funds;

        if (corpFunds < expandCost) {
            llog(
                ns,
                "ERROR: Insufficient funds to expand %s to %s %s < %s",
                tbDivName,
                city,
                ns.nFormat(corpFunds, "($0.000a)"),
                ns.nFormat(expandCost, "($0.000a)")
            );

            return;
        } else {
            llog(ns, "Expanding %s to %s for %s", tbDivName, city, ns.nFormat(expandCost, "($0.000a)"));
            ns.corporation.expandCity(tbDivName, city);
        }
    }

    // Buy warehouses in all cities
    for (const city of ns.corporation.getDivision(tbDivName).cities) {
        if (!ns.corporation.hasWarehouse(tbDivName, city)) {
            const warehouseCost = ns.corporation.getPurchaseWarehouseCost();
            const corpFunds = ns.corporation.getCorporation().funds;

            if (warehouseCost <= corpFunds) {
                llog(
                    ns,
                    "Purchasing a %s warehouse in %s for %s",
                    tbDivName,
                    city,
                    ns.nFormat(warehouseCost, "($0.000a)")
                );
                ns.corporation.purchaseWarehouse(tbDivName, city);
            } else {
                llog(
                    ns,
                    "Insufficient funds to purchase a %s warehouse in %s %s < %s",
                    tbDivName,
                    city,
                    ns.nFormat(corpFunds, "($0.000a)"),
                    ns.nFormat(warehouseCost, "($0.000a)")
                );
                return;
            }
        }

        ns.corporation.setSmartSupply(tbDivName, city, true);
    }

    // upgrade the size of the warehouses in all of the cities to 1000
    buyAllWarehouseUpgrades(ns, tbDivName, 1000);

    // upgrade the office size in every city to 10 and assign jobs
    growAllOffices(ns, tbDivName, 10);
    assignAllEmployees(ns, tbDivName, [
        ["Operations", 2],
        ["Engineer", 2],
        ["Business", 2],
        ["Management", 2],
        ["Research & Development", 2],
    ]);

    // Upgrade Aevum office to 30 employees
    growOffice(ns, tbDivName, tbRDCity, 30);
    assignEmployees(ns, tbDivName, tbRDCity, [
        ["Operations", 6],
        ["Engineer", 6],
        ["Business", 6],
        ["Management", 6],
        ["Research & Development", 6],
    ]);

    buyLeveledUpgrades(
        ns,
        ["FocusWires", "Neural Accelerators", "Speech Processor Implants", "Nuoptimal Nootropic Injector Implants"],
        20
    );

    while (true) {
        // Attempt to max out Wilson Analytics
        buyLeveledUpgrades(ns, "Wilson Analytics", 0, 0.5);

        let maxProducts = 3;
        if (ns.corporation.hasResearched(tbDivName, "uPgrade: Capacity.I")) maxProducts++;
        if (ns.corporation.hasResearched(tbDivName, "uPgrade: Capacity.II")) maxProducts++;

        // Develop a product if there are none in development
        let products = ns.corporation
            .getDivision(tbDivName)
            .products.map((prodname) => ns.corporation.getProduct(tbDivName, prodname))
            .sort((a, b) => Number(a.name.slice(5)) - Number(b.name.slice(5)));

        let productIsDeveloping = false;
        for (const product of products) {
            if (product.developmentProgress < 100) {
                productIsDeveloping = true;
                break;
            }
        }

        // if there are no products in development, discontinue the oldest one if needed
        if (!productIsDeveloping) {
            if (products.length === maxProducts) {
                llog(ns, "Discontinuing %s product %s", tbDivName, products[0].name);

                ns.corporation.discontinueProduct(tbDivName, products[0].name);
            }

            const investmentCash = ns.corporation.getCorporation().funds * 0.01;

            let productName = "prod-0";
            if (products.length > 0) {
                productName = "prod-" + (Number(products[products.length - 1].name.slice(5)) + 1).toString();
            }

            llog(
                ns,
                "Developing new %s product %s for %s",
                tbDivName,
                productName,
                ns.nFormat(investmentCash * 2, "($0.000a)")
            );

            ns.corporation.makeProduct(tbDivName, tbRDCity, productName, investmentCash, investmentCash);
            ns.corporation.sellProduct(tbDivName, tbRDCity, productName, "MAX", "MP", true);
        }

        products = ns.corporation
            .getDivision(tbDivName)
            .products.map((prodname) => ns.corporation.getProduct(tbDivName, prodname))
            .sort((a, b) => Number(a.name) - Number(b.name));

        if (playerProp?.corporation?.divisions) {
            const tobaccoDiv: Industry = playerProp.corporation.divisions.find(
                (a: { type: string }) => a.type === "Tobacco"
            );

            if (tobaccoDiv) {
                for (const prod of Object.values(tobaccoDiv.products)) {
                    if (prod) prod.marketTa2 = true;
                }
            }
        }

        // compare price of increasing advertising vs increasing office space, do the cheaper if it's affordable
        let officeSizeIncrease = 0;
        let advertIncrease = 0;
        let advertPrice = 0;
        while (true) {
            const advertCost = ns.corporation.getHireAdVertCost(tbDivName);
            const tbRDCityOfficeExpandCost = ns.corporation.getOfficeSizeUpgradeCost(tbDivName, tbRDCity, 15);

            if (
                advertCost > ns.corporation.getCorporation().funds * 0.5 &&
                tbRDCityOfficeExpandCost > ns.corporation.getCorporation().funds * 0.5
            )
                break;

            if (advertCost < tbRDCityOfficeExpandCost) {
                advertIncrease++;
                advertPrice += advertCost;
                ns.corporation.hireAdVert(tbDivName);
                continue;
            }

            officeSizeIncrease += 15;
            ns.corporation.upgradeOfficeSize(tbDivName, tbRDCity, 15);
        }

        if (advertIncrease > 0) {
            llog(ns, "Hiring %s AdVert %dx for %s", tbDivName, advertIncrease, ns.nFormat(advertPrice, "($0.000a)"));
        }

        if (officeSizeIncrease > 0) {
            const newSize = ns.corporation.getOffice(tbDivName, tbRDCity).size + officeSizeIncrease;
            growOffice(ns, tbDivName, tbRDCity, newSize);
            assignEmployees(ns, tbDivName, tbRDCity, [
                ["Operations", newSize / 5],
                ["Engineer", newSize / 5],
                ["Business", newSize / 5],
                ["Management", newSize / 5],
                ["Research & Development", newSize / 5],
            ]);
        }

        // if any of the other office sizes are < 20% the size of the Aevum office, attempt to increase their size
        const cityIncrease: Record<string, { inc: number; cost: number }> = {};
        for (const city of ns.corporation.getDivision(tbDivName).cities) {
            // iterate as long as this city's office size is less than 20% of Aevum's and the price
            // of upgrading is less than 5% of the corporation's funds
            while (
                ns.corporation.getOffice(tbDivName, city).size <
                    ns.corporation.getOffice(tbDivName, tbRDCity).size * 0.2 &&
                ns.corporation.getOfficeSizeUpgradeCost(tbDivName, city, 5) <
                    ns.corporation.getCorporation().funds * 0.05
            ) {
                const cost = ns.corporation.getOfficeSizeUpgradeCost(tbDivName, city, 5);
                ns.corporation.upgradeOfficeSize(tbDivName, city, 5);

                if (!(city in cityIncrease)) {
                    cityIncrease[city] = {
                        inc: 5,
                        cost: cost,
                    };
                } else {
                    cityIncrease[city].inc += 5;
                    cityIncrease[city].cost += cost;
                }
            }
        }

        for (const [city, val] of Object.entries(cityIncrease)) {
            llog(
                ns,
                "Hiring %d employees in %s:%s for %s",
                val.inc,
                tbDivName,
                city,
                ns.nFormat(val.cost, "($0.000a)")
            );

			const officeSize = ns.corporation.getOffice(tbDivName, city).size;
            while (ns.corporation.getOffice(tbDivName, city).employees.length < officeSize) {
                ns.corporation.hireEmployee(tbDivName, city);
            }
            assignEmployees(ns, tbDivName, city, [
                ["Operations", officeSize / 5],
                ["Engineer", officeSize / 5],
                ["Business", officeSize / 5],
                ["Management", officeSize / 5],
                ["Research & Development", officeSize / 5],
            ]);
        }

        const leveledUpgrades = [
            "Project Insight",
            "Nuoptimal Nootropic Injector Implants",
            "Smart Factories",
            "DreamSense",
            "Speech Processor Implants",
            "Neural Accelerators",
            "FocusWires",
            "ABC SalesBots",
            "Smart Storage",
        ];
		buyLeveledUpgrades(ns, leveledUpgrades, 0, 0.01);

        // attempt to expand to additional divisions to improve valuation
        const divisions = [
            "Food",
            "Software",
            "Chemical",
            "Fishing",
            "Utilities",
            "Pharmaceutical",
            "Energy",
            // "Mining",
            // "Computer",
            // "RealEstate",
            // "Healthcare",
            // "Robotics",
        ];
        for (const division of divisions) {
            if (
                ns.corporation.getCorporation().divisions.find((div) => div.type === division) === undefined &&
                ns.corporation.getExpandIndustryCost(division) < ns.corporation.getCorporation().funds
            ) {
                const divCost = ns.corporation.getExpandIndustryCost(division);
                llog(ns, "Starting %s division for %s", division, ns.nFormat(divCost, "($0.000a)"));

                ns.corporation.expandIndustry(division, division);
            }
        }

        // If all divisions have been built and a 3rd round investment offer is made for > $1.5q, accept
        const offer = ns.corporation.getInvestmentOffer();
        if (offer.round === 3 && offer.funds > 1500000000000000) {
            ns.corporation.acceptInvestmentOffer();
            llog(
                ns,
                "Investment round 3: Taking offer of %s for %d%%",
                ns.nFormat(offer.funds, "(0.000a)"),
                (offer.shares / 1000000000) * 100
            );
			ns.corporation.goPublic(0);
			ns.corporation.issueDividends(5);
        }

        // Buy Research Upgrades -- buy after high priority researches, and only if purchase cost is < 5% of total research
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const lowPriorityResearches = [
            "Automatic Drug Administration",
            "CPH4 Injections",
            "Drones",
            "Drones - Assembly",
            "Drones - Transport",
            "Go-Juice",
            "JoyWire",
            "Overclock",
            "Self-Correcting Assemblers",
            "Sti.mu",
        ];

        // High Priority - buy when purchase cost is 50% of total research
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const highPriorityResearches = [
            "Hi-Tech R&D Laboratory",
            "Market-TA.I",
            "Market-TA.II",
            "uPgrade: Fulcrum",
            "uPgrade: Capacity.I",
            "uPgrade: Capacity.II",
        ];

        // buy one time unlocks government partnership and shady accounting after going public

        await waitForState(ns, "START");
    }
}

import { NS } from "@ns";
import { cleanLogs, llog } from "lib/util";

const CITIES = ["Aevum", "Chongqing", "Sector-12", "New Tokyo", "Ishima", "Volhaven"];

type Industry = {
    products: { [key: string]: { marketTa2: boolean } };
    warehouses: { [key: string]: { materials: { [key: string]: { name: string; marketTa2: boolean } } } };
    offices: {
        [key: string]: { employees: [{ pos: string }]; setEmployeeToJob(job: string, amount: number): boolean };
    };
};

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

// 237/235 selling at MP

function unassignEmployees(divisionName: string, cityName: string): void {
    const playerProp = findProp("player");

    if (playerProp?.corporation?.divisions) {
        const division: Industry = playerProp.corporation.divisions.find((a: { type: string }) => a.type === divisionName);

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

function unassignAllEmployees(divisionName: string): void {
    const playerProp = findProp("player");

    if (playerProp?.corporation?.divisions) {
        const division: Industry = playerProp.corporation.divisions.find((a: { type: string }) => a.type === divisionName);

        if (division) {
            for (const cityName of Object.keys(division.offices)) {
                unassignEmployees(divisionName, cityName)
            }
        }
    }
}

async function doAgSell(ns: NS, selloff: boolean): Promise<void> {
    const playerProp = findProp("player");
    const agDivName = "Agriculture";

    if (playerProp?.corporation?.divisions) {
        const agDiv: Industry = playerProp.corporation.divisions.find((a: { type: string }) => a.type === agDivName);

        if (agDiv) {
            for (const office of Object.values(agDiv.offices)) {
                const employeeCount = office.employees.length;
                if (selloff) {
                    // all Business
                    unassignAllEmployees(agDivName);

                    office.setEmployeeToJob("Engineer", 1);
                    office.setEmployeeToJob("Business", employeeCount - 1);
                } else {
                    // all Operations
                    unassignAllEmployees(agDivName);

                    office.setEmployeeToJob("Operations", employeeCount);
                }
            }
            for (const [city, warehouse] of Object.entries(agDiv.warehouses)) {
                for (const matName of Object.keys(warehouse.materials)) {
                    // eslint-disable-next-line no-prototype-builtins
                    if (!warehouse.materials.hasOwnProperty(matName)) continue;
                    const mat = warehouse.materials[matName];

                    if (mat.name === "Plants") mat.marketTa2 = true;

                    if (mat.name === "Food") {
                        if (selloff) {
                            mat.marketTa2 = false;
                            ns.corporation.sellMaterial(agDivName, city, mat.name, "MAX", "MP*1");
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

async function buyLeveledUpgrades(ns: NS, _upgrades: string | string[], _amount: number, threshold = 1) {
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

            await ns.sleep(20);
        }

        if (upgradeCount > 0) {
            llog(ns, "Purchased %dx of %s for %s", upgradeCount, upgrade, ns.nFormat(upgradeCost, "($0.000a)"));
        }
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
        await buyLeveledUpgrades(
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

    // Hire and assign jobs
    for (const city of ns.corporation.getDivision(agDivName).cities) {
        if (ns.corporation.getOffice(agDivName, city).employees.length < 3) {
            ns.corporation.hireEmployee(agDivName, city);
            ns.corporation.hireEmployee(agDivName, city);
            ns.corporation.hireEmployee(agDivName, city);
            llog(ns, "Setting Jobs Initial");
            await ns.corporation.setAutoJobAssignment(agDivName, city, "Operations", 1);
            await ns.corporation.setAutoJobAssignment(agDivName, city, "Engineer", 1);
            await ns.corporation.setAutoJobAssignment(agDivName, city, "Business", 1);
        }
    }

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
        }

        // upgrade the size of the warehouses in all of the cities to 300
        while (ns.corporation.getWarehouse(agDivName, city).size < 300) {
            const upgradeCost = ns.corporation.getUpgradeWarehouseCost(agDivName, city);
            const corpFunds = ns.corporation.getCorporation().funds;
            const startSize = ns.corporation.getWarehouse(agDivName, city).size;

            if (corpFunds < upgradeCost) {
                llog(
                    ns,
                    "WARNING: Insufficient funds to purchase a warehouse upgrade %s < %s",
                    ns.nFormat(corpFunds, "($0.000a)"),
                    ns.nFormat(upgradeCost, "($0.000a)")
                );
            } else {
                ns.corporation.upgradeWarehouse(agDivName, city);
                const endSize = ns.corporation.getWarehouse(agDivName, city).size;
                llog(
                    ns,
                    "Upgraded %s %s's warehouse size from %s to %s for %s",
                    agDivName,
                    city,
                    ns.nFormat(startSize, "(0.000a)"),
                    ns.nFormat(endSize, "(0.000a)"),
                    ns.nFormat(upgradeCost, "($0.000a)")
                );
            }
        }

        ns.corporation.setSmartSupply(agDivName, city, true);
        ns.corporation.sellMaterial(agDivName, city, "Food", "MAX", "MP");
        ns.corporation.sellMaterial(agDivName, city, "Plants", "MAX", "MP");
    }

    // buy production materials for all cities
    for (const city of ns.corporation.getDivision(agDivName).cities) {
        if (ns.corporation.getMaterial(agDivName, city, "Real Estate").qty === 0) {
            ns.corporation.buyMaterial(agDivName, city, "Hardware", 12.5);
            ns.corporation.buyMaterial(agDivName, city, "AI Cores", 7.5);
            ns.corporation.buyMaterial(agDivName, city, "Real Estate", 2700);

            while (ns.corporation.getMaterial(agDivName, city, "Real Estate").qty === 0) await ns.sleep(5);

            llog(ns, "Purchased Round 1 of %s production materials in %s", agDivName, city);

            ns.corporation.buyMaterial(agDivName, city, "Hardware", 0);
            ns.corporation.buyMaterial(agDivName, city, "AI Cores", 0);
            ns.corporation.buyMaterial(agDivName, city, "Real Estate", 0);
        }
    }

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
                "Offer: %s %s",
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
            await ns.sleep(500);
        }
    }

    // upgrade the office size in every city to 9 and assign jobs
    for (const city of ns.corporation.getDivision(agDivName).cities) {
        if (ns.corporation.getOffice(agDivName, city).size >= 9) {
            continue;
        }

        const upgradeCost = ns.corporation.getOfficeSizeUpgradeCost(
            agDivName,
            city,
            9 - ns.corporation.getOffice(agDivName, city).size
        );
        const corpFunds = ns.corporation.getCorporation().funds;

        if (corpFunds < upgradeCost) {
            llog(
                ns,
                "ERROR: Insufficient funds to increase %s %s office size to 9 %s < %s",
                agDivName,
                city,
                ns.nFormat(corpFunds, "($0.000a)"),
                ns.nFormat(upgradeCost, "($0.000a)")
            );
            return;
        } else {
            llog(
                ns,
                "Purchasing %d additional office positions in %s %s for %s",
                9 - ns.corporation.getOffice(agDivName, city).size,
                agDivName,
                city,
                ns.nFormat(upgradeCost, "($0.000a)")
            );
            ns.corporation.upgradeOfficeSize(agDivName, city, 9 - ns.corporation.getOffice(agDivName, city).size);
        }

        while (ns.corporation.getOffice(agDivName, city).employees.length < 9) {
            ns.corporation.hireEmployee(agDivName, city);
        }

        llog(ns, "Setting Jobs Second Round Hire");
        await ns.corporation.setAutoJobAssignment(agDivName, city, "Unassigned", 9);

        await ns.corporation.setAutoJobAssignment(agDivName, city, "Operations", 2);
        await ns.corporation.setAutoJobAssignment(agDivName, city, "Engineer", 2);
        await ns.corporation.setAutoJobAssignment(agDivName, city, "Business", 2);
        await ns.corporation.setAutoJobAssignment(agDivName, city, "Management", 1);
        await ns.corporation.setAutoJobAssignment(agDivName, city, "Research & Development", 2);
    }

    // Upgrade Smart Factories and Smart Storage
    await buyLeveledUpgrades(ns, ["Smart Factories", "Smart Storage"], 10);

    // Increase Warehouse Sizes to 3k
    for (const city of ns.corporation.getDivision(agDivName).cities) {
        while (ns.corporation.getWarehouse(agDivName, city).size < 3000) {
            const upgradeCost = ns.corporation.getUpgradeWarehouseCost(agDivName, city);
            const corpFunds = ns.corporation.getCorporation().funds;
            const startSize = ns.corporation.getWarehouse(agDivName, city).size;

            if (corpFunds < upgradeCost) {
                llog(
                    ns,
                    "WARNING: Insufficient funds to purchase a warehouse upgrade %s < %s",
                    ns.nFormat(corpFunds, "($0.000a)"),
                    ns.nFormat(upgradeCost, "($0.000a)")
                );
                break;
            } else {
                ns.corporation.upgradeWarehouse(agDivName, city);
                const endSize = ns.corporation.getWarehouse(agDivName, city).size;
                llog(
                    ns,
                    "Upgraded %s %s's warehouse size from %s to %s for %s",
                    agDivName,
                    city,
                    ns.nFormat(startSize, "(0.000a)"),
                    ns.nFormat(endSize, "(0.000a)"),
                    ns.nFormat(upgradeCost, "($0.000a)")
                );
            }
        }
    }

    // buy second round production materials for all cities
    for (const city of ns.corporation.getDivision(agDivName).cities) {
        if (ns.corporation.getMaterial(agDivName, city, "Real Estate").qty < 140000) {
            ns.corporation.buyMaterial(agDivName, city, "Hardware", 267.5);
            ns.corporation.buyMaterial(agDivName, city, "Robots", 9.6);
            ns.corporation.buyMaterial(agDivName, city, "AI Cores", 244.5);
            ns.corporation.buyMaterial(agDivName, city, "Real Estate", 11940);

            while (ns.corporation.getMaterial(agDivName, city, "Real Estate").qty < 140000) await ns.sleep(5);

            llog(ns, "Purchased Round 2 of %s production materials in %s", agDivName, city);

            ns.corporation.buyMaterial(agDivName, city, "Hardware", 0);
            ns.corporation.buyMaterial(agDivName, city, "Robots", 0);
            ns.corporation.buyMaterial(agDivName, city, "AI Cores", 0);
            ns.corporation.buyMaterial(agDivName, city, "Real Estate", 0);
        }
    }

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
            await ns.sleep(500);
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

        // upgrade the size of the warehouses in all of the cities to 1000
        while (ns.corporation.getWarehouse(tbDivName, city).size < 1000) {
            const upgradeCost = ns.corporation.getUpgradeWarehouseCost(tbDivName, city);
            const corpFunds = ns.corporation.getCorporation().funds;
            const startSize = ns.corporation.getWarehouse(tbDivName, city).size;

            if (corpFunds < upgradeCost) {
                llog(
                    ns,
                    "WARNING: Insufficient funds to purchase a warehouse upgrade %s < %s",
                    ns.nFormat(corpFunds, "($0.000a)"),
                    ns.nFormat(upgradeCost, "($0.000a)")
                );
            } else {
                ns.corporation.upgradeWarehouse(tbDivName, city);
                const endSize = ns.corporation.getWarehouse(tbDivName, city).size;
                llog(
                    ns,
                    "Upgraded %s %s's warehouse size from %s to %s for %s",
                    tbDivName,
                    city,
                    ns.nFormat(startSize, "(0.000a)"),
                    ns.nFormat(endSize, "(0.000a)"),
                    ns.nFormat(upgradeCost, "($0.000a)")
                );
            }
        }

        ns.corporation.setSmartSupply(tbDivName, city, true);
    }

    // upgrade the office size in every city to 10 and assign jobs
    for (const city of ns.corporation.getDivision(tbDivName).cities) {
        if (ns.corporation.getOffice(tbDivName, city).size >= 10) {
            continue;
        }

        const upgradeCost = ns.corporation.getOfficeSizeUpgradeCost(
            tbDivName,
            city,
            10 - ns.corporation.getOffice(tbDivName, city).size
        );
        const corpFunds = ns.corporation.getCorporation().funds;

        if (corpFunds < upgradeCost) {
            llog(
                ns,
                "ERROR: Insufficient funds to increase %s %s office size to 10 %s < %s",
                tbDivName,
                city,
                ns.nFormat(corpFunds, "($0.000a)"),
                ns.nFormat(upgradeCost, "($0.000a)")
            );
            return;
        } else {
            llog(
                ns,
                "Purchasing %d additional office positions in %s %s for %s",
                10 - ns.corporation.getOffice(tbDivName, city).size,
                tbDivName,
                city,
                ns.nFormat(upgradeCost, "($0.000a)")
            );
            ns.corporation.upgradeOfficeSize(tbDivName, city, 10 - ns.corporation.getOffice(tbDivName, city).size);
        }

        while (ns.corporation.getOffice(tbDivName, city).employees.length < 10) {
            ns.corporation.hireEmployee(tbDivName, city);
        }

        llog(ns, "Setting Tobacco Jobs");

        await ns.corporation.setAutoJobAssignment(tbDivName, city, "Unassigned", 2);
        await ns.corporation.setAutoJobAssignment(tbDivName, city, "Operations", 2);
        await ns.corporation.setAutoJobAssignment(tbDivName, city, "Engineer", 2);
        await ns.corporation.setAutoJobAssignment(tbDivName, city, "Business", 2);
        await ns.corporation.setAutoJobAssignment(tbDivName, city, "Management", 2);
        await ns.corporation.setAutoJobAssignment(tbDivName, city, "Research & Development", 2);
    }

    // Upgrade Aevum office to 30 employees
    if (ns.corporation.getOffice(tbDivName, tbRDCity).size < 30) {
        const upgradeCost = ns.corporation.getOfficeSizeUpgradeCost(
            tbDivName,
            tbRDCity,
            30 - ns.corporation.getOffice(tbDivName, tbRDCity).size
        );
        const corpFunds = ns.corporation.getCorporation().funds;

        if (corpFunds < upgradeCost) {
            llog(
                ns,
                "ERROR: Insufficient funds to increase %s %s office size to 30 %s < %s",
                tbDivName,
                tbRDCity,
                ns.nFormat(corpFunds, "($0.000a)"),
                ns.nFormat(upgradeCost, "($0.000a)")
            );
            return;
        } else {
            llog(
                ns,
                "Purchasing %d additional office positions in %s %s for %s",
                30 - ns.corporation.getOffice(tbDivName, tbRDCity).size,
                tbDivName,
                tbRDCity,
                ns.nFormat(upgradeCost, "($0.000a)")
            );
            ns.corporation.upgradeOfficeSize(
                tbDivName,
                tbRDCity,
                30 - ns.corporation.getOffice(tbDivName, tbRDCity).size
            );
        }

        while (ns.corporation.getOffice(tbDivName, tbRDCity).employees.length < 30) {
            ns.corporation.hireEmployee(tbDivName, tbRDCity);
        }

        llog(ns, "Setting Tobacco Aevum Jobs");
        await ns.corporation.setAutoJobAssignment(tbDivName, tbRDCity, "Unassigned", 30);

        await ns.corporation.setAutoJobAssignment(tbDivName, tbRDCity, "Operations", 6);
        await ns.corporation.setAutoJobAssignment(tbDivName, tbRDCity, "Engineer", 6);
        await ns.corporation.setAutoJobAssignment(tbDivName, tbRDCity, "Business", 6);
        await ns.corporation.setAutoJobAssignment(tbDivName, tbRDCity, "Management", 6);
        await ns.corporation.setAutoJobAssignment(tbDivName, tbRDCity, "Research & Development", 6);
    }

    await buyLeveledUpgrades(
        ns,
        ["FocusWires", "Neural Accelerators", "Speech Processor Implants", "Nuoptimal Nootropic Injector Implants"],
        20
    );

    let doUpdate = false;
    let didUpdate = false;
    while (true) {
        const state = ns.corporation.getCorporation().state;

        if (state === "START") {
            doUpdate = true;
        }

        if (state !== "START") {
            doUpdate = false;
            didUpdate = false;
        }

        if (doUpdate && !didUpdate) {
            //llog(ns, "Doing Update");

            didUpdate = true;

            // Attempt to max out Wilson Analytics
            while (
                ns.corporation.getUpgradeLevelCost("Wilson Analytics") <
                ns.corporation.getCorporation().funds * 0.5
            ) {
                const upgradeCost = ns.corporation.getUpgradeLevelCost("Wilson Analytics");
                llog(ns, "Purchasing %s upgrade for %s", "Wilson Analytics", ns.nFormat(upgradeCost, "($0.000a)"));
                ns.corporation.levelUpgrade("Wilson Analytics");
            }

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
                    for (const prod of Object.values(tobaccoDiv.products)) prod.marketTa2 = true;
                }
            }

            // compare price of increasing advertising vs increasing office space, do the cheaper if it's affordable
            let officeSizeIncrease = 0;
            let officeSizePrice = 0;
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
                officeSizePrice += tbRDCityOfficeExpandCost;
                ns.corporation.upgradeOfficeSize(tbDivName, tbRDCity, 15);
            }

            if (advertIncrease > 0) {
                llog(
                    ns,
                    "Hiring %s AdVert %dx for %s",
                    tbDivName,
                    advertIncrease,
                    ns.nFormat(advertPrice, "($0.000a)")
                );
            }

            if (officeSizeIncrease > 0) {
                llog(
                    ns,
                    "Hiring %d employees in %s:%s for %s",
                    officeSizeIncrease,
                    tbDivName,
                    tbRDCity,
                    ns.nFormat(officeSizePrice, "($0.000a)")
                );
                const officeSize = ns.corporation.getOffice(tbDivName, tbRDCity).size;
                while (ns.corporation.getOffice(tbDivName, tbRDCity).employees.length < officeSize) {
                    ns.corporation.hireEmployee(tbDivName, tbRDCity);
                }

                await ns.corporation.setAutoJobAssignment(tbDivName, tbRDCity, "Unassigned", officeSize);

                await ns.corporation.setAutoJobAssignment(tbDivName, tbRDCity, "Operations", officeSize / 5);
                await ns.corporation.setAutoJobAssignment(tbDivName, tbRDCity, "Engineer", officeSize / 5);
                await ns.corporation.setAutoJobAssignment(tbDivName, tbRDCity, "Business", officeSize / 5);
                await ns.corporation.setAutoJobAssignment(tbDivName, tbRDCity, "Management", officeSize / 5);
                await ns.corporation.setAutoJobAssignment(
                    tbDivName,
                    tbRDCity,
                    "Research & Development",
                    officeSize / 5
                );
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

                await ns.corporation.setAutoJobAssignment(tbDivName, city, "Unassigned", officeSize);

                await ns.corporation.setAutoJobAssignment(tbDivName, city, "Operations", officeSize / 5);
                await ns.corporation.setAutoJobAssignment(tbDivName, city, "Engineer", officeSize / 5);
                await ns.corporation.setAutoJobAssignment(tbDivName, city, "Business", officeSize / 5);
                await ns.corporation.setAutoJobAssignment(tbDivName, city, "Management", officeSize / 5);
                await ns.corporation.setAutoJobAssignment(tbDivName, city, "Research & Development", officeSize / 5);
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
            for (const upgrade of leveledUpgrades) {
                let upgradeCount = 0;
                let upgradeCost = 0;
                while (ns.corporation.getUpgradeLevelCost(upgrade) < ns.corporation.getCorporation().funds * 0.01) {
                    upgradeCost += ns.corporation.getUpgradeLevelCost(upgrade);
                    upgradeCount++;
                    ns.corporation.levelUpgrade(upgrade);
                }

                if (upgradeCount > 0) {
                    llog(
                        ns,
                        "Purchased %dx %s upgrade for %s",
                        upgradeCount,
                        upgrade,
                        ns.nFormat(upgradeCost, "($0.000a)")
                    );
                }
            }

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
        }

        await ns.sleep(20);
    }
}

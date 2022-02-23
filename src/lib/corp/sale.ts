interface IMap<T> {
    [key: string]: T;
}

export interface Product {
    name: string;
    dmd: number;
    cmp: number;
    mku: number;
    pCost: number;
    sCost: string | number;
    fin: boolean;
    prog: number;
    createCity: string;
    designCost: number;
    advCost: number;
    rat: number;
    qlt: number;
    per: number;
    dur: number;
    rel: number;
    aes: number;
    fea: number;
    data: IMap<number[]>;
    loc: string;
    siz: number;
    reqMats: IMap<number>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prdman: IMap<any[]>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sllman: IMap<any[]>;
    marketTa1: boolean;
    marketTa2: boolean;
    marketTa2Price: IMap<number>;
}

export interface Material {
    name: string;
    qty: number;
    qlt: number;
    dmd: number;
    dmdR: number[];
    cmp: number;
    cmpR: number[];
    mv: number;
    mku: number;
    buy: number;
    sll: number;
    prd: number;
    imp: number;
    totalExp: number;
    bCost: number;
    sCost: string | number;
    prdman: [boolean, number]; // Production
    sllman: [boolean, string | number]; // Sale
    marketTa1: boolean;
    marketTa2: boolean;
    marketTa2Price: number;

    getMarkupLimit(): number;
}

export interface Employee {
    name: string;
    mor: number;
    hap: number;
    ene: number;
    int: number;
    cha: number;
    exp: number;
    cre: number;
    eff: number;
    sal: number;
    cyclesUntilRaise: number;
    loc: string;
    pos: string;
}

export interface OfficeSpace {
    loc: string;
    size: number;
    minEne: number;
    maxEne: number;
    minHap: number;
    maxHap: number;
    maxMor: number;
    employees: Employee[];
    employeeProd: { [key: string]: number };

	atCapacity(): boolean;
	process(marketCycles: number, corporation: ICorporation, industry: Industry): number;
	calculateEmployeeProductivity(corporation: ICorporation, industry: Industry): void;
	hireRandomEmployee(): Employee | undefined;
	assignEmployeeToJob(job: string): boolean;
	unassignEmployeeFromJob(job: string): boolean;
	setEmployeeToJob(job: string, amount: number): boolean;
}

export interface Warehouse {
    level: number;
    loc: string;
    materials: IMap<Material>;
    size: number;
    sizeUsed: number;
    smartSupplyEnabled: boolean;
    smartSupplyUseLeftovers: { [key: string]: boolean | undefined };
    smartSupplyStore: number;
}

export interface Industry {
    name: string;
    type: string;
    sciResearch: Material;
    researched: { [key: string]: boolean | undefined };
    reqMats: { [key: string]: number | undefined };

    prodMats: string[];

    products: { [key: string]: Product | undefined };
    makesProducts: boolean;

    awareness: number;
    popularity: number;
    startingCost: number;

    reFac: number;
    sciFac: number;
    hwFac: number;
    robFac: number;
    aiFac: number;
    advFac: number;

    prodMult: number;

    // Decimal
    lastCycleRevenue: number;
    lastCycleExpenses: number;
    thisCycleRevenue: number;
    thisCycleExpenses: number;

    upgrades: number[];

    state: string;
    newInd: boolean;
    warehouses: { [key: string]: Warehouse | 0 };
    offices: { [key: string]: OfficeSpace | 0 };

    init(): void;
    getProductDescriptionText(): string;
    getMaximumNumberProducts(): number;
    hasMaximumNumberProducts(): boolean;
    calculateProductionFactors(): void;
    updateWarehouseSizeUsed(warehouse: Warehouse): void;
    process(marketCycles: number, state: string, corporation: ICorporation): void;
    processMaterialMarket(): void;
    processProductMarket(marketCycles: number): void;
    processMaterials(marketCycles: number, corporation: ICorporation): [number, number];
    processProducts(marketCycles: number, corporation: ICorporation): [number, number];
    processProduct(marketCycles: number, product: Product, corporation: ICorporation): number;
    discontinueProduct(product: Product): void;
    getOfficeProductivity(office: OfficeSpace, params?: { forProduct?: boolean }): number;
    getBusinessFactor(office: OfficeSpace): number;
    getAdvertisingFactors(): [number, number, number, number];
    getMarketFactor(mat: { dmd: number; cmp: number }): number;
    hasResearch(name: string): boolean;
    updateResearchTree(): void;
    getAdvertisingMultiplier(): number;
    getEmployeeChaMultiplier(): number;
    getEmployeeCreMultiplier(): number;
    getEmployeeEffMultiplier(): number;
    getEmployeeIntMultiplier(): number;
    getProductionMultiplier(): number;
    getProductProductionMultiplier(): number;
    getSalesMultiplier(): number;
    getScientificResearchMultiplier(): number;
    getStorageMultiplier(): number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toJSON(): any;
}

export interface ICorporation {
    name: string;

    divisions: Industry[];

    funds: number;
    revenue: number;
    expenses: number;
    fundingRound: number;
    public: boolean;
    totalShares: number;
    numShares: number;
    shareSalesUntilPriceUpdate: number;
    shareSaleCooldown: number;
    issueNewSharesCooldown: number;
    dividendPercentage: number;
    dividendTaxPercentage: number;
    issuedShares: number;
    sharePrice: number;
    storedCycles: number;

    unlockUpgrades: number[];
    upgrades: number[];
    upgradeMultipliers: number[];

    state: string;

    addFunds(amt: number): void;
    getState(): string;
    storeCycles(numCycles: number): void;
    determineValuation(): number;
    getTargetSharePrice(): number;
    updateSharePrice(): void;
    immediatelyUpdateSharePrice(): void;
    calculateShareSale(numShares: number): [number, number, number];
    convertCooldownToString(cd: number): string;
    getProductionMultiplier(): number;
    getStorageMultiplier(): number;
    getDreamSenseGain(): number;
    getAdvertisingMultiplier(): number;
    getEmployeeCreMultiplier(): number;
    getEmployeeChaMultiplier(): number;
    getEmployeeIntMultiplier(): number;
    getEmployeeEffMultiplier(): number;
    getSalesMultiplier(): number;
    getScientificResearchMultiplier(): number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toJSON(): any;
    getDividends(): number;
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

export function getMaterialPrice(divisionName: string, city: string, matName: string): number {
    const playerProp = findProp("player");
    const agDivName = "Agriculture";

    if (playerProp?.corporation?.divisions) {
        const corporation: ICorporation = playerProp.corporation;
        const agDiv: Industry = playerProp.corporation.divisions.find((a: { type: string }) => a.type === agDivName);

        if (agDiv) {
            const warehouse = agDiv.warehouses[city];
            const office = agDiv.offices[city];
            if (warehouse && office) {
                if (Object.prototype.hasOwnProperty.call(warehouse.materials, matName)) {
                    const mat = warehouse.materials[matName];
                    const businessFactor = agDiv.getBusinessFactor(office); //Business employee productivity
                    const advertisingFactor = agDiv.getAdvertisingFactors()[0]; //Awareness + popularity
                    const marketFactor = agDiv.getMarketFactor(mat); //Competition + demand

                    const markupLimit = mat.getMarkupLimit();

                    // Reverse engineer the 'maxSell' formula
                    // 1. Set 'maxSell' = prod
                    // 2. Substitute formula for 'markup'
                    // 3. Solve for 'sCost'
                    const numerator = markupLimit;
                    const sqrtNumerator = mat.qty * 10;
                    const sqrtDenominator =
                        (mat.qlt + 0.001) *
                        marketFactor *
                        businessFactor *
                        corporation.getSalesMultiplier() *
                        advertisingFactor *
                        agDiv.getSalesMultiplier();
                    const denominator = Math.sqrt(sqrtNumerator / sqrtDenominator);
                    let optimalPrice;
                    if (sqrtDenominator === 0 || denominator === 0) {
                        if (sqrtNumerator === 0) {
                            optimalPrice = 0; // No production
                        } else {
                            optimalPrice = mat.bCost + markupLimit;
                            console.warn(
                                `In Corporation, found illegal 0s when trying to calculate MarketTA2 sale cost`
                            );
                        }
                    } else {
                        optimalPrice = numerator / denominator + mat.bCost;
                    }

					return optimalPrice;
                }
            }
        }
    }

    return 0;
}

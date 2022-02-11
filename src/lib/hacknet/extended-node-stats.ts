import { NS, NodeStats } from '@ns'

export class ExtendedNodeStats {
    name: string;
    level: number;
    ram: number;
    ramUsed: number;
    cores: number;
    cache: number;
    hashCapacity: number;
    production: number;
    timeOnline: number;
    totalCost: number;
    totalValue: number;

    constructor(stats: NodeStats) {
        this.name = stats.name;
        this.level = stats.level;
        this.ram = stats.ram;
        this.ramUsed = stats.ramUsed;
        this.cores = stats.cores;
        this.cache = stats.cache;
        this.hashCapacity = stats.hashCapacity;
        this.production = stats.production;
        this.timeOnline = stats.timeOnline;
        this.totalCost = 0;
        this.totalValue = 0;
    }

    updateProduction(ns: NS, zeroRamUsed = true): void {
        this.production = ns.formulas.hacknetServers.hashGainRate(
            this.level,
            zeroRamUsed ? 0 : this.ramUsed,
            this.ram,
            this.cores,
            ns.getPlayer().hacknet_node_money_mult
        );
    }
}
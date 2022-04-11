import { NS } from "@ns";
import { MarketData } from "/lib/stock/market_data";

export async function main(ns: NS): Promise<void> {
    const mData = ns.stock.getSymbols().map((sym) => {
        return new MarketData(ns, sym);
    });

    for (const data of mData) {
        data.sell(ns, true);
    }
}

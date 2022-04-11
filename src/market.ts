import { NS } from "@ns";
import { MarketData, logMarketData, waitForMarketUpdate } from "/lib/stock/market_data";

export async function main(ns: NS): Promise<void> {
    ns.disableLog("disableLog");
    ns.disableLog("sleep");

    ns.tail();

    const volatilityFilter = 0.0175;
    const movementFilter = 0.05;
    //const potentialFilter = 0.0005;

    const mData = ns.stock.getSymbols().map((sym) => {
        return new MarketData(ns, sym);
    });
    
    while (true) {
        mData.map((x) => x.update(ns));
        const filteredData = mData
            .filter((a) => a.movement >= movementFilter && a.volatility < volatilityFilter)
            .sort((a, b) => b.potential - a.potential);
        const unfilteredData = mData
            .filter((a) => !(a.movement >= movementFilter && a.volatility < volatilityFilter));


        logMarketData(ns, filteredData);

        for (const data of mData) {
            data.polaritySwitchSell(ns);
        }

        for (const data of unfilteredData) {
            data.sell(ns, true);
        }

        for (let idx = 0; idx < filteredData.length; idx++) {
            const pprice = filteredData[idx].getPurchasePrice(ns);
            if (pprice < 10000000) continue;

            if (pprice > ns.getPlayer().money) {
                filteredData.slice(idx + 1).map((x) => x.sell(ns));
            }

            filteredData[idx].buy(ns);
        }

        await waitForMarketUpdate(ns, mData);
    }
}

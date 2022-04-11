import { NS } from '@ns'
import { llog } from '/lib/util';

const TCOST = 100000;

export class MarketData {
    sym: string;
    ask = 0;
    bid = 0;
    price = 0;
    spread = 0;
    max = 0;
    cap = 0;
    shares = 0;
    avgPx = 0;
    totalPx = 0;
    sharesShort = 0;
    avgPxShort = 0;
    totalPxShort = 0;
    forecast = 0;
    movement = 0;
    sgain = 0;
    sgainper = 0;
    volatility = 0;
    potential = 0;

    constructor(ns: NS, sym: string) {
        this.sym = sym;

        this.update(ns);
    }

    update(ns: NS): void {
        this.ask = ns.stock.getAskPrice(this.sym);
        this.bid = ns.stock.getBidPrice(this.sym);
        this.price = ns.stock.getPrice(this.sym);
        this.spread = this.ask - this.bid;

        this.max = ns.stock.getMaxShares(this.sym);
        this.cap = this.price * this.max;

        [this.shares, this.avgPx, this.sharesShort, this.avgPxShort] = ns.stock.getPosition(this.sym);
        this.totalPx = this.avgPx * this.shares;
        this.totalPxShort = this.avgPxShort * this.sharesShort;

        this.sgain = 0;
        this.sgainper = 0;
        if (this.shares > 0) {
            this.sgain = ns.stock.getSaleGain(this.sym, this.shares, "Long");
            this.sgainper = (this.sgain - this.totalPx) / this.totalPx;
        }
        if (this.sharesShort > 0) {
            this.sgain = ns.stock.getSaleGain(this.sym, this.sharesShort, "Short");
            this.sgainper = (this.sgain - this.totalPxShort) / this.totalPxShort;
        }

        try {
            this.forecast = ns.stock.getForecast(this.sym);
            this.movement = Math.abs(0.5 - this.forecast);
            this.volatility = ns.stock.getVolatility(this.sym);
            this.potential = this.movement * this.volatility;
        } catch (e) {
            // do nothing
        }
    }

    value(): number {
        return this.sgain;
    }

    buy(ns: NS): boolean {
        this.update(ns);

        let buyShareCount = this.max - this.shares - this.sharesShort;

        if (this.forecast >= 0.5) {
            if (this.ask * buyShareCount + TCOST > ns.getPlayer().money) {
                buyShareCount = Math.floor((ns.getPlayer().money - TCOST) / this.ask);
            }

            if (buyShareCount <= 0 || this.ask * buyShareCount < 10000000) return false;

            ns.stock.buy(this.sym, buyShareCount);
            llog(ns, "Buy %s - %d (%s)", this.sym, buyShareCount, ns.nFormat(this.ask * buyShareCount, "$0.000a"));
        } else {
            if (this.bid * buyShareCount + TCOST > ns.getPlayer().money) {
                buyShareCount = Math.floor((ns.getPlayer().money - TCOST) / this.bid);
            }

            if (buyShareCount <= 0 || this.bid * buyShareCount < 10000000) return false;

            ns.stock.short(this.sym, buyShareCount);
            llog(ns, "Buy %s - %d (SHORT)", this.sym, buyShareCount);
        }

        this.update(ns);

        return true;
    }

    sell(ns: NS, force?: boolean): boolean {
        this.update(ns);

        if (this.sgainper < 0.01 && force !== true) return; // dont sell if we're losing money or gaining very little

        if (this.shares > 0) {
            ns.stock.sell(this.sym, this.shares);
            llog(ns, "Sell %s - %d", this.sym, this.shares);
        }

        if (this.sharesShort > 0) {
            ns.stock.sellShort(this.sym, this.sharesShort);
            llog(ns, "Sell %s - %d (SHORT)", this.sym, this.sharesShort);
        }
    }

    getPurchasePrice(ns: NS): number {
        this.update(ns);

        const buyShareCount = this.max - this.shares - this.sharesShort;

        if (this.forecast >= 0.5) {
            return this.ask * buyShareCount + TCOST;
        } else {
            return this.bid * buyShareCount + TCOST;
        }
    }

    polaritySwitchSell(ns: NS): void {
        this.update(ns);

        if (this.shares > 0 && this.forecast < 0.5) {
            ns.stock.sell(this.sym, this.shares);
            llog(ns, "*POLARITY SWITCH* Sell %s - %d", this.sym, this.shares);
        }

        if (this.sharesShort > 0 && this.forecast > 0.5) {
            ns.stock.sellShort(this.sym, this.sharesShort);
            llog(ns, "*POLARITY SWITCH* Sell %s - %d (SHORT)", this.sym, this.sharesShort);
        }
    }

    isUpdated(ns: NS): boolean {
        return ns.stock.getAskPrice(this.sym) !== this.ask || ns.stock.getBidPrice(this.sym) !== this.bid;
    }
}

export async function waitForMarketUpdate(ns: NS, mData: MarketData[]): void {
    while (!mData.some((x) => x.isUpdated(ns))) {
        await ns.sleep(500);
    }
}

export function logMarketData(ns: NS, mData: MarketData[]): void {
    const mFormat = function (num: number): string {
        if (Math.abs(num) > 1000) return ns.nFormat(num, "$0.000a");

        return ns.sprintf("$%.3f ", num);
    };

    llog(ns, "=======================================================================");
    llog(ns, "  SYM   POT MOV FOR  VOL      VALUE    SHARES  TYPE   GAIN%%  VALUE INC")
    
    for (const data of mData) {
        let shareStr = "---------";
        let posStr = "-----";
        let gainStr = "----------";
        let sellStr = "----------";
        if (data.shares > 0) {
            shareStr = ns.sprintf("%9d", data.shares);
            posStr = " LONG";
            gainStr = mFormat(data.sgain - data.totalPx);
            sellStr = mFormat(data.sgain);
        }
        if (data.sharesShort > 0) {
            shareStr = ns.sprintf("%9d", data.sharesShort);
            posStr = "SHORT";
            gainStr = mFormat(data.sgain - data.totalPxShort);
            sellStr = mFormat(data.sgain);
        }
        
        llog(ns, 
            "%5s %5.2f %3d %3d %.2f %10s %s %s %7s %10s ",
            data.sym,
            data.potential * 10000,
            data.movement * 100,
            data.forecast * 100,
            data.volatility * 100,
            sellStr,
            shareStr,
            posStr,
            data.sgainper !== 0 ? ns.nFormat(data.sgainper, "0.00%") : "-------",
            gainStr
        );
    }

    const value = mData.reduce((total, data) => total + data.value(), 0);
    llog(ns, "Value: %s", mFormat(value));
}
import { NS } from "@ns";
import { allHosts } from "bbutil";

class CCT {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [index: string]:any

    name: string;
    host: string;
    type: string;
    desc: string;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;

    constructor(ns: NS, hostname: string, filename: string) {
        this.name = filename;
        this.host = hostname;
        this.type = ns.codingcontract.getContractType(filename, hostname);
        this.desc = ns.codingcontract.getDescription(filename, hostname);
        this.data = ns.codingcontract.getData(filename, hostname);

        this.solve = _.bind(this["solve" + this.type.replace(/\s/g, "")], null, _, this);

        //this.print(ns);
    }

    print(ns: NS) {
        ns.tprintf("%s %s:", this.host, this.name);
        ns.tprintf("  %s", this.type);
        ns.tprintf("  %s", this.desc);
        ns.tprintf("  %s", this.data);
    }

    answer(ns: NS) {
        const solution = this.solve();

        if (solution === null) {
            ns.tprintf("ERROR: Attempted to solve with null solution");
        }
        const reward = ns.codingcontract.attempt(solution, this.name, this.host, { returnReward: true });

        if (reward === "") {
            ns.tprintf("ERROR: Failed to solve %s:%s of type %s", this.host, this.name, this.type);
            ns.tprintf("  data: %s; answer: %s", this.data.toString(), solution.toString());
        } else {
            ns.tprintf("SUCCESS: Solved %s:%s => %s", this.host, this.name, reward);
        }
    }

    solveTotalWaystoSum() {
        const ways: number[] = [1];
        ways.length = this.data + 1;
        ways.fill(0, 1);
        for (let i = 1; i < this.data; ++i) {
            for (let j: number = i; j <= this.data; ++j) {
                ways[j] += ways[j - i];
            }
        }

        return ways[this.data];
    }

    solveSubarraywithMaximumSum() {
        const nums: number[] = this.data.slice();
        for (let i = 1; i < nums.length; i++) {
            nums[i] = Math.max(nums[i], nums[i] + nums[i - 1]);
        }

        return Math.max(...nums);
    }

    solveSpiralizeMatrix() {
        const spiral = [];
        const m = this.data.length;
        const n = this.data[0].length;
        let u = 0;
        let d = m - 1;
        let l = 0;
        let r = n - 1;
        let k = 0;
        while (true) {
            // Up
            for (let col = l; col <= r; col++) {
                spiral[k] = this.data[u][col];
                ++k;
            }
            if (++u > d) {
                break;
            }

            // Right
            for (let row = u; row <= d; row++) {
                spiral[k] = this.data[row][r];
                ++k;
            }
            if (--r < l) {
                break;
            }

            // Down
            for (let col = r; col >= l; col--) {
                spiral[k] = this.data[d][col];
                ++k;
            }
            if (--d < u) {
                break;
            }

            // Left
            for (let row = d; row >= u; row--) {
                spiral[k] = this.data[row][l];
                ++k;
            }
            if (++l > r) {
                break;
            }
        }

        return spiral;
    }

    solveArrayJumpingGame() {
        const n = this.data.length;
        let i = 0;
        for (let reach = 0; i < n && i <= reach; ++i) {
            reach = Math.max(i + this.data[i], reach);
        }

        return i === n ? 1 : 0;
    }

    solveMergeOverlappingIntervals() {
        const intervals: number[][] = this.data.slice();
        intervals.sort((a, b) => {
            return a[0] - b[0];
        });

        const result = [];
        let start = intervals[0][0];
        let end = intervals[0][1];
        for (const interval of intervals) {
            if (interval[0] <= end) {
                end = Math.max(end, interval[1]);
            } else {
                result.push([start, end]);
                start = interval[0];
                end = interval[1];
            }
        }
        result.push([start, end]);

        return result;
    }

    solveGenerateIPAddresses() {
        function validate(str: string) {
            if (str === "0") return true;
            if (str.length > 1 && str[0] === "0") return false;
            if (str.length > 3) return false;
            return parseInt(str) < 255;
        }

        const results = [];
        for (let i = 1; i <= 3; i++) {
            if (this.data.length - i > 9) continue;

            const a = this.data.substr(0, i);

            if (!validate(a)) continue;

            for (let j = 1; j <= 3; j++) {
                if (this.data.length - (i + j) > 6) continue;

                const b = this.data.substr(i, j);

                if (!validate(b)) continue;

                for (let k = 1; k <= 3; k++) {
                    if (this.data.length - (i + j + k) > 3) continue;

                    const c = this.data.substr(i + j, k);
                    const d = this.data.substr(i + j + k);

                    if (validate(c) && validate(d)) {
                        results.push(a + "." + b + "." + c + "." + d);
                    }
                }
            }
        }

        return results;
    }
    solveAlgorithmicStockTraderI() {
        let maxCur = 0;
        let maxSoFar = 0;
        for (let i = 1; i < this.data.length; ++i) {
            maxCur = Math.max(0, (maxCur += this.data[i] - this.data[i - 1]));
            maxSoFar = Math.max(maxCur, maxSoFar);
        }

        return maxSoFar;
    }
    solveAlgorithmicStockTraderII() {
        let profit = 0;
        for (let p = 1; p < this.data.length; ++p) {
            profit += Math.max(this.data[p] - this.data[p - 1], 0);
        }

        return profit;
    }
    solveAlgorithmicStockTraderIII() {
        let hold1 = Number.MIN_SAFE_INTEGER;
        let hold2 = Number.MIN_SAFE_INTEGER;
        let release1 = 0;
        let release2 = 0;
        for (const price of this.data) {
            release2 = Math.max(release2, hold2 + price);
            hold2 = Math.max(hold2, release1 - price);
            release1 = Math.max(release1, hold1 + price);
            hold1 = Math.max(hold1, price * -1);
        }

        return release2;
    }
    solveAlgorithmicStockTraderIV() {
        const k = this.data[0];
        const prices = this.data[1];

        const len = prices.length;
        if (len < 2) {
            return 0;
            return;
        }
        if (k > len / 2) {
            let res = 0;
            for (let i = 1; i < len; ++i) {
                res += Math.max(prices[i] - prices[i - 1], 0);
            }

            return res;
            return;
        }

        const hold = [];
        const rele = [];
        hold.length = k + 1;
        rele.length = k + 1;
        for (let i = 0; i <= k; ++i) {
            hold[i] = Number.MIN_SAFE_INTEGER;
            rele[i] = 0;
        }

        let cur;
        for (let i = 0; i < len; ++i) {
            cur = prices[i];
            for (let j = k; j > 0; --j) {
                rele[j] = Math.max(rele[j], hold[j] + cur);
                hold[j] = Math.max(hold[j], rele[j - 1] - cur);
            }
        }

        return rele[k];
    }

    solveMinimumPathSuminaTriangle() {
        const n: number = this.data.length;
        const dp: number[] = this.data[n - 1].slice();
        for (let i = n - 2; i > -1; --i) {
            for (let j = 0; j < this.data[i].length; ++j) {
                dp[j] = Math.min(dp[j], dp[j + 1]) + this.data[i][j];
            }
        }

        return dp[0];
    }

    solveUniquePathsinaGridI() {
        const n = this.data[0]; // Number of rows
        const m = this.data[1]; // Number of columns
        const currentRow = [];
        currentRow.length = n;

        for (let i = 0; i < n; i++) {
            currentRow[i] = 1;
        }
        for (let row = 1; row < m; row++) {
            for (let i = 1; i < n; i++) {
                currentRow[i] += currentRow[i - 1];
            }
        }

        return currentRow[n - 1];
    }
    solveUniquePathsinaGridII() {
        const obstacleGrid = [];
        obstacleGrid.length = this.data.length;
        for (let i = 0; i < obstacleGrid.length; ++i) {
            obstacleGrid[i] = this.data[i].slice();
        }

        for (let i = 0; i < obstacleGrid.length; i++) {
            for (let j = 0; j < obstacleGrid[0].length; j++) {
                if (obstacleGrid[i][j] == 1) {
                    obstacleGrid[i][j] = 0;
                } else if (i == 0 && j == 0) {
                    obstacleGrid[0][0] = 1;
                } else {
                    obstacleGrid[i][j] = (i > 0 ? obstacleGrid[i - 1][j] : 0) + (j > 0 ? obstacleGrid[i][j - 1] : 0);
                }
            }
        }

        return obstacleGrid[obstacleGrid.length - 1][obstacleGrid[0].length - 1];
    }
    solveSanitizeParenthesesinExpression() {
        let left = 0;
        let right = 0;
        const res: string[] = [];

        for (let i = 0; i < this.data.length; ++i) {
            if (this.data[i] === "(") {
                ++left;
            } else if (this.data[i] === ")") {
                left > 0 ? --left : ++right;
            }
        }

        function dfs(
            pair: number,
            index: number,
            left: number,
            right: number,
            s: string,
            solution: string,
            res: string[]
        ): void {
            if (s.length === index) {
                if (left === 0 && right === 0 && pair === 0) {
                    for (let i = 0; i < res.length; i++) {
                        if (res[i] === solution) {
                            return;
                        }
                    }
                    res.push(solution);
                }
                return;
            }

            if (s[index] === "(") {
                if (left > 0) {
                    dfs(pair, index + 1, left - 1, right, s, solution, res);
                }
                dfs(pair + 1, index + 1, left, right, s, solution + s[index], res);
            } else if (s[index] === ")") {
                if (right > 0) dfs(pair, index + 1, left, right - 1, s, solution, res);
                if (pair > 0) dfs(pair - 1, index + 1, left, right, s, solution + s[index], res);
            } else {
                dfs(pair, index + 1, left, right, s, solution + s[index], res);
            }
        }

        dfs(0, 0, left, right, this.data, "", res);

        return res;
    }
    solveFindAllValidMathExpressions() {
        const num = this.data[0];
        const target = this.data[1];

        function helper(
            res: string[],
            path: string,
            num: string,
            target: number,
            pos: number,
            evaluated: number,
            multed: number
        ): void {
            if (pos === num.length) {
                if (target === evaluated) {
                    res.push(path);
                }
                return;
            }

            for (let i = pos; i < num.length; ++i) {
                if (i != pos && num[pos] == "0") {
                    break;
                }
                const cur = parseInt(num.substring(pos, i + 1));

                if (pos === 0) {
                    helper(res, path + cur, num, target, i + 1, cur, cur);
                } else {
                    helper(res, path + "+" + cur, num, target, i + 1, evaluated + cur, cur);
                    helper(res, path + "-" + cur, num, target, i + 1, evaluated - cur, -cur);
                    helper(res, path + "*" + cur, num, target, i + 1, evaluated - multed + multed * cur, multed * cur);
                }
            }
        }

        const result: string[] = [];
        helper(result, "", num, target, 0, 0, 0);

        return result;
    }

    solveFindLargestPrimeFactor() {
        let fac = 2;
        let n: number = this.data;
        while (n > (fac - 1) * (fac - 1)) {
            while (n % fac === 0) {
                n = Math.round(n / fac);
            }
            ++fac;
        }

        return n === 1 ? fac - 1 : n;
    }
}

export async function main(ns: NS): Promise<void> {
    const hosts = allHosts(ns);
    while (true) {
        const ccts = [];
        for (const hostname of hosts) {
            const ls = ns.ls(hostname).filter((filename) => filename.indexOf(".cct") !== -1);

            if (ls.length === 0) continue;

            ccts.push(new CCT(ns, hostname, ls[0]));
        }

        for (const cct of ccts) {
            cct.answer(ns);
        }

        await ns.sleep(60 * 1000);
    }
}

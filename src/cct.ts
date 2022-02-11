import { NS } from "@ns";
import { allHosts } from "lib/util";

function answerCCT(ns: NS, cct: CCT, answer: number | string[]) {
    const reward = ns.codingcontract.attempt(answer, cct.name, cct.host, { returnReward: true });

    if (reward === "") {
        ns.tprintf("ERROR: Failed to solve %s:%s of type %s", cct.host, cct.name, cct.type);
        ns.tprintf("  data: %s; answer: %s", cct.data.toString(), answer.toString());
    } else {
        ns.tprintf("SUCCESS: Solved %s:%s => %s", cct.host, cct.name, reward);
    }
}

class CCT {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [index: string]:any

    name: string;
    host: string;
    type: string;
    desc: string;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    solve: any;

    constructor(ns: NS, hostname: string, filename: string) {
        this.name = filename;
        this.host = hostname;
        this.type = ns.codingcontract.getContractType(filename, hostname);
        this.desc = ns.codingcontract.getDescription(filename, hostname);
        this.data = ns.codingcontract.getData(filename, hostname);

        this.solve = _.bind(CCT["solve" + this.type.replace(/\s/g, "")], null, _, this);

        //this.print(ns);
    }

    print(ns: NS) {
        ns.tprintf("%s %s:", this.host, this.name);
        ns.tprintf("  %s", this.type);
        ns.tprintf("  %s", this.desc);
        ns.tprintf("  %s", this.data);
    }

    static solveTotalWaystoSum(ns: NS, cct: CCT) {
        const ways: number[] = [1];
        ways.length = cct.data + 1;
        ways.fill(0, 1);
        for (let i = 1; i < cct.data; ++i) {
            for (let j: number = i; j <= cct.data; ++j) {
                ways[j] += ways[j - i];
            }
        }

        answerCCT(ns, cct, ways[cct.data]);
    }

    static solveSubarraywithMaximumSum(ns: NS, cct: CCT) {
        const nums: number[] = cct.data.slice();
        for (let i = 1; i < nums.length; i++) {
            nums[i] = Math.max(nums[i], nums[i] + nums[i - 1]);
        }

        answerCCT(ns, cct, Math.max(...nums));
    }

    static solveSpiralizeMatrix(ns: NS, cct: CCT) {
        const spiral = [];
        const m = cct.data.length;
        const n = cct.data[0].length;
        let u = 0;
        let d = m - 1;
        let l = 0;
        let r = n - 1;
        let k = 0;
        while (true) {
            // Up
            for (let col = l; col <= r; col++) {
                spiral[k] = cct.data[u][col];
                ++k;
            }
            if (++u > d) {
                break;
            }

            // Right
            for (let row = u; row <= d; row++) {
                spiral[k] = cct.data[row][r];
                ++k;
            }
            if (--r < l) {
                break;
            }

            // Down
            for (let col = r; col >= l; col--) {
                spiral[k] = cct.data[d][col];
                ++k;
            }
            if (--d < u) {
                break;
            }

            // Left
            for (let row = d; row >= u; row--) {
                spiral[k] = cct.data[row][l];
                ++k;
            }
            if (++l > r) {
                break;
            }
        }

        answerCCT(ns, cct, spiral);
    }

    static solveArrayJumpingGame(ns: NS, cct: CCT) {
        const n = cct.data.length;
        let i = 0;
        for (let reach = 0; i < n && i <= reach; ++i) {
            reach = Math.max(i + cct.data[i], reach);
        }

        answerCCT(ns, cct, i === n ? 1 : 0);
    }

    static solveMergeOverlappingIntervals(ns: NS, cct: CCT) {
        function convert2DArrayToString(arr: number[][]): string {
            const components: string[] = [];
            arr.forEach((e: number[]) => {
                let s: string = e.toString();
                s = ["[", s, "]"].join("");
                components.push(s);
            });

            return components.join(",").replace(/\s/g, "");
        }

        const intervals: number[][] = cct.data.slice();
        intervals.sort((a, b) => {
            return a[0] - b[0];
        });

        const result: number[][] = [];
        let start: number = intervals[0][0];
        let end: number = intervals[0][1];
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

        answerCCT(ns, cct, [convert2DArrayToString(result)]);
    }

    static solveGenerateIPAddresses(ns: NS, cct: CCT) {
        function validate(str: string) {
            if (str === "0") return true;
            if (str.length > 1 && str[0] === "0") return false;
            if (str.length > 3) return false;
            return parseInt(str) < 255;
        }

        const results = [];
        for (let i = 1; i <= 3; i++) {
            if (cct.data.length - i > 9) continue;

            const a = cct.data.substr(0, i);

            if (!validate(a)) continue;

            for (let j = 1; j <= 3; j++) {
                if (cct.data.length - (i + j) > 6) continue;

                const b = cct.data.substr(i, j);

                if (!validate(b)) continue;

                for (let k = 1; k <= 3; k++) {
                    if (cct.data.length - (i + j + k) > 3) continue;

                    const c = cct.data.substr(i + j, k);
                    const d = cct.data.substr(i + j + k);

                    if (validate(c) && validate(d)) {
                        results.push(a + "." + b + "." + c + "." + d);
                    }
                }
            }
        }

        answerCCT(ns, cct, results);
    }

    static solveAlgorithmicStockTraderI(ns: NS, cct: CCT) {
        let maxCur = 0;
        let maxSoFar = 0;
        for (let i = 1; i < cct.data.length; ++i) {
            maxCur = Math.max(0, (maxCur += cct.data[i] - cct.data[i - 1]));
            maxSoFar = Math.max(maxCur, maxSoFar);
        }

        answerCCT(ns, cct, maxSoFar);
    }

    static solveAlgorithmicStockTraderII(ns: NS, cct: CCT) {
        let profit = 0;
        for (let p = 1; p < cct.data.length; ++p) {
            profit += Math.max(cct.data[p] - cct.data[p - 1], 0);
        }

        answerCCT(ns, cct, profit);
    }

    static solveAlgorithmicStockTraderIII(ns: NS, cct: CCT) {
        let hold1 = Number.MIN_SAFE_INTEGER;
        let hold2 = Number.MIN_SAFE_INTEGER;
        let release1 = 0;
        let release2 = 0;
        for (const price of cct.data) {
            release2 = Math.max(release2, hold2 + price);
            hold2 = Math.max(hold2, release1 - price);
            release1 = Math.max(release1, hold1 + price);
            hold1 = Math.max(hold1, price * -1);
        }

        answerCCT(ns, cct, release2);
    }

    static solveAlgorithmicStockTraderIV(ns: NS, cct: CCT) {
        const k: number = cct.data[0];
        const prices: number[] = cct.data[1];

        const len = prices.length;
        if (len < 2) {
            answerCCT(ns, cct, 0);
        }
        if (k > len / 2) {
            let res = 0;
            for (let i = 1; i < len; ++i) {
                res += Math.max(prices[i] - prices[i - 1], 0);
            }

            answerCCT(ns, cct, res);
        }

        const hold: number[] = [];
        const rele: number[] = [];
        hold.length = k + 1;
        rele.length = k + 1;
        for (let i = 0; i <= k; ++i) {
            hold[i] = Number.MIN_SAFE_INTEGER;
            rele[i] = 0;
        }

        let cur: number;
        for (let i = 0; i < len; ++i) {
            cur = prices[i];
            for (let j = k; j > 0; --j) {
                rele[j] = Math.max(rele[j], hold[j] + cur);
                hold[j] = Math.max(hold[j], rele[j - 1] - cur);
            }
        }

        answerCCT(ns, cct, rele[k]);
    }

    static solveMinimumPathSuminaTriangle(ns: NS, cct: CCT) {
        const n: number = cct.data.length;
        const dp: number[] = cct.data[n - 1].slice();
        for (let i = n - 2; i > -1; --i) {
            for (let j = 0; j < cct.data[i].length; ++j) {
                dp[j] = Math.min(dp[j], dp[j + 1]) + cct.data[i][j];
            }
        }

        answerCCT(ns, cct, dp[0]);
    }

    static solveUniquePathsinaGridI(ns: NS, cct: CCT) {
        const n = cct.data[0]; // Number of rows
        const m = cct.data[1]; // Number of columns
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

        answerCCT(ns, cct, currentRow[n - 1]);
    }

    static solveUniquePathsinaGridII(ns: NS, cct: CCT) {
        const obstacleGrid = [];
        obstacleGrid.length = cct.data.length;
        for (let i = 0; i < obstacleGrid.length; ++i) {
            obstacleGrid[i] = cct.data[i].slice();
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

        answerCCT(ns, cct, obstacleGrid[obstacleGrid.length - 1][obstacleGrid[0].length - 1]);
    }

    static solveSanitizeParenthesesinExpression(ns: NS, cct: CCT) {
        let left = 0;
        let right = 0;
        const res: string[] = [];

        for (let i = 0; i < cct.data.length; ++i) {
            if (cct.data[i] === "(") {
                ++left;
            } else if (cct.data[i] === ")") {
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

        dfs(0, 0, left, right, cct.data, "", res);

        answerCCT(ns, cct, res);
    }

    static solveFindAllValidMathExpressions(ns: NS, cct: CCT) {
        const num: string = cct.data[0];
        const target: number = cct.data[1];

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

        answerCCT(ns, cct, result);
    }

    static solveFindLargestPrimeFactor(ns: NS, cct: CCT) {
        let fac = 2;
        let n = cct.data;
        while (n > (fac - 1) * (fac - 1)) {
            while (n % fac === 0) {
                n = Math.round(n / fac);
            }
            ++fac;
        }

        answerCCT(ns, cct, n === 1 ? fac - 1 : n);
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
            cct.solve(ns);
        }

        await ns.sleep(60 * 1000);
    }
}

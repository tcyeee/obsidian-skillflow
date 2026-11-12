export type DiffOp = "same" | "add" | "remove";
export type DiffLine = { op: DiffOp; text: string };

// LCS-based line diff is O(n*m); past this many cells, fall back to a plain
// remove-all/add-all view so a huge note can't freeze the diff modal.
const MAX_CELLS = 400_000;

export function diffLines(before: string, after: string): DiffLine[] {
	const a = before.split("\n");
	const b = after.split("\n");
	const n = a.length;
	const m = b.length;

	if (n * m > MAX_CELLS) {
		return [
			...a.map((text): DiffLine => ({ op: "remove", text })),
			...b.map((text): DiffLine => ({ op: "add", text })),
		];
	}

	const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
		}
	}

	const result: DiffLine[] = [];
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		if (a[i] === b[j]) {
			result.push({ op: "same", text: a[i] });
			i++;
			j++;
		} else if (dp[i + 1][j] >= dp[i][j + 1]) {
			result.push({ op: "remove", text: a[i] });
			i++;
		} else {
			result.push({ op: "add", text: b[j] });
			j++;
		}
	}
	while (i < n) {
		result.push({ op: "remove", text: a[i] });
		i++;
	}
	while (j < m) {
		result.push({ op: "add", text: b[j] });
		j++;
	}
	return result;
}

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

export type CharOp = "same" | "add" | "remove";
export type CharSegment = { op: CharOp; text: string };

// Character-level LCS is O(n*m) like the line-level diff above; past this
// many cells, skip segment highlighting and treat the whole line as changed.
const MAX_CHAR_CELLS = 20_000;

export function diffChars(before: string, after: string): { left: CharSegment[]; right: CharSegment[] } {
	const a = Array.from(before);
	const b = Array.from(after);
	const n = a.length;
	const m = b.length;

	if (n * m > MAX_CHAR_CELLS) {
		return {
			left: before ? [{ op: "remove", text: before }] : [],
			right: after ? [{ op: "add", text: after }] : [],
		};
	}

	const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
		}
	}

	const leftOps: CharOp[] = [];
	const leftChars: string[] = [];
	const rightOps: CharOp[] = [];
	const rightChars: string[] = [];
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		if (a[i] === b[j]) {
			leftOps.push("same");
			leftChars.push(a[i]);
			rightOps.push("same");
			rightChars.push(b[j]);
			i++;
			j++;
		} else if (dp[i + 1][j] >= dp[i][j + 1]) {
			leftOps.push("remove");
			leftChars.push(a[i]);
			i++;
		} else {
			rightOps.push("add");
			rightChars.push(b[j]);
			j++;
		}
	}
	while (i < n) {
		leftOps.push("remove");
		leftChars.push(a[i]);
		i++;
	}
	while (j < m) {
		rightOps.push("add");
		rightChars.push(b[j]);
		j++;
	}

	return { left: mergeCharSegments(leftOps, leftChars), right: mergeCharSegments(rightOps, rightChars) };
}

function mergeCharSegments(ops: CharOp[], chars: string[]): CharSegment[] {
	const segments: CharSegment[] = [];
	for (let k = 0; k < ops.length; k++) {
		const last = segments[segments.length - 1];
		if (last && last.op === ops[k]) {
			last.text += chars[k];
		} else {
			segments.push({ op: ops[k], text: chars[k] });
		}
	}
	return segments;
}

export type SideOp = "same" | "add" | "remove" | "modify" | "blank";
export type SideCell = { op: SideOp; text: string; segments?: CharSegment[] };
export type SideRow = { left: SideCell; right: SideCell };

// Pairs the unified diffLines() stream into side-by-side rows: unchanged
// lines line up 1:1, and each contiguous remove-block/add-block (an LCS
// "changed region") is zipped index-by-index so replaced lines land on the
// same row, with char-level highlighting; leftover lines on the longer side
// fall back to pure remove/add with a blank cell opposite them.
export function diffSideBySide(before: string, after: string): SideRow[] {
	const lines = diffLines(before, after);
	const rows: SideRow[] = [];
	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		if (line.op === "same") {
			rows.push({ left: { op: "same", text: line.text }, right: { op: "same", text: line.text } });
			i++;
			continue;
		}

		const removes: string[] = [];
		while (i < lines.length && lines[i].op === "remove") {
			removes.push(lines[i].text);
			i++;
		}
		const adds: string[] = [];
		while (i < lines.length && lines[i].op === "add") {
			adds.push(lines[i].text);
			i++;
		}

		const max = Math.max(removes.length, adds.length);
		for (let k = 0; k < max; k++) {
			const l = removes[k];
			const r = adds[k];
			if (l !== undefined && r !== undefined) {
				const segments = diffChars(l, r);
				rows.push({
					left: { op: "modify", text: l, segments: segments.left },
					right: { op: "modify", text: r, segments: segments.right },
				});
			} else if (l !== undefined) {
				rows.push({ left: { op: "remove", text: l }, right: { op: "blank", text: "" } });
			} else if (r !== undefined) {
				rows.push({ left: { op: "blank", text: "" }, right: { op: "add", text: r } });
			}
		}
	}
	return rows;
}

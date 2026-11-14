import { setIcon } from "obsidian";

// Self-drawn status-bar popover, styled after the minimalism-ui
// `.minimalism-ui-status-popover` reference in
// "Obsidian交互菜单设计规范.md" (§ 第三参照): fixed width, anchored to the
// trigger icon with up/down auto-flip, click-to-open/close (no hover delay
// or safe zone — those only matter for hover-triggered panels), icon+label
// rows left-aligned and grouped by dividers (no section titles).
export type StatusBarMenuRow = {
	label: string;
	icon: string;
	onClick: () => void;
};

const POPOVER_WIDTH = 265;
const POPOVER_GAP = 6;
const VIEWPORT_MARGIN = 8;

export class StatusBarMenuManager {
	private popoverEl: HTMLElement | null = null;
	private abortController: AbortController | null = null;

	isOpen(): boolean {
		return this.popoverEl !== null;
	}

	toggle(triggerEl: HTMLElement, groups: StatusBarMenuRow[][]): void {
		if (this.popoverEl) {
			this.close();
			return;
		}
		this.open(triggerEl, groups);
	}

	close(): void {
		this.abortController?.abort();
		this.abortController = null;
		this.popoverEl?.remove();
		this.popoverEl = null;
	}

	private open(triggerEl: HTMLElement, groups: StatusBarMenuRow[][]): void {
		const doc = triggerEl.ownerDocument;
		const win = doc.defaultView ?? window;

		const popoverEl = doc.body.createDiv({ cls: "skillflow-status-popover" });
		popoverEl.setAttribute("role", "menu");

		groups.forEach((rows, groupIndex) => {
			if (rows.length === 0) return;
			if (groupIndex > 0) {
				popoverEl.createDiv({ cls: "skillflow-status-popover-divider" });
			}
			for (const row of rows) this.renderRow(popoverEl, row);
		});

		this.popoverEl = popoverEl;
		this.positionPopover(triggerEl, popoverEl, win);

		const controller = new AbortController();
		this.abortController = controller;
		const { signal } = controller;

		// Click-to-close model (not hover): a single document click outside
		// both the popover and the trigger closes it, mirroring the
		// right-click menu's "click outside / Escape" model rather than the
		// settings panel's hover-delay + safe-zone one.
		doc.addEventListener(
			"click",
			(evt: MouseEvent) => {
				const path = evt.composedPath();
				if (path.includes(popoverEl) || path.includes(triggerEl)) return;
				this.close();
			},
			{ signal, capture: true },
		);
		doc.addEventListener(
			"keydown",
			(evt: KeyboardEvent) => {
				if (evt.key !== "Escape") return;
				evt.preventDefault();
				this.close();
				triggerEl.focus();
			},
			{ signal },
		);

		popoverEl.querySelector<HTMLElement>("[tabindex='0']")?.focus();
	}

	private positionPopover(triggerEl: HTMLElement, popoverEl: HTMLElement, win: Window): void {
		const rect = triggerEl.getBoundingClientRect();

		// Width affects wrapping, so it must be fixed before height can be
		// measured; render hidden at a throwaway position to get a real height.
		popoverEl.addClass("skillflow-status-popover--measuring");
		popoverEl.setCssStyles({ width: `${POPOVER_WIDTH}px` });
		const height = popoverEl.getBoundingClientRect().height;

		const spaceAbove = rect.top - POPOVER_GAP;
		const spaceBelow = win.innerHeight - rect.bottom - POPOVER_GAP;
		const openUpward = spaceAbove >= height || spaceAbove >= spaceBelow;
		const top = openUpward ? rect.top - POPOVER_GAP - height : rect.bottom + POPOVER_GAP;

		const left = Math.min(
			Math.max(rect.right - POPOVER_WIDTH, VIEWPORT_MARGIN),
			win.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN,
		);

		popoverEl.removeClass("skillflow-status-popover--measuring");
		popoverEl.setCssStyles({
			top: `${Math.max(top, VIEWPORT_MARGIN)}px`,
			left: `${left}px`,
		});
	}

	private renderRow(parent: HTMLElement, row: StatusBarMenuRow): void {
		const rowEl = parent.createDiv({ cls: "skillflow-status-popover-row" });
		rowEl.setAttribute("role", "menuitem");
		rowEl.tabIndex = 0;

		const iconEl = rowEl.createSpan({ cls: "skillflow-status-popover-row-icon" });
		setIcon(iconEl, row.icon);
		rowEl.createSpan({ cls: "skillflow-status-popover-row-label", text: row.label });

		const activate = () => {
			this.close();
			row.onClick();
		};
		rowEl.addEventListener("click", activate);
		rowEl.addEventListener("keydown", (evt: KeyboardEvent) => {
			if (evt.key !== "Enter" && evt.key !== " ") return;
			evt.preventDefault();
			activate();
		});
	}
}

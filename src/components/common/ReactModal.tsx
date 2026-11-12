import { App, Modal } from "obsidian";
import React from "react";
import { Root, createRoot } from "react-dom/client";

type ModalProps<T extends Record<string, unknown>> = {
	app: App;
	Component: React.ComponentType<T & { onClose: () => void }>;
	props: T;
	title?: string;
};

// Mirrors obsidian-yolo's ReactModal (src/components/common/ReactModal.tsx):
// a thin Obsidian Modal that mounts a React root into its content element.
export class ReactModal<T extends Record<string, unknown>> extends Modal {
	private root: Root | null = null;
	private readonly Component: React.ComponentType<T & { onClose: () => void }>;
	private readonly props: T;
	private readonly title?: string;

	constructor({ app, Component, props, title }: ModalProps<T>) {
		super(app);
		this.Component = Component;
		this.props = props;
		this.title = title;
	}

	onOpen() {
		if (this.title) this.titleEl.setText(this.title);
		this.root = createRoot(this.contentEl);
		const componentProps = { ...this.props, onClose: () => this.close() } as T & {
			onClose: () => void;
		};
		this.root.render(<this.Component {...componentProps} />);
	}

	onClose() {
		this.root?.unmount();
		this.root = null;
		this.contentEl.empty();
	}
}

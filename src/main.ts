import { Menu, Plugin } from "obsidian";

export default class SkillFlowPlugin extends Plugin {
	async onload() {
		const statusBarItem = this.addStatusBarItem();
		statusBarItem.addClass("mod-clickable");
		statusBarItem.setText("SkillFlow");

		statusBarItem.addEventListener("click", (evt: MouseEvent) => {
			const menu = new Menu();

			menu.addItem((item) => {
				item.setTitle("Skills").setIsLabel(true);
			});
			menu.addSeparator();
			menu.addItem((item) => {
				item.setTitle("No skills yet").setDisabled(true);
			});

			menu.showAtMouseEvent(evt);
		});
	}

	onunload() {}
}

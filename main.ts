import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

// Remember to rename these classes and interfaces!

interface Settings {
	folder: string;
	recursive: boolean;
}

const DEFAULT_SETTINGS: Settings = {
	folder: "/",
	recursive: true,
};

export default class Note2Anki extends Plugin {
	settings: Settings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon("lamp-desk", "Sample Plugin", (evt: MouseEvent) => {
			new Notice("Test from the plugin");
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: Note2Anki;

	constructor(app: App, plugin: Note2Anki) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Root folder")
			.setDesc("This folder will be searched for notes to convert")
			.addText((text) =>
				text
					.setPlaceholder("Folder path")
					.setValue(this.plugin.settings.folder)
					.onChange(async (value) => {
						this.plugin.settings.folder = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Recursive")
			.setDesc(
				"If true, all subfolders will be searched for notes to convert"
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.recursive)
					.onChange(async (value) => {
						this.plugin.settings.recursive = value;
						await this.plugin.saveSettings();
					})
			);
	}
}

import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFolder,
	TFile,
	FuzzySuggestModal,
} from "obsidian";
import { parseMdDir } from "./lib/source";
import { marked } from "marked";
import * as anki from "./lib/anki";

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

		this.addRibbonIcon("lamp-desk", "Note2Anki", (evt: MouseEvent) => {
			(async () => {
				const mds = await parseMdDir(
					this.app,
					this.settings.folder,
					this.settings.recursive
				);
				new Notice(`Found ${mds.length} notes`);

				for (const md of mds) {
					const htmlContent = await marked(md.content);

					const fields: anki.BasicNoteFields = {
						Front: md.name,
						Back: htmlContent,
					};

					await anki.upsertNote(fields, md.deck);
				}
			})();
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
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
					.setDisabled(true)
			)
			.addButton((button) =>
				button.setButtonText("Browse").onClick(() => {
					const onSelect = (folder: TFolder) => {
						this.plugin.settings.folder = folder.path;
						this.plugin.saveSettings();
						this.display(); // Refresh the display to show the new folder
					};

					const modal = new FolderSuggestModal(this.app, onSelect);
					modal.open();
				})
			);

		// Keep the recursive setting as is
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

class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
	private onSelect: (
		folder: TFolder,
		evt: MouseEvent | KeyboardEvent
	) => void;

	constructor(
		app: App,
		onSelect: (folder: TFolder, evt: MouseEvent | KeyboardEvent) => void
	) {
		super(app);
		this.onSelect = onSelect;
	}

	getItems(): TFolder[] {
		return this.app.vault
			.getAllLoadedFiles()
			.filter((file) => file instanceof TFolder) as TFolder[];
	}

	getItemText(folder: TFolder): string {
		return folder.path;
	}

	onChooseItem(folder: TFolder, evt: MouseEvent | KeyboardEvent) {
		this.onSelect(folder, evt);
	}
}

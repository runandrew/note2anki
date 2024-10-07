import { marked } from "marked";
import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFolder,
	FuzzySuggestModal,
} from "obsidian";

import { AnkiConnect, BasicNoteFields } from "./lib/anki";
import { MdParser } from "./lib/source";

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
			this.processNotes(this.settings.folder, this.settings.recursive);
		});

		this.addSettingTab(new SettingTab(this.app, this));
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

	async processNotes(folder: string, recursive: boolean) {
		try {
			const mds = await new MdParser(this.app).parseMdDir(
				folder,
				recursive
			);
			new Notice(`Found ${mds.length} notes`);

			const anki = new AnkiConnect();

			for (const md of mds) {
				const htmlContent = await marked(md.content);

				const fields: BasicNoteFields = {
					Front: md.name,
					Back: htmlContent,
				};

				await anki.upsertNote(fields, md.deck);
			}
		} catch (e) {
			new Notice(
				`Note2Anki error: ${e instanceof Error ? e.message : String(e)}`
			);
		}
	}
}

class SettingTab extends PluginSettingTab {
	plugin: Note2Anki;

	constructor(app: App, plugin: Note2Anki) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Note2Anki" });

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

		new Setting(containerEl)
			.setName("Include Subfolders")
			.setDesc(
				"If enabled, all subfolders will be searched for notes to convert"
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.recursive)
					.onChange(async (value) => {
						this.plugin.settings.recursive = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Request AnkiConnect Permission")
			.setDesc("Request permission to use AnkiConnect")
			.addButton((button) =>
				button.setButtonText("Request Permission").onClick(async () => {
					const anki = new AnkiConnect();
					try {
						await anki.requestPermission();
						new Notice("Permission granted");
					} catch (error) {
						new Notice(
							`Failed to request permission: ${
								error instanceof Error
									? error.message
									: String(error)
							}`
						);
					}
				})
			);

		new Setting(containerEl)
			.setName("Test AnkiConnect Connection")
			.setDesc("Test that the AnkiConnect server is available")
			.addButton((button) =>
				button.setButtonText("Test Connection").onClick(async () => {
					try {
						const anki = new AnkiConnect();
						await anki.testConnection();
						new Notice("Successfully connected to AnkiConnect!");
					} catch (error) {
						new Notice(
							`Failed to connect to AnkiConnect: ${
								error instanceof Error
									? error.message
									: String(error)
							}`
						);
					}
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

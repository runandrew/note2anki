import { marked } from "marked";
import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFolder,
	FuzzySuggestModal,
	TAbstractFile,
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

		this.addCommand({
			id: "run-note2anki",
			name: "Process notes to Anki",
			callback: () => {
				this.processNotes(
					this.settings.folder,
					this.settings.recursive
				);
			},
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
			let unchanged = 0;

			for (const md of mds) {
				const htmlContent = await marked(md.content);

				const fields: BasicNoteFields = {
					Front: md.name,
					Back: htmlContent,
				};

				const result = await anki.upsertNote(fields, md.deck);

				if (
					result.action === "created" ||
					result.action === "updated"
				) {
					new Notice(`Note "${md.name}" was ${result.action}`);
				} else {
					unchanged++;
				}
			}

			if (unchanged > 0) {
				new Notice(`${unchanged} notes were unchanged`);
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

		new Setting(containerEl).setName("Setup").setHeading();

		new Setting(containerEl)
			.setName("Request AnkiConnect permission")
			.setDesc("Request permission to use AnkiConnect")
			.addButton((button) =>
				button.setButtonText("Request permission").onClick(async () => {
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
			.setName("Test AnkiConnect connection")
			.setDesc("Test that the AnkiConnect server is available")
			.addButton((button) =>
				button.setButtonText("Test connection").onClick(async () => {
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

		new Setting(containerEl).setName("Advanced").setHeading();

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
			.setName("Include subfolders")
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
		const folders: TFolder[] = [];
		this.app.vault.getAllLoadedFiles().forEach((f: TAbstractFile) => {
			if (f instanceof TFolder) {
				folders.push(f);
			}
		});
		return folders;
	}

	getItemText(folder: TFolder): string {
		return folder.path;
	}

	onChooseItem(folder: TFolder, evt: MouseEvent | KeyboardEvent) {
		this.onSelect(folder, evt);
	}
}

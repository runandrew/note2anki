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

import { AnkiConnect } from "./lib/anki";
import { printErr } from "./lib/errors";
import { ObsidianFileRepository } from "./lib/files";
import { NoteProcessor } from "./lib/processor";

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
	private noteProcessingService: NoteProcessor;

	async onload() {
		await this.loadSettings();
		this.noteProcessingService = new NoteProcessor(
			new ObsidianFileRepository(this.app)
		);

		this.addRibbonIcon("lamp-desk", "Note2Anki", () => {
			this.processNotes();
		});

		this.addCommand({
			id: "run-note2anki",
			name: "Process Notes to Anki",
			callback: () => {
				this.processNotes();
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

	private async processNotes() {
		new Notice("Processing notes...");
		try {
			const result = await this.noteProcessingService.processNotes(
				this.settings.folder,
				this.settings.recursive
			);

			new Notice(`Found ${result.totalNotes} notes`);

			const created = result.noteResults.filter(
				(nr) => nr.action === "created"
			);
			const updated = result.noteResults.filter(
				(nr) => nr.action === "updated"
			);
			const unchanged = result.noteResults.filter(
				(nr) => nr.action === "unchanged"
			);

			if (created.length > 0) {
				new Notice(
					created
						.map((r) => `Note "${r.name}" was created`)
						.join("\n"),
					5000
				);
			}

			if (updated.length > 0) {
				new Notice(
					updated
						.map((r) => `Note "${r.name}" was updated`)
						.join("\n"),
					5000
				);
			}

			if (unchanged.length > 0) {
				new Notice(`${unchanged.length} notes were unchanged`, 5000);
			}

			result.errors.forEach((error) => {
				new Notice(`Error: ${error}`, 5000);
			});

			if (result.errors.length === 0) {
				new Notice("Note processing completed successfully", 5000);
			} else {
				new Notice(
					`Note processing completed with ${result.errors.length} errors`,
					5000
				);
			}
		} catch (e) {
			new Notice(`Error processing notes: ${printErr(e)}`, 5000);
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

		containerEl.createEl("h3", { text: "Setup" });

		new Setting(containerEl)
			.setName("Request AnkiConnect Permission")
			.setDesc("Request permission to use AnkiConnect")
			.addButton((button) =>
				button.setButtonText("Request Permission").onClick(async () => {
					const anki = new AnkiConnect();
					try {
						await anki.requestPermission();
						new Notice("Permission granted");
					} catch (e) {
						new Notice(
							`Failed to request permission: ${printErr(e)}`
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
					} catch (e) {
						new Notice(
							`Failed to connect to AnkiConnect: ${printErr(e)}`
						);
					}
				})
			);

		containerEl.createEl("h3", { text: "Settings" });

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

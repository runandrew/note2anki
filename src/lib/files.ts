import { App, TFile, TFolder } from "obsidian";

export interface File {
	type: "file";
	path: string;
	name: string;
	getContent: () => Promise<string>;
}

export interface Folder {
	type: "folder";
	path: string;
	getChildren: () => Promise<AbstractFile[]>;
}

export type AbstractFile = File | Folder;

export interface FileRepository {
	getFolder: (path: string) => Promise<Folder | null>;
}

export class ObsidianFileRepository implements FileRepository {
	constructor(private readonly app: App) {}

	async getFolder(path: string): Promise<Folder> {
		const folder = this.app.vault.getFolderByPath(path);
		if (!folder) {
			throw new Error("Folder not found");
		}

		return new ObsidianFolder(this.app, folder);
	}
}

export class ObsidianFile implements File {
	readonly type = "file";

	constructor(private readonly app: App, private readonly file: TFile) {}

	get path(): string {
		return this.file.path;
	}

	get name(): string {
		return this.file.name;
	}

	async getContent(): Promise<string> {
		return this.app.vault.cachedRead(this.file);
	}
}

export class ObsidianFolder implements Folder {
	readonly type = "folder";

	constructor(private readonly app: App, private readonly folder: TFolder) {}

	get path(): string {
		return this.folder.path;
	}

	async getChildren(): Promise<AbstractFile[]> {
		return this.folder.children.map((f) => {
			if (f instanceof TFile) {
				return new ObsidianFile(this.app, f);
			} else if (f instanceof TFolder) {
				return new ObsidianFolder(this.app, f);
			}
			throw new Error("Unknown file type");
		});
	}
}

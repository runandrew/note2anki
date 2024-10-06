import { App, TFolder, TFile } from "obsidian";
import matter from "gray-matter";
import assert from "assert";

interface Md {
	name: string;
	deck: string;
	content: string;
}

export class MdParser {
	app: App;

	constructor(app: App) {
		this.app = app;
	}

	async parseMd(file: TFile): Promise<Md> {
		const fileContents = await this.app.vault.cachedRead(file);
		const { data, content } = matter(fileContents);

		const deck = data["anki-deck"];
		const name = file.name.replace(/\.md$/, "");

		assert(
			typeof deck === "string",
			"anki-deck file property is not defined"
		);
		assert(deck !== "", "anki-deck file property is empty");

		return {
			name,
			deck,
			content,
		};
	}

	private async isValidMdFile(file: TFile): Promise<boolean> {
		if (!file.path.endsWith(".md")) {
			return false;
		}

		const fileContents = await this.app.vault.cachedRead(file);
		const { data } = matter(fileContents);
		return (
			typeof data["anki-deck"] === "string" && data["anki-deck"] !== ""
		);
	}

	async parseMdDir(path: string, recursive: boolean = true): Promise<Md[]> {
		const folder = this.app.vault.getFolderByPath(path);
		if (!folder) {
			throw new Error("Folder not found");
		}
		const files = folder.children;

		const out: Md[] = [];

		for (const file of files) {
			if (file instanceof TFolder) {
				if (recursive) {
					out.push(...(await this.parseMdDir(file.path, true)));
				}
			} else if (
				file instanceof TFile &&
				(await this.isValidMdFile(file))
			) {
				out.push(await this.parseMd(file));
			}
		}

		return out;
	}
}

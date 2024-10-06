import { App, TFolder, TFile } from "obsidian";
import matter from "gray-matter";
import assert from "assert";

interface Md {
	name: string;
	deck: string;
	content: string;
}

async function parseMd(app: App, file: TFile): Promise<Md> {
	const fileContents = await app.vault.cachedRead(file);
	const { data, content } = matter(fileContents);

	const deck = data["anki-deck"];
	const name = file.name.replace(/\.md$/, "");

	assert(typeof deck === "string", "anki-deck file property is not defined");
	assert(deck !== "", "anki-deck file property is empty");

	return {
		name,
		deck,
		content,
	};
}

async function isValidMdFile(app: App, file: TFile): Promise<boolean> {
	if (!file.path.endsWith(".md")) {
		return false;
	}

	const fileContents = await app.vault.cachedRead(file);
	const { data } = matter(fileContents);
	return typeof data["anki-deck"] === "string" && data["anki-deck"] !== "";
}

export async function parseMdDir(
	app: App,
	path: string,
	recursive: boolean = true
): Promise<Md[]> {
	const folder = app.vault.getFolderByPath(path);
	if (!folder) {
		throw new Error("Folder not found");
	}
	const files = folder.children;

	const out: Md[] = [];

	for (const file of files) {
		if (file instanceof TFolder) {
			if (recursive) {
				out.push(...(await parseMdDir(app, file.path, true)));
			}
		} else if (file instanceof TFile && (await isValidMdFile(app, file))) {
			out.push(await parseMd(app, file));
		}
	}

	return out;
}

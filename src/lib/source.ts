import assert from "assert";

import matter from "gray-matter";

import { FileRepository, File } from "./files";

interface Md {
	name: string;
	deck: string;
	content: string;
}

export class MdParser {
	constructor(private readonly fileRepository: FileRepository) {}

	async parseMd(file: File): Promise<Md> {
		const fileContents = await file.getContent();
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

	private async isValidMdFile(file: File): Promise<boolean> {
		if (!file.path.endsWith(".md")) {
			return false;
		}

		const fileContents = await file.getContent();
		const { data } = matter(fileContents);
		return (
			typeof data["anki-deck"] === "string" && data["anki-deck"] !== ""
		);
	}

	async parseMdDir(path: string, recursive = true): Promise<Md[]> {
		const folder = await this.fileRepository.getFolder(path);
		if (!folder) {
			throw new Error("Folder not found");
		}
		const files = await folder.getChildren();

		const out: Md[] = [];

		for (const file of files) {
			if (file.type === "folder") {
				if (recursive) {
					out.push(...(await this.parseMdDir(file.path, true)));
				}
			} else if (await this.isValidMdFile(file)) {
				out.push(await this.parseMd(file));
			}
		}

		return out;
	}
}

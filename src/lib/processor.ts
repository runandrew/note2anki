import { marked } from "marked";

import { AnkiConnect, BasicNoteFields } from "./anki";
import { printErr } from "./errors";
import { FileRepository } from "./files";
import { MdParser } from "./source";

export interface NoteResult {
	name: string;
	action: "created" | "updated" | "unchanged";
}

export interface ProcessNotesResult {
	totalNotes: number;
	noteResults: NoteResult[];
	errors: string[];
}

export class NoteProcessor {
	constructor(private fileRepository: FileRepository) {}

	async processNotes(
		folder: string,
		recursive: boolean
	): Promise<ProcessNotesResult> {
		const result: ProcessNotesResult = {
			totalNotes: 0,
			noteResults: [],
			errors: [],
		};

		try {
			const mds = await new MdParser(this.fileRepository).parseMdDir(
				folder,
				recursive
			);
			result.totalNotes = mds.length;

			const anki = new AnkiConnect();

			for (const md of mds) {
				try {
					const htmlContent = await marked(md.content);
					const fields: BasicNoteFields = {
						Front: md.name,
						Back: htmlContent,
					};

					const noteResult = await anki.upsertNote(fields, md.deck);
					result.noteResults.push({
						name: md.name,
						action: noteResult.action,
					});
				} catch (e) {
					result.errors.push(
						`Error processing note "${md.name}": ${printErr(e)}`
					);
				}
			}
		} catch (e) {
			result.errors.push(`General error: ${printErr(e)}`);
		}

		return result;
	}
}

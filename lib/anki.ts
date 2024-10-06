import isEqual from "lodash/isEqual";
import { z } from "zod";

export interface BasicNote {
	id: number;
	modelName: "Basic";
	fields: BasicNoteFields;
}

export type BasicNoteFields = {
	Front: string;
	Back: string;
};

export class AnkiConnect {
	private static readonly AddNoteResultSchema = z.number();
	private static readonly UpdateNoteResultSchema = z.null();
	private static readonly NotesInfoResultSchema = z.array(
		z.object({
			noteId: z.number(),
			modelName: z.literal("Basic"),
			fields: z.object({
				Front: z.object({
					value: z.string(),
					order: z.number(),
				}),
				Back: z.object({
					value: z.string(),
					order: z.number(),
				}),
			}),
		})
	);
	private static readonly FindNotesResultSchema = z.array(z.number());
	private static readonly AnkiConnectResponseSchema = z.object({
		result: z.unknown(),
		error: z.union([z.string(), z.null()]),
	});

	private async ankiConnect(
		action: string,
		params: unknown
	): Promise<unknown> {
		const response = await fetch("http://localhost:8765", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				action,
				version: 6,
				params,
			}),
		});

		const data = AnkiConnect.AnkiConnectResponseSchema.parse(
			await response.json()
		);
		if (data.error) {
			throw new Error(`Anki Connect: ${data.error}`);
		}

		return data.result;
	}

	async createNote(fields: BasicNoteFields, deck: string): Promise<number> {
		console.log(
			`Anki Connect: Creating note "${fields.Front}" in deck "${deck}"`
		);
		const result = await this.ankiConnect("addNote", {
			note: {
				deckName: deck,
				modelName: "Basic",
				fields,
				options: {
					allowDuplicate: false,
					duplicateScope: "deck",
				},
			},
		});
		return AnkiConnect.AddNoteResultSchema.parse(result);
	}

	async updateNote(
		id: number,
		fields: BasicNoteFields,
		deck: string
	): Promise<void> {
		console.log(
			`Anki Connect: Updating note "${fields.Front}" in deck "${deck}"`
		);
		const result = await this.ankiConnect("updateNote", {
			note: {
				id: id,
				fields,
				deckName: deck,
			},
		});
		AnkiConnect.UpdateNoteResultSchema.parse(result);
	}

	async upsertNote(fields: BasicNoteFields, deck: string): Promise<void> {
		console.log(`Upserting note: "${fields.Front}"`);
		const existingNote = await this.findNoteByQuery({
			front: fields.Front,
			deck,
			note: "Basic",
		});
		if (existingNote) {
			if (isEqual(existingNote.fields, fields)) {
				console.log(`Note "${fields.Front}" has not changed`);
				return;
			}
			await this.updateNote(existingNote.id, fields, deck);
			console.log(`Updated existing note: "${fields.Front}"`);
		} else {
			await this.createNote(fields, deck);
			console.log(`Created new note: "${fields.Front}"`);
		}
	}

	async findNote(id: number): Promise<BasicNote | null> {
		console.log(`Anki Connect: Finding note with ID "${id}"`);
		const result = await this.ankiConnect("notesInfo", { notes: [id] });
		const validatedResult = AnkiConnect.NotesInfoResultSchema.parse(result);
		if (validatedResult && validatedResult.length > 0) {
			const noteInfo = validatedResult[0];
			const noteInfoFields = noteInfo.fields;
			const fields = {
				Front: noteInfoFields.Front.value,
				Back: noteInfoFields.Back.value,
			};

			return {
				id: noteInfo.noteId,
				modelName: noteInfo.modelName,
				fields,
			};
		}
		return null;
	}

	async findNoteByQuery(
		query: Record<string, string>
	): Promise<BasicNote | null> {
		const queryString = Object.entries(query)
			.map(([key, value]) => `${key}:"${value}"`)
			.join(" ");
		console.log(`Anki Connect: Finding note with query: ${queryString}`);
		const result = await this.ankiConnect("findNotes", {
			query: queryString,
		});
		const noteIds = AnkiConnect.FindNotesResultSchema.parse(result);
		if (noteIds && noteIds.length > 0) {
			return await this.findNote(noteIds[0]);
		}
		return null;
	}
}

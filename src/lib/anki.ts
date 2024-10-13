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

export type UpsertNoteResult = {
	action: "created" | "updated" | "unchanged";
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
	private static readonly RequestPermissionResultSchema = z.object({
		permission: z.union([z.literal("granted"), z.literal("denied")]),
		requireApiKey: z.boolean().optional(),
	});
	private static readonly AnkiConnectResponseSchema = z.object({
		result: z.unknown(),
		error: z.union([z.string(), z.null()]),
	});

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

	async upsertNote(
		fields: BasicNoteFields,
		deck: string
	): Promise<UpsertNoteResult> {
		console.log(`Upserting note: "${fields.Front}"`);
		const existingNote = await this.findNoteByQuery({
			front: fields.Front,
			deck,
			note: "Basic",
		});
		if (existingNote) {
			if (isEqual(existingNote.fields, fields)) {
				console.log(`Note "${fields.Front}" has not changed`);
				return { action: "unchanged" };
			}
			await this.updateNote(existingNote.id, fields, deck);
			console.log(`Updated existing note: "${fields.Front}"`);
			return { action: "updated" };
		} else {
			await this.createNote(fields, deck);
			console.log(`Created new note: "${fields.Front}"`);
			return { action: "created" };
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

	async testConnection(): Promise<void> {
		try {
			const response = await this.ankiConnect("version", {});
			if (response === null || response === undefined) {
				throw new Error("No response from AnkiConnect");
			}
		} catch (error) {
			throw new Error(`AnkiConnect connection failed: ${error.message}`);
		}
	}

	async requestPermission(): Promise<void> {
		const response = await this.ankiConnect("requestPermission", {});
		const validatedResponse =
			AnkiConnect.RequestPermissionResultSchema.parse(response);
		if (validatedResponse.permission === "denied") {
			throw new Error("Permission denied");
		}
		if (validatedResponse.requireApiKey) {
			throw new Error("API key required");
		}
	}

	private async ankiConnect(
		action: string,
		params: unknown
	): Promise<unknown> {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.addEventListener("error", () =>
				reject("failed to issue request")
			);
			xhr.addEventListener("load", () => {
				try {
					const response = JSON.parse(xhr.responseText);
					const data =
						AnkiConnect.AnkiConnectResponseSchema.parse(response);
					if (data.error) {
						throw new Error(`Anki Connect: ${data.error}`);
					}
					resolve(data.result);
				} catch (e) {
					reject(e);
				}
			});

			xhr.open("POST", "http://127.0.0.1:8765");
			xhr.send(JSON.stringify({ action, version: 6, params }));
		});
	}
}

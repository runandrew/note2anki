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

const AddNoteResultSchema = z.number();

const UpdateNoteResultSchema = z.null();

const NotesInfoResultSchema = z.array(
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

const FindNotesResultSchema = z.array(z.number());

const AnkiConnectResponseSchema = z.object({
	result: z.unknown(),
	error: z.union([z.string(), z.null()]),
});

async function ankiConnect(action: string, params: unknown): Promise<unknown> {
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

	const data = AnkiConnectResponseSchema.parse(await response.json());
	if (data.error) {
		throw new Error(`Anki Connect: ${data.error}`);
	}

	return data.result;
}

export async function createNote(
	fields: BasicNoteFields,
	deck: string
): Promise<number> {
	console.log(
		`Anki Connect: Creating note "${fields.Front}" in deck "${deck}"`
	);
	const result = await ankiConnect("addNote", {
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
	return AddNoteResultSchema.parse(result);
}

export async function updateNote(
	id: number,
	fields: BasicNoteFields,
	deck: string
): Promise<void> {
	console.log(
		`Anki Connect: Updating note "${fields.Front}" in deck "${deck}"`
	);
	const result = await ankiConnect("updateNote", {
		note: {
			id: id,
			fields,
			deckName: deck,
		},
	});
	UpdateNoteResultSchema.parse(result);
}

export async function upsertNote(
	fields: BasicNoteFields,
	deck: string
): Promise<void> {
	console.log(`Upserting note: "${fields.Front}"`);
	const existingNote = await findNoteByQuery({
		front: fields.Front,
		deck,
		note: "Basic",
	});
	if (existingNote) {
		if (isEqual(existingNote.fields, fields)) {
			console.log(`Note "${fields.Front}" has not changed`);
			return;
		}
		await updateNote(existingNote.id, fields, deck);
		console.log(`Updated existing note: "${fields.Front}"`);
	} else {
		await createNote(fields, deck);
		console.log(`Created new note: "${fields.Front}"`);
	}
}

export async function findNote(id: number): Promise<BasicNote | null> {
	console.log(`Anki Connect: Finding note with ID "${id}"`);
	const result = await ankiConnect("notesInfo", { notes: [id] });
	const validatedResult = NotesInfoResultSchema.parse(result);
	if (validatedResult && validatedResult.length > 0) {
		const noteInfo = validatedResult[0];
		// The fields object comes back as a map of { value: string; order: number }
		// We need to convert it back to a simple key-value pair, removing the order field
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

export async function findNoteByQuery(
	query: Record<string, string>
): Promise<BasicNote | null> {
	const queryString = Object.entries(query)
		.map(([key, value]) => `${key}:"${value}"`)
		.join(" ");
	console.log(`Anki Connect: Finding note with query: ${queryString}`);
	const result = await ankiConnect("findNotes", { query: queryString });
	const noteIds = FindNotesResultSchema.parse(result);
	if (noteIds && noteIds.length > 0) {
		return await findNote(noteIds[0]);
	}
	return null;
}

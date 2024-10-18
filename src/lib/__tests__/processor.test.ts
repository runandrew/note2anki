import { marked } from "marked";

import { AnkiConnect } from "../anki";
import { FileRepository } from "../files";
import { NoteProcessor, ProcessNotesResult } from "../processor";
import { MdParser } from "../source";

jest.mock("../anki");
jest.mock("../files");
jest.mock("../source");

describe("NoteProcessor", () => {
	let noteProcessor: NoteProcessor;
	let mockFileRepository: jest.Mocked<FileRepository>;

	beforeEach(() => {
		mockFileRepository = {
			getFolder: jest.fn(),
		};
		noteProcessor = new NoteProcessor(mockFileRepository);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("processNotes", () => {
		it("should process notes successfully", async () => {
			const mockMdParser = {
				parseMdDir: jest.fn().mockResolvedValue([
					{
						name: "Note 1",
						content: "# Note 1\nContent 1",
						deck: "Deck 1",
					},
					{
						name: "Note 2",
						content: "# Note 2\nContent 2",
						deck: "Deck 2",
					},
				]),
			};
			(MdParser as jest.Mock).mockImplementation(() => mockMdParser);

			const mockAnkiConnect = {
				upsertNote: jest
					.fn()
					.mockResolvedValueOnce({ action: "created" })
					.mockResolvedValueOnce({ action: "updated" }),
			};
			(
				AnkiConnect as jest.MockedClass<typeof AnkiConnect>
			).mockImplementation(
				() => mockAnkiConnect as unknown as AnkiConnect
			);

			const result: ProcessNotesResult = await noteProcessor.processNotes(
				"testFolder",
				true
			);

			expect(result).toEqual({
				totalNotes: 2,
				noteResults: [
					{ name: "Note 1", action: "created" },
					{ name: "Note 2", action: "updated" },
				],
				errors: [],
			});

			expect(mockMdParser.parseMdDir).toHaveBeenCalledWith(
				"testFolder",
				true
			);
			expect(mockAnkiConnect.upsertNote).toHaveBeenCalledTimes(2);

			expect(mockAnkiConnect.upsertNote).toHaveBeenNthCalledWith(
				1,
				{
					Front: "Note 1",
					Back: marked("# Note 1\nContent 1"),
				},
				"Deck 1"
			);
			expect(mockAnkiConnect.upsertNote).toHaveBeenNthCalledWith(
				2,
				{
					Front: "Note 2",
					Back: marked("# Note 2\nContent 2"),
				},
				"Deck 2"
			);
		});

		it("should handle errors during note processing", async () => {
			const mockMdParser = {
				parseMdDir: jest.fn().mockResolvedValue([
					{
						name: "Note 1",
						content: "# Note 1\nContent 1",
						deck: "Deck 1",
					},
					{
						name: "Note 2",
						content: "# Note 2\nContent 2",
						deck: "Deck 2",
					},
				]),
			};
			(MdParser as jest.Mock).mockImplementation(() => mockMdParser);

			const mockAnkiConnect = {
				upsertNote: jest
					.fn()
					.mockResolvedValueOnce({ action: "created" })
					.mockRejectedValueOnce(new Error("Anki error")),
			};
			(
				AnkiConnect as jest.MockedClass<typeof AnkiConnect>
			).mockImplementation(
				() => mockAnkiConnect as unknown as AnkiConnect
			);

			const result: ProcessNotesResult = await noteProcessor.processNotes(
				"testFolder",
				false
			);

			expect(result).toEqual({
				totalNotes: 2,
				noteResults: [{ name: "Note 1", action: "created" }],
				errors: ['Error processing note "Note 2": Anki error'],
			});

			expect(mockMdParser.parseMdDir).toHaveBeenCalledWith(
				"testFolder",
				false
			);
			expect(mockAnkiConnect.upsertNote).toHaveBeenCalledTimes(2);

			expect(mockAnkiConnect.upsertNote).toHaveBeenNthCalledWith(
				1,
				{
					Front: "Note 1",
					Back: marked("# Note 1\nContent 1"),
				},
				"Deck 1"
			);
			expect(mockAnkiConnect.upsertNote).toHaveBeenNthCalledWith(
				2,
				{
					Front: "Note 2",
					Back: marked("# Note 2\nContent 2"),
				},
				"Deck 2"
			);
		});
	});
});

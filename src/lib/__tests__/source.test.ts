import { FileRepository } from "../files";
import { MdParser } from "../source";

import { TestFile, TestFolder } from "./files";

describe("MdParser", () => {
	let mdParser: MdParser;
	let mockFileRepository: jest.Mocked<FileRepository>;

	beforeEach(() => {
		mockFileRepository = {
			getFolder: jest.fn(),
		} as jest.Mocked<FileRepository>;
		mdParser = new MdParser(mockFileRepository);
	});

	describe("parseMd", () => {
		it("should parse a valid markdown file", async () => {
			const file = new TestFile(
				"test.md",
				"---\nanki-deck: Test Deck\n---\nTest content"
			);

			const result = await mdParser.parseMd(file);

			expect(result).toEqual({
				name: "test",
				deck: "Test Deck",
				content: "Test content",
			});
		});

		it("should throw an error if anki-deck is not defined", async () => {
			const file = new TestFile("test.md", "---\n---\nTest content");

			await expect(mdParser.parseMd(file)).rejects.toThrow(
				"anki-deck file property is not defined"
			);
		});
	});

	describe("parseMdDir", () => {
		it("should parse multiple markdown files in a directory", async () => {
			const fileA = new TestFile(
				"a.md",
				"---\nanki-deck: Test Deck\n---\nTest content A"
			);
			const fileB = new TestFile(
				"b.md",
				"---\nanki-deck: Test Deck\n---\nTest content B"
			);
			const folder = new TestFolder("root");
			folder.addChildren([fileA, fileB]);

			mockFileRepository.getFolder.mockResolvedValueOnce(folder);

			const res = await mdParser.parseMdDir("/");
			expect(res).toEqual([
				{
					name: "a",
					deck: "Test Deck",
					content: "Test content A",
				},
				{
					name: "b",
					deck: "Test Deck",
					content: "Test content B",
				},
			]);
		});

		it("skips files that are not for anki", async () => {
			const fileA = new TestFile(
				"a.md",
				"---\nanki-deck: Test Deck\n---\nTest content A"
			);
			// fileB is invalid because it does not have the `anki-deck` header
			const fileB = new TestFile("b.md", "---\n---\nTest content");
			// fileC is invalid because it's not an .md file
			const fileC = new TestFile(
				"c.txt",
				"---\nanki-deck: Test Deck\n---\nTest content A"
			);

			const folder = new TestFolder("root");
			folder.addChildren([fileA, fileB, fileC]);

			mockFileRepository.getFolder.mockResolvedValueOnce(folder);

			const res = await mdParser.parseMdDir("/");
			expect(res).toEqual([
				{
					name: "a",
					deck: "Test Deck",
					content: "Test content A",
				},
			]);
		});

		it("should recursively parse files in a directory by default", async () => {
			const fileA = new TestFile(
				"a.md",
				"---\nanki-deck: Test Deck\n---\nTest content A"
			);
			const subFolder = new TestFolder("sub");
			subFolder.addChildren([fileA]);

			const fileB = new TestFile(
				"b.md",
				"---\nanki-deck: Test Deck\n---\nTest content B"
			);
			const folder = new TestFolder("root");
			folder.addChildren([fileB, subFolder]);

			mockFileRepository.getFolder.mockImplementation((p) => {
				if (p === "/root") return Promise.resolve(folder);
				else if (p === "/root/sub") return Promise.resolve(subFolder);
				throw new Error("invalid folder");
			});

			const res = await mdParser.parseMdDir("/root");

			expect(res).toEqual([
				{
					name: "b",
					deck: "Test Deck",
					content: "Test content B",
				},
				{
					name: "a",
					deck: "Test Deck",
					content: "Test content A",
				},
			]);
		});

		it("should not recursively parse files in a directory if indicated", async () => {
			const fileA = new TestFile(
				"a.md",
				"---\nanki-deck: Test Deck\n---\nTest content A"
			);
			const subFolder = new TestFolder("sub");
			subFolder.addChildren([fileA]);

			const fileB = new TestFile(
				"b.md",
				"---\nanki-deck: Test Deck\n---\nTest content B"
			);
			const folder = new TestFolder("root");
			folder.addChildren([fileB, subFolder]);

			mockFileRepository.getFolder.mockImplementation((p) => {
				if (p === "/root") return Promise.resolve(folder);
				else if (p === "/root/sub") return Promise.resolve(subFolder);
				throw new Error("invalid folder");
			});

			const res = await mdParser.parseMdDir("/root", false);

			expect(res).toEqual([
				{
					name: "b",
					deck: "Test Deck",
					content: "Test content B",
				},
			]);
		});

		it("should throw an error if the folder is not found", async () => {
			mockFileRepository.getFolder.mockResolvedValue(null);
			await expect(
				mdParser.parseMdDir("/non/existent/folder")
			).rejects.toThrow("Folder not found");
		});
	});
});

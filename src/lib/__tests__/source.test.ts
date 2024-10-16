import { FileRepository, File, Folder } from "../files";
import { MdParser } from "../source";

// Mock the FileRepository and its dependencies
jest.mock("../files");

describe("MdParser", () => {
	let mdParser: MdParser;
	let mockFileRepository: jest.Mocked<FileRepository>;

	beforeEach(() => {
		mockFileRepository = {
			getFolder: jest.fn(),
			getFile: jest.fn(),
		} as jest.Mocked<FileRepository>;
		mdParser = new MdParser(mockFileRepository);
	});

	describe("parseMd", () => {
		it("should parse a valid markdown file", async () => {
			const mockFile: jest.Mocked<File> = {
				name: "test.md",
				path: "/path/to/test.md",
				getContent: jest
					.fn()
					.mockResolvedValue(
						"---\nanki-deck: Test Deck\n---\nTest content"
					),
			} as any;

			const result = await mdParser.parseMd(mockFile);

			expect(result).toEqual({
				name: "test",
				deck: "Test Deck",
				content: "Test content",
			});
		});

		it("should throw an error if anki-deck is not defined", async () => {
			const mockFile: jest.Mocked<File> = {
				name: "test.md",
				path: "/path/to/test.md",
				getContent: jest
					.fn()
					.mockResolvedValue("---\n---\nTest content"),
			} as any;

			await expect(mdParser.parseMd(mockFile)).rejects.toThrow(
				"anki-deck file property is not defined"
			);
		});
	});

	describe("parseMdDir", () => {
		// 	it("should parse multiple markdown files in a directory", async () => {
		// 		const mockFolder: jest.Mocked<Folder> = {
		// 			path: "/path/to/folder",
		// 			getChildren: jest.fn().mockResolvedValue([
		// 				{
		// 					type: "file",
		// 					name: "test1.md",
		// 					path: "/path/to/folder/test1.md",
		// 				},
		// 				{
		// 					type: "file",
		// 					name: "test2.md",
		// 					path: "/path/to/folder/test2.md",
		// 				},
		// 				{
		// 					type: "file",
		// 					name: "invalid.txt",
		// 					path: "/path/to/folder/invalid.txt",
		// 				},
		// 			]),
		// 		} as any;
		// 		mockFileRepository.getFolder.mockResolvedValue(mockFolder);
		// 		const mockFile1: jest.Mocked<File> = {
		// 			name: "test1.md",
		// 			path: "/path/to/folder/test1.md",
		// 			getContent: jest
		// 				.fn()
		// 				.mockResolvedValue(
		// 					"---\nanki-deck: Deck 1\n---\nContent 1"
		// 				),
		// 		} as any;
		// 		const mockFile2: jest.Mocked<File> = {
		// 			name: "test2.md",
		// 			path: "/path/to/folder/test2.md",
		// 			getContent: jest
		// 				.fn()
		// 				.mockResolvedValue(
		// 					"---\nanki-deck: Deck 2\n---\nContent 2"
		// 				),
		// 		} as any;
		// 		mockFileRepository.getFile.mockImplementation((path: string) => {
		// 			if (path === "/path/to/folder/test1.md")
		// 				return Promise.resolve(mockFile1);
		// 			if (path === "/path/to/folder/test2.md")
		// 				return Promise.resolve(mockFile2);
		// 			return Promise.resolve(null);
		// 		});
		// 		const result = await mdParser.parseMdDir("/path/to/folder");
		// 		expect(result).toEqual([
		// 			{ name: "test1", deck: "Deck 1", content: "Content 1" },
		// 			{ name: "test2", deck: "Deck 2", content: "Content 2" },
		// 		]);
		// 	});
		// 	it("should throw an error if the folder is not found", async () => {
		// 		mockFileRepository.getFolder.mockResolvedValue(null);
		// 		await expect(
		// 			mdParser.parseMdDir("/non/existent/folder")
		// 		).rejects.toThrow("Folder not found");
		// 	});
		// 	it("should parse files recursively when recursive flag is true", async () => {
		// 		const mockRootFolder: jest.Mocked<Folder> = {
		// 			path: "/path/to/root",
		// 			getChildren: jest.fn().mockResolvedValue([
		// 				{
		// 					type: "file",
		// 					name: "test1.md",
		// 					path: "/path/to/root/test1.md",
		// 				},
		// 				{
		// 					type: "folder",
		// 					name: "subfolder",
		// 					path: "/path/to/root/subfolder",
		// 				},
		// 			]),
		// 		} as any;
		// 		const mockSubFolder: jest.Mocked<Folder> = {
		// 			path: "/path/to/root/subfolder",
		// 			getChildren: jest.fn().mockResolvedValue([
		// 				{
		// 					type: "file",
		// 					name: "test2.md",
		// 					path: "/path/to/root/subfolder/test2.md",
		// 				},
		// 			]),
		// 		} as any;
		// 		mockFileRepository.getFolder.mockImplementation((path: string) => {
		// 			if (path === "/path/to/root")
		// 				return Promise.resolve(mockRootFolder);
		// 			if (path === "/path/to/root/subfolder")
		// 				return Promise.resolve(mockSubFolder);
		// 			return Promise.resolve(null);
		// 		});
		// 		const mockFile1: jest.Mocked<File> = {
		// 			name: "test1.md",
		// 			path: "/path/to/root/test1.md",
		// 			getContent: jest
		// 				.fn()
		// 				.mockResolvedValue(
		// 					"---\nanki-deck: Deck 1\n---\nContent 1"
		// 				),
		// 		} as any;
		// 		const mockFile2: jest.Mocked<File> = {
		// 			name: "test2.md",
		// 			path: "/path/to/root/subfolder/test2.md",
		// 			getContent: jest
		// 				.fn()
		// 				.mockResolvedValue(
		// 					"---\nanki-deck: Deck 2\n---\nContent 2"
		// 				),
		// 		} as any;
		// 		mockFileRepository.getFile.mockImplementation((path: string) => {
		// 			if (path === "/path/to/root/test1.md")
		// 				return Promise.resolve(mockFile1);
		// 			if (path === "/path/to/root/subfolder/test2.md")
		// 				return Promise.resolve(mockFile2);
		// 			return Promise.resolve(null);
		// 		});
		// 		const result = await mdParser.parseMdDir("/path/to/root", true);
		// 		expect(result).toEqual([
		// 			{ name: "test1", deck: "Deck 1", content: "Content 1" },
		// 			{ name: "test2", deck: "Deck 2", content: "Content 2" },
		// 		]);
		// 	});
	});
});

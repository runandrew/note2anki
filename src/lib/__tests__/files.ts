import * as nodePath from "path";

import { AbstractFile, File, Folder } from "../files";

export class TestFile implements File {
	readonly type = "file";
	path = "";
	name = "";
	content = "";

	constructor(filename: string, content: string) {
		this.path = `${filename}`;
		this.name = filename.split(".")[0];
		this.content = content;
	}

	async getContent(): Promise<string> {
		return Promise.resolve(this.content);
	}
}

export class TestFolder implements Folder {
	readonly type = "folder";
	children: AbstractFile[] = [];
	path = "/";
	name = "";

	constructor(name: string) {
		this.name = name;
		this.path = `/${name}`;
	}

	addChildren(files: AbstractFile[]) {
		files.forEach((f) => {
			f.path = nodePath.join(this.path, f.path);
		});
		this.children.push(...files);
	}

	async getChildren(): Promise<AbstractFile[]> {
		return Promise.resolve(this.children);
	}
}

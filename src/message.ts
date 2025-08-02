import { bindThis } from "@/decorators.js";
import chalk from "chalk";

import すばる from "@/subaru.js";
import Friend from "@/friend.js";
import type { User } from "@/misskey/user.js";
import includes from "@/utils/includes.js";
import or from "@/utils/or.js";
import config from "@/config.js";
import { sleep } from "@/utils/sleep.js";

export default class Message {
	private subaru: すばる;
	private note: any;

	public get id(): string {
		return this.note.id;
	}

	public get user(): User {
		return this.note.user;
	}

	public get userId(): string {
		return this.note.userId;
	}

	public get text(): string {
		return this.note.text;
	}

	public get quoteId(): string | null {
		return this.note.renoteId;
	}

	public get visibility(): string {
		return this.note.visibility;
	}

	/**
	 * メンション部分を除いたテキスト本文
	 */
	public get extractedText(): string {
		const host = new URL(config.host).host.replace(/\./g, "\\.");
		return this.text
			.replace(new RegExp(`^@${this.subaru.account.username}@${host}\\s`, "i"), "")
			.replace(new RegExp(`^@${this.subaru.account.username}\\s`, "i"), "")
			.trim();
	}

	public get replyId(): string {
		return this.note.replyId;
	}

	public friend: Friend;

	constructor(subaru: すばる, note: any) {
		this.subaru = subaru;
		this.note = note;

		this.friend = new Friend(subaru, { user: this.user });

		// メッセージなどに付いているユーザー情報は省略されている場合があるので完全なユーザー情報を持ってくる
		this.subaru
			.api("users/show", {
				userId: this.userId,
			})
			.then((user) => {
				this.friend.updateUser(user as User);
			});
	}

	@bindThis
	public async reply(
		text: string | null,
		opts?: {
			file?: any;
			cw?: string;
			renote?: string;
			immediate?: boolean;
			visibility?: string;
		},
	) {
		if (text == null) return;

		this.subaru.log(`>>> Sending reply to ${chalk.underline(this.id)}`);

		if (!opts?.immediate) {
			await sleep(2000);
		}

		const visibleIds = (opts?.visibility && opts.visibility === 'specified') ? [ this.friend.userId ] : undefined;

		return await this.subaru.post({
			replyId: this.note.id,
			text: text,
			fileIds: opts?.file ? [opts?.file.id] : undefined,
			cw: opts?.cw,
			renoteId: opts?.renote,
			visibility: opts?.visibility ? opts?.visibility : this.note.visibility,
			visibleUserIds: visibleIds ? visibleIds : undefined,
		});
	}

	@bindThis
	public includes(words: string[]): boolean {
		return includes(this.text, words);
	}

	@bindThis
	public or(words: (string | RegExp)[]): boolean {
		return or(this.text, words);
	}
}

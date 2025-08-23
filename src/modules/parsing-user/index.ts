import { bindThis } from "@/decorators.js";
import Module from "@/module.js";
import Message from "@/message.js";
import config from "@/config.js";
import Denchat from "../denchat/index.js";
import { User } from "@/misskey/user.js";
import { Note } from "@/misskey/note.js";

export default class extends Module {
	public readonly name = "parsingUser";

	@bindThis
	public install() {
		return {
			mentionHook: this.mentionHook,
		};
	}

	@bindThis
	private async mentionHook(msg: Message) {
		if (msg.text && msg.extractedText.startsWith("ユーザー解析")) {
			this.log("User parsing requested");

			if (msg.user.username !== config.master || msg.user.host !== null || msg.visibility !== 'specified') {
				return {
					reaction: "🆖",
					immediate: true,
				}
			}

			const words = msg.extractedText.split(" "); // スペースで分割

			// ユーザーIDが無ければNG
			if (!words[1]) return { reaction: "🆖", immediate: true };

			// ユーザーIDとホストを抽出
			const userName = words[1];
			const host = words[2] ?? null;

			// 内部ID照会
			const res = await this.subaru.api('users/show', { username: userName, host: host }) as User;
			if (!res.id) return { reaction: "🆖", immediate: true };
			const userId = res.id;
			const displayName = res.name;

			// ノート取得
			const rawNotes = await this.subaru.api('users/notes', { userId: userId, limit: 100, excludeNsfw: true }) as Note[];
			const noteTexts: string[] = rawNotes.map(note => note.text).filter((text): text is string => Boolean(text));
			
			const denchatModule = this.subaru.modules.find((m) => m.name === 'denchat') as Denchat;
			return await denchatModule.parsingUser(displayName, noteTexts, msg) ? {
				reaction: "🆗",
				immediate: true,
			} : {
				reaction: "🆖",
				immediate: true,
			};
		} else {
			return false;
		}
	}
}

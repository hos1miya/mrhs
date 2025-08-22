import { bindThis } from "@/decorators.js";
import loki from "lokijs";
import { parse } from "twemoji-parser";
import type { Note } from "@/misskey/note.js";
import Module from "@/module.js";
import Stream from "@/stream.js";
import includes from "@/utils/includes.js";
import { sleep } from "@/utils/sleep.js";
import serifs from "@/serifs.js";

export default class extends Module {
	public readonly name = "emoji-react";

	private htl!: ReturnType<Stream["useSharedConnection"]>;

	private reationFlag!: loki.Collection<{
		id: string;
		enabled: boolean;
		updatedAt: number;
	}>;

	@bindThis
	public install() {
		this.reationFlag = this.subaru.getCollection("reactionFlag", {
			indices: ["userId"],
		});
		this.htl = this.subaru.connection.useSharedConnection("homeTimeline");
		this.htl.on("note", this.onNote);

		return {};
	}

	@bindThis
	private async onNote(note: Note) {
		if (note.reply != null) return;
		if (note.text == null) return;
		if (note.text.includes("@")) return; // (自分または他人問わず)メンションっぽかったらreject
		if (note.userId == this.subaru.account.id) return; // 自分は弾く

		const react = async (reaction: string, immediate = false) => {
			if (!immediate) {
				await sleep(1500);
			}
			this.subaru.api("notes/reactions/create", {
				noteId: note.id,
				reaction: reaction,
			});
		};

		const status = this.reationFlag.findOne({
			id: note.userId,
		});

		// reaction toggle
		if (note.text.startsWith('/subaru emojireact')) {
			if (status) {
				status.enabled = !status.enabled;
				status.updatedAt = Date.now();
				this.reationFlag.update(status);
				this.subaru.api("notes/create", {
					replyId: note.id,
					text: status.enabled ? serifs.emojiReact.emojiReactIsOn : serifs.emojiReact.emojiReactIsOff,
					visibility: 'specified',
				});
			}
			else {
				this.reationFlag.insertOne({
					id: note.userId,
					enabled: false,
					updatedAt: Date.now(),
				});
				this.subaru.api("notes/create", {
					replyId: note.id,
					text: serifs.emojiReact.emojiReactIsOff,
					visibility: 'specified',
				});
			}
			return react("🆗");
		}

		if (status && status.enabled === false) {
			return;
		}

		const customEmojis = note.text.match(/:([^\n:]+?):/g);
		if (customEmojis) {
			this.log(`Custom emoji detected - ${customEmojis[0]}`);

			return react("🌟");
		}

		const emojis = parse(note.text).map((x) => x.text);
		if (emojis.length > 0) {
			// 絵文字が複数種類ある場合はキャンセル
			if (!emojis.every((val, i, arr) => val === arr[0])) return;

			this.log(`Emoji detected - ${emojis[0]}`);

			let reaction = emojis[0];

			switch (reaction) {
				case "✊":
					return react("🖐", true);
				case "✌":
					return react("✊", true);
				case "🖐":
				case "✋":
					return react("✌", true);
			}

			return react(reaction);
		}

		if (includes(note.text, ["ぴざ"])) return react("🍕");
		if (includes(note.text, ["ぷりん"])) return react("🍮");
		if (includes(note.text, ["寿司", "sushi"]) || note.text === "すし")
			return react("🍣");
		if (includes(note.text, ["らーめん", "ramen"])) return react("🍜");
		if (includes(note.text, ["かれー", "curry"])) return react("🍛");
		if (includes(note.text, ["はんばーがー", "hamburger"])) return react("🍔");
		if (includes(note.text, ["ほっとけーき", "hotcake"])) return react("🥞");
		if (includes(note.text, ["ぱすた", "pasta"])) return react("🍝");
		if (includes(note.text, ["けーき", "cake"])) return react("🍰");
		if (includes(note.text, ["たこ", "octopus"])) return react("🐙");
		if (includes(note.text, ["ねこ", "cat"])) return react("😺");
		if (includes(note.text, ["いぬ", "dog"])) return react("🐶");

		if (includes(note.text, ["すばる", "pleiades"])) return react("🌌");
	}
}

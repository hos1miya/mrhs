import { bindThis } from "@/decorators.js";
import loki from "lokijs";
import Module from "@/module.js";
import Message from "@/message.js";
import config from "@/config.js";
import serifs from "@/serifs.js";
import { mecab } from "./mecab.js";
import type { Note } from "@/misskey/note.js";

function kanaToHira(str: string) {
	return str.replace(/[\u30a1-\u30f6]/g, (match) => {
		const chr = match.charCodeAt(0) - 0x60;
		return String.fromCharCode(chr);
	});
}

export default class extends Module {
	public readonly name = "keyword";

	private learnedKeywords: loki.Collection<{
		keyword: string;
		learnedAt: number;
	}>;

	@bindThis
	public install() {
		if (!config.keywordEnabled) return {};

		this.learnedKeywords = this.subaru.getCollection("_keyword_learnedKeywords", {
			indices: ["userId"],
		});

		setInterval(this.learn, 1000 * 60 * 30);

		return {
			mentionHook: this.mentionHook,
		};
	}

	@bindThis
	private async learn() {
		const tl = await this.subaru.api("notes/hybrid-timeline", {
			limit: 30,
		});

		const interestedNotes = tl.filter(
			(note) =>
				note.userId !== this.subaru.account.id &&
				note.text != null &&
				note.cw == null &&
				(note.visibility === "public" || note.visibility === "home"),
		);

		let keywords: string[][] = [];

		for (const note of interestedNotes) {
			const tokens = await mecab(note.text, config.mecab, config.mecabDic);
			const keywordsInThisNote = tokens.filter(
				(token) => token[2] == "固有名詞" && token[8] != null,
			);
			keywords = keywords.concat(keywordsInThisNote);
		}

		if (keywords.length === 0) return;

		const rnd = Math.floor((1 - Math.sqrt(Math.random())) * keywords.length);
		const keyword = keywords.sort((a, b) =>
			a[0].length < b[0].length ? 1 : -1,
		)[rnd];

		const exist = this.learnedKeywords.findOne({
			keyword: keyword[0],
		});

		let text: string;

		if (exist) {
			return;
		} else {
			this.learnedKeywords.insertOne({
				keyword: keyword[0],
				learnedAt: Date.now(),
			});

			text = serifs.keyword.learned(keyword[0], kanaToHira(keyword[8]));
		}

		this.subaru.post({
			text: text,
		});
	}

	@bindThis
	private async mentionHook(msg: Message) {
		if (
			!msg.replyId ||
			!msg.text ||
			!(msg.text.startsWith("忘れて") ||
			 msg.text.startsWith("忘却"))
		) {
			return false;
		} else {
			this.log("Keyword remove requested");
		}

		const note: Note = await this.subaru.api("notes/show", { noteId: msg.replyId }) as Note;
		if(!note.text) return false;
		const match = note.text.match(/\(([^.]+)\.\.\.\.\..*\)/);
		if(!match) return false;

		this.log(`matched keyword: ${match}`);

		const learnedKeywords = this.learnedKeywords.find({
			keyword: match[1],
		});
		learnedKeywords.forEach((learnedKeyword) => {
			if ( match[1] === learnedKeyword.keyword) {
				this.learnedKeywords.remove(learnedKeyword);
			}
		});
		return {
			reaction: "🆗",
			immediate: true,
		};
	}
}


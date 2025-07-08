import { bindThis } from "@/decorators.js";
import loki from "lokijs";
import Module from "@/module.js";
import Message from "@/message.js";
import config from "@/config.js";
import serifs from "@/serifs.js";
import { mecab } from "./mecab.js";
import type { Note } from "@/misskey/note.js";
import Denchat from "../denchat/index.js";

function kanaToHira(str: string) {
	return str.replace(/[\u30a1-\u30f6]/g, (match) => {
		const chr = match.charCodeAt(0) - 0x60;
		return String.fromCharCode(chr);
	});
}

const KEYWORDNOTE_DEFAULT_INTERVAL = 1000 * 60 * 60 * 12;// デフォルトのrandomTalk間隔

export default class extends Module {
	private keywordNoteIntervalMinutes: number = KEYWORDNOTE_DEFAULT_INTERVAL;
	public readonly name = "keyword";

	private learnedKeywords!: loki.Collection<{
		keyword: string;
		learnedAt: number;
	}>;

	@bindThis
	public install() {
		if (!config.keywordEnabled) return {};

		this.learnedKeywords = this.subaru.getCollection("_keyword_learnedKeywords", {
			indices: ["userId"],
		});

		// 一定間隔で学習
		setInterval(this.learn, 1000 * 60 * 30);

		// キーワードノート 間隔(分)は設定されていればそちらを採用(設定がなければデフォルトを採用)
		if (config.keywordNoteIntervalMinutes != undefined && !Number.isNaN(Number.parseInt(config.keywordNoteIntervalMinutes))) {
			this.keywordNoteIntervalMinutes = 1000 * 60 * Number.parseInt(config.keywordNoteIntervalMinutes);
		}
		this.log('keywordNoteEnabled:' + config.keywordNoteEnabled);
		this.log('keywordNoteIntervalMinutes:' + (this.keywordNoteIntervalMinutes / (60 * 1000)));
		if (config.keywordNoteEnabled) {
			setInterval(this.keywordNote, this.keywordNoteIntervalMinutes);
		}
		
		return {
			mentionHook: this.mentionHook,
		};
	}

	@bindThis
	private async learn() {
		const tl = await this.subaru.api("notes/hybrid-timeline", {
			limit: 30,
		}) as Note[];

		const interestedNotes = tl.filter(
			(note) =>
				note.userId !== this.subaru.account.id &&
				note.text != null &&
				note.cw == null &&
				(note.visibility === "public" || note.visibility === "home"),
		);

		let keywords: string[][] = [];

		for (const note of interestedNotes) {
			// ミュート判定
			const sinceId = note.id.slice(0, -2) + "00";
			const untilId = note.id.slice(0, -2) + "00";
			const isMuted = await this.subaru.api("i/get-word-muted-notes", {
				sinceId: sinceId,
				untilId: untilId,
			}, true) as Note[];
			// ミュートされていなければ単語を抽出
			if (isMuted.length === 0) {
				const tokens = await mecab(note.text ?? '', config.mecab, config.mecabDic);
				const keywordsInThisNote = tokens.filter(
					(token) => token[2] == "固有名詞" && token[8] != null,
				);
				keywords = keywords.concat(keywordsInThisNote);
			} else {
				this.log(`Skipped ${note.id} (contain muted words)`);
			}
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

			// 学習元と思われるノートにふぁぼ
			const learnedNote: Note[] = await this.subaru.api('notes/search', { limit: 1, query: keyword[0] }) as Note[];
			await this.subaru.api('notes/reactions/create', { noteId: learnedNote[0].id, reaction: '📕' });
		}

		this.subaru.post({
			text: text,
		});
	}

	@bindThis
	private async keywordNote() {
		if (this.learnedKeywords.data.length === 0) return;

		const keyword = this.learnedKeywords.data[Math.floor(Math.random() * this.learnedKeywords.data.length)].keyword;
		const denchatModule = this.subaru.modules.find((m) => m.name === 'denchat') as Denchat;

		return await denchatModule.noteAboutKeyword(keyword);
	}

	@bindThis
	private async mentionHook(msg: Message) {
		if (msg.extractedText.startsWith("単語紹介") && msg.user.username === config.master && msg.user.host == null) {
			await this.keywordNote();
			return {
				reaction: "🆗",
				immediate: true,
			};
		}
		if (msg.extractedText.startsWith("学習して") && msg.user.username === config.master && msg.user.host == null) {
			await this.learn();
			return {
				reaction: "🆗",
				immediate: true,
			};
		} else if (
			!msg.replyId ||
			!msg.text ||
			!(msg.extractedText.startsWith("忘れて") ||
			 msg.extractedText.startsWith("忘却"))
		) {
			return false;
		} else {
			this.log("Keyword remove requested");
		}

		const originNote: Note = await this.subaru.api("notes/show", { noteId: msg.replyId }) as Note;
		if(!originNote.text) return false;
		const match = originNote.text.match(/\(([^.]+)\.\.\.\.\..*\)/);
		if(!match) return false;

		this.log(`matched keyword: ${match}`);

		const learnedKeywords = this.learnedKeywords.find({
			keyword: match[1],
		});
		learnedKeywords.forEach((learnedKeyword) => {
			if (match[1] === learnedKeyword.keyword) {
				this.learnedKeywords.remove(learnedKeyword);
			}
		});
		
		// ミュートワード追加処理
		const rawAcctData = await this.subaru.api('i', {});
		const currentMutedWords = ((rawAcctData as { mutedWords: string[][] })?.mutedWords ?? []).flat();
		const updatedMutedWords = Array.from(new Set([...currentMutedWords, match[1]])).map(word => [word]);
		await this.subaru.api('i/update', { mutedWords: updatedMutedWords });

		// 直近の対象ノートをミュート
		const unsafeNote: Note[] = await this.subaru.api('notes/search', { limit: 1, query: match[1], untilId: originNote.id }) as Note[];
		await this.subaru.api('notes/mutes/create', { noteId: unsafeNote[0].id });

		return {
			reaction: "🆗",
			immediate: true,
		};
	}
}


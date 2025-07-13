import { bindThis } from "@/decorators.js";
import Module from "@/module.js";
import Message from "@/message.js";
import config from "@/config.js";
import { mecab } from "../keyword/mecab.js";
import { prohibitedWords } from "@/prohibitedWords.js";
import { prohibitedTexts } from "@/prohibitedTexts.js";

export default class extends Module {
	public readonly name = "safety";

	@bindThis
	public install() {
		return {
			mentionHook: this.mentionHook,
			contextHook: this.contextHook,
		};
	}

	@bindThis
	private async mentionHook(msg: Message) {
		// 文章
		const normalizedText = msg.text.trim().toLowerCase();
		if (prohibitedTexts.some((text) => normalizedText.includes(text.toLowerCase()))) {
			this.log(`Prohibited text detected (likely prompt injection): "${msg.text}"`);
			await this.addNoteToClip(msg.id);
			msg.friend.decLove();
			return {
				reaction: '😡',
				immediate: true,
			};
		}

		// 単語
		const tokens = await mecab(msg.text, config.mecab, config.mecabDic);
		const match = tokens.map(entry => entry[0]).filter(word => prohibitedWords.includes(word)); // 一致する単語を抽出
		if (msg.text && match.length > 0) {
			this.log(`Prohibited word detected: ${match.join(", ")}`);
			await this.addNoteToClip(msg.id);
			msg.friend.decLove();
			return {
				reaction: '😡',
				immediate: true,
			};
		}
		return false;
	}

	@bindThis
	private async contextHook(key: any, msg: Message) {
		// 文章
		const normalizedText = msg.text.trim().toLowerCase();
		if (prohibitedTexts.some((text) => normalizedText.includes(text.toLowerCase()))) {
			this.log(`Prohibited text detected (likely prompt injection): "${msg.text}"`);
			await this.addNoteToClip(msg.id);
			msg.friend.decLove();
			return {
				reaction: '😡',
				immediate: true,
			};
		}
		
		// 単語
		const tokens = await mecab(msg.text, config.mecab, config.mecabDic);
		const match = tokens.map(entry => entry[0]).filter(word => prohibitedWords.includes(word)); // 一致する単語を抽出
		if (msg.text && match.length > 0) {
			this.log(`Prohibited word detected: ${match.join(", ")}`);
			await this.addNoteToClip(msg.id);
			msg.friend.decLove();
			return {
				reaction: '😡',
				immediate: true,
			};
		}
		return false;
	}

	private async addNoteToClip(noteId: string) {
		// Clip一覧を取得
		const clips = await this.subaru.api('clips/list') as any[];

		// 「検疫済み」という名前のClipを探す
		let clip = clips.find(c => c.name === '検疫済み');

		let clipId: string;

		if (clip) {
			clipId = clip.id;
		} else {
			// 見つからなければ新規作成
			const newClip: any = await this.subaru.api('clips/create', {
				name: '検疫済み',
				isPublic: false,
				description: '有害ワードが検出されたノート',
			});
			clipId = newClip.id;
		}

		// 指定されたノートをClipに追加
		await this.subaru.api('clips/add-note', {
			clipId,
			noteId,
		});

		this.log(`Note ${noteId} added to clip ${clipId}`);
	}
}

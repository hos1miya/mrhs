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
			msg.friend.decLove();
			return {
				reaction: '😡',
				immediate: true,
			};
		}
		return false;
	}
}

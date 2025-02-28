import { bindThis } from "@/decorators.js";
import Module from "@/module.js";
import Message from "@/message.js";
import config from "@/config.js";
import { mecab } from "../keyword/mecab.js";
import { prohibitedWords } from "@/prohibitedWords.js";

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

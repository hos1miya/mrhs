import { bindThis } from "@/decorators.js";
import Module from "@/module.js";
import Message from "@/message.js";
import serifs from "@/serifs.js";
import { safeForInterpolate } from "@/utils/safe-for-interpolate.js";

const titles = ["さん", "くん", "君", "ちゃん", "様", "先生"];

export default class extends Module {
	public readonly name = "core";

	@bindThis
	public install() {
		return {
			mentionHook: this.mentionHook,
			contextHook: this.contextHook,
		};
	}

	@bindThis
	private async mentionHook(msg: Message) {
		if (!msg.text) return false;

		return (
			this.transferBegin(msg) ||
			this.transferEnd(msg) ||
			this.setName(msg) ||
			this.modules(msg) ||
			this.version(msg) ||
			this.help(msg)
		);
	}

	@bindThis
	private transferBegin(msg: Message): boolean {
		if (!msg.text) return false;
		if (!msg.includes(["引継", "引き継ぎ", "引越", "引っ越し"])) return false;
		this.log("CoreModule TransferBegin requested");

		const code = msg.friend.generateTransferCode();

		msg.reply(serifs.core.transferCode(code));

		return true;
	}

	@bindThis
	private transferEnd(msg: Message): boolean {
		if (!msg.text) return false;
		if (!msg.text.startsWith("「") || !msg.text.endsWith("」")) return false;
		this.log("CoreModule TransferEnd requested");

		const code = msg.text.substring(1, msg.text.length - 1);

		const succ = msg.friend.transferMemory(code);

		if (succ) {
			msg.reply(serifs.core.transferDone(msg.friend.name));
		} else {
			msg.reply(serifs.core.transferFailed);
		}

		return true;
	}

	@bindThis
	private setName(msg: Message): boolean {
		if (!msg.text) return false;
		if (!msg.text.includes('って呼んで')) return false;
		if (msg.text.startsWith('って呼んで')) return false;
		this.log("CoreModule SetName requested");

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const name = msg.text.replace(/^@[a-zA-Z0-9_]+\s*/, '').match(/^(.+?)って呼んで/)![1];

		if (name.trim.length > 10) {
			msg.reply(serifs.core.tooLong);
			return true;
		}

		if (!safeForInterpolate(name)) {
			msg.reply(serifs.core.invalidName);
			return true;
		}

		const withSan = titles.some((t) => name.endsWith(t));

		if (withSan) {
			msg.friend.updateName(name);
			msg.reply(serifs.core.setNameOk(name));
		} else {
			msg.reply(serifs.core.san).then((reply) => {
				this.subscribeReply(msg.userId, reply.id, {
					name: name,
				});
			});
		}

		return true;
	}

	@bindThis
	private modules(msg: Message): boolean {
		if (!msg.text) return false;
		if (!msg.or(["modules"])) return false;
		this.log("CoreModule Modules requested");

		let text = "```\n";

		for (const m of this.subaru.modules) {
			text += `${m.name}\n`;
		}

		text += "```";

		msg.reply(text, {
			immediate: true,
		});

		return true;
	}

	@bindThis
	private version(msg: Message): boolean {
		if (!msg.text) return false;
		if (!msg.or(["v", "version", "バージョン"])) return false;
		this.log("CoreModule Version requested");

		msg.reply(`\`\`\`\nv${this.subaru.version}\n\`\`\``, {
			immediate: true,
		});

		return true;
	}

	@bindThis
	private help(msg: Message): boolean {
		if (!msg.text) return false;
		if (!msg.or(["help", "使い方", "ヘルプ"])) return false;
		this.log("CoreModule Help requested");

		msg.reply(serifs.core.help, {
			immediate: true,
		});

		return true;
	}

	@bindThis
	private async contextHook(key: any, msg: Message, data: any) {
		this.log('contextHook...');
		if (msg.text == null) return;

		const done = () => {
			msg.reply(serifs.core.setNameOk(msg.friend.name));
			this.unsubscribeReply(key);
		};

		if (msg.text.includes("はい")) {
			msg.friend.updateName(data.name + "さん");
			done();
		} else if (msg.text.includes("いいえ")) {
			msg.friend.updateName(data.name);
			done();
		} else {
			msg.reply(serifs.core.yesOrNo).then((reply) => {
				this.subscribeReply(msg.userId, reply.id, data);
			});
		}
	}
}

import { bindThis } from "@/decorators.js";
import Module from "@/module.js";
import Message from "@/message.js";
import serifs from "@/serifs.js";

export default class extends Module {
	public readonly name = "dice";

	@bindThis
	public install() {
		return {
			mentionHook: this.mentionHook,
		};
	}

	@bindThis
	private async mentionHook(msg: Message) {
		if (msg.text == null) return false;

		const query = msg.text.match(/([0-9]+)[dD]([0-9]+)/);

		if (query == null) {
			return false;
		} else {
			this.log("Dice requested");
		}

		const times = parseInt(query[1], 10);
		const dice = parseInt(query[2], 10);

		if (times < 1 || times > 10) return false;
		if (dice < 2 || dice > 100000000) return false;

		const results: number[] = [];

		for (let i = 0; i < times; i++) {
			results.push(Math.floor(Math.random() * dice) + 1);
		}

		const message = msg.text.replace(/\d+[dD]\d+/g, results.join(" "))
		msg.reply(serifs.dice.done(message));

		return {
			reaction: '🎲'
		};
	}
}

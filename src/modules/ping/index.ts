import { bindThis } from "@/decorators.js";
import Module from "@/module.js";
import Message from "@/message.js";

export default class extends Module {
	public readonly name = "ping";

	@bindThis
	public install() {
		return {
			mentionHook: this.mentionHook,
		};
	}

	@bindThis
	private async mentionHook(msg: Message) {
		if (msg.text && msg.text.includes("ping")) {
			this.log("Ping received");
			msg.reply("ぽん。", {
				immediate: true,
			});
			return true;
		} else {
			return false;
		}
	}
}

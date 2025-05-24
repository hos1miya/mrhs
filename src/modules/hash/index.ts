import { bindThis } from "@/decorators.js";
import Module from "@/module.js";
import Message from "@/message.js";

export default class extends Module {
	public readonly name = "hash";

	@bindThis
	public install() {
		return {
			mentionHook: this.mentionHook,
		};
	}

	@bindThis
	private async mentionHook(msg: Message) {
		if (msg.extractedText == null) return false;

		const text = msg.extractedText;

		if (
			!text.startsWith("md5") &&
			!text.startsWith("sha256") &&
			!text.startsWith("aid")
		) {
			return false;
		} else {
			this.log("Hash requested");
		}

		const firstSpaceIndex = text.indexOf(" ");
		const targetText = firstSpaceIndex !== -1 ? text.slice(firstSpaceIndex + 1) : "";

		let resultHash = targetText; // for test

		// md5
		if (text.startsWith("md5 ")) {
			
		}

		// sha256
		if (text.startsWith("sha256 ")) {
			
		}

		// aid
		if (text.startsWith("aid ")) {
			
		}

		// aidx
		if (text.startsWith("aidx ")) {
			
		}

		msg.reply(`\`\`\`\n${ resultHash }\n\`\`\``);

		return {
			reaction: '#️⃣'
		};
	}
}

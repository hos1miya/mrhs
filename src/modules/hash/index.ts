import { bindThis } from "@/decorators.js";
import { createHash, randomBytes } from "crypto";
import Module from "@/module.js";
import Message from "@/message.js";
import serifs from "@/serifs.js";

const TIME2000 = Date.UTC(2000, 0, 1);

export default class extends Module {
	public readonly name = "hash";

	@bindThis
	public install() {
		return {
			mentionHook: this.mentionHook,
		};
	}

	@bindThis
	private generateNodeId(length: number): string {
		const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
		let id = '';
		for (let i = 0; i < 4; i++) {
			id += chars[Math.floor(Math.random() * chars.length)];
		}
		return id;
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
			resultHash = createHash("md5").update(targetText).digest("hex");
		}

		// sha256
		if (text.startsWith("sha256 ")) {
			resultHash = createHash("sha256").update(targetText).digest("hex");
		}

		// aidx
		if (text.startsWith("aidx")) {
			try {

				let date: Date;
				const nodeId = this.generateNodeId(4); // 4文字の個体IDを生成

				if (targetText.trim() === '') {
					// 日時未指定 → 現在時刻（JST→UTC補正）
					const now = new Date();
					date = new Date(now.getTime() * 60 * 60 * 1000);
				} else {
					// 日時指定あり
					const [d, t = '00:00'] = targetText.trim().split(/\s+/);
					const [y, m, day] = d.replace(/[./]/g, '-').split('-').map(Number);
					const [hh, mm] = t.split(':').map(Number);
		
					date = new Date(Date.UTC(y, m - 1, day, hh - 9, mm));
					if (isNaN(date.getTime())) throw new Error('Invalid date');
				}

				const diff = Math.max(0, date.getTime() - TIME2000);
				const timePart36 = diff.toString(36).padStart(8, '0').slice(-8);

				resultHash = timePart36 + nodeId + '0001'; // カウンタは固定0001

			} catch (err) {
				msg.reply(serifs.hash.invalidDate);
				return {
					reaction: '🆖'
				};
			}
		}

		// aid
		if (text.startsWith("aid")) {
			try {

				let date: Date;
		
				if (targetText.trim() === '') {
					// 日時が未指定 → 現在日時（JST）
					const now = new Date();
					date = new Date(now.getTime() * 60 * 60 * 1000); // JST → UTC補正
				} else {
					// 指定あり → パース
					const [d, t = '00:00'] = targetText.trim().split(/\s+/);
					const [y, m, day] = d.replace(/[./]/g, '-').split('-').map(Number);
					const [hh, mm] = t.split(':').map(Number);
		
					date = new Date(Date.UTC(y, m - 1, day, hh - 9, mm));
					if (isNaN(date.getTime())) throw new Error('Invalid date');
				}
		
				const diff = Math.max(0, date.getTime() - TIME2000);
				const timePart = diff.toString(36).padStart(8, '0');
				const noise = randomBytes(2).readUInt16LE().toString(36).padStart(2, '0').slice(-2);
		
				resultHash = timePart + noise;
		
			} catch (err) {
				msg.reply(serifs.hash.invalidDate);
				return {
					reaction: '🆖'
				};
			}
		}

		msg.reply(`\`\`\`\n${ resultHash }\n\`\`\``);

		return {
			reaction: '#️⃣'
		};
	}
}

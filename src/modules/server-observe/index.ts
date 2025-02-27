import { bindThis } from "@/decorators.js";
import Module from "@/module.js";
import serifs from "@/serifs.js";
import Message from "@/message.js";
import config from "@/config.js";

export default class extends Module {
	public readonly name = "serverObserve";

	private lastDeliverProblem = false;
	private lastRebootCanceled;

	@bindThis
	public install() {
		if (!config.serverObserveEnable) return {};

		this.checkDeliverDelay();
		setInterval(this.checkDeliverDelay, 1000 * 60 * 5);

		return {
			contextHook: this.contextHook,
		};
	}

	@bindThis
	private async checkDeliverDelay() {
		const now = new Date();
		if (now.getMinutes() % 3 !== 0) return;
		if (this.lastRebootCanceled && now < this.lastRebootCanceled + 1000 * 60 * 10) return;

		const data: [string, number, boolean][] = await this.subaru.api("admin/queue/deliver-delayed", {});

		if(!data) return;

		const hosts = data
    	.filter(row => row.includes(true)) // true を含む配列を取得
    	.map(row => row[0]) // 各配列の最初の要素（ホスト）を取得
    	.filter(host => typeof host === "string") as string[]; // 文字列のホストだけ残す

		let deliverProblem = false;
		for (const host of hosts) {
			try {
				const response = await fetch(`https://${host}`, { method: "GET" });
				if (response.status === 200) {
					deliverProblem = true;
				}
			} catch (error) {
			}
		}

		// 前回も今回も問題があった場合、鯖再起動・今回は問題なしとする
		if (this.lastDeliverProblem && deliverProblem) {
			this.subaru.api('admin/reboot-server', { confirm: 'yes' });
			deliverProblem = false;
		}
		
		// フラグをリセット
		this.lastDeliverProblem = false;

		// 今回が大丈夫ならreturn
		if (!deliverProblem) return;

		// 今回は問題があった場合、告知・フラグを立てる
		this.subaru.post({
			text: serifs.serverObserve.deliverDelay,
			visibility: "followers",
		});
		this.lastDeliverProblem = true;
	}

	@bindThis
	private async contextHook(key: any, msg: Message, data: any) {
		this.log('contextHook...');
		if (msg.text == null) return;

		if (msg.includes(["キャンセル", "ストップ", "中止", "やめて"])) {
			this.lastDeliverProblem = false;
			this.lastRebootCanceled = Date.now();
			msg.reply(serifs.serverObserve.rebootCanceled, { visibility: msg.visibility });
		}
		return {
			reaction: "🆗",
			immediate: true,
		};
	}
}

import { bindThis } from "@/decorators.js";
import Module from "@/module.js";
import serifs from "@/serifs.js";
import Message from "@/message.js";
import config from "@/config.js";

export default class extends Module {
	public readonly name = "serverObserve";

	@bindThis
	public install() {
		if (!config.serverObserveEnable) return {};

		this.checkDeliverDelay();
		setInterval(this.checkDeliverDelay, 1000 * 60 * 5);

		return {};
	}

	@bindThis
	private async checkDeliverDelay() {
		const now = new Date();
		if (now.getMinutes() % 3 !== 0) return;

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

		if (!deliverProblem) return;

		this.subaru.post({
			text: serifs.serverObserve.deliverDelay,
			visibility: "followers",
		});
	}
}

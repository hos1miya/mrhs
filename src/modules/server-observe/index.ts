import { bindThis } from "@/decorators.js";
import Module from "@/module.js";
import serifs from "@/serifs.js";
import Message from "@/message.js";
import config from "@/config.js";

const REBOOT_CANCEL_DURATION = 60;

export default class extends Module {
	public readonly name = 'serverObserve';

	private lastDeliverProblem = false;
	private lastRebootCanceled;

	@bindThis
	public install() {
		if (!config.serverObserveEnable) return {};

		this.checkDeliverDelay();
		setInterval(this.checkDeliverDelay, 1000 * 60 * 1);

		return {
			contextHook: this.contextHook,
		};
	}

	@bindThis
	private async checkDeliverDelay() {
		const now = new Date();
		if (now.getMinutes() % 5 !== 0) return;
		if (this.lastRebootCanceled && now < this.lastRebootCanceled + 1000 * 60 * REBOOT_CANCEL_DURATION) return;

		const data: [string, number, boolean][] = await this.subaru.api('admin/queue/deliver-delayed', {}) as [string, number, boolean][];

		if(!data) return;

		const hosts = data
    	.filter(row => row.includes(true)) // true を含む配列を取得
    	.map(row => row[0]) // 各配列の最初の要素（ホスト）を取得
    	.filter(host => typeof host === 'string') as string[]; // 文字列のホストだけ残す

		let deliverProblem = false;
		for (const host of hosts) {
			try {
				const response = await fetch(`https://${host}/.well-known/webfinger`, { method: 'GET', headers: { 'Cache-Control': 'no-cache' } });
				if (response.status === 400) {
					deliverProblem = true;
				}
			} catch (error) {
			}
		}

		// 前回も今回も問題があった場合、鯖再起動・今回は問題なしとする
		if (this.lastDeliverProblem && deliverProblem) {
			this.subaru.api('admin/reboot-server', { confirm: 'yes' });
			this.lastRebootCanceled = Date.now();
			this.unsubscribeReply(null);
			deliverProblem = false;
		}

		// 前回問題があったが今回問題なかった場合は再起動キャンセルの旨を投稿
		else if (this.lastDeliverProblem) {
			this.subaru.post({
				text: serifs.serverObserve.deliverDelayDisappeared,
				visibility: 'followers',
			});
		}
		
		// フラグをリセット
		this.lastDeliverProblem = false;

		// 今回が大丈夫ならreturn
		if (!deliverProblem) return;

		// 今回は問題があった場合、告知・フラグを立てる
		const post = await this.subaru.post({
			text: serifs.serverObserve.deliverDelay,
			visibility: 'followers',
		});
		this.lastDeliverProblem = true;
		this.subscribeReply(null, post.id);
	}

	@bindThis
	private async contextHook(key: any, msg: Message) {
		this.log('contextHook...');
		if (msg.text == null)	return;
		if (
			msg.extractedText == null ||
			msg.user.username !== config.master ||
			msg.user.host !== null ||
			(this.lastRebootCanceled && new Date() < this.lastRebootCanceled + 1000 * 60) ||
			!(
			 	msg.extractedText.startsWith('キャンセル') ||
			 	msg.extractedText.startsWith('ストップ') ||
			 	msg.extractedText.startsWith('中止') ||
			 	msg.extractedText.startsWith('やめて')
			)
		) {
			return;
		} else {
			this.log('Reboot cancel requested');
		}

		this.lastDeliverProblem = false;
		this.lastRebootCanceled = Date.now();
		msg.reply(serifs.serverObserve.rebootCanceled);

		this.unsubscribeReply(null);

		return {
			reaction: "🆗",
		};
	}
}

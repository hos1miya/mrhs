import { bindThis } from "@/decorators.js";
import loki from "lokijs";
import Module from "@/module.js";
import Message from "@/message.js";
import serifs, { getSerif } from "@/serifs.js";
import { acct } from "@/utils/acct.js";
import config from "@/config.js";

const NOTIFY_INTERVAL = 1000 * 60 * 60 * 12;

export default class extends Module {
	public readonly name = "reminder";

	private reminds!: loki.Collection<{
		userId: string;
		id: string;
		thing: string | null;
		quoteId: string | null;
		times: number; // 催促した回数(使うのか？)
		createdAt: number;
		expiredAt: number;
		visibility: string;
	}>;

	@bindThis
	public install() {
		this.reminds = this.subaru.getCollection("reminds", {
			indices: ["userId", "id"],
		});

		return {
			mentionHook: this.mentionHook,
			contextHook: this.contextHook,
			timeoutCallback: this.timeoutCallback,
		};
	}

	@bindThis
	private async mentionHook(msg: Message) {
		let text = msg.extractedText.toLowerCase();
		if (
			!text.startsWith("remind") &&
			!text.startsWith("todo") &&
			!text.startsWith("リマインド") &&
			!text.startsWith("やること")
		) {
			return false;
		} else {
			this.log("Reminder requested");
		}

		// 全てのリマインドを削除
		if (
			text.startsWith("reminds purge") ||
			text.startsWith("todos purge")
		) {
			const reminds = this.reminds.find({
				userId: msg.userId,
			});
			reminds.forEach((remind) => {
				this.unsubscribeReply(
				  remind.thing == null && remind.quoteId ? remind.quoteId : remind.id,
				);
				this.reminds.remove(remind);
			});
			this.log(`Reminder for user ${msg.userId} purged.`);
			return {
				reaction: "🚮",
				immediate: true,
			};
		}

		// 何らかの理由で残っている終了したリマインドを削除
		if (
			text.startsWith("reminds gc") ||
			text.startsWith("todos gc")
		) {
			const reminds = this.reminds.find({
				userId: msg.userId,
			});
			reminds.forEach((remind) => {
				if ( Date.now() > remind.expiredAt ) {
					this.unsubscribeReply(
						remind.thing == null && remind.quoteId ? remind.quoteId : remind.id,
					);
					this.reminds.remove(remind);
				}
			});
			return {
				reaction: "✨",
				immediate: true,
			};
		}

		if (
			text.startsWith("reminds") ||
			text.startsWith("todos") ||
			text.startsWith("リマインド一覧") ||
			text.startsWith("やること一覧") ||
			text.startsWith("やることリスト") ||
			text.startsWith("リマインドリスト")
		) {
			const reminds = this.reminds.find({
				userId: msg.userId,
			});

			const getQuoteLink = (id) => `[${id}](${config.host}/notes/${id})`;

			msg.reply(
				serifs.reminder.reminds +
					"\n" +
					reminds
						.map(
							(remind) =>
								`・${remind.thing ? remind.thing : getQuoteLink(remind.quoteId)} \$[unixtime ${remind.expiredAt / 1000}]`,
						)
						.join("\n"),
				{ visibility : "specified" },
			);
			return true;
		}

		if (text.match(/^(.+?)\s(.+)/)) {
			text = text.replace(/^(.+?)\s/, "");
		} else {
			text = "";
		}

		const words = text.split(" "); // スペースで分割
		let thing, time;
		
		if (words.length > 1 && words[words.length - 1].match(/\d+(分|時間|日)$/)) {
			// 最後の単語が「○分」「○時間」「○日」なら time
			time = words.pop(); // 配列の最後の要素を time に
		} else {
			time = ""; // time がない場合は空
		}
		
		thing = words.join(" "); // 残りを thing に
		
		const minutesQuery = (time || "").match(/([0-9]+)分/);
		const hoursQuery = (time || "").match(/([0-9]+)時間/);
		const daysQuery = (time || "").match(/([0-9]+)日/);
		const minutes = minutesQuery ? parseInt(minutesQuery[1], 10) : 0;
		const hours = hoursQuery ? parseInt(hoursQuery[1], 10) : 0;
		const days = daysQuery ? parseInt(daysQuery[1], 10) : 0;
		const times = minutes + hours + days == 0 
			? 1000 * 60 * 60 * 24 * 30 // 0分が指定された場合デフォルトの30日にする
			: 1000 * 60 * minutes + 1000 * 60 * 60 * hours + 1000 * 60 * 60 * 24 * days;

		// 今日の日付の23:59:59を設定
		const now = new Date();
		const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

		if (
			(thing === "" && msg.quoteId == null) ||
			times > 5184000000
		) {
			msg.reply(serifs.reminder.invalid, { visibility : msg.visibility });
			return {
				reaction: "🆖",
				immediate: true,
			};
		}

		const remind = this.reminds.insertOne({
			id: msg.id,
			userId: msg.userId,
			thing: thing === "" ? null : thing,
			quoteId: msg.quoteId,
			times: 0,
			createdAt: Date.now(),
			expiredAt: minutes + hours === 0 ? endOfToday.getTime() + times : now.getTime() + times,	// 分と時間が0なら終了日の23:59:59までにする、分と時間の指定があれば指定時間まで
			visibility: msg.visibility,
		});

		// メンションをsubscribe
		this.subscribeReply(remind!.id, msg.id, {
			id: remind!.id,
		});

		if (msg.quoteId) {
			// 引用元をsubscribe
			this.subscribeReply(remind!.id, msg.quoteId, {
				id: remind!.id,
			});
		}

		// タイマーセット
		this.setTimeoutWithPersistence(NOTIFY_INTERVAL > times ? times + 100 : NOTIFY_INTERVAL, {
			id: remind!.id,
		});

		return {
			reaction: "🆗",
			immediate: true,
		};
	}

	@bindThis
	private async contextHook(key: any, msg: Message, data: any) {
		this.log('contextHook...');
		if (msg.text == null) return;

		const remind = this.reminds.findOne({
			id: data.id,
		});

		if (remind == null) {
			this.unsubscribeReply(key);
			return;
		}

		const done = msg.includes(["done", "やった", "やりました", "はい", "おわった", "終わった", "ok", "おっけー", "おけ"]);
		const cancel = msg.includes(["cancel", "やめ", "キャンセル"]);
		const isOneself = msg.userId === remind.userId;

		if ((done || cancel) && isOneself) {
			this.unsubscribeReply(key);
			this.reminds.remove(remind);
			msg.reply(
				done
					? getSerif(serifs.reminder.done(msg.friend.name))
					: serifs.reminder.cancel,
				{ visibility : msg.visibility },
			);
			return;
		} else if (isOneself === false) {
			msg.reply(serifs.reminder.doneFromInvalidUser, { visibility : "home" });
			return;
		} else {
			return false;
		}
	}

	@bindThis
	private async timeoutCallback(data) {
		const remind = this.reminds.findOne({
			id: data.id,
		});
		if (remind == null) return;

		remind.times++;
		this.reminds.update(remind);

		const friend = this.subaru.lookupFriend(remind.userId);
		if (friend == null) return; // 処理の流れ上、実際にnullになることは無さそうだけど一応

		// 期限切れならお知らせしてリマインダー解除
		if ( Date.now() > remind.expiredAt ) {
			try {
				const visibleIds = remind.visibility === 'specified' ? [ friend.doc.userId ] : undefined;
				await this.subaru.post({
					renoteId: ['specified', 'followers'].includes(remind.visibility)
						? undefined
						: remind.thing == null && remind.quoteId ? remind.quoteId : remind.id,
					replyId: !['specified', 'followers'].includes(remind.visibility)
						? undefined
						: remind.thing == null && remind.quoteId ? remind.quoteId : remind.id,
					text: acct(friend.doc.user) + " " + serifs.reminder.expired,
					visibility : remind.visibility ? remind.visibility : 'home',
					visibleUserIds: visibleIds ? visibleIds : undefined,
				});
			} finally {
				this.unsubscribeReply(
					remind.thing == null && remind.quoteId ? remind.quoteId : remind.id,
				);
				this.reminds.remove(remind);
				return;
			}
		}

		let reply;
		try {
			const visibleIds = remind.visibility === 'specified' ? [ friend.doc.userId ] : undefined;
			reply = await this.subaru.post({
				renoteId: ['specified', 'followers'].includes(remind.visibility)
					? undefined
					: remind.thing == null && remind.quoteId ? remind.quoteId : remind.id,
				replyId: !['specified', 'followers'].includes(remind.visibility)
					? undefined
					: remind.thing == null && remind.quoteId ? remind.quoteId : remind.id,
				text: acct(friend.doc.user) + " " + serifs.reminder.notify(friend.name),
				visibility : remind.visibility ? remind.visibility : 'home',
				visibleUserIds: visibleIds ? visibleIds : undefined,
			});
		} catch (err) {
			// renote対象が消されていたらリマインダー解除
			if (err.statusCode === 400) {
				this.unsubscribeReply(
					remind.thing == null && remind.quoteId ? remind.quoteId : remind.id,
				);
				this.reminds.remove(remind);
				return;
			}
			return;
		}

		this.subscribeReply(remind.id, reply.id, {
			id: remind.id,
		});

		// タイマーセット
		this.setTimeoutWithPersistence(NOTIFY_INTERVAL > remind.expiredAt - Date.now() ? remind.expiredAt - Date.now() : NOTIFY_INTERVAL, {
			id: remind.id,
		});
	}
}

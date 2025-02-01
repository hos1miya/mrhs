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
		)
			return false;

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
								`・${remind.thing ? remind.thing : getQuoteLink(remind.quoteId)}`,
						)
						.join("\n"),
			);
			return true;
		}

		if (text.match(/^(.+?)\s(.+)/)) {
			text = text.replace(/^(.+?)\s/, "");
		} else {
			text = "";
		}

		const separatorIndex = text.indexOf(" "); // 最初のスペースの位置を取得（ユーザーIDと日付を区切るため）
		const secondSeparatorIndex = text.indexOf(" ", separatorIndex + 1); // 次のスペース（ユーザーIDと日付の区切り）
		// 内容部分を抽出
		const thing = text.slice(separatorIndex + 1, secondSeparatorIndex).trim();
		// 日付部分を抽出 指定がなければ30日
		const day = text.slice(secondSeparatorIndex + 1).trim();
		const daysQuery = (day || "").match(/([0-9]+)時間/);
		const days = daysQuery ? parseInt(daysQuery[1], 10) : 30;

		// 今日の日付の23:59:59を設定
		const now = new Date();
		const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

		if (
			(thing === "" && msg.quoteId == null) ||
			msg.visibility === "followers"
		) {
			msg.reply(serifs.reminder.invalid);
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
			expiredAt: endOfToday.getTime() + days * 24 * 60 * 60 * 1000,
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
		this.setTimeoutWithPersistence(NOTIFY_INTERVAL, {
			id: remind!.id,
		});

		return {
			reaction: "🆗",
			immediate: true,
		};
	}

	@bindThis
	private async contextHook(key: any, msg: Message, data: any) {
		if (msg.text == null) return;

		const remind = this.reminds.findOne({
			id: data.id,
		});

		if (remind == null) {
			this.unsubscribeReply(key);
			return;
		}

		const done = msg.includes(["done", "やった", "やりました", "はい"]);
		const cancel = msg.includes(["やめる", "やめた", "キャンセル"]);
		const isOneself = msg.userId === remind.userId;

		if ((done || cancel) && isOneself) {
			this.unsubscribeReply(key);
			this.reminds.remove(remind);
			msg.reply(
				done
					? getSerif(serifs.reminder.done(msg.friend.name))
					: serifs.reminder.cancel,
			);
			return;
		} else if (isOneself === false) {
			msg.reply(serifs.reminder.doneFromInvalidUser);
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
				await this.subaru.post({
					renoteId:
						remind.thing == null && remind.quoteId ? remind.quoteId : remind.id,
					text: acct(friend.doc.user) + " " + serifs.reminder.expired,
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
			reply = await this.subaru.post({
				renoteId:
					remind.thing == null && remind.quoteId ? remind.quoteId : remind.id,
				text: acct(friend.doc.user) + " " + serifs.reminder.notify(friend.name),
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
		this.setTimeoutWithPersistence(NOTIFY_INTERVAL, {
			id: remind.id,
		});
	}
}

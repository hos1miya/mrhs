import { bindThis } from "@/decorators.js";
import loki from "lokijs";
import Module from "@/module.js";
import Message from "@/message.js";
import config from "@/config.js";
import serifs from "@/serifs.js";

export default class extends Module {
	public readonly name = "follow";
	
	private pendingReqs!: loki.Collection<{
		id: string;
		requestedAt: number;
		rejected?: boolean;
	}>;

	@bindThis
	public install() {
		this.pendingReqs = this.subaru.getCollection("followRequests", {
			indices: ["userId"],
		});

		return {
			mentionHook: this.mentionHook,
			contextHook: this.contextHook,
			timeoutCallback: this.timeoutCallback,
		};
	}

	@bindThis
	private async mentionHook(msg: Message) {
		if (
			!msg.text ||
			!(msg.text.includes("フォロー") ||
				msg.text.includes("フォロバ") ||
				msg.text.includes("follow me") ||
				msg.text.includes("followreq clean"))
		) {
			return false;
		} else {
			this.log("Follow requested");
		}

		if (msg.text.includes("followreq clean") && msg.user.username === config.master && msg.user.host === null) {
			this.pendingReqs.clear();
			return {
				reaction: "🚮",
				immediate: true,
			};
		}
		
		this.log(`User host: ${msg.user.host}`);
		this.log(`User following status: ${msg.user.isFollowing ? msg.user.isFollowing : 'unknown'}`);
		const allowedHosts = config.followAllowedHosts || [];
		const followExcludeInstances = config.followExcludeInstances || [];

		// フォローリクエスト転送処理
		if (config.transferFollowRequests && !msg.user.isFollowing) {
			// 既にリクエストを受けているかチェック
			const exists = this.pendingReqs.find({
				id: msg.userId,
			});
			if (exists[0]) {
				// 拒否していればNG
				if (exists[0].rejected) {
					return {
						reaction: "🆖",
						immediate: true,
					};
				}
				return {
					reaction: "⌛",
					immediate: true,
				};
			}

			// レコード追加
			const request = this.pendingReqs.insertOne({
				id: msg.user.id,
				requestedAt: Date.now(),
			});

			if (request === undefined) {
				return {
					reaction: "⚠️",
					immediate: true,
				};
			}

			// masterへメッセージ送信
			const master: any = await this.subaru.api('users/show', { username: config.master, host: null });
			const notify = await this.subaru.post({
				text: msg.user.host
					? serifs.follow.requestReceivedWithHost(config.master, msg.user.name, msg.user.username, msg.user.host)
					: serifs.follow.requestReceived(config.master, msg.user.name, msg.user.username),
				visibility: 'specified',
				visibleUserIds: [ master.id ],
				noExtractMentions: true,
			});

			// フォロー可否の待ち受け
			this.subscribeReply(request.id, notify.id, {
				id: request.id,
			});

			// キャンセルの待ち受け
			this.subscribeReply(request.id, msg.id, {
				id: request.id,
			});

			// userへ返信
			msg.reply(serifs.follow.pleaseWaitForConfirm);

			// タイマーセット
			this.setTimeoutWithPersistence(1000 * 60 * 60 * 24 * 7, {
				id: request.id,
			});

			return {
				reaction: "🆗",
				immediate: true,
			};
		}

		if (
			!msg.user.isFollowing &&
			(
				msg.user.host == null ||
				msg.user.host === '' ||
				this.shouldFollowUser(
					msg.user.host,
					allowedHosts,
					followExcludeInstances
				)
			)
		) {
			try {
				await this.subaru.api("following/create", {
					userId: msg.userId,
				});
				return {
					reaction: msg.friend.love >= 0 ? "like" : null,
				};
			} catch (error) {
				if(error instanceof Error) this.log(`Failed to follow user: ${error.message}`);
				else this.log(`Failed to follow user: unknown API error`);
				return false;
			}
		} else if (!msg.user.isFollowing) {
			await msg.reply(serifs.follow.whoAreYou);
			return {
				reaction: msg.friend.love >= 0 ? "hmm" : null,
			};
		} else { // フォロー済み
			return false;
		}
	}
	
	@bindThis
	private async contextHook(key: any, msg: Message, data: any) {
		this.log('contextHook...');
		if (msg.text == null) return;

		const request = this.pendingReqs.findOne({
			id: data.id,
		});

		if (request == null) {
			this.unsubscribeReply(key);
			return;
		}

		const ok = msg.includes(["ok", "yes", "いい", "おっけー", "おけ"]);
		const ng = msg.includes(["ng", "no", "だめ", "駄目", "ダメ", "ノー"]);
		const cancel = msg.includes(["cancel", "キャンセル"]);

		// マスターによる承認、拒否
		if ((ok || ng) && msg.user.username === config.master && msg.user.host === null) {
			msg.reply(serifs.follow.okay);
			// OKならフォロー処理
			if (ok) {
				this.unsubscribeReply(key);
				this.pendingReqs.remove(request);
				await this.subaru.api('following/create', { userId: request.id });
			}
			// NGならrejectedに
			if (ng) {
				this.unsubscribeReply(key);
				request.rejected = true;
				this.pendingReqs.update(request);
			}
			return;
		}

		// userによるキャンセル
		if (cancel && (msg.user.username !== config.master || msg.user.host !== null)) {
			msg.reply(serifs.follow.okay);
			this.unsubscribeReply(key);
			this.pendingReqs.remove(request);
			return;
		}
	}

	@bindThis
	private async timeoutCallback(data) {
		const request = this.pendingReqs.findOne({
			id: data.id,
		});
		if (request == null) return;
		this.unsubscribeReply(
			request.id,
		);
		this.pendingReqs.remove(request)
		return;
	}

  /**
   * リモートユーザーをフォローすべきかどうかを判定する
   * @param host ユーザーのホスト
   * @param allowedHosts 許可されたホストのリスト
   * @param excludedHosts 除外されたホストのリスト
   * @returns フォローすべき場合はtrue、そうでない場合はfalse
	 * From https://github.com/Ruruke/ai
   */
	private shouldFollowUser(
		host: string,
		allowedHosts: string[],
		excludedHosts: string[]
	): boolean {
		// followAllowedHostsが存在する場合、followExcludeInstancesを無視する
		if (allowedHosts.length > 0) {
				return this.isHostAllowed(host, allowedHosts);
		}
		// followAllowedHostsが存在しない場合、followExcludeInstancesを適用する
		return !this.isHostExcluded(host, excludedHosts);
	}

	private isHostAllowed(host: string, allowedHosts: string[]): boolean {
		for (const allowedHost of allowedHosts) {
			if (allowedHost.startsWith("*")) {
				const domain = allowedHost.slice(1);
				if (host.endsWith(domain)) {
					return true;
				}
			} else if (host === allowedHost) {
				return true;
			}
		}
		return false;
	}

	private isHostExcluded(host: string,excludedHosts: string[]): boolean {
		for (const excludedHost of excludedHosts) {
				if (excludedHost.startsWith('*')) {
						const domain = excludedHost.slice(1);
						if (host.endsWith(domain)) {
								return true;
						}
				} else if (host === excludedHost) {
						return true;
				}
		}
		return false;
	}
}

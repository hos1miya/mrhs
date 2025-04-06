import { bindThis } from "@/decorators.js";
import loki from "lokijs";
import Module from "@/module.js";
import Message from "@/message.js";
import config from "@/config.js";

export default class extends Module {
	public readonly name = "follow";
	
	private pendingReqs!: loki.Collection<{
		userId: string;
		requestedAt: number;
	}>;

	@bindThis
	public install() {
		this.pendingReqs = this.subaru.getCollection("followRequests", {
			indices: ["userId"],
		});

		return {
			mentionHook: this.mentionHook,
		};
	}

	@bindThis
	private async mentionHook(msg: Message) {
		if (
			!msg.text ||
			!(msg.text.includes("フォロー") ||
				msg.text.includes("フォロバ") ||
				msg.text.includes("follow me"))
		) {
			return false;
		} else {
			this.log("Follow requested");
		}
		
		this.log(`User host: ${msg.user.host}`);
		this.log(`User following status: ${msg.user.isFollowing ? msg.user.isFollowing : 'unknown'}`);
		const allowedHosts = config.followAllowedHosts || [];
		const followExcludeInstances = config.followExcludeInstances || [];

		// ここにフォローリクエスト転送処理追加(followBackConfirmable)

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
			await msg.reply("きみは誰？");
			return {
				reaction: msg.friend.love >= 0 ? "hmm" : null,
			};
		} else { // フォロー済み
			return false;
		}
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

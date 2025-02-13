import { bindThis } from "@/decorators.js";
import Module from "@/module.js";
import Friend from "@/friend.js";
import serifs from "@/serifs.js";

export default class extends Module {
	public readonly name = "valentine";

	@bindThis
	public install() {
		this.crawleValentine();
		setInterval(this.crawleValentine, 1000 * 60 * 60 * 2);

		return {};
	}

	/**
	 * チョコ配り
	 */
	@bindThis
	private crawleValentine() {
		const now = new Date();

		const isValentine = now.getMonth() == (2 - 1) && now.getDate() == 14;
		if (!isValentine) return;
		this.log('Valentine Module Triggered...');

		const date = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

		const friends = this.subaru.friends.find({} as any);

		friends.forEach((f) => {
			const friend = new Friend(this.subaru, { doc: f });

			// 親愛度が5以上必要
			if (friend.love < 5) return;

			const data = friend.getPerModulesData(this);

			if (data.lastChocolated == date) return;

			this.log(`Give chocolate to ${friend.userId}`);

			data.lastChocolated = date;
			friend.setPerModulesData(this, data);

			const text = serifs.valentine.chocolateForYou(friend.name);

			this.subaru.sendMessage(friend.userId, {
				text: text,
			});
		});
	}
}

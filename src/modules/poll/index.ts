import { bindThis } from "@/decorators.js";
import Message from "@/message.js";
import Module from "@/module.js";
import serifs from "@/serifs.js";
import { genItem } from "@/vocabulary.js";
import config from "@/config.js";
import type { Note } from "@/misskey/note.js";

export default class extends Module {
	public readonly name = "poll";

	@bindThis
	public install() {
		if (!config.pollEnable) {
					return {};
		}
		setInterval(
			() => {
				if (Math.random() < 0.1) {
					this.post();
				}
			},
			1000 * 60 * 60,
		);

		return {
			mentionHook: this.mentionHook,
			timeoutCallback: this.timeoutCallback,
		};
	}

	@bindThis
	private async post() {
		const duration = 1000 * 60 * 15;

		const polls = [
			// TODO: Extract serif
			["珍しそうなもの", "みんなは、どれがいちばん珍しいと思うかな？"],
			["美味しそうなもの", "みんなは、どれがいちばん美味しいと思うかな？"],
			["重そうなもの", "みんなは、どれがいちばん重いと思うかな？"],
			["欲しいもの", "みんなは、どれがいちばん欲しいかな？"],
			[
				"無人島に持っていきたいもの",
				"みんなは、無人島にひとつ持っていけるとしたらどれにする？",
			],
			["家に飾りたいもの", "みんなは、家に飾るとしたらどれにする？"],
			["売れそうなもの", "みんなは、どれがいちばん売れそうだと思うかな？"],
			[
				"降ってきてほしいもの",
				"みんなは、どれが空から降ってきてほしいかな？",
			],
			["携帯したいもの", "みんなは、どれを携帯したいかな？"],
			["商品化したいもの", "みんなは、商品化するとしたらどれにする？"],
			[
				"発掘されそうなもの",
				"みんなは、遺跡から発掘されそうなものはどれだと思うかな？",
			],
			[
				"良い香りがしそうなもの",
				"みんなは、どれがいちばんいい香りがすると思うかな？",
			],
			[
				"高値で取引されそうなもの",
				"みんなは、どれがいちばん高値で取引されると思うかな？",
			],
			[
				"地球周回軌道上にありそうなもの",
				"みんなは、どれが地球周回軌道上を漂っていそうだと思うかな？",
			],
			[
				"プレゼントしたいもの",
				"みんなは、ぼくにプレゼントしてくれるとしたらどれにする？",
			],
			[
				"プレゼントされたいもの",
				"みんなは、プレゼントでもらうとしたらどれにする？",
			],
			[
				"ぼくが持ってそうなもの",
				"みんなは、ぼくが持ってそうなものはどれだと思うかな？",
			],
			["流行りそうなもの", "みんなは、どれが流行りそうだと思うかな？"],
			["朝ごはん", "みんなは、朝ごはんにどれが食べたいかな？"],
			["お昼ごはん", "みんなは、お昼ごはんにどれが食べたいかな？"],
			["お夕飯", "みんなは、お夕飯にどれが食べたいかな？"],
			["体に良さそうなもの", "みんなは、どれが体に良さそうだと思うかな？"],
			["後世に遺したいもの", "みんなは、どれを後世に遺したいかな？"],
			[
				"楽器になりそうなもの",
				"みんなは、どれが楽器になりそうだと思うかな？",
			],
			[
				"お味噌汁の具にしたいもの",
				"みんなは、お味噌汁の具にするとしたらどれがいいかな？",
			],
			[
				"ふりかけにしたいもの",
				"みんなは、どれをごはんにふりかけたいかな？",
			],
			["よく見かけるもの", "みんなは、どれをよく見かけるかな？"],
			[
				"道に落ちてそうなもの",
				"みんなは、道端に落ちてそうなものはどれだと思うかな？",
			],
			[
				"美術館に置いてそうなもの",
				"みんなは、この中で美術館に置いてありそうなものはどれだと思うかな？",
			],
			[
				"教室にありそうなもの",
				"みんなは、教室にありそうなものってどれだと思うかな？",
			],
			["絵文字になってほしいもの", "絵文字になってほしいものはどれかな？"],
			[
				"MissingKey本部にありそうなもの",
				"みんなは、MissingKey本部にありそうなものはどれだと思うかな？",
			],
			["いらないもの", "みんなは、どれが不要だと思うかな？"],
			["好きなおにぎりの具", "みんなの好きなおにぎりの具はなにかな？"],
		];

		const poll = polls[Math.floor(Math.random() * polls.length)];

		const choices = [genItem(), genItem(), genItem(), genItem()];

		const note = await this.subaru.post({
			text: poll[1],
			poll: {
				choices,
				expiredAfter: duration,
				multiple: false,
			},
		});

		// タイマーセット
		this.setTimeoutWithPersistence(duration + 3000, {
			title: poll[0],
			noteId: note.id,
		});
	}

	@bindThis
	private async mentionHook(msg: Message) {
		if (
			!msg.extractedText ||
			!msg.extractedText.startsWith("/poll") ||
			msg.user.username !== config.master ||
			msg.user.host !== null
		) {
			return false;
		} else {
			this.log("Manualy poll requested");
		}

		this.post();

		return true;
	}

	@bindThis
	private async timeoutCallback({ title, noteId }) {
		const note: Note = await this.subaru.api("notes/show", { noteId }) as Note;

		if (!note || !note.poll) return;

		const choices = note.poll.choices;

		let mostVotedChoice;

		for (const choice of choices) {
			if (mostVotedChoice == null) {
				mostVotedChoice = choice;
				continue;
			}

			if (choice.votes > mostVotedChoice.votes) {
				mostVotedChoice = choice;
			}
		}

		const mostVotedChoices = choices.filter(
			(choice) => choice.votes === mostVotedChoice.votes,
		);

		if (mostVotedChoice.votes === 0) {
			this.subaru.post({
				// TODO: Extract serif
				text: "投票はなかったみたい。",
				renoteId: noteId,
			});
		} else if (mostVotedChoices.length === 1) {
			this.subaru.post({
				// TODO: Extract serif
				cw: `${title}アンケートの結果発表だよ。`,
				text: `結果は${mostVotedChoice.votes}票の「${mostVotedChoice.text}」だったよ。`,
				renoteId: noteId,
			});
		} else {
			const choices = mostVotedChoices
				.map((choice) => `「${choice.text}」`)
				.join("と");
			this.subaru.post({
				// TODO: Extract serif
				cw: `${title}アンケートの結果発表だよ。`,
				text: `結果は${mostVotedChoice.votes}票の${choices}だったよ。`,
				renoteId: noteId,
			});
		}
	}
}

import { bindThis } from "@/decorators.js";
import Module from "@/module.js";
import serifs from "@/serifs.js";
import { genItem } from "@/vocabulary.js";
import request from "axios";

export default class extends Module {
	public readonly name = "earthquake_warning";

	private URL = {
		LATEST: "http://www.kmoni.bosai.go.jp/webservice/server/pros/latest.json",
		BASE: "http://www.kmoni.bosai.go.jp/webservice/hypo/eew/",
	};
	private diff_time = 0;
	private last_100_id: String[] = [];
	private now_loading = false;
	private error_count = 0;
	private readonly MAX_ERROR_RETRIES = 5;
	private readonly ERROR_COOLDOWN_MS = 60000; // 1 minute cooldown

	@bindThis
	public install() {
		request.defaults.timeout = 10000;
		this.do_init()
			.then(() => {
				setInterval(() => {
					try {
						this.run();
					} catch (e) {
						this.handleError(e);
					}
				}, 1000);
			})
			.catch(this.handleError);
		return {};
	}

	private handleError = (error: any) => {
		console.error("Earthquake warning module error:", error);
		this.error_count++;

		// If we've exceeded max error retries, stop trying
		if (this.error_count > this.MAX_ERROR_RETRIES) {
			console.error(
				"Max error retries exceeded. Stopping earthquake warning module.",
			);
			// Optionally send an alert or log
			this.putmsg("地震警報モジュールで継続的なエラーが発生しています。");
		}

		// Reset error count after cooldown
		setTimeout(() => {
			this.error_count = 0;
		}, this.ERROR_COOLDOWN_MS);
	};

	private timestr_to_obj(str: String) {
		let dt = str.split(" ");
		let ymd = dt[0].split("/");
		let hms = dt[1].split(":");
		return new Date(
			parseInt(ymd[0], 10),
			parseInt(ymd[1], 10) - 1,
			parseInt(ymd[2], 10),
			parseInt(hms[0], 10),
			parseInt(hms[1], 10),
			parseInt(hms[2], 10),
		);
	}

	private timedate_to_str(d: Date) {
		return (
			String(d.getFullYear()) +
			("0" + String(d.getMonth() + 1)).slice(-2) +
			("0" + String(d.getDate())).slice(-2) +
			("0" + String(d.getHours())).slice(-2) +
			("0" + String(d.getMinutes())).slice(-2) +
			("0" + String(d.getSeconds())).slice(-2)
		);
	}

	private timedate_to_ja_str(d: Date) {
		return (
			String(d.getFullYear()) +
			"/" +
			("0" + String(d.getMonth() + 1)).slice(-2) +
			"/" +
			("0" + String(d.getDate())).slice(-2) +
			" " +
			("0" + String(d.getHours())).slice(-2) +
			":" +
			("0" + String(d.getMinutes())).slice(-2) +
			":" +
			("0" + String(d.getSeconds())).slice(-2) +
			" JST"
		);
	}

	private rand_choice(a: Array<String>) {
		const r = Math.floor(Math.random() * a.length);
		return a[r];
	}

	private async do_init() {
		try {
			for (let i = 0; i < 1; i++) {
				const ctime = new Date();
				const response = (await request.get(this.URL.LATEST)).data;
				const svt = this.timestr_to_obj(response.latest_time);
				this.diff_time = Math.floor(svt.getTime() - ctime.getTime() - 1000);
			}
		} catch (error) {
			this.handleError(error);
			// Fallback: set diff_time to 0 or a default value
			this.diff_time = 0;
		}
	}

	private async run() {
		if (this.now_loading == true) return;
		this.now_loading = true;
		try {
			const response = (
				await request.get(
					this.URL.BASE +
						this.timedate_to_str(
							new Date(new Date().getTime() + this.diff_time),
						) +
						".json",
				)
			).data;
			this.now_loading = false;

			if (response.result.message == "" && response.is_training == false) {
				// have data
				if (this.last_100_id.indexOf(response.report_id) == -1) {
					// catch first
					if (response.is_cancel == false) {
						await this.doit(response);
					}
				} else if (response.is_cancel == true) {
					// cancel
					await this.do_cancel(response);
				} else if (response.is_final == true) {
					// final
					await this.do_final(response);
				}
			}
			while (this.last_100_id.length > 100) {
				this.last_100_id.shift();
			}
		} catch (e) {
			this.now_loading = false;
			this.handleError(e);
		}
	}

	private async doit(response) {
		const clc = parseInt(response.calcintensity.split()[0], 10);
		const mg = parseFloat(response.magunitude);
		if (clc < 3) {
			return; // 震度3以上のみ対象
		}
		if (clc < 4 && mg < 4) {
			return; // 震度４未満の場合、マグニチュード4.0未満は無視
		}
		this.last_100_id.push(response.report_id);
		let msg = "";
		if (clc < 4) {
			msg += this.rand_choice([
				"ゆれ……",
				"ゆれ?",
				"地震ですかね？",
				"揺れそうな気がします！",
				"ゆ……？",
				"ゆ？",
				"ぽよん！",
				":blobbounce:",
			]);
		} else if (clc == 4) {
			msg += this.rand_choice(["ゆれ……！", "地震です！！", "結構揺れます！"]);
		} else if (clc == 5) {
			msg += this.rand_choice([
				"ゆれます……！　おおきいです！！",
				"かなり揺れます！",
			]);
		} else if (clc == 6) {
			msg += this.rand_choice(["大地震です！！", "めちゃくちゃ揺れます！"]);
		} else if (clc >= 7) {
			msg += this.rand_choice(["！！　大地震です！！"]);
		}
		msg += "\n\n";
		msg +=
			this.timedate_to_ja_str(new Date()) + "頃、地震速報を受信しました！\n";
		msg +=
			response.region_name +
			"あたりで震度" +
			response.calcintensity +
			"位の揺れが予想されます！\n";
		msg +=
			"マグニチュードは" +
			response.magunitude +
			"、震源の深さは" +
			response.depth +
			"みたいです。\n";
		await this.putmsg(msg);
	}

	private async do_cancel(response) {
		let msg =
			"さっき" + response.region_name + "で揺れたのは気のせいみたいです！";
		await this.putmsg(msg);
	}

	private async do_final(response) {
		// DO NOTHING
	}

	private async putmsg(msg: String) {
		try {
			this.subaru.post({
				text: msg,
			});
		} catch (error) {
			console.error("Error sending message:", error);
		}
	}
}

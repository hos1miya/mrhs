// DENCO(H) bootstrapper

import process from "node:process";
import chalk from "chalk";
import got from "got";
import promiseRetry from "promise-retry";

import すばる from "./subaru.js";
import config from "./config.js";
import _log from "./utils/log.js";
// import pkg from '../package.json' assert { type: 'json' };
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pkg = require("../package.json");

import SafetyModule from "./modules/safety/index.js";
import CoreModule from "./modules/core/index.js";
import TalkModule from "./modules/talk/index.js";
import BirthdayModule from "./modules/birthday/index.js";
//import ReversiModule from "./modules/reversi/index.js";
import PingModule from "./modules/ping/index.js";
import EmojiModule from "./modules/emoji/index.js";
import EmojiReactModule from "./modules/emoji-react/index.js";
import FortuneModule from "./modules/fortune/index.js";
import GuessingGameModule from "./modules/guessing-game/index.js";
import KazutoriModule from "./modules/kazutori/index.js";
import KeywordModule from "./modules/keyword/index.js";
import WelcomeModule from "./modules/welcome/index.js";
import TimerModule from "./modules/timer/index.js";
import DiceModule from "./modules/dice/index.js";
import ServerModule from "./modules/server/index.js";
import FollowModule from "./modules/follow/index.js";
import ValentineModule from "./modules/valentine/index.js";
import MazeModule from './modules/maze/index.js';
import ChartModule from "./modules/chart/index.js";
import SleepReportModule from "./modules/sleep-report/index.js";
import NotingModule from "./modules/noting/index.js";
import PollModule from './modules/poll/index.js';
import ReminderModule from "./modules/reminder/index.js";
import CheckCustomEmojisModule from "./modules/check-custom-emojis/index.js";
//import EarthQuakeWarningModule from "./modules/earthquake_warning/index.js";
import DenChatModule from "./modules/denchat/index.js";
import ServerObserveModule from "./modules/server-observe/index.js";
import HashModule from "./modules/hash/index.js";
import WeatherModule from "./modules/weather/index.js";

console.log(" ____    _____   _   _   _____   _____    __         __  ");
console.log("|    \\  | ____| | \\ | | |  ___| |  _  |  / _| _   _ |_ \\ ");
console.log("| |\\  | | |___  |  \\| | | |     | | | | | /  | |_| |  \\ |");
console.log("| | | | |  ___| | \\ | | | |     | | | | ||   |  _  |   ||");
console.log("| |/  | | |___  | |\\  | | |___  | |_| | | \\_ |_| |_| _/ |");
console.log("|____/  |_____| |_| \\_| |_____| |_____|  \\__|       |__/ \n");

function log(msg: string): void {
	_log(`[Boot]: ${msg}`);
}

log(chalk.bold(`Subaru v${pkg._v}`));

process.on("uncaughtException", (err) => {
	try {
		console.error(`Uncaught exception: ${err.message}`);
		console.dir(err, { colors: true, depth: 2 });
	} catch {}
});

promiseRetry(
	(retry) => {
		log(`Account fetching... ${chalk.gray(config.host)}`);

		// アカウントをフェッチ
		return got
			.post(`${config.apiUrl}/i`, {
				json: {
					i: config.i,
				},
			})
			.json()
			.catch(retry);
	},
	{
		retries: 3,
	},
)
	.then((account) => {
		// @ts-ignore
		const acct = `@${account.username}`;
		log(chalk.green(`Account fetched successfully: ${chalk.underline(acct)}`));

		log("Starting DENCO(H)...");

		// すばる起動
		// @ts-ignore
		new すばる(account, [
			new SafetyModule(),
			new CoreModule(),

			// 他モジュールで引っ掛かるワードが含まれていそうなものから優先初期化
			// chatはフリートークなので一番引っかかる可能性が高い
			new DenChatModule(),

			// reminderも内容が自由なのでその次に引っかかる可能性が高い
			new ReminderModule(),

			// 挨拶もちょっとした文章が付いてきそう
			new TalkModule(),						// 挨拶

			// コマンド単体で実行されやすいもの(余計な文章が少なそうなもの)は後
			new ChartModule(),					// チャート
			new PingModule(),						// ping
			new PollModule(),						// 投票(/poll)
			new CheckCustomEmojisModule(),		// カスタム絵文字チェック(福笑いが発火すると困るので福笑いより先)
			new EmojiModule(),					// 福笑い(絵文字)
			new FortuneModule(),				// 占い
			new GuessingGameModule(),		// 数当て
			new KazutoriModule(),				// 数取り
			//new ReversiModule(),			// リバーシ
			new TimerModule(),					// タイマー(～分・～時間)
			new DiceModule(),						// サイコロ(～d～)
			new MazeModule(),						// 迷路
			new FollowModule(),					// フォロー
			new KeywordModule(),				// 単語紹介
			new HashModule(),						// ハッシュ計算

			// mentionHook無しモジュール
			new EmojiReactModule(),
			new WelcomeModule(),
			new ServerModule(),
			new BirthdayModule(),
			new ValentineModule(),
			new SleepReportModule(),
			new NotingModule(),
			//new EarthQuakeWarningModule(),
			new ServerObserveModule(),
			new WeatherModule(),
		]);
	})
	.catch((e) => {
		log(chalk.red("Failed to fetch the account"));
	});

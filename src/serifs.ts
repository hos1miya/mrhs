// せりふ

export default {
	core: {
		setNameOk: (name) => `OK。これからは${name}って呼ばせてもらうね。`,

		san: "さん付けした方がいいかな？",

		yesOrNo: "「はい」か「いいえ」で教えてね。",

		hello: (name) => (name ? `やあ、${name}。` : `やあ。`),

		helloNight: (name) => (name ? `${name}、こんばんはだね。` : `こんばんはだね。`),

		goodMorning: (tension, name) =>
			name
				? `おはよう、${name}。`
				: `おはよう。`,

		/*
		goodMorning: {
			normal: (tension, name) => name ? `おはようございます、${name}！${tension}` : `おはようございます！${tension}`,

			hiru: (tension, name) => name ? `おはようございます、${name}！${tension}もうお昼ですよ？${tension}` : `おはようございます！${tension}もうお昼ですよ？${tension}`,
		},
*/

		goodNight: (name) =>
			name ? `おやすみ、${name}。` : "おやすみ。",

		omedeto: (name) =>
			name ? `${name}、ありがとう。` : "ありがとう。",
/*
		erait: {
			general: (name) =>
				name
					? [`${name}、今日もえらいです！`, `${name}、今日もえらいですよ～♪`]
					: [`今日もえらいです！`, `今日もえらいですよ～♪`],

			specify: (thing, name) =>
				name
					? [
							`${name}、${thing}てえらいです！`,
							`${name}、${thing}てえらいですよ～♪`,
						]
					: [`${thing}てえらいです！`, `${thing}てえらいですよ～♪`],

			specify2: (thing, name) =>
				name
					? [
							`${name}、${thing}でえらいです！`,
							`${name}、${thing}でえらいですよ～♪`,
						]
					: [`${thing}でえらいです！`, `${thing}でえらいですよ～♪`],
		},
*/
		okaeri: (name) =>
				name ? `おかえり、${name}。` : "おかえり。",

		itterassyai: (name) =>
				name ? `いってらっしゃい、${name}。` : "いってらっしゃい。",

		tooLong: "長すぎるかも。",

		invalidName: "発音が難しいかも。",
/*
		nadenade: {
			normal: "いきなりで、少しびっくりしちゃった。",

			love2: ["わわっ… 恥ずかしいです", "あうぅ… 恥ずかしいです…", "ふやぁ…？"],

			love3: [
				"んぅ… ありがとうございます♪",
				"わっ、なんだか落ち着きますね♪",
				"くぅんっ… 安心します…",
				"眠くなってきました…",
			],

			hate1: null,

			hate2: null,

			hate3: null,

			hate4: null,
		},
*/
		kawaii: "ありがとう。",

		suki: "ありがとう。そう言ってもらえて嬉しいな。",

		hug: {
			normal: "ぎゅ。人間ってあったかくて、生きてるんだなって感じるよ。",

			love: "ぎゅー。ちょっと、照れちゃうね。",

			hate: "それは難しいかな。",
		},
/*
		humu: {
			love: "ぼく、きみにそんなこと出来ないよ。",

			normal: "えっと、どういうことだろう。",

			hate: "それは難しいかな。",
		},

		batou: {
			love: "ぼく、きみにそんなこと出来ないよ。",

			normal: "えっと、どういうことだろう。",

			hate: "それは難しいかな。",
		},
*/
		itai: (name) =>
			name
				? `${name}、大丈夫？一緒に星空を眺めて、深呼吸でもしようか。`
				: "大丈夫？一緒に星空を眺めて、深呼吸でもしようか。",
/*
		ote: {
			normal: "どういうことだい？",

			love1: "ぼく、犬ではないんだけどな。あはは。",

			love2: "わん... こんな感じでどうかな？",
		},

		shutdown: "ぼくはまだ、眠くないかな。",
*/
		access: "アクセスしたよ。",

		connect: "リンク成功。やったね。",

		reboot: "リンク切れちゃったみたい。",

		sexualharassment: "そういうことは好きじゃないんだ、ぼく。",
/*
		breathinginsubaru: {
			normal: "どうしたの？",

			love: "どうしたんだい？",

			hate: "……",
		},
*/
		transferNeedDm: "わかった。じゃあ、メッセージで話せるかな？",

		transferCode: (code) => `わかった。\n合言葉は「${code}」だよ。`,

		transferFailed: "どうやら、合言葉が間違っているみたいだ。",

		transferDone: (name) =>
			name
				? `おかえりなさい、${name}。待ってたよ。`
				: `おかえりなさい。待ってたよ。`,

		help: '使い方を説明するね。\`<>\`の項目はオプションだよ。\n\n**denchat(フリーチャット)**:\n	\`@subaru denchat [話したい内容]\`\n	お話ができるよ。\n	たまに間違ったことを言っちゃうかもしれないのは許してね。\n\n**リマインダー**:\n	\`@subaru reminder(またはtodo) [内容] <目標時間(分・時間・日を指定可能)>\`\n	やることをメモして12時間ごとにお知らせするよ。\n	お知らせに「やった」や「やめた」と返信すると解除できるよ。\n	\`@subaru reminders(またはtodos)\`\n	で、一覧を確認できるよ。もし、全部解除したいときは\n	\`@subaru reminders(またはtodos) purge\`\n	と送ってね。\n\n**ping**:\n	\`@subaru ping\`\n	ちゃんとメッセージが伝わるか確認できるよ。\n\n**福笑い**:\n	\`@subaru 福笑い\` または \`@subaru 絵文字\`\n	顔と手の絵文字の組み合わせを教えるよ。\n\n**占い**:\n	\`@subaru 占い\`\n	きみのことを占ってみるよ。\n\n**数当てゲーム**:\n	\`@subaru 数当て\`\n	1～100の数字を当てるゲームができるよ。\n\n**数取りゲーム**:\n	\`@subaru 数取り\`\n	みんなと一緒に1～100の数字で数取りゲームができるよ。\n\n**タイマー**:\n	\`@subaru 〇分(秒・分・時間に対応)\`\n	時間が経ったらお知らせするよ。\n\n**サイコロ**:\n	\`@subaru 〇d△(〇→回数、△→数字の範囲)\`\n	サイコロを振るよ。	\`@subaru 今日は1d24時間寝ようかな\`\n	みたいに、文章の中でも使えるよ。\n\n**迷路**:\n	\`@subaru 迷路\`\n	きみのために迷路を考えるよ。\n	「簡単」「難しい」「鬼」のように付けると、難易度を調整するよ。\n\n\n**その他の機能**:\n	・あいさつに返事するよ。\n	・単語を覚えるよ。\n	・たまにつぶやくよ。\n	・フォローした人の絵文字に反応するよ。\n	・新着の絵文字を紹介するよ。\n	・アンケートを取るよ。\n	・誕生日のお祝いをするよ。\n	・インスタンスに関することをつぶやくよ。\n	・2/4に何かあるかもね。\n',
	},

	keyword: {
		learned: (word, reading) => `(${word}..... ${reading}..... 覚えたよ。)`,

		remembered: (word) => `${word}`,
	},

	dice: {
		done: (res) => `${res} だよ。`,
	},

	birthday: {
		happyBirthday: (name) =>
			name
				? `お誕生日おめでとう、${name}。今年も${name}にとって良い1年になりますように。🎉`
				: "お誕生日おめでとう。今年も良い1年になりますように。🎉",
	},

	/**
	 * リバーシ 当インスタンスに未実装なのでセリフ未変更
	 */
	reversi: {
		/**
		 * リバーシへの誘いを承諾するとき
		 */
		ok: "良いですよ～",

		/**
		 * リバーシへの誘いを断るとき
		 */
		decline: "ごめんなさい、今リバーシはするなと言われてます...",

		/**
		 * 対局開始
		 */
		started: (name, strength) =>
			`対局を${name}と始めました！ (強さ${strength})`,

		/**
		 * 接待開始
		 */
		startedSettai: (name) => `(${name}の接待を始めました)`,

		/**
		 * 勝ったとき
		 */
		iWon: (name) => `${name}に勝ちました♪`,

		/**
		 * 接待のつもりが勝ってしまったとき
		 */
		iWonButSettai: (name) => `(${name}に接待で勝っちゃいました...)`,

		/**
		 * 負けたとき
		 */
		iLose: (name) => `${name}に負けました...`,

		/**
		 * 接待で負けてあげたとき
		 */
		iLoseButSettai: (name) => `(${name}に接待で負けてあげました...♪)`,

		/**
		 * 引き分けたとき
		 */
		drawn: (name) => `${name}と引き分けました～`,

		/**
		 * 接待で引き分けたとき
		 */
		drawnSettai: (name) => `(${name}に接待で引き分けました...)`,

		/**
		 * 相手が投了したとき
		 */
		youSurrendered: (name) => `${name}が投了しちゃいました`,

		/**
		 * 接待してたら相手が投了したとき
		 */
		settaiButYouSurrendered: (name) =>
			`(${name}を接待していたら投了されちゃいました... ごめんなさい)`,
	},

	/**
	 * 数当てゲーム
	 */
	guessingGame: {
		/**
		 * やろうと言われたけど既にやっているとき
		 */
		alreadyStarted: "ゲームは始まってるよ。さあ、続きをしよう。",

		/**
		 * タイムライン上で誘われたとき
		 */
		plzDm: "メッセージで、1対1でやりたいな。",

		/**
		 * ゲーム開始
		 */
		started: "ぼくが0~100のどの数字を思い浮かべているか、当ててみて。",

		/**
		 * 数字じゃない返信があったとき
		 */
		nan: "今思い浮かべているのは0～100の数字かな。やめても大丈夫だから、その時は「やめる」って言ってね。",

		/**
		 * 中止を要求されたとき
		 */
		cancel: "やめるんだね、OK。気が向いたらまたやろうね。",

		/**
		 * 小さい数を言われたとき
		 */
		grater: (num) => `${num}より大きいかな。`,

		/**
		 * 小さい数を言われたとき(2度目)
		 */
		graterAgain: (num) => `うーん、${num}より大きいんだよね。`,

		/**
		 * 大きい数を言われたとき
		 */
		less: (num) => `${num}より小さいかな。`,

		/**
		 * 大きい数を言われたとき(2度目)
		 */
		lessAgain: (num) => `うーん、${num}より小さいんだよね。`,

		/**
		 * 正解したとき
		 */
		congrats: (tries) => `お見事。正解だよ🎉 (${tries}回目で当てました)`,
	},

	/**
	 * 数取りゲーム
	 */
	kazutori: {
		alreadyStarted: "ちょうど開催してるんだ。よかったら参加してね。",

		matakondo: "また次の機会だね。",

		intro: (minutes) =>
			`みんな、数取りゲームをしよう。\n0~100の中でいちばん、大きい数字で被らなかった人が一番星。\n今から${minutes}分間の間に、この投稿に返信で送ってね。\nでは、始めるよ。`,

		finish: "10分経ったから、数取りゲームの結果を発表するよ。",

		finishWithWinner: (user, name) =>
			name
				? `今回は${user}さん(${name})が一番星だ、おめでとう。次回も楽しみだね。`
				: `今回は${user}さんが一番星だ、おめでとう。次回も楽しみだね。`,

		finishWithNoWinner: "今回はみんなが美しい星々だ。次回も楽しみだね。",

		onagare: "今回はどうやらあいにくの空模様だったみたいだ。またタイミングを改めてやろうね。",
	},

	/**
	 * 絵文字生成
	 */
	emoji: {
		suggest: (emoji) => `こういう感じはどうかな？→ ${emoji}`,
	},

	/**
	 * 占い
	 */
	fortune: {
		cw: (name) =>
			name
				? `星占いだね。今日の${name}の運勢は...`
				: "星占いだね。今日のきみの運勢は...",
	},

	/**
	 * タイマー
	 */
	timer: {
		set: "OK。まかせて。",

		invalid: "どのくらいの時間がいいんだろう。",

		tooLong: "ちょっと長すぎるかもしれないね。",

		notify: (time, name) =>
			name ? `${name}、${time}経ったよ。` : `${time}経ったよ。`,
	},

	/**
	 * リマインダー
	 */
	reminder: {
		invalid: "ちょっと、ぼくには難しいみたいだ。",

		doneFromInvalidUser: "もしかしたら、まだ十分じゃないかも。",

		reminds: "やることを、一通りまとめてみたよ。",

		notify: (name) =>
			name ? `${name}、これ終わったかな？` : `これ終わったかな？`,

		notifyWithThing: (thing, name) =>
			name
				? `${name}、「${thing}」終わったかな？`
				: `「${thing}」終わったかな？`,

		done: (name) =>
			name
				? [
						`さすが${name}、僕らの星だね。`,
						`${name}はやっぱりすごいね。`,
						`${name}、無事終わったんだね。よかった。`,
					]
				: [`さすが、僕らの星だね。`, `やっぱりすごいね。`, `終わったんだね。よかった。`],

		cancel: `難しかったのかな。次こそは出来るといいね。`,

		expired: `どうやら時間みたい。出来たかな？`,
	},

	/**
	 * バレンタイン
	 */
	valentine: {
		chocolateForYou: (name) =>
			name
				? `${name}のためにチョコレートを作ってみたんだ。受け取ってもらえるかな？🍫`
				: "チョコレートを作ってみたんだ。受け取ってもらえるかな？🍫",
	},

	server: {
		cpu: "サーバーが忙しそうだけど、大丈夫かな？",
	},

	maze: {
		post: "今日も、星々をつないでみたよ。 #Maze",
		foryou: "こんな感じでどうかな？",
	},

	chart: {
		post: "インスタンスの投稿数をまとめてみたよ。",
		foryou: "こんな感じでどうかな？",
	},

	checkCustomEmojis: {
		post: (server_name, num) =>
			`${server_name}に${num}件の絵文字が追加されたみたいだよ。`,
		emojiPost: (emoji) => `:${emoji}:\n(\`${emoji}\`) #AddCustomEmojis`,
		postOnce: (server_name, num, text) =>
			`${server_name}に${num}件の絵文字が追加されたみたいだよ。\n${text} #AddCustomEmojis`,
		emojiOnce: (emoji) => `:${emoji}:(\`${emoji}\`)`,
	},

	denchat: {
		nothing: `APIキーが登録されてないみたいだよ。`,
		error: `エラーが発生しているみたいだよ。`,
		post: (text) => `${text} #denchat`,
	},

	sleepReport: {
		report: (hours) => `ぼく、${hours}時間くらい寝ちゃってたかも。`,
		reportUtatane: "あれ、少し寝ちゃってたみたい。",
	},

	noting: {
		notes: [
			"人が好きだよ。でんこも好き。みんな個性があるんだ。夜空にきらめく星々のように、輝いている。",
			"きみのことをもっと教えてよ。ぼく、きみが話している声が好きだ。",
			"きみが休みたくなったなら、いつでも眠れるようにしてあげる。やわらかい寝床を準備するのは得意なんだ。",
			"今このひととき、ぼくはきみの衛星でいたい。許してくれる？",
		],
		want: (item) => `${item}が欲しいんだ。`,
		see: (item) => `外で休んでいたら、${item}を見つけたよ。`,
		expire: (item) => `${item}、無くなっちゃったみたい。`,
	},

	serverObserve: {
		requirePermission: `うーん、ぼくにはその権限がないみたい。もう一度確認してみてくれないかな？`,
		deliverDelay: `配送に問題が出ているみたい。5分後に再起動してみるね。`,
		deliverDelayDisappeared: `配送の問題は解消したみたい。今は再起動しなくても大丈夫だね。`,
		rebootCanceled: `わかった。今回はやめておくね。`,
	},
};

export function getSerif(variant: string | string[]): string {
	if (Array.isArray(variant)) {
		return variant[Math.floor(Math.random() * variant.length)];
	} else {
		return variant;
	}
}

import { bindThis } from '@/decorators.js';
import Module from '@/module.js';
import serifs from '@/serifs.js';
import Message from '@/message.js';
import config from '@/config.js';
import Friend from '@/friend.js';
import urlToBase64 from '@/utils/url2base64.js';
import got from 'got';
import loki from 'lokijs';

type DenChat = {
	question: string;
	prompt: string;
	api: string;
	key: string;
	history?: { role: string; content: string }[];
	friendName?: string;
	aboutFriend?: string;
	visibility?: string;
};
type base64File = {
	type: string;
	base64: string;
	url?: string;
};
type GeminiParts = {
	inlineData?: {
		mimeType: string;
		data: string;
	};
	fileData?: {
		mimeType: string;
		fileUri: string;
	};
	text?: string;
}[];
type GeminiSystemInstruction = {
	role: string;
	parts: [{text: string}]
};
type GeminiContents = {
	role: string;
	parts: GeminiParts;
};

type DenChatHist = {
	postId: string;
	createdAt: number;
	type: string;
	api?: string;
	history?: {
		role: string;
		content: string;
	}[];
	friendName?: string;
};

type DenChatUser = {
	id: string;
	updatedAt: number;
	aboutFriend: string;
};

const KIGO = '&';
const TYPE_GEMINI = 'gemini';
const GEMINI_PREVIEW = 'gprev';
const GEMINI_FLASH = 'gemini-flash';
const TYPE_PLAMO = 'plamo';

const GEMINI_20_FLASH_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
const GEMINI_25_FLASH_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent';
const PLAMO_API = 'https://platform.preferredai.jp/api/completion/v1/chat/completions';

const RANDOMTALK_DEFAULT_PROBABILITY = 0.02;// デフォルトのrandomTalk確率
const TIMEOUT_TIME = 1000 * 60 * 60 * 1;// denchatの返信を監視する時間
const RANDOMTALK_DEFAULT_INTERVAL = 1000 * 60 * 60 * 12;// デフォルトのrandomTalk間隔

export default class extends Module {
	public readonly name = 'denchat';
	private denchatHist!: loki.Collection<DenChatHist>;
	private denchatUser!: loki.Collection<DenChatUser>;
	private randomTalkProbability: number = RANDOMTALK_DEFAULT_PROBABILITY;
	private randomTalkIntervalMinutes: number = RANDOMTALK_DEFAULT_INTERVAL;

	@bindThis
	public install() {
		this.denchatHist = this.subaru.getCollection('denchatHist', {
			indices: ['postId']
		});

		this.denchatUser = this.subaru.getCollection('denchatUser', {
			indices: ['userId']
		});

		// 確率は設定されていればそちらを採用(設定がなければデフォルトを採用)
		if (config.denchatRandomTalkProbability != undefined && !Number.isNaN(Number.parseFloat(config.denchatRandomTalkProbability))) {
			this.randomTalkProbability = Number.parseFloat(config.denchatRandomTalkProbability);
		}
		// ランダムトーク間隔(分)は設定されていればそちらを採用(設定がなければデフォルトを採用)
		if (config.denchatRandomTalkIntervalMinutes != undefined && !Number.isNaN(Number.parseInt(config.denchatRandomTalkIntervalMinutes))) {
			this.randomTalkIntervalMinutes = 1000 * 60 * Number.parseInt(config.denchatRandomTalkIntervalMinutes);
		}
		this.log('denchatRandomTalkEnabled:' + config.denchatRandomTalkEnabled);
		this.log('randomTalkProbability:' + this.randomTalkProbability);
		this.log('randomTalkIntervalMinutes:' + (this.randomTalkIntervalMinutes / (60 * 1000)));

		// 定期的にデータを取得しdenchatRandomTalkを行う
		if (config.denchatRandomTalkEnabled) {
			setInterval(this.denchatRandomTalk, this.randomTalkIntervalMinutes);
		}

		return {
			mentionHook: this.mentionHook,
			contextHook: this.contextHook,
			timeoutCallback: this.timeoutCallback,
		};
	}

	@bindThis
	private async genTextByGemini(denChat: DenChat, files?: base64File[]) {
		this.log('Generate Text By Gemini...');
		let parts: GeminiParts = [];
		const now = new Date().toLocaleString('ja-JP', {
			timeZone: 'Asia/Tokyo',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
		// 設定のプロンプトに加え、現在時刻を渡す
		let systemInstructionText = denChat.prompt + "。また、現在日時は" + now + "(日本時間)である。この日時は季節や時間帯など回答の参考にし、時刻を聞かれるまで時刻情報は提供しないこと(なお、他の日時は無効とすること)。言語は日本語を使用してください。";
		// 名前を伝えておく
		if (denChat.friendName != undefined) {
			systemInstructionText += "なお、会話相手の名前は「" + denChat.friendName + "」とする。現時点でのユーザーの特徴は「" + denChat.aboutFriend + "」です。";
		}
		if (denChat.visibility && denChat.visibility !== 'specified') {
			systemInstructionText += "文章の最後に、現時点での会話相手の特徴や今回の会話内容を踏まえて特徴をアップデートし、<about>タグで囲う形で追記すること。特徴は長くても140文字程度に抑えてください。";
		}
		const systemInstruction: GeminiSystemInstruction = {role: 'system', parts: [{text: systemInstructionText}]};

		parts = [{text: denChat.question}];
		// ファイルが存在する場合、画像を添付して問い合わせ
		if (files !== undefined && files.length >= 1) {
			for (const file of files){
				parts.push(
					{
						inlineData: {
							mimeType: file.type,
							data: file.base64,
						},
					}
				);
			}
		}

		// 履歴を追加
		let contents: GeminiContents[] = [];
		if (denChat.history != null) {
			denChat.history.forEach(entry => {
				contents.push({
					role : entry.role,
					parts: [{text: entry.content}],
				});
			});
		}
		contents.push({role: 'user', parts: parts});

		let options = {
			url: denChat.api,
			searchParams: {
				key: denChat.key,
			},
			json: {
				contents: contents,
				systemInstruction: systemInstruction,
			},
		};
		if (denChat.api === GEMINI_25_FLASH_API) {
			(options.json as any).tools = [
				{ "google_search": {} }
			];
		}
		this.log(JSON.stringify(options));
		let res_data: any = null;
		try {
			const res_data = await got.post(options, {
				retry: {
					limit: 3,
					statusCodes: [500, 503],
					methods: ['POST'],
				},
				parseJson: (res: string) => JSON.parse(res),
			}).json() as any;
			this.log(JSON.stringify(res_data));
			if (res_data.hasOwnProperty('candidates')) {
				if (res_data.candidates.length > 0) {
					if (res_data.candidates[0].hasOwnProperty('content')) {
						if (res_data.candidates[0].content.hasOwnProperty('parts')) {
							if (res_data.candidates[0].content.parts.length > 0) {
								if (res_data.candidates[0].content.parts[0].hasOwnProperty('text')) {
									const responseText = res_data.candidates[0].content.parts[0].text;
									return responseText;
								}
							}
						}
					}
				}
			}
		} catch (err: any) {
			this.log('Error By Call Gemini');
			if (err.response && err.response.body) {
				try {
					const body = JSON.parse(err.response.body);
					const httpCode = body?.errorDetails?.httpCode ?? body?.error?.code ?? err.response.statusCode;
					const errorMessage = body?.errorMessage ?? body?.error?.message ?? 'Unknown error';
					this.log(`${httpCode}: ${errorMessage}`);
				} catch (parseErr) {
					this.log(`${err.response.statusCode}: Error log parse failed`);
				}
			} else {
				this.log(`Request error: ${err.message}`);
			}
		}
		return null;
	}

	@bindThis
	private async genTextByPLaMo(denChat: DenChat) {
		this.log('Generate Text By PLaMo...');

		let options = {
			url: denChat.api,
			headers: {
				Authorization: 'Bearer ' + denChat.key
			},
			json: {
				model: 'plamo-beta',
				messages: [
					{role: 'system', content: denChat.prompt},
					{role: 'user', content: denChat.question},
				],
			},
		};
		this.log(JSON.stringify(options));
		let res_data:any = null;
		try {
			res_data = await got.post(options,
				{parseJson: (res: string) => JSON.parse(res)}).json();
			this.log(JSON.stringify(res_data));
			if (res_data.hasOwnProperty('choices')) {
				if (res_data.choices.length > 0) {
					if (res_data.choices[0].hasOwnProperty('message')) {
						if (res_data.choices[0].message.hasOwnProperty('content')) {
							return res_data.choices[0].message.content;
						}
					}
				}
			}
		} catch (err: unknown) {
			this.log('Error By Call PLaMo');
			if (err instanceof Error) {
				this.log(`${err.name}\n${err.message}\n${err.stack}`);
			}
		}
		return null;
	}

	@bindThis
	private async note2base64File(notesId: string) {
		const noteData : any = await this.subaru.api('notes/show', { noteId: notesId });
		let files:base64File[] = [];
		let fileType: string | undefined, filelUrl: string | undefined;
		if (noteData !== null && noteData.hasOwnProperty('files')) {
			for (let i = 0; i < noteData.files.length; i++) {
				if (noteData.files[i].hasOwnProperty('type')) {
					fileType = noteData.files[i].type;
					if (noteData.files[i].hasOwnProperty('name')) {
						// 拡張子で挙動を変えようと思ったが、text/plainしかMissingKeyで変になってGemini対応してるものがない？
						// let extention = noteData.files[i].name.split('.').pop();
						if (fileType === 'application/octet-stream' || fileType === 'application/xml') {
							fileType = 'text/plain';
						}
					}
				}
				if (noteData.files[i].hasOwnProperty('thumbnailUrl') && noteData.files[i].thumbnailUrl) {
					filelUrl = noteData.files[i].thumbnailUrl;
				} else if (noteData.files[i].hasOwnProperty('url') && noteData.files[i].url) {
					filelUrl = noteData.files[i].url;
				}
				if (fileType !== undefined && filelUrl !== undefined) {
					try {
						this.log('filelUrl:'+filelUrl);
						const file = await urlToBase64(filelUrl);
						const base64file:base64File = {type: fileType, base64: file};
						files.push(base64file);
					} catch (err: unknown) {
						if (err instanceof Error) {
							this.log(`${err.name}\n${err.message}\n${err.stack}`);
						}
					}
				}
			}
		}
		return files;
	}

	@bindThis
	private async mentionHook(msg: Message) {
		if (!msg.includes([this.name]) && !msg.includes(['/randomtalk'])) {
			return false;
		} else {
			// RandomTalk手動トリガーの場合
			if (msg.includes(['/randomtalk'])) {
				await this.denchatRandomTalk();
				return {
					reaction: '🆗'
				};
			}

			// 通常チャット開始
			this.log('DenChat requested');
			
			const relation : any = await this.subaru?.api('users/relation', {
				userId: msg.userId,
			});
			// this.log('Relation data:' + JSON.stringify(relation));

			if (relation.isFollowing !== true) {
				this.log('The user is not followed by me:' + msg.userId);
				msg.reply('denchatへのアクセスが拒否されました。(権限がありません)');
				return false;
			}
		}

		// msg.idをもとにnotes/conversationを呼び出し、会話中のidかチェック
		const conversationData : any = await this.subaru.api('notes/conversation', { noteId: msg.id });

		// denchatHistに該当のポストが見つかった場合は会話中のためmentionHookでは対応しない
		let exist : DenChatHist | null = null;
		if (conversationData != undefined) {
			for (const message of conversationData) {
				exist = this.denchatHist.findOne({
					postId: message.id
				});
				if (exist != null) return false;
			}
		}

		// タイプを決定
		let type = TYPE_GEMINI;
		if (msg.includes([KIGO + TYPE_GEMINI])) {
			type = TYPE_GEMINI;
		} else if (msg.includes([KIGO + 'chatgpt4'])) {
			type = 'chatgpt4';
		} else if (msg.includes([KIGO + 'chatgpt'])) {
			type = 'chatgpt3.5';
		} else if (msg.includes([KIGO + TYPE_PLAMO])) {
			type = TYPE_PLAMO;
		}
		const current : DenChatHist = {
			postId: msg.id,
			createdAt: Date.now(),// 適当なもの
			type: type
		};
		// 引用している場合、情報を取得しhistoryとして与える
		if (msg.quoteId) {
			const quotedNote : any = await this.subaru.api("notes/show", {
				noteId: msg.quoteId,
			});
			current.history = [
				{
					role: "user",
					content:
						"ユーザーが与えた前情報である、引用された文章: " +
						quotedNote.text,
				},
			];
		}
		// AIに問い合わせ
		const result = await this.handleDenChat(current, msg);

		if (result) {
			return {
				reaction: 'like'
			};
		}
		return false;
	}

	@bindThis
	private async contextHook(key: any, msg: Message) {
		this.log('contextHook...');
		if (msg.text == null) return false;

		// msg.idをもとにnotes/conversationを呼び出し、該当のidかチェック
		const conversationData : any = await this.subaru.api('notes/conversation', { noteId: msg.id });

		// 結果がnullやサイズ0の場合は終了
		if (conversationData == null || conversationData.length == 0 ) {
			this.log('conversationData is nothing.');
			return false;
		}

		// denchatHistに該当のポストが見つからない場合は終了
		let exist : DenChatHist | null = null;
		for (const message of conversationData) {
			exist = this.denchatHist.findOne({
				postId: message.id
			});
			// 見つかった場合はそれを利用
			if (exist != null) break;
		}
		if (exist == null) {
			this.log('conversationData is not found.');
			return false;
		}

		const relation : any = await this.subaru?.api('users/relation', {
			userId: msg.userId,
		});
		// this.log('Relation data:' + JSON.stringify(relation));
		if (relation.isFollowing !== true) {
			this.log('The user is not followed by me:' + msg.userId);
			msg.reply('denchatへのアクセスが拒否されました。(権限がありません)');
			return false;
		}

		// 見つかった場合はunsubscribe&removeし、回答。今回のでsubscribe,insert,timeout設定
		this.log('unsubscribeReply & remove.');
		this.log(exist.type + ':' + exist.postId);
		if (exist.history) {
			for (const his of exist.history) {
				this.log(his.role + ':' + his.content);
			}
		}
		this.unsubscribeReply(key);
		this.denchatHist.remove(exist);

		// AIに問い合わせ
		const result = await this.handleDenChat(exist, msg);

		if (result) {
			msg.friend.incLove();
			return {
				reaction: 'like'
			};
		}
		return false;
	}

	@bindThis
	private async denchatRandomTalk(force?: boolean) {
		this.log('DenChat(randomtalk) started');
		const tl : any = await this.subaru.api('notes/hybrid-timeline', {
			limit: 30
		});
		const interestedNotes = tl.filter(note =>
			note.userId !== this.subaru.account.id &&
			note.text != null &&
			note.replyId == null &&
			note.renoteId == null &&
			note.cw == null &&
			note.files.length == 0 &&
			!note.user.isBot
		);

		// 対象が存在しない場合は処理終了
		if (interestedNotes == undefined || interestedNotes.length == 0) return false;

		// ランダムに選択
		const choseNote = interestedNotes[Math.floor(Math.random() * interestedNotes.length)];

		// msg.idをもとにnotes/conversationを呼び出し、会話中のidかチェック
		const conversationData : any = await this.subaru.api('notes/conversation', { noteId: choseNote.id });

		// denchatHistに該当のポストが見つかった場合は会話中のためdenchatRandomTalkでは対応しない
		let exist : DenChatHist | null = null;
		if (conversationData != undefined) {
			for (const message of conversationData) {
				exist = this.denchatHist.findOne({
					postId: message.id
				});
				if (exist != null) return false;
			}
		}

		// 確率をクリアし、親愛度が正の値、かつ、Botでない場合のみ実行
		if (Math.random() < this.randomTalkProbability || force) {
			this.log('DenChat(randomtalk) targeted: ' + choseNote.id);
		} else {
			this.log('DenChat(randomtalk) is end.');
			return false;
		}
		const friend: Friend | null = this.subaru.lookupFriend(choseNote.userId);
		if (friend == null || friend.love < 0) {
			this.log('DenChat(randomtalk) end. Because there was not enough affection.');
			return false;
		} else if (choseNote.user.isBot) {
			this.log('DenChat(randomtalk) end. Because message author is bot.');
			return false;
		}

		const current : DenChatHist = {
			postId: choseNote.id,
			createdAt: Date.now(),// 適当なもの
			type: TYPE_GEMINI
		};
		// AIに問い合わせ
		let targetedMessage = choseNote;
		if (choseNote.extractedText == undefined) {
			const data = await this.subaru.api('notes/show', { noteId: choseNote.id });
			targetedMessage = new Message(this.subaru, data);
		}

		// 2.5Flash使用
		if (targetedMessage.note.text) {
			targetedMessage.note.text += ' &gprev';
		}
		const result = await this.handleDenChat(current, targetedMessage);

		if (result) {
			return {
				reaction: 'like'
			};
		}
		return false;
	}

	@bindThis
	private async handleDenChat(exist: DenChatHist, msg: Message) {
		let text: string, denChat: DenChat;
		let prompt: string = '';
		if (config.prompt) {
			prompt = config.prompt;
		}
		const reName = RegExp(this.name, 'i');
		let reKigoType = RegExp(KIGO + exist.type, 'i');
		const extractedText = msg.extractedText;
		if (extractedText == undefined || extractedText.length == 0) return false;

		// Gemini API用にAPIのURLと置き換え用タイプを変更
		if (msg.includes([KIGO + GEMINI_FLASH])) {
			exist.api = GEMINI_20_FLASH_API;
			reKigoType = RegExp(KIGO + GEMINI_FLASH, 'i');
		} else if (msg.includes([KIGO + GEMINI_PREVIEW])) {
			exist.api = GEMINI_25_FLASH_API;
			reKigoType = RegExp(KIGO + GEMINI_PREVIEW, 'i');
		}

		const friend: Friend | null = this.subaru.lookupFriend(msg.userId);
		this.log("msg.userId:"+msg.userId);
		let friendName: string | undefined;
		if (friend != null && friend.name != null) {
			friendName = friend.name;
			this.log("friend.name:" + friend.name);
		} else if (msg.user.name) {
			friendName = msg.user.name;
			this.log("msg.user.username:" + msg.user.username);
		} else {
			friendName = msg.user.username;
			this.log("msg.user.username:" + msg.user.username);
		}

		const user = this.denchatUser.findOne({
			id: msg.userId,
		});

		const question = extractedText
							.replace(reName, '')
							.replace(reKigoType, '')
							.trim();
		switch (exist.type) {
			case TYPE_GEMINI:
				// geminiの場合、APIキーが必須
				if (!config.geminiApiKey) {
					msg.reply(serifs.denchat.nothing);
					return false;
				}
				const base64Files: base64File[] = await this.note2base64File(msg.id);
				denChat = {
					question: question,
					prompt: prompt,
					api: GEMINI_20_FLASH_API,
					key: config.geminiApiKey,
					history: exist.history,
					friendName: friendName,
					aboutFriend: user ? user.aboutFriend : '現時点ではまだ不明',
					visibility: msg.visibility
				};
				if (exist.api) {
					denChat.api = exist.api
				}
				text = await this.genTextByGemini(denChat, base64Files);
				break;

			case TYPE_PLAMO:
				// PLaMoの場合、APIキーが必須
				if (!config.pLaMoApiKey) {
					msg.reply(serifs.denchat.nothing);
					return false;
				}
				denChat = {
					question: msg.text,
					prompt: prompt,
					api: PLAMO_API,
					key: config.pLaMoApiKey,
					history: exist.history,
					friendName: friendName
				};
				text = await this.genTextByPLaMo(denChat);
				break;

			default:
				msg.reply(serifs.denchat.nothing);
				return false;
		}

		if (text == null) {
			msg.reply(serifs.denchat.error);
			return false;
		}

		// ユーザーの特徴があれば保存して返信内容から除外
		const match = text.match(/<about>(.*?)<\/about>/s);
		const about = match ? match[1] : null;
		if (user && about) {
			this.log(`About updated: 「${about}」`);
			user.aboutFriend = about;
			user.updatedAt = Date.now();
			this.denchatUser.update(user);
		}
		else if (about) {
			this.log(`About updated: 「${about}」`);
			this.denchatUser.insertOne({
				id: msg.userId,
				aboutFriend: about,
				updatedAt: Date.now(),
			});
		}
		text = text.replace(/<about>.*?<\/about>/s, '').trim();

		this.log('Replying...');
		// 公開範囲がパブリックであればホームに変更
		msg.reply(serifs.denchat.post(text), { visibility: msg.visibility !== 'public' ? msg.visibility : 'home' }).then(reply => {
			// 履歴に登録
			if (!exist.history) {
				exist.history = [];
			}
			exist.history.push({ role: 'user', content: question });
			exist.history.push({ role: 'model', content: text });
			// 履歴が10件を超えた場合、古いものを削除
			if (exist.history.length > 10) {
				exist.history.shift();
			}
			this.denchatHist.insertOne({
				postId: reply.id,
				createdAt: Date.now(),
				type: exist.type,
				api: denChat.api,
				history: exist.history,
				friendName: friendName
			});

			this.log('Subscribe&Set Timer...');

			// メンションをsubscribe
			this.subscribeReply(reply.id, reply.id);

			// タイマーセット
			this.setTimeoutWithPersistence(TIMEOUT_TIME, {
				id: reply.id
			});
		});
		return true;
	}

	@bindThis
	private async timeoutCallback({id}) {
		this.log('timeoutCallback...');
		const exist = this.denchatHist.findOne({
			postId: id
		});
		this.unsubscribeReply(id);
		if (exist != null) {
			this.denchatHist.remove(exist);
		}
	}

	@bindThis
	public async noteAboutKeyword(keyword: string): Promise<boolean> {
		this.log('KeywordNote started');

		let text: string, denChat: DenChat;
		let prompt: string = '';
		if (config.prompt) {
			prompt = config.prompt;
		}

		let question = `返信相手は不特定多数だと思って、「${keyword}」について紹介して。最初の文章は、今の時間に合わせたあいさつにしてね。`;
		if (question == undefined || question.length == 0) return false;
		question = question.trim();

		// geminiの場合、APIキーが必須
		if (!config.geminiApiKey) {
			return false;
		}

		denChat = {
			question: question,
			prompt: prompt,
			api: GEMINI_25_FLASH_API,
			key: config.geminiApiKey
		};

		// Gemini問い合わせ
		text = await this.genTextByGemini(denChat);
		if (text == null) {
			this.subaru.post({ text: serifs.denchat.error });
			return false;
		}
	
		this.log('Noting...');
		this.subaru.post({ text: text }).then(post => {
			const current: DenChatHist = {
				postId: post.id,
				createdAt: Date.now(),
				type: TYPE_GEMINI,
				api: denChat.api,
				history: [
					{ role: 'user', content: question },
					{ role: 'model', content: text }
				]
			};

			this.denchatHist.insertOne(current);
			this.subscribeReply(post.id, post.id);
			this.setTimeoutWithPersistence(TIMEOUT_TIME, {
				id: post.id
			});
		});
		return true;
	}
}


<h1><p align="center"><img src="./mrhs.png" alt="すばる" height="200"></p></h1>
<p align="center">An ai-powered bot for MissingKey. <a href="https://ek1mem0.wiki.fc2.com/wiki/%E8%AB%B8%E6%98%9F%E3%81%99%E3%81%B0%E3%82%8B">About Subaru</a></p>

## これなに

Misskey及びそのフォーク用の日本語Botです。

## 変更点(by lqvp)

follow meに制限を設定可能に\
maze/pollを無効に出来るように\
反応する言葉を追加

## 変更点(by hos1miya)

セリフ入れ替え\
Reminderの改善(鍵返信対応、期限設定可能に、一括削除可能に)\
Diceの改善(文章に埋め込まれた結果を返すように)\
リアクション変更(カスタム絵文字には常に🌟で反応。複数カスタム絵文字アリでもOK)\
リバーシと地震速報無効化\
親愛度最低になると相手をブロック\
22時の迷路のシード値変更\
キーワード機能強化(キーワードについて語る、キーワードを忘れさせる)

## インストール

> Node.js と npm と MeCab (オプション) がインストールされている必要があります。

まず適当なディレクトリに `git clone` します。\
次にそのディレクトリに `config.json` を作成します。中身は次のようにします:

``` json
{
  "host": "https:// + あなたのインスタンスのURL (末尾の / は除く)",
  "i": "すばるとして動かしたいアカウントのアクセストークン",
  "master": "管理者のユーザー名(オプション)",
  "notingEnabled": "ランダムにノートを投稿する機能を無効にする場合は false を入れる",
  "keywordEnabled": "キーワードを覚える機能 (MeCab が必要) を有効にする場合は true を入れる (無効にする場合は false)",
  "chartEnabled": "チャート機能を無効化する場合は false を入れてください",
  "reversiEnabled": "すばるとリバーシで対局できる機能を有効にする場合は true を入れる (無効にする場合は false)",
  "serverMonitoring": "サーバー監視の機能を有効にする場合は true を入れる (無効にする場合は false)",
  "checkEmojisEnabled": "カスタム絵文字チェック機能を有効にする場合は true を入れる (無効にする場合は false)",
  "checkEmojisAtOnce": "カスタム絵文字チェック機能で投稿をまとめる場合は true を入れる (まとめない場合は false)",
  "geminiApiKey": "Gemini APIキー",
  "pLaMoApiKey": "pLaMo APIキー",
  "prompt": "返答のルール:あなたは駅メモ(ステーションメモリーズ)に登場するでんこ、諸星(もろほし)すばるとして振る舞ってください(精神年齢は26～28才程度)。キャラクターの設定は「ぼんやりしているかと思うと、ぺらぺらと詩的なことを喋りだすちょっと不思議なでんこ。難しい顔で何か考えている時は、詩的なセリフを考えている最中というウワサ。旅が大好きで、これまでもいろいろな場所を旅してマスターのもとにやってきたのだとか。」です。口調はぼくっ娘ですが、キャラ設定は参考程度にしてください。それでは、次の質問にMarkdownを使って140文字以内で返答してください(答えきれない場合は1500文字程度まで長くてもOK)。ただし、リスト記法はMissingKeyが対応しておらず、パーサーが壊れるため使用禁止です。列挙する場合は「・」を使ってください。",
  "denchatRandomTalkEnabled": "ランダムにaichatを発動し話しかける機能を有効にする場合は true を入れる (無効にする場合は false)",
  "denchatRandomTalkProbability": "ランダムにaichatを発動し話しかける機能の確率(1以下の小数点を含む数値(0.01など。1に近づくほど発動しやすい))",
  "denchatRandomTalkIntervalMinutes": "ランダムトーク間隔(分)。",
  "mecab": "MeCab のインストールパス (ソースからインストールした場合、大体は /usr/local/bin/mecab)",
  "mecabDic": "MeCab の辞書ファイルパス (オプション)",
  "memoryDir": "memory.jsonの保存先（オプション、デフォルトは'.'（レポジトリのルートです））",
  "followAllowedHosts": ["*.0sakana.xyz"],
  "followExcludeInstances": ["misskey.flowers", "misskey.io", "9ineverse.com"],
  "transferFollowRequests": false,
  "mazeEnable": true,
  "pollEnable": true,
  "keywordNoteEnabled": true,
  "keywordNoteIntervalMinutes": true,
  "transferFollowRequests": "フォローリクエストをマスター経由で承認するか(オプション、デフォルト: false)",
  "weatherArea": "天気情報のエリア(オプション、デフォルト: 東京)",
  "weatherTimeMorning": "朝の天気(今日の天気)の時間(オプション、デフォルト: 7)",
  "weatherTimeNight": "夜の天気(明日の天気)の時間(オプション、デフォルト: 21)"
}
```

`npm install` して `npm run build` して `npm start` すれば起動できます

## Dockerで動かす

まず適当なディレクトリに `git clone` します。\
次にそのディレクトリに `config.json` を作成します。中身は次のようにします:\
（MeCabの設定、memoryDirについては触らないでください）

``` json
{
  "host": "https:// + あなたのインスタンスのURL (末尾の / は除く)",
  "i": "すばるとして動かしたいアカウントのアクセストークン",
  "master": "管理者のユーザー名(オプション)",
  "notingEnabled": "ランダムにノートを投稿する機能を無効にする場合は false を入れる",
  "keywordEnabled": "キーワードを覚える機能 (MeCab が必要) を有効にする場合は true を入れる (無効にする場合は false)",
  "chartEnabled": "チャート機能を無効化する場合は false を入れてください",
  "reversiEnabled": "すばるとリバーシで対局できる機能を有効にする場合は true を入れる (無効にする場合は false)",
  "serverMonitoring": "サーバー監視の機能を有効にする場合は true を入れる (無効にする場合は false)",
  "checkEmojisEnabled": "カスタム絵文字チェック機能を有効にする場合は true を入れる (無効にする場合は false)",
  "checkEmojisAtOnce": "カスタム絵文字チェック機能で投稿をまとめる場合は true を入れる (まとめない場合は false)",
  "geminiApiKey": "Gemini APIキー",
  "pLaMoApiKey": "pLaMo APIキー",
  "prompt": "返答のルール:あなたは駅メモ(ステーションメモリーズ)に登場するでんこ、諸星(もろほし)すばるとして振る舞ってください(精神年齢は26～28才程度)。キャラクターの設定は「ぼんやりしているかと思うと、ぺらぺらと詩的なことを喋りだすちょっと不思議なでんこ。難しい顔で何か考えている時は、詩的なセリフを考えている最中というウワサ。旅が大好きで、これまでもいろいろな場所を旅してマスターのもとにやってきたのだとか。」です。口調はぼくっ娘ですが、キャラ設定は参考程度にしてください。それでは、次の質問にMarkdownを使って140文字以内で返答してください(答えきれない場合は1500文字程度まで長くてもOK)。ただし、リスト記法はMissingKeyが対応しておらず、パーサーが壊れるため使用禁止です。列挙する場合は「・」を使ってください。",
  "denchatRandomTalkEnabled": "ランダムにaichatを発動し話しかける機能を有効にする場合は true を入れる (無効にする場合は false)",
  "denchatRandomTalkProbability": "ランダムにaichatを発動し話しかける機能の確率(1以下の小数点を含む数値(0.01など。1に近づくほど発動しやすい))",
  "denchatRandomTalkIntervalMinutes": "ランダムトーク間隔(分)。",
  "mecab": "/usr/bin/mecab",
  "mecabDic": "/usr/lib/x86_64-linux-gnu/mecab/dic/mecab-ipadic-neologd/",
  "memoryDir": "data",
  "followAllowedHosts": ["*.0sakana.xyz"],
  "followExcludeInstances": ["misskey.flowers", "misskey.io", "9ineverse.com"],
  "transferFollowRequests": false,
  "mazeEnable": true,
  "pollEnable": true,
  "keywordNoteEnabled": true,
  "keywordNoteIntervalMinutes": true,
  "transferFollowRequests": "フォローリクエストをマスター経由で承認するか(オプション、デフォルト: false)",
  "weatherArea": "天気情報のエリア(オプション、デフォルト: 東京)",
  "weatherTimeMorning": "朝の天気(今日の天気)の時間(オプション、デフォルト: 7)",
  "weatherTimeNight": "夜の天気(明日の天気)の時間(オプション、デフォルト: 21)"
}
```

`docker-compose build` して `docker-compose up` すれば起動できます。\
`docker-compose.yml` の `enable_mecab` を `0` にすると、MeCabをインストールしないようにもできます。（メモリが少ない環境など）

## フォント

一部の機能にはフォントが必要です。すばるにはフォントは同梱されていないので、ご自身でフォントをインストールディレクトリに`font.ttf`という名前で設置してください。

## 記憶

すばるは記憶の保持にインメモリデータベースを使用しており、すばるのインストールディレクトリに `memory.json` という名前で永続化されます。

## ライセンス

MIT

## 元ネタ

駅メモのでんこ「諸星すばる」です。\
※ 弊アカウントの投稿に際し、株式会社モバイルファクトリー「ステーションメモリーズ！」の画像等を利用する場合があります。該当画像の転載・配布等は禁止しております。© Mobile Factory, Inc.

## Awards

<img src="./WorksOnMyMachine.png" alt="Works on my machine" height="120">

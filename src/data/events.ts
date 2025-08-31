/* INLINE CSV EDITION — 外部fetch/.env不要。ここ1ファイルで完結します。 */
/* 使い方：
   1) 下の CSV_TEXT に dialogues.csv を"ヘッダ行ごと"コピペ
   2) コードからは speakByPlayerId(playerId, eventKey) を呼ぶだけ
   3) フォールバック禁止（同キャラ内の順位系エイリアスのみ許容）
*/

export type EventKey =
  // start
  | "EVT_PLAYERS_CONFIRMED"
  | "DEALT_HAND_EVAL"
  | "AUTO_PLACE_SEVENS"
  | "STARTER_DECIDED"
  // turn / think
  | "TURN_START"
  | "NO_LEGAL_MOVES_DETECTED"
  | "DOOMED_DETECTED"
  | "MULTIPLE_LEGAL_MOVES"
  | "PASS_WARNING"
  // play（出し方のニュアンス）
  | "PLAY_NORMAL"
  | "PLAY_CARD" // カードを出すときの基本発話
  | "OPEN_NEW_END"
  | "EXTEND_EXISTING_END"
  | "UNBLOCK_SELF_SUIT"
  | "OPEN_OPP_WAIT"
  | "RUNOUT_PUSH"
  | "DUMP_RISKY_ENDCARD"
  // pass 系
  | "PASS_DECIDED" // 自分がパスを決めた時
  | "PASS_STRATEGIC"
  | "PASS_STREAK_OBSERVED"
  | "MUST_PLAY_STATE"
  | "ELIM_RISK_WARNING"
  // block 系
  | "HOLD_BLOCK_SUIT"
  | "KEEP_HOLD_BLOCK"
  | "RELEASE_BLOCK"
  | "OPP_BLOCK_RELEASED"
  // AKリンク系
  | "AK_COMPLETE_TO_A"
  | "AK_COMPLETE_TO_K"
  // elimination
  | "SELF_ELIMINATED"
  | "OTHER_ELIMINATED"
  | "ELIMINATION_MASS_PLACEMENT"
  // endgame
  | "HAND_COUNT_TWO"
  | "HAND_COUNT_ONE"
  | "DOOMED_DETECTED"
  | "WINNER"
  | "FINISH_POSITION"
  | "FINISH_1ST"
  | "FINISH_2ND"
  | "FINISH_3RD"
  | "FINISH_OTHER"
  | "FINISH_WIN" // 勝利時の発話
  | "FINISH_FOUL" // ファウル時の発話
  | "FINISH_PASS_OVER" // パス超過時の発話
  | "LAST_PLACE_CONFIRMED" // 最下位確定時の発話
  // 他者行動への反応
  | "OTHER_OPP_NORMAL" // 他人がカードを出した（影響なし）
  | "OTHER_OPP_BLOCK" // 他人のカード出しで自分がブロックされた
  | "OTHER_PASS_NORMAL" // 他人がパスした（影響なし）
  | "OTHER_PASS_RISK" // 他人がパス → 自分もリスク状態
  // （互換のため既存キーも維持）
  | "ELIMINATED_BY_PASS_LIMIT" // ドボン専用（旧実装互換）
  // thinking
  | "THINKING"; // 思考中表示

export type Character =
  | "1主"
  | "2主"
  | "3主"
  | "4主"
  | "5主"
  | "6主"
  | "7主"
  | "8主"
  | "9主"
  | "10主"
  | "11主";

/* ==== ここにCSV全文をペースト ==== */
const CSV_TEXT = String.raw`

id,character,event_key,line_ja_1,line_ja_2,line_ja_3
1,1主,EVT_PLAYERS_CONFIRMED,よっし,よろしくな,負けないぞ
1,2主,EVT_PLAYERS_CONFIRMED,よろしくおねがいします！,やるからには勝つぞ,しちならべ？ななならべ？
1,3主,EVT_PLAYERS_CONFIRMED,やるぞー,俺に勝てるかな？,ま、考えれば勝てるだろ
1,4主,EVT_PLAYERS_CONFIRMED,よろしく,負けたやつは玄関掃除な,来週の献立を考えねば…
1,5主,EVT_PLAYERS_CONFIRMED,パパ頑張っちゃうぞ,ポーカーの方が得意かなあ,お手柔らかに
1,6主,EVT_PLAYERS_CONFIRMED,よろしく！,お兄ちゃんのいいとこ見せちゃう,妹たちにいいとこ見せるぞ
1,7主,EVT_PLAYERS_CONFIRMED,よろしくね,やるからには負けないよ,「７」並べだからね！負けないよ！
1,8主,EVT_PLAYERS_CONFIRMED,よろしくお願いします,華麗に勝ちますよ〜,7並べで強いのは、8なんですよね
1,9主,EVT_PLAYERS_CONFIRMED,頑張ります！,負けませんよ！,7主さんのゲームですか？
1,10主,EVT_PLAYERS_CONFIRMED,やるぞ！,よろしくな！,7こい、7こい…
1,11主,EVT_PLAYERS_CONFIRMED,やるからには負けられません,恥ずかしいけど…やります！,がんばります
3,1主,DEALT_HAND_EVAL,うーむ,なるほど,よし…やるぞ！
3,2主,DEALT_HAND_EVAL,これでたたかうのか,わかったぞ,いいてふだだ
3,3主,DEALT_HAND_EVAL,なるほどね,よし、やろう,これは勝てるな
3,4主,DEALT_HAND_EVAL,…。なるほど,こういう手札か,これは負けはないな
3,5主,DEALT_HAND_EVAL,ありがとう！,ふ〜む、なるほどね,ここで役作れそうだけどなあ…
3,6主,DEALT_HAND_EVAL,お兄ちゃん把握！,よ〜し,見て見てこれ…てダメだった
3,7主,DEALT_HAND_EVAL,ふーん、なるほど,ちゃんと混ざってる？,よし、勝てそうだよ！
3,8主,DEALT_HAND_EVAL,ありがとうございます,…そうでもありそうです,ふふ、勝てそうですよ〜
3,9主,DEALT_HAND_EVAL,こうですか…,導きがありました！,いい手札ですね
3,10主,DEALT_HAND_EVAL,こう来たか…,いい引きだな、さすが俺,圧勝しちゃうかもな
3,11主,DEALT_HAND_EVAL,うう、恥ずかしい…,把握できました…,…勝てます！
4,1主,AUTO_PLACE_SEVENS,7あったよ,,
4,2主,AUTO_PLACE_SEVENS,7があったぞ！,,
4,3主,AUTO_PLACE_SEVENS,ほい、7,,
4,4主,AUTO_PLACE_SEVENS,7だ,,
4,5主,AUTO_PLACE_SEVENS,7だよ〜,,
4,6主,AUTO_PLACE_SEVENS,7だぜ！,,
4,7主,AUTO_PLACE_SEVENS,いえーい、7!,7が集まってきちゃうねえ,
4,8主,AUTO_PLACE_SEVENS,7ですよ！,,
4,9主,AUTO_PLACE_SEVENS,7です！,,
4,10主,AUTO_PLACE_SEVENS,7だな,,
4,11主,AUTO_PLACE_SEVENS,7です！…呼び捨てではないです！,,
5,1主,STARTER_DECIDED,俺が一番だな,さて、どうするか,
5,2主,STARTER_DECIDED,さいしょだ！,いちばんか…,
5,3主,STARTER_DECIDED,ふふ、当然の一番だ,俺のターン！！,
5,4主,STARTER_DECIDED,俺が一番か,…じゃあ、どうしようかな,
5,5主,STARTER_DECIDED,一番だね,おねだりしてもいいよ,
5,6主,STARTER_DECIDED,お兄ちゃんいちばん！,お兄ちゃんのターン！,
5,7主,STARTER_DECIDED,当たり前に僕だよね,一番って嬉しいねえ,
5,8主,STARTER_DECIDED,いえい、僕からですよ！,…何が欲しいですか？,
5,9主,STARTER_DECIDED,僕からです！,いちばん、嬉しいです！,
5,10主,STARTER_DECIDED,俺からだ！,俺のことよく見てるじゃん,
5,11主,STARTER_DECIDED,うう、恥ずかしい…僕からです！,…見られると恥ずかしいですよ,
6,1主,TURN_START,よーし,よぉし,どうするか
6,2主,TURN_START,よし！,やるぞ！,どうしようかな
6,3主,TURN_START,どうしたい？,やるかー,俺のターン！
6,4主,TURN_START,やるか,俺か,どうするかな
6,5主,TURN_START,やるよ,いくよ,何がほしい？
6,6主,TURN_START,いくぜ！,お兄ちゃんのターン！,さ〜て
6,7主,TURN_START,やるよ〜,ガンガンいくよ！,どうしようかな
6,8主,TURN_START,いきますよ〜,さーて、どうしますか,僕のこと待ってますか？
6,9主,TURN_START,行きますよ！,どうしましょうか,油断しないでくださいね
6,10主,TURN_START,よっし,どうするか…,俺のことよく見てるじゃん
6,11主,TURN_START,…やります！,いきますよ,…見られると恥ずかしいです
7,1主,NO_LEGAL_MOVES_DETECTED,うっ…,おっと…,なるほど…
7,2主,NO_LEGAL_MOVES_DETECTED,あれ！？,これって…,むむ…
7,3主,NO_LEGAL_MOVES_DETECTED,げっ…,やなやつがいるな…,…。
7,4主,NO_LEGAL_MOVES_DETECTED,…！,どいつだ…？,うう…。
7,5主,NO_LEGAL_MOVES_DETECTED,うわ…,焦らしプレイかい？,困ったな…
7,6主,NO_LEGAL_MOVES_DETECTED,え！,お兄ちゃん困り,なるほどね〜
7,7主,NO_LEGAL_MOVES_DETECTED,うわっ,…,誰だい？
7,8主,NO_LEGAL_MOVES_DETECTED,うわっ,誰ですか〜？,…なるほどです
7,9主,NO_LEGAL_MOVES_DETECTED,あれっ？,これって…,…困りました…
7,10主,NO_LEGAL_MOVES_DETECTED,どいつだ？,…うーん…,困ったな…
7,11主,NO_LEGAL_MOVES_DETECTED,あれっ…,…！,…恥ずかしい…
8,1主,MULTIPLE_LEGAL_MOVES,どうするか…,どう出るか…,うーん…
8,2主,MULTIPLE_LEGAL_MOVES,うーん…,どうするかな,むむ…
8,3主,MULTIPLE_LEGAL_MOVES,…。,どうするか…,何を出すと思う？
8,4主,MULTIPLE_LEGAL_MOVES,ふむ…。,どうするか…,悩むな
8,5主,MULTIPLE_LEGAL_MOVES,悩むなあ,焦らしプレイもいいよね,どうしようかな
8,6主,MULTIPLE_LEGAL_MOVES,お兄ちゃんシンキング,なるほど…,ZZZ…
8,7主,MULTIPLE_LEGAL_MOVES,どうしようかなあ,みんな、どういう気分？,迷うな〜
8,8主,MULTIPLE_LEGAL_MOVES,…そうでもありますね,みなさんどれが欲しいですか？,迷いますねえ
8,9主,MULTIPLE_LEGAL_MOVES,迷っちゃいます,…どうしましょう,何がいいですか？
8,10主,MULTIPLE_LEGAL_MOVES,迷うなあ,俺的には…,どう出るか…
8,11主,MULTIPLE_LEGAL_MOVES,……（迷っている）,迷っちゃいます、恥ずかしい,お待たせしてます…！
9,1主,PASS_WARNING,…げげげ,もう後がないか…,もうパスできないのか！？
9,2主,PASS_WARNING,もうパスできないのか！？,…うーん、最後のパスだったか…,はいすいのじんだ
9,3主,PASS_WARNING,おっと…,最後のパスか,追い詰められたなあ
9,4主,PASS_WARNING,最後か…,…最後のパスか？,…うーん…
9,5主,PASS_WARNING,パス最後だったね,追い詰められると燃えるよね,ピンチだなあ
9,6主,PASS_WARNING,お兄ちゃんピンチ？,お兄ちゃんパスラスト？,え？もうパスできないの？
9,7主,PASS_WARNING,え？もう最後？,…ちょっとゾクゾクするね,最後のパスかあ〜…はっ！
9,8主,PASS_WARNING,えっ、いまの最後ですか？,いまの最後ですよねえ〜…,どうしようかなあ
9,9主,PASS_WARNING,え！？もうパスなしですか？,えーと、天使の加護とか…,もう一声…
9,10主,PASS_WARNING,うーん、天使の加護とか…どう？,げげ、もうパスなしだよな,パス回数終わった？
9,11主,PASS_WARNING,…！！,パス…最後でした？,…追い詰められても、やります
10,1主,PLAY_NORMAL,これだ,ここで,ほい
10,2主,PLAY_NORMAL,これだ！,これをだすぞ,ここだ
10,3主,PLAY_NORMAL,ここで,ほい,これで
10,4主,PLAY_NORMAL,ここで,これで,これだ
10,5主,PLAY_NORMAL,ここだね,はい,つなげるよ
10,6主,PLAY_NORMAL,ここだ,これだ,はい
10,7主,PLAY_NORMAL,はい,出すよ,ここで
10,8主,PLAY_NORMAL,はーい,出しますよ,ありがたがってください
10,9主,PLAY_NORMAL,つなぎますよ,ここです,ここで！
10,10主,PLAY_NORMAL,ここかな,これで,これだ
10,11主,PLAY_NORMAL,これです,これかな,…これです
46,1主,PLAY_CARD,これだ,ここで,ほい
46,2主,PLAY_CARD,これだ！,これをだすぞ,ここだ
46,3主,PLAY_CARD,ここで,ほい,これで
46,4主,PLAY_CARD,ここで,これで,これだ
46,5主,PLAY_CARD,ここだね,はい,つなげるよ
46,6主,PLAY_CARD,ここだ,これだ,はい
46,7主,PLAY_CARD,はい,出すよ,ここで
46,8主,PLAY_CARD,はーい,出しますよ,ありがたがってください
46,9主,PLAY_CARD,つなぎますよ,ここです,ここで！
46,10主,PLAY_CARD,ここかな,これで,これだ
46,11主,PLAY_CARD,これです,これかな,…これです
11,1主,OPEN_NEW_END,お！はしっこ,ここで,ほい
11,2主,OPEN_NEW_END,つなぐぞ,これをだすぞ,ここだ
11,3主,OPEN_NEW_END,つないでやろう,ほい,これで
11,4主,OPEN_NEW_END,繋ぐか…,これで,これだ
11,5主,OPEN_NEW_END,ここかな,はい,つなげるよ
11,6主,OPEN_NEW_END,ここだな,繋げとくぞ〜,ほい
11,7主,OPEN_NEW_END,繋げるよ,ここだね,はい
11,8主,OPEN_NEW_END,はーい,繋げておきますよ,ありがたがってください
11,9主,OPEN_NEW_END,つなぎますよ,ここです,ここで！
11,10主,OPEN_NEW_END,繋ぐか〜,これで,これだ
11,11主,OPEN_NEW_END,つなぎます,これかな,…これです
12,1主,EXTEND_EXISTING_END,これだ,ここで,ほい
12,2主,EXTEND_EXISTING_END,これだ！,これをだすぞ,ここだ
12,3主,EXTEND_EXISTING_END,ここで,ほい,これで
12,4主,EXTEND_EXISTING_END,ここで,これで,これだ
12,5主,EXTEND_EXISTING_END,ここだね,はい,つなげるよ
12,6主,EXTEND_EXISTING_END,ここだ,これだ,はい
12,7主,EXTEND_EXISTING_END,はい,出すよ,ここで
12,8主,EXTEND_EXISTING_END,はーい,出しますよ,ありがたがってください
12,9主,EXTEND_EXISTING_END,つなぎますよ,ここです,ここで！
12,10主,EXTEND_EXISTING_END,ここかな,これで,これだ
12,11主,EXTEND_EXISTING_END,これです,これかな,…これです
19,1主,PASS_DECIDED,パスだな,パス,パース
19,2主,PASS_DECIDED,パスだぞ！,パス！,パスするぞ
19,3主,PASS_DECIDED,ほい、俺パス,パース,パスだ
19,4主,PASS_DECIDED,パス,パスだ,俺はパス
19,5主,PASS_DECIDED,パスだよ,パパ、パス,パスにするよ
19,6主,PASS_DECIDED,お兄ちゃんパス,パスしちゃう,パスだ
19,7主,PASS_DECIDED,パスだよ,パスしちゃうね,パスだよ〜
19,8主,PASS_DECIDED,パスします,パスです！,僕パスです
19,9主,PASS_DECIDED,…パスです！,パスします,パスです
19,10主,PASS_DECIDED,…俺はパスかな,パスだな,パス
19,11主,PASS_DECIDED,パス、です,パスさせてもらいます,…パスです
19,1主,PASS_STRATEGIC,パスだな,パス,パース
19,2主,PASS_STRATEGIC,パスだぞ！,パス！,パスするぞ
19,3主,PASS_STRATEGIC,ほい、俺パス,パース,パスだ
19,4主,PASS_STRATEGIC,パス,パスだ,俺はパス
19,5主,PASS_STRATEGIC,パスだよ,パパ、パス,パスにするよ
19,6主,PASS_STRATEGIC,お兄ちゃんパス,パスしちゃう,パスだ
19,7主,PASS_STRATEGIC,パスだよ,パスしちゃうね,パスだよ〜
19,8主,PASS_STRATEGIC,パスします,パスです！,僕パスです
19,9主,PASS_STRATEGIC,…パスです！,パスします,パスです
19,10主,PASS_STRATEGIC,…俺はパスかな,パスだな,パス
19,11主,PASS_STRATEGIC,パス、です,パスさせてもらいます,…パスです
20,1主,PASS_STREAK_OBSERVED,お、大丈夫か？,パス続いてるな,またパスか？
20,2主,PASS_STREAK_OBSERVED,またパスか？,パスなのか,
20,3主,PASS_STREAK_OBSERVED,ふーん、パスなんだ,パス続くねえ,ピンチか？
20,4主,PASS_STREAK_OBSERVED,またパス？,続くな,…大丈夫か？
20,5主,PASS_STREAK_OBSERVED,へえ、続けるねえ,まだ我慢するんだ？,もっといけるの？
20,6主,PASS_STREAK_OBSERVED,またパス？,お兄ちゃん待ってるんだけど,お兄ちゃんウエイティング
20,7主,PASS_STREAK_OBSERVED,へえ、まだパスなんだ,続けるねえ,…まあいいけど
20,8主,PASS_STREAK_OBSERVED,まあ、いいですけど,ずいぶんとお手隙ですね,またですかぁ？
20,9主,PASS_STREAK_OBSERVED,え、またですか？,大丈夫ですか？,お力になれますか？
20,10主,PASS_STREAK_OBSERVED,へえ、パスか,パス続くな,ピンチか〜？
20,11主,PASS_STREAK_OBSERVED,…また？,…はい,…僕のせいですか？
21,1主,MUST_PLAY_STATE,…これだ,ここで,後がないなあ
21,2主,MUST_PLAY_STATE,ここで、これだ！,これをだすぞ,ここだ！
21,3主,MUST_PLAY_STATE,ここで,ほい,これで
21,4主,MUST_PLAY_STATE,これで,これで,これだ
21,5主,MUST_PLAY_STATE,ここだね,はい,危ないのも興奮するね
21,6主,MUST_PLAY_STATE,ギリギリお兄ちゃん,これだ〜,ドキドキお兄ちゃん
21,7主,MUST_PLAY_STATE,はい,出すよ,ここで
21,8主,MUST_PLAY_STATE,はいはい、ここですね,出しますってば,ありがたがってくださいね
21,9主,MUST_PLAY_STATE,えっと、これです,ここです,ここで！
21,10主,MUST_PLAY_STATE,ここ…だな,これで,これだ
21,11主,MUST_PLAY_STATE,これです,これかな,…これです
22,1主,ELIM_RISK_WARNING,ヤバい…,マジで終わり？,うわ〜
22,2主,ELIM_RISK_WARNING,やばいぞ,おわりか…,くそ〜
22,3主,ELIM_RISK_WARNING,おい！,マジかよ〜,マジかぁ〜
22,4主,ELIM_RISK_WARNING,終わった…,どうしようもない,マジか…
22,5主,ELIM_RISK_WARNING,パパピンチ！,どうしよう…,助けて〜
22,6主,ELIM_RISK_WARNING,お兄ちゃん死亡！？,やばくない？,あああ〜
22,7主,ELIM_RISK_WARNING,うわ〜終わった…,どうしようもないよ,やばい〜
22,8主,ELIM_RISK_WARNING,終わりですか…,どうしましょう…,ピンチです〜
22,9主,ELIM_RISK_WARNING,終わりですか…,天使の加護を…,困りました…
22,10主,ELIM_RISK_WARNING,やべ,終わったかも,うわ…
22,11主,ELIM_RISK_WARNING,…終わりです…,どうしよう…,……！
25,1主,RELEASE_BLOCK,…これだな,ここかな,…ほい
25,2主,RELEASE_BLOCK,…これで！,これをだすぞ！,！
25,3主,RELEASE_BLOCK,しょうがないな,はいはい,これで
25,4主,RELEASE_BLOCK,…これで,…これだ,…ここかな
25,5主,RELEASE_BLOCK,ここだね〜,はいっと,はいはい
25,6主,RELEASE_BLOCK,ここかな？,これかな？,はいはい
25,7主,RELEASE_BLOCK,はいはい,出すよ〜,ここでね
25,8主,RELEASE_BLOCK,しょうがないですねえ,出しますよん,ありがたがってくださいね〜
25,9主,RELEASE_BLOCK,つなぎます,ここです,ここで！
25,10主,RELEASE_BLOCK,しょうがないな,はいはい,これだ
25,11主,RELEASE_BLOCK,…これです,これかな…,…これです…
26,1主,OPP_BLOCK_RELEASED,お前かあ〜…,よしっ！,やってくれたなあ
26,2主,OPP_BLOCK_RELEASED,やるなあ,よし！,これで…
26,3主,OPP_BLOCK_RELEASED,お前さあ…,ど〜も,我慢の限界？
26,4主,OPP_BLOCK_RELEASED,お前…,よし,だいぶ待ったなあ
26,5主,OPP_BLOCK_RELEASED,焦らされたねえ,君がねえ,だいぶ焦れたよ
26,6主,OPP_BLOCK_RELEASED,お！お兄ちゃん待ち望み,よ〜し,我慢できなかったんだ？
26,7主,OPP_BLOCK_RELEASED,も〜、羊さん呼ぶとこだったよ,ありがとうねえ,ふーん、なるほど
26,8主,OPP_BLOCK_RELEASED,そういうのってどうかと思いますよ,やっとですか…,なかなかいい性格してますね
26,9主,OPP_BLOCK_RELEASED,あっ！やっと！,も〜、待ちかねました！,ありがとうございます！
26,10主,OPP_BLOCK_RELEASED,待ちかねたぞ〜,はは、もう我慢の限界？,よ〜し
26,11主,OPP_BLOCK_RELEASED,…！,待ってました…,……。
27,1主,AK_COMPLETE_TO_A,Aに繋いだ！,これでエースだ,Aまで行ったぞ
27,2主,AK_COMPLETE_TO_A,エースまでいったぞ！,Aだ！,えーすだ！
27,3主,AK_COMPLETE_TO_A,Aに到達だ,エースまでだ,これでA完成
27,4主,AK_COMPLETE_TO_A,Aに繋いだか,エースまで来た,これでA
27,5主,AK_COMPLETE_TO_A,Aまで来たね,エースまでだよ,A完成だね
27,6主,AK_COMPLETE_TO_A,お兄ちゃんA完成！,エースまで！,Aだ〜
27,7主,AK_COMPLETE_TO_A,Aまで来たよ！,エース完成！,これでAだね
27,8主,AK_COMPLETE_TO_A,Aまで繋がりました,エース完成ですよ,これでAです
27,9主,AK_COMPLETE_TO_A,Aまで来ました！,エース完成です！,やったー、A！
27,10主,AK_COMPLETE_TO_A,Aまで来たぜ,エース完成だ,これでA
27,11主,AK_COMPLETE_TO_A,Aまで…完成です,エースです…,…Aまで来ました
28,1主,AK_COMPLETE_TO_K,Kに繋いだ！,これでキングだ,Kまで行ったぞ
28,2主,AK_COMPLETE_TO_K,キングまでいったぞ！,Kだ！,きんぐだ！
28,3主,AK_COMPLETE_TO_K,Kに到達だ,キングまでだ,これでK完成
28,4主,AK_COMPLETE_TO_K,Kに繋いだか,キングまで来た,これでK
28,5主,AK_COMPLETE_TO_K,Kまで来たね,キングまでだよ,K完成だね
28,6主,AK_COMPLETE_TO_K,お兄ちゃんK完成！,キングまで！,Kだ〜
28,7主,AK_COMPLETE_TO_K,Kまで来たよ！,キング完成！,これでKだね
28,8主,AK_COMPLETE_TO_K,Kまで繋がりました,キング完成ですよ,これでKです
28,9主,AK_COMPLETE_TO_K,Kまで来ました！,キング完成です！,やったー、K！
28,10主,AK_COMPLETE_TO_K,Kまで来たぜ,キング完成だ,これでK
28,11主,AK_COMPLETE_TO_K,Kまで…完成です,キングです…,…Kまで来ました
37,1主,OTHER_ELIMINATED,やっちゃったなあ,やっちまったなあ,
37,2主,OTHER_ELIMINATED,ああー,そんなこともあるのか,
37,3主,OTHER_ELIMINATED,ちゃんと管理しとけよ,ドンマイ,やっちまったなー
37,4主,OTHER_ELIMINATED,負けは負けだが…,もったいないな,
37,5主,OTHER_ELIMINATED,あードンマイだね,次があるさ,気をつけないとね
37,6主,OTHER_ELIMINATED,ドンマイ！,お兄ちゃんなぐさめ,
37,7主,OTHER_ELIMINATED,あらら…,そんなこともあるよね,負けは負けだよ
37,8主,OTHER_ELIMINATED,あらら〜…,仇はとりますよ,
37,9主,OTHER_ELIMINATED,わあ…,そんなこともありますよ,気をつけないと…
37,10主,OTHER_ELIMINATED,やらかしたな,ドンマイ,
37,11主,OTHER_ELIMINATED,…！！,おつかれさまです…,
38,1主,ELIMINATION_MASS_PLACEMENT,おっと…,そう来るか…,
38,2主,ELIMINATION_MASS_PLACEMENT,おおっと,これって…,
38,3主,ELIMINATION_MASS_PLACEMENT,抱えこんでたな,お前…,
38,4主,ELIMINATION_MASS_PLACEMENT,これは…,お前…,
38,5主,ELIMINATION_MASS_PLACEMENT,秘めたる…てやつ？,なるほど…,
38,6主,ELIMINATION_MASS_PLACEMENT,お兄ちゃんびっくり,えー、なるほど,
38,7主,ELIMINATION_MASS_PLACEMENT,え！？,えっ、そういうこと！？,
38,8主,ELIMINATION_MASS_PLACEMENT,ええ〜っ,そういうことですか,
38,9主,ELIMINATION_MASS_PLACEMENT,え〜っ,…ええ？,
38,10主,ELIMINATION_MASS_PLACEMENT,なるほど…,そういうことか,
38,11主,ELIMINATION_MASS_PLACEMENT,…！！,…なるほど、です,
42,1主,WINNER,これで最後だ！,これが最後だ！,上がらせてもらうぜ
42,2主,WINNER,これで、さいごだ！,さいごのカードだ！,あがりだ！
42,3主,WINNER,これだ最後だ,上がらせてもらうぜ,当然の結果だ
42,4主,WINNER,これで最後だ,上がらせてもらう,あたりまえだな
42,5主,WINNER,これで上がりだよ,上がっちゃうよ,パパ上がりだよ〜
42,6主,WINNER,お兄ちゃん上がりっ！,お兄ちゃん、上がり〜,じゃ、お先！
42,7主,WINNER,これで上がりだよ！,上がらせてもらうよ,あたりまえだよね
42,8主,WINNER,これで上がりです！,皆さんお先に！,当然の結果です！
42,9主,WINNER,これで上がりです！,お先に失礼します！,じゃあ、上がります！
42,10主,WINNER,これで上がりだ！,これで上がるぜ！,上がらせてもらうぜ
42,11主,WINNER,…これで上がりです！,上がり、です…！,…！上がりです！
47,1主,FINISH_WIN,よーし！1位だ！,当然だ！…が、ローラに報告しよう…,
47,2主,FINISH_WIN,うれしいぞ！,1位、うれしいぞっ！,
47,3主,FINISH_WIN,当然だ！,あたりまえだな,見たか！
47,4主,FINISH_WIN,えーと、掃除当番は…,ふふん、当然だ,当たり前だが、うれしいな
47,5主,FINISH_WIN,パパ大勝利♪,読み合いだったら負けないよ,パパいちばん！
47,6主,FINISH_WIN,お兄ちゃん大勝利！,お兄ちゃんいちばん！,さて、昼寝するか…
47,7主,FINISH_WIN,あたりまえだよ！,大勝利だね！,７ならべだからね
47,8主,FINISH_WIN,ふふん、当然です！,当たり前の勝利です！,頭脳がものを言いましたね
47,9主,FINISH_WIN,うれしいです！,天使の導きですね！,へへ、勝っちゃいました！
47,10主,FINISH_WIN,よし！勝ったな！,へへ、嬉しいぜ,みんなに自慢しよう
47,11主,FINISH_WIN,…！うれしいです！,…みんなに自慢しなきゃ…,…ありがとうございます！
48,1主,FINISH_PASS_OVER,があ〜、やっちまった…,もう一回だ！,
48,2主,FINISH_PASS_OVER,くやしいぞ！,もういっかいだ！,
48,3主,FINISH_PASS_OVER,俺が！？,くそ〜、ありえね〜,
48,4主,FINISH_PASS_OVER,…もう一回だ！,ありえん！,
48,5主,FINISH_PASS_OVER,ええ〜、パパ残念,パパくやしい！,
48,6主,FINISH_PASS_OVER,お兄ちゃん最下位！？,お兄ちゃんくやしい！,
48,7主,FINISH_PASS_OVER,うそでしょ！？,7並べなのに！？,
48,8主,FINISH_PASS_OVER,…ありえません！,…もう一回です！,
48,9主,FINISH_PASS_OVER,負けですか〜！？,…もう一回やりませんか？,
48,10主,FINISH_PASS_OVER,俺が！？,…もう一回やろう,
48,11主,FINISH_PASS_OVER,…！！！！,…もう一回、です,
39,HAND_COUNT_TWO,よーし…,いい感じだ,このまま行くぞ
39,HAND_COUNT_TWO,よし,かちきるぞ,やるぞ！
39,HAND_COUNT_TWO,ふふふ、これが実力よ,いい感じだな,このまま行かせてもらう
39,HAND_COUNT_TWO,上がらせてもらう,もう少しだな,
39,HAND_COUNT_TWO,パパあがっちゃうよ,みんないっぱい持ってるね,
39,HAND_COUNT_TWO,よーし！お兄ちゃんあがっちゃうぞ〜,眠くなってきたな,お兄ちゃんチャンス！
39,HAND_COUNT_TWO,ふふふ、このまま行かせてもらうよ,だいぶいい感じだよ,このまま行かせてもらうよ
39,HAND_COUNT_TWO,このまま行かせてもらいますよ,みなさん手札が充実してますねぇ,あがらせてもらいますよ！
39,HAND_COUNT_TWO,いい感じです！,このままあがらせてもらいます！,もう少しです！
39,HAND_COUNT_TWO,このまま行かせてもらうぜ,悪いがこのまま行かせてもらうぜ,
39,HAND_COUNT_TWO,いい感じです…！,このまま行かせてもらいます…恥ずかしい！,恥ずかしいけど、僕が勝ちます…！
40,1主,HAND_COUNT_ONE,ラス１だ,ラス1だぜ,
40,2主,HAND_COUNT_ONE,ラスト、いちまい！,のこるはこれだけだ,
40,3主,HAND_COUNT_ONE,さ〜て、ラストだぜ,残るのはこれだけだ,
40,4主,HAND_COUNT_ONE,ここで決める,さて、最後だ,
40,5主,HAND_COUNT_ONE,最後の1枚だよ♪,さ〜て、最後だよ,
40,6主,HAND_COUNT_ONE,お兄ちゃん、ラス１！,さて、最後の1枚だぜ？,
40,7主,HAND_COUNT_ONE,最後1枚だよ〜,最後の1枚になったよ〜,
40,8主,HAND_COUNT_ONE,最後の1枚です！ふふん,さて、最後の1枚ですよ,
40,9主,HAND_COUNT_ONE,さいごの1枚になりました,最後の一枚です！,
40,10主,HAND_COUNT_ONE,ラス1だぜ,最後の一枚だ！,
40,11主,HAND_COUNT_ONE,…あと1枚です！,最後、です！,
41,1主,DOOMED_DETECTED,ぐっ…,えっ…,
41,2主,DOOMED_DETECTED,これは…,えっ…,
41,3主,DOOMED_DETECTED,まさか俺が…,うわ、えっ…,
41,4主,DOOMED_DETECTED,…これって…,…！,
41,5主,DOOMED_DETECTED,…うーん…,…おっと…,
41,6主,DOOMED_DETECTED,…,…え？,
41,7主,DOOMED_DETECTED,…え？,えーと…,
41,8主,DOOMED_DETECTED,…うーん…,ええと…,
41,9主,DOOMED_DETECTED,…ええと…,うーん…,
41,10主,DOOMED_DETECTED,…おっと…,…！,
41,11主,DOOMED_DETECTED,…！！,……！！！,
42,1主,WINNER,これで最後だ！,これが最後だ！,上がらせてもらうぜ
42,2主,WINNER,これで、さいごだ！,さいごのカードだ！,あがりだ！
42,3主,WINNER,これだ最後だ,上がらせてもらうぜ,当然の結果だ
42,4主,WINNER,これで最後だ,上がらせてもらう,あたりまえだな
42,5主,WINNER,これで上がりだよ,上がっちゃうよ,パパ上がりだよ〜
42,6主,WINNER,お兄ちゃん上がりっ！,お兄ちゃん、上がり〜,じゃ、お先！
42,7主,WINNER,これで上がりだよ！,上がらせてもらうよ,あたりまえだよね
42,8主,WINNER,これで上がりです！,皆さんお先に！,当然の結果です！
42,9主,WINNER,これで上がりです！,お先に失礼します！,じゃあ、上がります！
42,10主,WINNER,これで上がりだ！,これで上がるぜ！,上がらせてもらうぜ
42,11主,WINNER,…これで上がりです！,上がり、です…！,…！上がりです！
43,1主,FINISH_1ST,よーし！1位だ！,当然だ！…が、ローラに報告しよう…,
43,2主,FINISH_1ST,うれしいぞ！,1位、うれしいぞっ！,
43,3主,FINISH_1ST,当然だ！,あたりまえだな,見たか！
43,4主,FINISH_1ST,えーと、掃除当番は…,ふふん、当然だ,当たり前だが、うれしいな
43,5主,FINISH_1ST,パパ大勝利♪,読み合いだったら負けないよ,パパいちばん！
43,6主,FINISH_1ST,お兄ちゃん大勝利！,お兄ちゃんいちばん！,さて、昼寝するか…
43,7主,FINISH_1ST,あたりまえだよ！,大勝利だね！,７ならべだからね
43,8主,FINISH_1ST,ふふん、当然です！,当たり前の勝利です！,頭脳がものを言いましたね
43,9主,FINISH_1ST,うれしいです！,天使の導きですね！,へへ、勝っちゃいました！
43,10主,FINISH_1ST,よし！勝ったな！,へへ、嬉しいぜ,みんなに自慢しよう
43,11主,FINISH_1ST,…！うれしいです！,…みんなに自慢しなきゃ…,…ありがとうございます！
43,1主,FINISH_2ND,ま、勝ちは勝ちだ,最下位じゃなかっただけな…,誰だ？止めてたの
43,2主,FINISH_2ND,いちいになりたかったぞ,つぎはいちいだ！,
43,3主,FINISH_2ND,ま悪くないな,次は勝つぜ,
43,4主,FINISH_2ND,お先に,あそこでああしていれば…,
43,5主,FINISH_2ND,まあそんなもんかな？,誰か止めてたよね？,
43,6主,FINISH_2ND,お兄ちゃん、まあまあ…,お兄ちゃん、もうすこし…,
43,7主,FINISH_2ND,くう〜、もう少しだったよね,もうひと押しだったよね！？,
43,8主,FINISH_2ND,まあ悪くないですが…,誰ですか？止めてたのは…,
43,9主,FINISH_2ND,よし！あがりです！,悪くないので、大丈夫です,
43,10主,FINISH_2ND,…次は一位だ！,次は優勝するぜ,
43,11主,FINISH_2ND,…！,…（次は優勝と思っている）,
43,1主,FINISH_3RD,ま、勝ちは勝ちだ,最下位じゃなかっただけな…,誰だ？止めてたの
43,2主,FINISH_3RD,いちいになりたかったぞ,つぎはいちいだ！,
43,3主,FINISH_3RD,ま悪くないな,次は勝つぜ,
43,4主,FINISH_3RD,お先に,あそこでああしていれば…,
43,5主,FINISH_3RD,まあそんなもんかな？,誰か止めてたよね？,
43,6主,FINISH_3RD,お兄ちゃん、まあまあ…,お兄ちゃん、もうすこし…,
43,7主,FINISH_3RD,くう〜、もう少しだったよね,もうひと押しだったよね！？,
43,8主,FINISH_3RD,まあ悪くないですが…,誰ですか？止めてたのは…,
43,9主,FINISH_3RD,よし！あがりです！,悪くないので、大丈夫です,
43,10主,FINISH_3RD,…次は一位だ！,次は優勝するぜ,
43,11主,FINISH_3RD,…！,…（次は優勝と思っている）,
44,1主,FINISH_OTHER,があ〜、やっちまった…,もう一回だ！,
44,2主,FINISH_OTHER,くやしいぞ！,もういっかいだ！,
44,3主,FINISH_OTHER,俺が！？,くそ〜、ありえね〜,
44,4主,FINISH_OTHER,…もう一回だ！,ありえん！,
44,5主,FINISH_OTHER,ええ〜、パパ残念,パパくやしい！,
44,6主,FINISH_OTHER,お兄ちゃん最下位！？,お兄ちゃんくやしい！,
44,7主,FINISH_OTHER,うそでしょ！？,7並べなのに！？,
44,8主,FINISH_OTHER,…ありえません！,…もう一回です！,
44,9主,FINISH_OTHER,負けですか〜！？,…もう一回やりませんか？,
44,10主,FINISH_OTHER,俺が！？,…もう一回やろう,
44,11主,FINISH_OTHER,…！！！！,…もう一回、です,
45,1主,OTHER_OPP_NORMAL,そこか,なるほど,いい手だ
45,2主,OTHER_OPP_NORMAL,まってたぞ,そこかあ,どうしようかな
45,3主,OTHER_OPP_NORMAL,ふーん,そこ出していいんだ？,なるほどね
45,4主,OTHER_OPP_NORMAL,そこか,…うん,どうするか
45,5主,OTHER_OPP_NORMAL,そこなんだ,出していいの？,ありがとね〜
45,6主,OTHER_OPP_NORMAL,そこか,うす,ふむ
45,7主,OTHER_OPP_NORMAL,そこかあ,行くねえ,待ってたよ
45,8主,OTHER_OPP_NORMAL,そこですか,いいんですか？,僕はどうしましょう…
45,9主,OTHER_OPP_NORMAL,そこですね,どうしようかな…,なるほど
45,10主,OTHER_OPP_NORMAL,そこか,おー,俺はどうするか…
45,11主,OTHER_OPP_NORMAL,そこですか,…！,…なるほど
49,1主,OTHER_OPP_BLOCK,なるほど,…なるほど,そこかぁ…
49,2主,OTHER_OPP_BLOCK,…そこか,…そっちは？,どうしようかな
49,3主,OTHER_OPP_BLOCK,ふーん,そこ出していいんだ？,なるほどね
49,4主,OTHER_OPP_BLOCK,そこか…,…なるほど,…俺はどうしようか
49,5主,OTHER_OPP_BLOCK,…そこ？,そこ、出していいの？,焦らすねえ
49,6主,OTHER_OPP_BLOCK,そこか〜,ZZZ…,ふむ
49,7主,OTHER_OPP_BLOCK,…羊さん呼ぶよ,そこかあ…,待ってたよ
49,8主,OTHER_OPP_BLOCK,そこですかぁ…,いいんですか？,僕はどうしましょう…
49,9主,OTHER_OPP_BLOCK,そこですか…,どうしようかな…,なるほど
49,10主,OTHER_OPP_BLOCK,そこか,うーん…,俺はどうするか…
49,11主,OTHER_OPP_BLOCK,そこですか,…！！,…なるほど
50,1主,OTHER_PASS_NORMAL,おけ,パスか,はいはい
50,2主,OTHER_PASS_NORMAL,しょうちだ,なんかいめだ？,…パスか
50,3主,OTHER_PASS_NORMAL,ふーん…,大丈夫なのか？,へえ〜…
50,4主,OTHER_PASS_NORMAL,パスか,何回目だ？,へえ
50,5主,OTHER_PASS_NORMAL,了解,焦らすねえ,わかったよ
50,6主,OTHER_PASS_NORMAL,了解！,お兄ちゃんスリーピ〜,飛ばすんだな
50,7主,OTHER_PASS_NORMAL,パスなんだね,…焦らすねえ,飛ばすねー
50,8主,OTHER_PASS_NORMAL,…ふーん,パスですか,手札が多いですけど
50,9主,OTHER_PASS_NORMAL,パスですか,了解です,はい
50,10主,OTHER_PASS_NORMAL,パスか,…何回目？,へえ〜
50,11主,OTHER_PASS_NORMAL,…！,パスですか…,…はい
51,1主,OTHER_PASS_RISK,え！？パスなの？,パスなの？,出したほうがよくない？
51,2主,OTHER_PASS_RISK,パスするのか！？,パスしちゃうのか？,だしてみたらどうだ？
51,3主,OTHER_PASS_RISK,パスするんだ,へえ,…なかなかやるな
51,4主,OTHER_PASS_RISK,お前…,へえ……,お前……
51,5主,OTHER_PASS_RISK,焦らすねえ〜…,ふ〜ん……,作戦うまいね〜…
51,6主,OTHER_PASS_RISK,え、お兄ちゃんピンチ？,ふーん,ふーん……
51,7主,OTHER_PASS_RISK,…羊さん呼ぶよ！,パスなの？,パスなんだ…
51,8主,OTHER_PASS_RISK,いい性格してますねぇ,ま、僕でもそうしますけど…,へー、ここでパスですか…
51,9主,OTHER_PASS_RISK,えっ、パスですか,パスですか…,ここでですか？
51,10主,OTHER_PASS_RISK,ゲームうまいな〜,戦略的だな,へえ〜イイネ…
51,11主,OTHER_PASS_RISK,…！！,…パスですか…,…！
36,1主,FINISH_FOUL,ああ〜〜、ローラ〜！,やっちまった…,
36,2主,FINISH_FOUL,ぐう…,やってしまったぞ,
36,3主,FINISH_FOUL,俺が！？くそ〜,くそ〜、やっちまった,
36,4主,FINISH_FOUL,ええ〜？やっちまった…,やらかしたな…,
36,5主,FINISH_FOUL,やっちゃった…,悔しいね…,
36,6主,FINISH_FOUL,お兄ちゃん敗北!?,お兄ちゃんマジ！？,
36,7主,FINISH_FOUL,ええ〜〜！？やっちゃった…,くやしい〜,
36,8主,FINISH_FOUL,とほほ、欲張りすぎました…,ありえません〜！,
36,9主,FINISH_FOUL,欲深き天使でした…,くやしいです〜…,
36,10主,FINISH_FOUL,うう〜、マジ！？,悔しいなこれは…,
36,11主,FINISH_FOUL,…！！,…悔しいです！,
52,1主,THINKING,…,,
52,2主,THINKING,…,,
52,3主,THINKING,…,,
52,4主,THINKING,…,,
52,5主,THINKING,…,,
52,6主,THINKING,…,,
52,7主,THINKING,…,,
52,8主,THINKING,…,,
52,9主,THINKING,…,,
52,10主,THINKING,…,,
52,11主,THINKING,…,,
39,1主,HAND_COUNT_TWO,よーし…,いい感じだ,このまま行くぞ
39,2主,HAND_COUNT_TWO,よし,かちきるぞ,やるぞ！
39,3主,HAND_COUNT_TWO,ふふふ、これが実力よ,いい感じだな,このまま行かせてもらう
39,4主,HAND_COUNT_TWO,上がらせてもらう,もう少しだな,
39,5主,HAND_COUNT_TWO,パパあがっちゃうよ,みんないっぱい持ってるね,
39,6主,HAND_COUNT_TWO,よーし！お兄ちゃんあがっちゃうぞ〜,眠くなってきたな,お兄ちゃんチャンス！
39,7主,HAND_COUNT_TWO,ふふふ、このまま行かせてもらうよ,だいぶいい感じだよ,このまま行かせてもらうよ
39,8主,HAND_COUNT_TWO,このまま行かせてもらいますよ,みなさん手札が充実してますねぇ,あがらせてもらいますよ！
39,9主,HAND_COUNT_TWO,いい感じです！,このままあがらせてもらいます！,もう少しです！
39,10主,HAND_COUNT_TWO,このまま行かせてもらうぜ,悪いがこのまま行かせてもらうぜ,
39,11主,HAND_COUNT_TWO,いい感じです…！,このまま行かせてもらいます…恥ずかしい！,恥ずかしいけど、僕が勝ちます…！
53,1主,SELF_ELIMINATED,があ〜、やっちまった…,やっちまった…,
53,2主,SELF_ELIMINATED,くやしいぞ！,やってしまったぞ！,
53,3主,SELF_ELIMINATED,俺が！？,くそ〜、やっちまった,
53,4主,SELF_ELIMINATED,やっちまった…,負けは負けだ…,
53,5主,SELF_ELIMINATED,パパやっちゃった…,パパくやしい！,
53,6主,SELF_ELIMINATED,お兄ちゃん敗北…,お兄ちゃんやっちゃった,
53,7主,SELF_ELIMINATED,うそでしょ！？,やっちゃった…,
53,8主,SELF_ELIMINATED,…ありえません！,やっちまいました…,
53,9主,SELF_ELIMINATED,負けですか〜！？,やっちゃいました…,
53,10主,SELF_ELIMINATED,俺が！？,やっちまったな…,
53,11主,SELF_ELIMINATED,…！！！！,…やっちゃいました…,
54,1主,LAST_PLACE_CONFIRMED,があ〜、最下位か…,くやしいな…,もう一回だ！
54,2主,LAST_PLACE_CONFIRMED,最下位！？,くやしいぞ！,つぎはぜったい勝つぞ！
54,3主,LAST_PLACE_CONFIRMED,俺が最下位！？,ありえねー！,くそ〜、やられた…
54,4主,LAST_PLACE_CONFIRMED,最下位か…,ありえん…,…もう一回やろう
54,5主,LAST_PLACE_CONFIRMED,パパ最下位…,くやしいよ〜,次は頑張るからね
54,6主,LAST_PLACE_CONFIRMED,お兄ちゃん最下位！？,くやしい〜！,次は勝つからな〜！
54,7主,LAST_PLACE_CONFIRMED,最下位！？うそでしょ！？,７並べなのに！,くやしい〜！
54,8主,LAST_PLACE_CONFIRMED,最下位…ありえません！,くやしいです！,もう一回お願いします！
54,9主,LAST_PLACE_CONFIRMED,最下位ですか〜！？,くやしいです…,もう一回やりませんか？
54,10主,LAST_PLACE_CONFIRMED,俺が最下位！？,くやしいぜ…,次は絶対勝つ！
54,11主,LAST_PLACE_CONFIRMED,…最下位です…,…くやしいです…,…もう一回、やりたいです…

`;
/* ==== ペーストここまで ==== */

type Dict = Map<Character, Partial<Record<EventKey, string[]>>>;

/** 正規キー表（CSV→内部名の対応）。未定義キーは無視されます。 */
const VALID_KEYS: Record<string, EventKey> = {
  // start
  EVT_PLAYERS_CONFIRMED: "EVT_PLAYERS_CONFIRMED",
  DEALT_HAND_EVAL: "DEALT_HAND_EVAL",
  AUTO_PLACE_SEVENS: "AUTO_PLACE_SEVENS",
  STARTER_DECIDED: "STARTER_DECIDED",
  // turn / think
  TURN_START: "TURN_START",
  NO_LEGAL_MOVES_DETECTED: "NO_LEGAL_MOVES_DETECTED",
  MULTIPLE_LEGAL_MOVES: "MULTIPLE_LEGAL_MOVES",
  PASS_WARNING: "PASS_WARNING",
  // play
  PLAY_NORMAL: "PLAY_NORMAL",
  PLAY_CARD: "PLAY_CARD",
  OPEN_NEW_END: "OPEN_NEW_END",
  EXTEND_EXISTING_END: "EXTEND_EXISTING_END",
  UNBLOCK_SELF_SUIT: "UNBLOCK_SELF_SUIT",
  OPEN_OPP_WAIT: "OPEN_OPP_WAIT",
  RUNOUT_PUSH: "RUNOUT_PUSH",
  DUMP_RISKY_ENDCARD: "DUMP_RISKY_ENDCARD",
  // pass
  PASS_DECIDED: "PASS_DECIDED",
  PASS_STRATEGIC: "PASS_STRATEGIC",
  PASS_STREAK_OBSERVED: "PASS_STREAK_OBSERVED",
  MUST_PLAY_STATE: "MUST_PLAY_STATE",
  ELIM_RISK_WARNING: "ELIM_RISK_WARNING",
  // block
  HOLD_BLOCK_SUIT: "HOLD_BLOCK_SUIT",
  KEEP_HOLD_BLOCK: "KEEP_HOLD_BLOCK",
  RELEASE_BLOCK: "RELEASE_BLOCK",
  OPP_BLOCK_RELEASED: "OPP_BLOCK_RELEASED",
  // ak
  AK_COMPLETE_TO_A: "AK_COMPLETE_TO_A",
  AK_COMPLETE_TO_K: "AK_COMPLETE_TO_K",
  // elimination
  SELF_ELIMINATED: "SELF_ELIMINATED",
  OTHER_ELIMINATED: "OTHER_ELIMINATED",
  ELIMINATION_MASS_PLACEMENT: "ELIMINATION_MASS_PLACEMENT",
  // endgame
  HAND_COUNT_TWO: "HAND_COUNT_TWO",
  HAND_COUNT_ONE: "HAND_COUNT_ONE",
  DOOMED_DETECTED: "DOOMED_DETECTED",
  WINNER: "WINNER",
  FINISH_POSITION: "FINISH_POSITION",
  FINISH_1ST: "FINISH_1ST",
  FINISH_2ND: "FINISH_2ND",
  FINISH_3RD: "FINISH_3RD",
  FINISH_OTHER: "FINISH_OTHER",
  FINISH_WIN: "FINISH_WIN",
  FINISH_FOUL: "FINISH_FOUL",
  FINISH_PASS_OVER: "FINISH_PASS_OVER",
  LAST_PLACE_CONFIRMED: "LAST_PLACE_CONFIRMED",
  // 他者反応
  OTHER_OPP_NORMAL: "OTHER_OPP_NORMAL",
  OTHER_OPP_BLOCK: "OTHER_OPP_BLOCK",
  OTHER_PASS_NORMAL: "OTHER_PASS_NORMAL",
  OTHER_PASS_RISK: "OTHER_PASS_RISK",
  // 互換
  ELIMINATED_BY_PASS_LIMIT: "ELIMINATED_BY_PASS_LIMIT",
  // THINKING
  THINKING: "THINKING",
};

function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function normalizeEventKey(raw: string): EventKey | null {
  const k = String(raw)
    .trim()
    .toUpperCase()
    .replace(/[\s\-]+/g, "_");
  return VALID_KEYS[k] ?? null;
}

/** playerId（cpu-01/01/1 等）→ '1主'..'11主' に正規化 */
export function resolveCharacterFromPlayerId(
  playerId: string,
): Character | null {
  const m = String(playerId).match(/(\d{1,2})/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n >= 1 && n <= 11) return `${n}主` as Character;
  return null;
}

/** CSVテキスト → 辞書（キャラ別×イベント） */
function buildDict(csvText: string): Dict {
  const lines = csvText
    .split(/\r?\n/)
    .filter(
      (l) => l.trim().length > 0 && !l.trim().startsWith("#"),
    );
  if (lines.length < 2)
    throw new Error(
      "dialogues.csv が空です（ヘッダ+データ1行以上が必要）",
    );

  const header = splitCSVLine(lines[0]).map((s) =>
    s.toLowerCase(),
  );
  const ci = header.indexOf("character");
  const ei =
    header.indexOf("event_key") >= 0
      ? header.indexOf("event_key")
      : header.indexOf("event") >= 0
        ? header.indexOf("event")
        : -1;
  const l1 = header.indexOf("line_ja_1");
  const l2 = header.indexOf("line_ja_2");
  const l3 = header.indexOf("line_ja_3");
  if (ci < 0 || ei < 0 || l1 < 0) {
    throw new Error(
      "ヘッダに character,event_key,line_ja_1（line_ja_2/3 任意） が必要です",
    );
  }

  const dict: Dict = new Map();

  for (let r = 1; r < lines.length; r++) {
    const cols = splitCSVLine(lines[r]);
    if (cols.length <= Math.max(ci, ei, l1)) continue;

    // キャラ
    const chRaw = cols[ci];
    const ch = ((): Character | null => {
      const direct = chRaw as Character;
      if (
        [
          "1主",
          "2主",
          "3主",
          "4主",
          "5主",
          "6主",
          "7主",
          "8主",
          "9主",
          "10主",
          "11主",
        ].includes(direct)
      )
        return direct;
      const m = String(chRaw).match(/(\d{1,2})/);
      if (!m) return null;
      const n = parseInt(m[1], 10);
      return n >= 1 && n <= 11 ? (`${n}主` as Character) : null;
    })();
    if (!ch) continue;

    // イベント
    const evRaw = cols[ei];
    const ev = normalizeEventKey(evRaw || "");
    if (!ev) continue;

    // 台詞（空セルはスキップ）
    const linesJa = [l1, l2, l3]
      .filter((i) => i >= 0)
      .map((i) => (cols[i] || "").trim())
      .filter(Boolean);
    if (linesJa.length === 0) continue;

    const bag = dict.get(ch) || {};
    (bag[ev] ||= []).push(...linesJa);
    dict.set(ch, bag);
  }

  return dict;
}

// 構築（モジュールロード時1回）
const _DICT: Dict = buildDict(CSV_TEXT);

/** 順位系の同キャラ内エイリアス（後方互換） */
function resolveFinishAliasCandidates(
  key: EventKey,
): EventKey[] {
  switch (key) {
    case "FINISH_1ST":
      return ["FINISH_1ST", "WINNER"];
    case "FINISH_2ND":
      return ["FINISH_2ND"];
    case "FINISH_3RD":
      return ["FINISH_3RD"];
    case "FINISH_OTHER":
      return ["FINISH_OTHER", "FINISH_POSITION"];
    default:
      return [key];
  }
}

/**
 * メイン関数：playerId + eventKey → セリフをランダム選択（エイリアス込み）
 */
export function speakByPlayerId(
  playerId: string,
  eventKey: EventKey,
): string | null {
  const ch = resolveCharacterFromPlayerId(playerId);
  if (!ch) {
    console.warn(
      `[speakByPlayerId] Invalid playerId: ${playerId}`,
    );
    return null;
  }

  const chBag = _DICT.get(ch);
  if (!chBag) {
    console.warn(
      `[speakByPlayerId] No data for character: ${ch}`,
    );
    return null;
  }

  // エイリアス候補を試行
  const candidates = resolveFinishAliasCandidates(eventKey);
  for (const cand of candidates) {
    const lines = chBag[cand];
    if (lines && lines.length > 0) {
      // ランダム選択
      const idx = Math.floor(Math.random() * lines.length);
      const selected = lines[idx];
      console.debug(
        `[speakByPlayerId] ${playerId} (${ch}) ${cand}: "${selected}"`,
      );
      return selected;
    }
  }

  console.warn(
    `[speakByPlayerId] No lines found for ${playerId} (${ch}) eventKey: ${eventKey}`,
  );
  return null;
}

/**
 * デバッグ用：利用可能なイベントキー一覧
 */
export function listAvailableKeys(
  playerId: string,
): EventKey[] {
  const ch = resolveCharacterFromPlayerId(playerId);
  if (!ch) return [];
  const chBag = _DICT.get(ch);
  if (!chBag) return [];
  return Object.keys(chBag) as EventKey[];
}
/**
 * Expression CSV Data
 * 表情制御用のCSVデータ（後で直接更新予定）
 */

export const EXPRESSIONS_CSV = `

id,event_key,confident,happy,neutral,thinking,surprised,nervous,disappointed
1,EVT_PLAYERS_CONFIRMED,1,,1,1,,,
3,DEALT_HAND_EVAL,1,,1,1,,,
4,AUTO_PLACE_SEVENS,1,,1,,,,
5,STARTER_DECIDED,,1,1,,,,
6,TURN_START,,,1,1,,,
7,NO_LEGAL_MOVES_DETECTED,,,,1,,1,
8,MULTIPLE_LEGAL_MOVES,1,,,1,,,
9,PASS_WARNING,,,,,,1,
10,PLAY_NORMAL,1,,,1,,,
11,OPEN_NEW_END,1,1,,,,,
12,EXTEND_EXISTING_END,1,1,,,,,
13,UNBLOCK_SELF_SUIT,1,1,,,,,
14,OPEN_OPP_WAIT,,,,1,,1,
17,RUNOUT_PUSH,1,,,1,,,
18,DUMP_RISKY_ENDCARD,,,1,1,,1,
19,PASS_STRATEGIC,1,,,1,,1,
20,PASS_STREAK_OBSERVED,1,,1,1,,,
21,MUST_PLAY_STATE,,,,,,1,
22,ELIM_RISK_WARNING,,,,,,1,1
23,HOLD_BLOCK_SUIT,1,,,1,,,
24,KEEP_HOLD_BLOCK,1,,,1,,,
25,RELEASE_BLOCK,,,1,1,,1,
26,OPP_BLOCK_RELEASED,,,1,,,1,
28,AK_COMPLETE_TO_A,1,1,1,1,,,
29,AK_COMPLETE_TO_K,1,1,1,1,,,
36,SELF_ELIMINATED,,,,,,,1
37,OTHER_ELIMINATED,,,,,,1,
38,ELIMINATION_MASS_PLACEMENT,,,,1,,,
39,HAND_COUNT_TWO,1,,,,,,
40,HAND_COUNT_ONE,1,1,,,,,
41,DOOMED_DETECTED,,,,,,1,1
42,WINNER,,1,,,,,
43,FINISH_1ST,,1,,,,,
43,FINISH_2ND,1,,,,,,
43,FINISH_3RD,1,,,,,1,
44,LAST_PLACE_CONFIRMED,,,,,,,1
45,OTHER_OPP_NORMAL,,,1,1,,,
45,OTHER_OPP_BLOCK,,,1,1,,1,
45,OTHER_PASS_NOMAL,,,1,1,,,
45,OTHER_PASS_RISK,,,,1,,1,
45,THINKING,,,1,1,,,

`;

// 使用例:
// import { EXPRESSIONS_CSV } from './expressions_data';
// import { parseExpressionCSV, pickExpressionForEvent } from './expressions';
//
// const expressionMap = parseExpressionCSV(EXPRESSIONS_CSV);
// const expression = pickExpressionForEvent(expressionMap, 'PLAY_NORMAL');
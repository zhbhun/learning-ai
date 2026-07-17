// 关卡数据（由 tools/solver.mjs 求解生成并回放验证）
// solution 为最优解之一：U/D/L/R 表示玩家每一步的移动方向
const LEVELS = [
  {
    "name": "第一步",
    "map": [
      "#####",
      "#@$.#",
      "#####"
    ],
    "solution": "R"
  },
  {
    "name": "绕过去",
    "map": [
      "######",
      "#    #",
      "# @$ #",
      "#  . #",
      "#    #",
      "######"
    ],
    "solution": "URD"
  },
  {
    "name": "双胞胎",
    "map": [
      "#######",
      "#     #",
      "# $.$ #",
      "# .@  #",
      "#     #",
      "#######"
    ],
    "solution": "UULDRDRRUL"
  },
  {
    "name": "竖井",
    "map": [
      "######",
      "#    #",
      "# .$ #",
      "# .$ #",
      "# .$ #",
      "# @  #",
      "######"
    ],
    "solution": "RRUUULRDLRDL"
  },
  {
    "name": "夹击",
    "map": [
      "########",
      "#  #   #",
      "#  $ . #",
      "# @$ . #",
      "#  #   #",
      "########"
    ],
    "solution": "URRLLDRR"
  },
  {
    "name": "左右开弓",
    "map": [
      "#######",
      "# .   #",
      "# $$  #",
      "#  @ .#",
      "#######"
    ],
    "solution": "LURRURD"
  },
  {
    "name": "十字路口",
    "map": [
      "#########",
      "#   #   #",
      "# .$ $. #",
      "#  # #  #",
      "# .$@$. #",
      "#  # #  #",
      "#   #   #",
      "#########"
    ],
    "solution": "UULRRLDDLRR"
  },
  {
    "name": "门厅",
    "map": [
      "########",
      "#      #",
      "# $  . #",
      "###@####",
      "# $  . #",
      "#      #",
      "########"
    ],
    "solution": "UULLDRRRLDDDLLURRR"
  },
  {
    "name": "三个货位",
    "map": [
      "#########",
      "#       #",
      "# $ $ $ #",
      "# #.#.#.#",
      "#   @   #",
      "#########"
    ],
    "solution": "LLLUURURDRURDRURD"
  },
  {
    "name": "小屋",
    "map": [
      "####",
      "# .#",
      "#  ###",
      "#*@  #",
      "#  $ #",
      "#  ###",
      "####"
    ],
    "solution": "DLURRRDLULLDDRULURUULDRDDRRULDLUU"
  },
  {
    "name": "仓库大厅",
    "map": [
      "##########",
      "#        #",
      "# ###### #",
      "# #    # #",
      "# # $$ # #",
      "# # $  . #",
      "# #@$ .  #",
      "# ####.  #",
      "#    .   #",
      "##########"
    ],
    "solution": "UUURRDULLDRRURDDULLLDDRLUURRRDDDUUULLLDDRRLLUURDRRLLLDRURRDRDDLRUULULLDR"
  },
  {
    "name": "经典第一关",
    "map": [
      "    #####",
      "    #   #",
      "    #$  #",
      "  ###  $##",
      "  #  $ $ #",
      "### # ## #   ######",
      "#   # ## #####  ..#",
      "# $  $          ..#",
      "##### ### #@##  ..#",
      "    #     #########",
      "    #######"
    ],
    "solution": "ULLLUUULULUURDLDLDDULLDDDRRRRRRLLLLLLUUURRDDUUURUULDDDDULLDDDRRRRLLDDRRRRUURRRRRRLLLLLLDDLLLLUURRRRLLLLLLUUURRDDUULLDDDRRDDRRRRUULUUULLUURDLLDLLDDDRRDDRRRRUULUUULULLDDULLDDLLDRRUUURRURRDRDDDRDDLLLLUURRLLDDRRRRUURRRRRURDLLLLLLDDLLLLUURRRUUULULLDLLDDDRRRLLLUUURRURRDRDDDRDDLLLLUURRLLDDRRRRUURRRRRDRULURRLLDLLLLLDDLLLLUURRRUUULULLDDDUUURRDLULDDULLDDDRRRLLLUUURRRRRDDDRDDLLLLUURRLLDDRRRRUURRRRRDRULURLDLLLLLDDLLLLUURRRUUULLLDDUULLDDDRRRLUUURRRDDDRDDLLLLUURRLLDDRRRRUURRRRRDRRLLUURDRLLLLLLLDDLLLLUURRRRRRRRRRLDR"
  }
];

# 读取 prompt 信息 f839602c-5c2b-4a2e-aad8-4de3a3b74c9a

**Session ID:** ses_23fcef2ccffe7wy7zTVZNibmDC
**Created:** 4/24/2026, 11:52:13 PM
**Updated:** 4/24/2026, 11:52:52 PM

---

## User

读取这个 f839602c-5c2b-4a2e-aad8-4de3a3b74c9a prompt 信息

---

## Assistant (Artflo · GLM-5 · 5.2s)

_Thinking:_

用户要求读取一个元素的 prompt 信息。元素 ID 是 f839602c-5c2b-4a2e-aad8-4de3a3b74c9a。我需要使用 canvas-read 工具来读取这个元素的 prompt 字段。

根据工具说明，我应该读取 data.prompt 字段。

**Tool: canvasRead**

**Input:**
```json
{
  "id": "f839602c-5c2b-4a2e-aad8-4de3a3b74c9a",
  "scope": "data",
  "field": "prompt"
}
```

**Output:**
```


...86767 bytes truncated...

The tool call succeeded but the output was truncated. Full output saved to: /Users/<user>/.local/share/opencode/tool-output/tool_dc03120a4001eOZrnVqilJyasu
Use the Task tool to have explore agent process this file with Grep and Read (with offset/limit). Do NOT read the full file yourself - delegate to save context.
```

---

## Assistant (Artflo · GLM-5 · 5.9s)

_Thinking:_

输出被截断了，文件很大。我需要读取完整的 prompt 信息。让我使用 Read 工具来读取保存的文件。

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/<user>/.local/share/opencode/tool-output/tool_dc03120a4001eOZrnVqilJyasu"
}
```

**Output:**
```
<path>/Users/<user>/.local/share/opencode/tool-output/tool_dc03120a4001eOZrnVqilJyasu</path>
<type>file</type>
<content>
1: "<content>\n1: # AGENTS.md\n2: \n3: 所有项目是一个基于 [Slidev](https://sli.dev/) 编写的演示文稿，主题为\"**ArtfloCLI：让 Agent 像设计师一样操作画布**\"。\n4: \n5: ## Guidelines\n6: \n7: Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.\n8: \n9: **Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.\n10: \n11: ### 1. Think Before Coding\n12: \n13: **Don't assume. Don't hide confusion. Surface tradeoffs.**\n14: \n15: Before implementing:\n16: - State your assumptions explicitly. If uncertain, ask.\n17: - If multiple interpretations exist, present them - don't pick silently.\n18: - If a simpler approach exists, say so. Push back when warranted.\n19: - If something is unclear, stop. Name what's confusing. Ask.\n20: \n21: ### 2. Simplicity First\n22: \n23: **Minimum code that solves the problem. Nothing speculative.**\n24: \n25: - No features beyond what was asked.\n26: - No abstractions for single-use code.\n27: - No \"flexibility\" or \"configurability\" that wasn't requested.\n28: - No error handling for impossible scenarios.\n29: - If you write 200 lines and it could be 50, rewrite it.\n30: \n31: Ask yourself: \"Would a senior engineer say this is overcomplicated?\" If yes, simplify.\n32: \n33: ### 3. Surgical Changes\n34: \n35: **Touch only what you must. Clean up only your own mess.**\n36: \n37: When editing existing code:\n38: - Don't \"improve\" adjacent code, comments, or formatting.\n39: - Don't refactor things that aren't broken.\n40: - Match existing style, even if you'd do it differently.\n41: - If you notice unrelated dead code, mention it - don't delete it.\n42: \n43: When your changes create orphans:\n44: - Remove imports/variables/functions that YOUR changes made unused.\n45: - Don't remove pre-existing dead code unless asked.\n46: \n47: The test: Every changed line should trace directly to the user's request.\n48: \n49: ### 4. Goal-Driven Execution\n50: \n51: **Define success criteri... (line truncated to 2000 chars)

(End of file - total 1 lines)
</content>
```

---

## Assistant (Artflo · GLM-5 · 5.7s)

_Thinking:_

看起来文件内容被转义了。让我尝试直接读取原始的 prompt 字段，不指定 scope 和 field，看看能否获取更清晰的内容。

**Tool: canvasRead**

**Input:**
```json
{
  "id": "f839602c-5c2b-4a2e-aad8-4de3a3b74c9a"
}
```

**Output:**
```
{
  "id": "f839602c-5c2b-4a2e-aad8-4de3a3b74c9a",
  "name": "",
  "type": 110000,
  "data": {
    "prompt": "<content>\n1: # AGENTS.md\n2: \n3: 所有项目是一个基于 [Slidev](https://sli.dev/) 编写的演示文稿，主题为\"**ArtfloCLI：让 Agent 像设计师一样操作画布**\"。\n4: \n5: ## Guidelines\n</content>\n<meta>\nnumLines: 5\nstartLine: 1\ntotalLines: 4417\n</meta>",
    "medias": [],
    "references": []
  },
  "handle": {
    "sourceHandles": [
      {
        "type": "input",
        "edges": []
      }
    ],
    "targetSlots": {
      "prompt": {
        "types": [
          "prompt"
        ],
        "handles": []
      },
      "media": {
        "types": [
          "image",
          "video"
        ],
        "handles": []
      }
    }
  }
}
```

---

## Assistant (Artflo · GLM-5 · 10.9s)

_Thinking:_

好的，现在我看到了元素的完整信息。这是一个类型为 110000 的元素（看起来是 PROMPT 类型）。prompt 字段显示有 4417 行内容，但被截断了。我需要使用 offset 和 limit 参数来读取完整的 prompt 内容。

根据指示，对于长文本字段，我应该使用 field:<startLine>+<limit> 格式来读取特定行数。让我分段读取这个 prompt。

**Tool: canvasRead**

**Input:**
```json
{
  "id": "f839602c-5c2b-4a2e-aad8-4de3a3b74c9a",
  "field": "prompt:1+2000",
  "scope": "data"
}
```

**Output:**
```


...86767 bytes truncated...

The tool call succeeded but the output was truncated. Full output saved to: /Users/<user>/.local/share/opencode/tool-output/tool_dc03170bf001w7qD9c1lmZVRss
Use the Task tool to have explore agent process this file with Grep and Read (with offset/limit). Do NOT read the full file yourself - delegate to save context.
```

**Tool: canvasRead**

**Input:**
```json
{
  "id": "f839602c-5c2b-4a2e-aad8-4de3a3b74c9a",
  "field": "prompt:2001+2000",
  "scope": "data"
}
```

**Output:**
```


...88069 bytes truncated...

The tool call succeeded but the output was truncated. Full output saved to: /Users/<user>/.local/share/opencode/tool-output/tool_dc0317484001HKaf8wUvSZOhGW
Use the Task tool to have explore agent process this file with Grep and Read (with offset/limit). Do NOT read the full file yourself - delegate to save context.
```

**Tool: canvasRead**

**Input:**
```json
{
  "id": "f839602c-5c2b-4a2e-aad8-4de3a3b74c9a",
  "field": "prompt:4001+2000",
  "scope": "data"
}
```

**Output:**
```
"<content>\n4001: \n4002: **These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.\n4003: # AGENTS.md\n4004: \n4005: 所有项目是一个基于 [Slidev](https://sli.dev/) 编写的演示文稿，主题为\"**ArtfloCLI：让 Agent 像设计师一样操作画布**\"。\n4006: \n4007: ## Guidelines\n4008: \n4009: Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.\n4010: \n4011: **Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.\n4012: \n4013: ### 1. Think Before Coding\n4014: \n4015: **Don't assume. Don't hide confusion. Surface tradeoffs.**\n4016: \n4017: Before implementing:\n4018: - State your assumptions explicitly. If uncertain, ask.\n4019: - If multiple interpretations exist, present them - don't pick silently.\n4020: - If a simpler approach exists, say so. Push back when warranted.\n4021: - If something is unclear, stop. Name what's confusing. Ask.\n4022: \n4023: ### 2. Simplicity First\n4024: \n4025: **Minimum code that solves the problem. Nothing speculative.**\n4026: \n4027: - No features beyond what was asked.\n4028: - No abstractions for single-use code.\n4029: - No \"flexibility\" or \"configurability\" that wasn't requested.\n4030: - No error handling for impossible scenarios.\n4031: - If you write 200 lines and it could be 50, rewrite it.\n4032: \n4033: Ask yourself: \"Would a senior engineer say this is overcomplicated?\" If yes, simplify.\n4034: \n4035: ### 3. Surgical Changes\n4036: \n4037: **Touch only what you must. Clean up only your own mess.**\n4038: \n4039: When editing existing code:\n4040: - Don't \"improve\" adjacent code, comments, or formatting.\n4041: - Don't refactor things that aren't broken.\n4042: - Match existing style, even if you'd do it differently.\n4043: - If you notice unrelated dead code, mention it - don't delete it.\n4044: \n4045: When your changes create orphans:\n4046: - Remove imports/variables/functions that YOUR changes made unused.\n4047: - Don't remove pre-existing dead code unless asked.\n4048: \n4049: The test: Every changed line should trace directly to the user's request.\n4050: \n4051: ### 4. Goal-Driven Execution\n4052: \n4053: **Define success criteria. Loop until verified.**\n4054: \n4055: Transform tasks into verifiable goals:\n4056: - \"Add validation\" → \"Write tests for invalid inputs, then make them pass\"\n4057: - \"Fix the bug\" → \"Write a test that reproduces it, then make it pass\"\n4058: - \"Refactor X\" → \"Ensure tests pass before and after\"\n4059: \n4060: For multi-step tasks, state a brief plan:\n4061: ```\n4062: 1. [Step] → verify: [check]\n4063: 2. [Step] → verify: [check]\n4064: 3. [Step] → verify: [check]\n4065: ```\n4066: \n4067: Strong success criteria let you loop independently. Weak criteria (\"make it work\") require constant clarification.\n4068: \n4069: ---\n4070: \n4071: **These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.\n4072: # AGENTS.md\n4073: \n4074: 所有项目是一个基于 [Slidev](https://sli.dev/) 编写的演示文稿，主题为\"**ArtfloCLI：让 Agent 像设计师一样操作画布**\"。\n4075: \n4076: ## Guidelines\n4077: \n4078: Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.\n4079: \n4080: **Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.\n4081: \n4082: ### 1. Think Before Coding\n4083: \n4084: **Don't assume. Don't hide confusion. Surface tradeoffs.**\n4085: \n4086: Before implementing:\n4087: - State your assumptions explicitly. If uncertain, ask.\n4088: - If multiple interpretations exist, present them - don't pick silently.\n4089: - If a simpler approach exists, say so. Push back when warranted.\n4090: - If something is unclear, stop. Name what's confusing. Ask.\n4091: \n4092: ### 2. Simplicity First\n4093: \n4094: **Minimum code that solves the problem. Nothing speculative.**\n4095: \n4096: - No features beyond what was asked.\n4097: - No abstractions for single-use code.\n4098: - No \"flexibility\" or \"configurability\" that wasn't requested.\n4099: - No error handling for impossible scenarios.\n4100: - If you write 200 lines and it could be 50, rewrite it.\n4101: \n4102: Ask yourself: \"Would a senior engineer say this is overcomplicated?\" If yes, simplify.\n4103: \n4104: ### 3. Surgical Changes\n4105: \n4106: **Touch only what you must. Clean up only your own mess.**\n4107: \n4108: When editing existing code:\n4109: - Don't \"improve\" adjacent code, comments, or formatting.\n4110: - Don't refactor things that aren't broken.\n4111: - Match existing style, even if you'd do it differently.\n4112: - If you notice unrelated dead code, mention it - don't delete it.\n4113: \n4114: When your changes create orphans:\n4115: - Remove imports/variables/functions that YOUR changes made unused.\n4116: - Don't remove pre-existing dead code unless asked.\n4117: \n4118: The test: Every changed line should trace directly to the user's request.\n4119: \n4120: ### 4. Goal-Driven Execution\n4121: \n4122: **Define success criteria. Loop until verified.**\n4123: \n4124: Transform tasks into verifiable goals:\n4125: - \"Add validation\" → \"Write tests for invalid inputs, then make them pass\"\n4126: - \"Fix the bug\" → \"Write a test that reproduces it, then make it pass\"\n4127: - \"Refactor X\" → \"Ensure tests pass before and after\"\n4128: \n4129: For multi-step tasks, state a brief plan:\n4130: ```\n4131: 1. [Step] → verify: [check]\n4132: 2. [Step] → verify: [check]\n4133: 3. [Step] → verify: [check]\n4134: ```\n4135: \n4136: Strong success criteria let you loop independently. Weak criteria (\"make it work\") require constant clarification.\n4137: \n4138: ---\n4139: \n4140: **These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.\n4141: # AGENTS.md\n4142: \n4143: 所有项目是一个基于 [Slidev](https://sli.dev/) 编写的演示文稿，主题为\"**ArtfloCLI：让 Agent 像设计师一样操作画布**\"。\n4144: \n4145: ## Guidelines\n4146: \n4147: Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.\n4148: \n4149: **Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.\n4150: \n4151: ### 1. Think Before Coding\n4152: \n4153: **Don't assume. Don't hide confusion. Surface tradeoffs.**\n4154: \n4155: Before implementing:\n4156: - State your assumptions explicitly. If uncertain, ask.\n4157: - If multiple interpretations exist, present them - don't pick silently.\n4158: - If a simpler approach exists, say so. Push back when warranted.\n4159: - If something is unclear, stop. Name what's confusing. Ask.\n4160: \n4161: ### 2. Simplicity First\n4162: \n4163: **Minimum code that solves the problem. Nothing speculative.**\n4164: \n4165: - No features beyond what was asked.\n4166: - No abstractions for single-use code.\n4167: - No \"flexibility\" or \"configurability\" that wasn't requested.\n4168: - No error handling for impossible scenarios.\n4169: - If you write 200 lines and it could be 50, rewrite it.\n4170: \n4171: Ask yourself: \"Would a senior engineer say this is overcomplicated?\" If yes, simplify.\n4172: \n4173: ### 3. Surgical Changes\n4174: \n4175: **Touch only what you must. Clean up only your own mess.**\n4176: \n4177: When editing existing code:\n4178: - Don't \"improve\" adjacent code, comments, or formatting.\n4179: - Don't refactor things that aren't broken.\n4180: - Match existing style, even if you'd do it differently.\n4181: - If you notice unrelated dead code, mention it - don't delete it.\n4182: \n4183: When your changes create orphans:\n4184: - Remove imports/variables/functions that YOUR changes made unused.\n4185: - Don't remove pre-existing dead code unless asked.\n4186: \n4187: The test: Every changed line should trace directly to the user's request.\n4188: \n4189: ### 4. Goal-Driven Execution\n4190: \n4191: **Define success criteria. Loop until verified.**\n4192: \n4193: Transform tasks into verifiable goals:\n4194: - \"Add validation\" → \"Write tests for invalid inputs, then make them pass\"\n4195: - \"Fix the bug\" → \"Write a test that reproduces it, then make it pass\"\n4196: - \"Refactor X\" → \"Ensure tests pass before and after\"\n4197: \n4198: For multi-step tasks, state a brief plan:\n4199: ```\n4200: 1. [Step] → verify: [check]\n4201: 2. [Step] → verify: [check]\n4202: 3. [Step] → verify: [check]\n4203: ```\n4204: \n4205: Strong success criteria let you loop independently. Weak criteria (\"make it work\") require constant clarification.\n4206: \n4207: ---\n4208: \n4209: **These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.\n4210: # AGENTS.md\n4211: \n4212: 所有项目是一个基于 [Slidev](https://sli.dev/) 编写的演示文稿，主题为\"**ArtfloCLI：让 Agent 像设计师一样操作画布**\"。\n4213: \n4214: ## Guidelines\n4215: \n4216: Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.\n4217: \n4218: **Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.\n4219: \n4220: ### 1. Think Before Coding\n4221: \n4222: **Don't assume. Don't hide confusion. Surface tradeoffs.**\n4223: \n4224: Before implementing:\n4225: - State your assumptions explicitly. If uncertain, ask.\n4226: - If multiple interpretations exist, present them - don't pick silently.\n4227: - If a simpler approach exists, say so. Push back when warranted.\n4228: - If something is unclear, stop. Name what's confusing. Ask.\n4229: \n4230: ### 2. Simplicity First\n4231: \n4232: **Minimum code that solves the problem. Nothing speculative.**\n4233: \n4234: - No features beyond what was asked.\n4235: - No abstractions for single-use code.\n4236: - No \"flexibility\" or \"configurability\" that wasn't requested.\n4237: - No error handling for impossible scenarios.\n4238: - If you write 200 lines and it could be 50, rewrite it.\n4239: \n4240: Ask yourself: \"Would a senior engineer say this is overcomplicated?\" If yes, simplify.\n4241: \n4242: ### 3. Surgical Changes\n4243: \n4244: **Touch only what you must. Clean up only your own mess.**\n4245: \n4246: When editing existing code:\n4247: - Don't \"improve\" adjacent code, comments, or formatting.\n4248: - Don't refactor things that aren't broken.\n4249: - Match existing style, even if you'd do it differently.\n4250: - If you notice unrelated dead code, mention it - don't delete it.\n4251: \n4252: When your changes create orphans:\n4253: - Remove imports/variables/functions that YOUR changes made unused.\n4254: - Don't remove pre-existing dead code unless asked.\n4255: \n4256: The test: Every changed line should trace directly to the user's request.\n4257: \n4258: ### 4. Goal-Driven Execution\n4259: \n4260: **Define success criteria. Loop until verified.**\n4261: \n4262: Transform tasks into verifiable goals:\n4263: - \"Add validation\" → \"Write tests for invalid inputs, then make them pass\"\n4264: - \"Fix the bug\" → \"Write a test that reproduces it, then make it pass\"\n4265: - \"Refactor X\" → \"Ensure tests pass before and after\"\n4266: \n4267: For multi-step tasks, state a brief plan:\n4268: ```\n4269: 1. [Step] → verify: [check]\n4270: 2. [Step] → verify: [check]\n4271: 3. [Step] → verify: [check]\n4272: ```\n4273: \n4274: Strong success criteria let you loop independently. Weak criteria (\"make it work\") require constant clarification.\n4275: \n4276: ---\n4277: \n4278: **These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.\n4279: # AGENTS.md\n4280: \n4281: 所有项目是一个基于 [Slidev](https://sli.dev/) 编写的演示文稿，主题为\"**ArtfloCLI：让 Agent 像设计师一样操作画布**\"。\n4282: \n4283: ## Guidelines\n4284: \n4285: Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.\n4286: \n4287: **Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.\n4288: \n4289: ### 1. Think Before Coding\n4290: \n4291: **Don't assume. Don't hide confusion. Surface tradeoffs.**\n4292: \n4293: Before implementing:\n4294: - State your assumptions explicitly. If uncertain, ask.\n4295: - If multiple interpretations exist, present them - don't pick silently.\n4296: - If a simpler approach exists, say so. Push back when warranted.\n4297: - If something is unclear, stop. Name what's confusing. Ask.\n4298: \n4299: ### 2. Simplicity First\n4300: \n4301: **Minimum code that solves the problem. Nothing speculative.**\n4302: \n4303: - No features beyond what was asked.\n4304: - No abstractions for single-use code.\n4305: - No \"flexibility\" or \"configurability\" that wasn't requested.\n4306: - No error handling for impossible scenarios.\n4307: - If you write 200 lines and it could be 50, rewrite it.\n4308: \n4309: Ask yourself: \"Would a senior engineer say this is overcomplicated?\" If yes, simplify.\n4310: \n4311: ### 3. Surgical Changes\n4312: \n4313: **Touch only what you must. Clean up only your own mess.**\n4314: \n4315: When editing existing code:\n4316: - Don't \"improve\" adjacent code, comments, or formatting.\n4317: - Don't refactor things that aren't broken.\n4318: - Match existing style, even if you'd do it differently.\n4319: - If you notice unrelated dead code, mention it - don't delete it.\n4320: \n4321: When your changes create orphans:\n4322: - Remove imports/variables/functions that YOUR changes made unused.\n4323: - Don't remove pre-existing dead code unless asked.\n4324: \n4325: The test: Every changed line should trace directly to the user's request.\n4326: \n4327: ### 4. Goal-Driven Execution\n4328: \n4329: **Define success criteria. Loop until verified.**\n4330: \n4331: Transform tasks into verifiable goals:\n4332: - \"Add validation\" → \"Write tests for invalid inputs, then make them pass\"\n4333: - \"Fix the bug\" → \"Write a test that reproduces it, then make it pass\"\n4334: - \"Refactor X\" → \"Ensure tests pass before and after\"\n4335: \n4336: For multi-step tasks, state a brief plan:\n4337: ```\n4338: 1. [Step] → verify: [check]\n4339: 2. [Step] → verify: [check]\n4340: 3. [Step] → verify: [check]\n4341: ```\n4342: \n4343: Strong success criteria let you loop independently. Weak criteria (\"make it work\") require constant clarification.\n4344: \n4345: ---\n4346: \n4347: **These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.\n4348: # AGENTS.md\n4349: \n4350: 所有项目是一个基于 [Slidev](https://sli.dev/) 编写的演示文稿，主题为\"**ArtfloCLI：让 Agent 像设计师一样操作画布**\"。\n4351: \n4352: ## Guidelines\n4353: \n4354: Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.\n4355: \n4356: **Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.\n4357: \n4358: ### 1. Think Before Coding\n4359: \n4360: **Don't assume. Don't hide confusion. Surface tradeoffs.**\n4361: \n4362: Before implementing:\n4363: - State your assumptions explicitly. If uncertain, ask.\n4364: - If multiple interpretations exist, present them - don't pick silently.\n4365: - If a simpler approach exists, say so. Push back when warranted.\n4366: - If something is unclear, stop. Name what's confusing. Ask.\n4367: \n4368: ### 2. Simplicity First\n4369: \n4370: **Minimum code that solves the problem. Nothing speculative.**\n4371: \n4372: - No features beyond what was asked.\n4373: - No abstractions for single-use code.\n4374: - No \"flexibility\" or \"configurability\" that wasn't requested.\n4375: - No error handling for impossible scenarios.\n4376: - If you write 200 lines and it could be 50, rewrite it.\n4377: \n4378: Ask yourself: \"Would a senior engineer say this is overcomplicated?\" If yes, simplify.\n4379: \n4380: ### 3. Surgical Changes\n4381: \n4382: **Touch only what you must. Clean up only your own mess.**\n4383: \n4384: When editing existing code:\n4385: - Don't \"improve\" adjacent code, comments, or formatting.\n4386: - Don't refactor things that aren't broken.\n4387: - Match existing style, even if you'd do it differently.\n4388: - If you notice unrelated dead code, mention it - don't delete it.\n4389: \n4390: When your changes create orphans:\n4391: - Remove imports/variables/functions that YOUR changes made unused.\n4392: - Don't remove pre-existing dead code unless asked.\n4393: \n4394: The test: Every changed line should trace directly to the user's request.\n4395: \n4396: ### 4. Goal-Driven Execution\n4397: \n4398: **Define success criteria. Loop until verified.**\n4399: \n4400: Transform tasks into verifiable goals:\n4401: - \"Add validation\" → \"Write tests for invalid inputs, then make them pass\"\n4402: - \"Fix the bug\" → \"Write a test that reproduces it, then make it pass\"\n4403: - \"Refactor X\" → \"Ensure tests pass before and after\"\n4404: \n4405: For multi-step tasks, state a brief plan:\n4406: ```\n4407: 1. [Step] → verify: [check]\n4408: 2. [Step] → verify: [check]\n4409: 3. [Step] → verify: [check]\n4410: ```\n4411: \n4412: Strong success criteria let you loop independently. Weak criteria (\"make it work\") require constant clarification.\n4413: \n4414: ---\n4415: \n4416: **These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.\n4417: \n</content>\n<meta>\nnumLines: 417\nstartLine: 4001\ntotalLines: 4417\n</meta>"
```

---

## Assistant (Artflo · GLM-5 · 11.3s)

_Thinking:_

我现在看到 prompt 内容包含了大量重复的 AGENTS.md 内容。这看起来像是一个演示文稿的 prompt，内容被重复了很多次。让我看看前两部分的内容，以便给用户一个完整的概览。

这个 prompt 元素包含 4417 行内容，主要是一个关于 **"ArtfloCLI：让 Agent 像设计师一样操作画布"** 的 Slidev 演示文稿内容。

内容被重复了多次（大约 11 次），每次都包含相同的 AGENTS.md 内容，主要涵盖：

**核心 Guidelines:**
1. **Think Before Coding** - 不要假设，明确陈述，权衡取舍
2. **Simplicity First** - 最小化代码，无推测性功能
3. **Surgical Changes** - 只修改必要的部分
4. **Goal-Driven Execution** - 定义可验证的成功标准

这个 prompt 似乎是用于训练或指导 Agent 如何进行画布操作的规范文档。文档强调在编写代码前要思考，保持简单，进行精确的修改，并确保可验证的执行目标。

由于内容重复度很高（同样的 AGENTS.md 内容重复了多次），这个 prompt 可能存在冗余。

---


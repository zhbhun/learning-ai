#!/usr/bin/env python3
"""summarize.py - 调用 Claude 对一个文本文件的内容做摘要，输出到终端。

用法:
    python summarize.py <文本文件>

依赖:
    pip install anthropic
    需设置环境变量 ANTHROPIC_API_KEY（或已通过 ant auth login 配置凭证）。
"""

import argparse
import os
import sys
from pathlib import Path

import anthropic

DEFAULT_MODEL = "claude-opus-5-5"
MAX_TOKENS = 16000

SYSTEM_PROMPT = (
    "你是一个摘要助手。请对用户提供的文本内容做摘要："
    "抓住核心观点和关键信息，输出简洁清晰的摘要。"
    "用与原文相同的语言输出，只输出摘要本身。"
)


def read_text(path: str) -> str:
    try:
        return Path(path).read_text(encoding="utf-8")
    except FileNotFoundError:
        print(f"错误：找不到文件 {path}", file=sys.stderr)
        sys.exit(1)
    except UnicodeDecodeError:
        print(f"错误：{path} 不是 UTF-8 文本文件", file=sys.stderr)
        sys.exit(1)


def resolve_model(cli_value: str | None) -> str:
    """模型选择顺序：--model 参数 > ANTHROPIC_DEFAULT_OPUS_MODEL 环境变量 > claude-opus-5-5。

    ANTHROPIC_BASE_URL 等代理环境会通过 DEFAULT_*_MODEL 环境变量映射模型别名，
    但原始 SDK 不做这个映射，所以这里手动解析。
    """
    if cli_value:
        return cli_value
    return os.environ.get("ANTHROPIC_DEFAULT_OPUS_MODEL") or DEFAULT_MODEL


def summarize(text: str, model: str) -> None:
    client = anthropic.Anthropic()
    try:
        with client.messages.stream(
            model=model,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"请总结以下内容：\n\n{text}"}],
        ) as stream:
            for chunk in stream.text_stream:
                print(chunk, end="", flush=True)
            response = stream.get_final_message()
        print()
    except anthropic.AuthenticationError:
        print(
            "错误：未配置凭证。请设置 ANTHROPIC_API_KEY 环境变量，"
            "或先运行 ant auth login。",
            file=sys.stderr,
        )
        sys.exit(1)
    except anthropic.RateLimitError as e:
        retry_after = e.response.headers.get("retry-after", "60")
        print(f"错误：触发限流，请在 {retry_after}s 后重试。", file=sys.stderr)
        sys.exit(1)
    except anthropic.APIConnectionError:
        print("错误：网络连接失败，请检查网络后重试。", file=sys.stderr)
        sys.exit(1)
    except anthropic.APIStatusError as e:
        print(f"错误：API 返回 {e.status_code}：{e.message}", file=sys.stderr)
        sys.exit(1)

    if response.stop_reason == "max_tokens":
        print("警告：输出达到 max_tokens 上限，摘要可能被截断。", file=sys.stderr)
    elif response.stop_reason == "refusal":
        print("错误：请求被安全策略拒绝。", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="用 Claude 对文本文件做摘要")
    parser.add_argument("file", help="要摘要的文本文件路径")
    parser.add_argument(
        "--model",
        default=None,
        help=f"模型 ID（默认按环境变量 ANTHROPIC_DEFAULT_OPUS_MODEL 解析，否则 {DEFAULT_MODEL}）",
    )
    args = parser.parse_args()

    text = read_text(args.file)
    if not text.strip():
        print(f"错误：{args.file} 是空文件", file=sys.stderr)
        sys.exit(1)

    summarize(text, resolve_model(args.model))


if __name__ == "__main__":
    main()

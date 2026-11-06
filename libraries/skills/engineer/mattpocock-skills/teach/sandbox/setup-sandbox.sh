#!/usr/bin/env bash
# setup-sandbox.sh — 重建练习仓库 practice-repo/
# 用法: bash ../setup-sandbox.sh   （从 lessons/ 目录）或直接 bash /path/to/setup-sandbox.sh
# 幂等：删掉旧的重建，内容固定，hash 在 "aha" 那条。
set -euo pipefail
cd "$(dirname "$0")"

rm -rf practice-repo
mkdir practice-repo
cd practice-repo
git init -q -b main
git config user.name "Learner"
git config user.email "learner@example.com"

# —— 提交链（与课程 0001 展示的完全一致）——
echo "# 报告" > README.md
git add . && git commit -q -m "docs: 报告框架和目录"

cat > team.md <<'EOF'
# 团队分工
- 调研：阿布
EOF
git add . && git commit -q -m "docs: 团队分工页"

cat > results.md <<'EOF'
# 调研结果
（占位）
EOF
git add . && git commit -q -m "wip 调研结果"
git commit -q --allow-empty -m "fix"
git commit -q --allow-empty -m "wip"
git commit -q --allow-empty -m "fix typo"

echo "aha" > results.md
git add . && git commit -q -m "aha"

echo "aha v2" > results.md
git add . && git commit -q -m "aha 2"

git log --oneline

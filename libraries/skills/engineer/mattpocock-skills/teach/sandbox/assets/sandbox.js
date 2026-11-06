/* sandbox.js — 浏览器里的 rebase 模拟器（无 git 依赖的反馈环）
   挂到全局 window.Sandbox。课程里这样用：
     <div id="sim"></div>
     <script src="../assets/sandbox.js"></script>
     <script>Sandbox.rebaseSim(document.getElementById('sim'));</script>
   规则：拖拽（或按钮）移动整行 = 调整顺序；把某行动词改成 squash/fixup
   会并进上一行；reword 弹出改 message 的输入框；drop/删行 = 丢弃。
   "运行 rebase" 后展示结果序列与 git 视角的日志，可一键还原。 */
(function () {
  'use strict';

  var TODO_COMMANDS = {
    pick:   { label: 'pick',   hint: '保留该提交，不改' },
    reword: { label: 'reword', hint: '保留改动，改 message' },
    squash: { label: 'squash', hint: '并入上一个提交，message 合并' },
    fixup:  { label: 'fixup',  hint: '并入上一个提交，丢弃 message' },
    drop:   { label: 'drop',   hint: '丢弃该提交' }
  };

  var INITIAL = [
    { hash: 'a1b2c3d', msg: 'docs: 报告框架和目录', action: 'pick' },
    { hash: 'e4f5a6b', msg: 'docs: 团队分工页',     action: 'pick' },
    { hash: 'b7c8d9e', msg: 'wip 调研结果',         action: 'pick' },
    { hash: 'c9d0e1f', msg: 'fix',                  action: 'pick' },
    { hash: 'd1e2f3a', msg: 'wip',                  action: 'pick' },
    { hash: 'e3f4a5b', msg: 'fix typo',             action: 'pick' },
    { hash: 'f5a6b7c', msg: 'aha',                  action: 'pick' },
    { hash: 'a7b8c9d', msg: 'aha 2',                action: 'pick' }
  ];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function shortHash() {
    var chars = '0123456789abcdef';
    var s = '';
    for (var i = 0; i < 7; i++) s += chars[Math.floor(Math.random() * 16)];
    return s;
  }

  /* —— 主入口：todo 编辑器 + 运行 —— */
  function rebaseSim(root, opts) {
    opts = opts || {};
    var rows = INITIAL.map(function (r) { return Object.assign({}, r); });

    root.classList.add('sim');

    var head = el('div', 'sim-head');
    var title = el('p', 'sim-title', '模拟终端 · git rebase -i HEAD~8 打开的 todo 列表');
    var reset = el('button', 'sim-btn', '还原');
    reset.type = 'button';
    reset.addEventListener('click', function () {
      rows = INITIAL.map(function (r) { return Object.assign({}, r); });
      renderRows();
      result.hidden = true;
    });
    head.appendChild(title);
    head.appendChild(reset);
    root.appendChild(head);

    var hint = el('p', 'sim-hint',
      '先把第 3–6 行（4 个碎提交）整行删掉或改成 drop，再运行 —— 这是本课的目标操作。');
    root.appendChild(hint);

    var list = el('div', 'sim-list');
    root.appendChild(list);

    var runBar = el('div', 'sim-runbar');
    var run = el('button', 'sim-btn primary', '运行 rebase');
    run.type = 'button';
    runBar.appendChild(run);
    root.appendChild(runBar);

    var result = el('div', 'sim-result');
    result.hidden = true;
    root.appendChild(result);

    function rowClass(r) {
      if (r.action === 'drop') return 'sim-row is-dropped';
      if (r.action === 'squash' || r.action === 'fixup') return 'sim-row is-squashed';
      if (r.action === 'reword') return 'sim-row is-reword';
      return 'sim-row';
    }

    function renderRows() {
      list.innerHTML = '';
      rows.forEach(function (r, i) {
        var row = el('div', rowClass(r));
        row.draggable = true;
        row.dataset.idx = i;

        var handle = el('span', 'sim-drag', '⠿');
        handle.title = '拖动整行调整顺序';

        var sel = el('select', 'sim-sel');
        Object.keys(TODO_COMMANDS).forEach(function (cmd) {
          var o = el('option', null, TODO_COMMANDS[cmd].label);
          o.value = cmd;
          if (r.action === cmd) o.selected = true;
          sel.appendChild(o);
        });
        sel.setAttribute('aria-label', '第' + (i + 1) + '行的动作');

        var hash = el('span', 'sim-hash', r.hash);
        var msg = el('span', 'sim-msg', r.msg);

        row.appendChild(handle);
        row.appendChild(sel);
        row.appendChild(hash);
        row.appendChild(msg);
        list.appendChild(row);

        sel.addEventListener('change', function () {
          r.action = sel.value;
          if (sel.value === 'reword') {
            var next = window.prompt('新的 commit message：', r.msg);
            if (next !== null && next.trim()) r.msg = next.trim();
            msg.textContent = r.msg;
          }
          row.className = rowClass(r);
        });

        /* 拖拽排序 */
        row.addEventListener('dragstart', function (e) {
          row.classList.add('is-dragging');
          e.dataTransfer.setData('text/plain', String(i));
          e.dataTransfer.effectAllowed = 'move';
        });
        row.addEventListener('dragend', function () {
          row.classList.remove('is-dragging');
        });
        row.addEventListener('dragover', function (e) {
          e.preventDefault();
          row.classList.add('is-over');
        });
        row.addEventListener('dragleave', function () {
          row.classList.remove('is-over');
        });
        row.addEventListener('drop', function (e) {
          e.preventDefault();
          row.classList.remove('is-over');
          var from = parseInt(e.dataTransfer.getData('text/plain'), 10);
          if (isNaN(from) || from === i) return;
          var moved = rows.splice(from, 1)[0];
          rows.splice(i, 0, moved);
          renderRows();
        });

        /* 键盘可达：Ctrl+↑/↓ 移动行 */
        row.addEventListener('keydown', function (e) {
          if (!e.ctrlKey && !e.metaKey) return;
          if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
          e.preventDefault();
          var to = e.key === 'ArrowUp' ? i - 1 : i + 1;
          if (to < 0 || to >= rows.length) return;
          var moved = rows.splice(i, 1)[0];
          rows.splice(to, 0, moved);
          renderRows();
          list.children[to].focus();
        });
        row.tabIndex = 0;
      });
    }

    run.addEventListener('click', function () {
      result.hidden = false;
      result.innerHTML = '';

      /* 规则校验 */
      var problems = [];
      rows.forEach(function (r, i) {
        if ((r.action === 'squash' || r.action === 'fixup') && i === 0) {
          problems.push('第 1 行不能是 squash/fixup —— 上面没有提交可供并入了。');
        }
        if ((r.action === 'squash' || r.action === 'fixup') &&
            i > 0 && rows[i - 1].action === 'drop') {
          problems.push('「' + r.msg + '」标了 ' + r.action + '，但它上一行是 drop，没有可并入的提交。');
        }
      });

      var log = el('div', 'term');
      var bar = el('div', 'term-bar');
      bar.appendChild(el('i'));
      bar.appendChild(el('i'));
      bar.appendChild(el('i'));
      bar.appendChild(el('span', null, 'rebase 输出'));
      log.appendChild(bar);
      var pre = el('pre');

      function line(cls, text) {
        var s = el('span', cls, text);
        s.style.display = 'block';
        pre.appendChild(s);
      }

      if (problems.length) {
        line('bad', 'git 因下面的配置无法完成重放（真实 git 同样会停住）：');
        problems.forEach(function (p) { line('dim', '  ✗ ' + p); });
        line('dim', '');
        line('cmd', 'git rebase --abort   # 先退回来，修好 todo 再跑');
      } else {
        /* 重放：drop 不进新历史；squash/fixup 并入上一条；reword 换 message */
        var played = [];
        rows.forEach(function (r) {
          if (r.action === 'drop') return;
          var last = played[played.length - 1];
          if ((r.action === 'squash' || r.action === 'fixup') && last) {
            if (r.action === 'squash') last.msg += ' + ' + r.msg;
            return;
          }
          played.push({ hash: shortHash(), msg: r.msg });
        });

        line('dim', 'rebase (start): checkout ' + rows[0].hash);
        rows.forEach(function (r, i) {
          if (r.action === 'drop') line('dim', 'rebase: skip ' + r.msg + '（drop）');
          else if (r.action === 'squash') line('good', 'rebase (squash): ' + r.msg);
          else if (r.action === 'fixup') line('good', 'rebase (fixup): ' + r.msg);
          else if (r.action === 'reword') line('acc', 'rebase (reword): ' + r.msg);
          else line('out', 'rebase (pick): ' + r.msg);
        });
        line('dim', 'rebase (finish): returning to refs/heads/main');
        line('dim', '');

        var verdict = played.length === 4
          ? '完成：4 个提交，碎提交清干净了。就是这个效果。'
          : '完成，但得到了 ' + played.length + ' 个提交。对照目标（4 个）看看哪行没改对，点「还原」再来。';
        line(played.length === 4 ? 'good' : 'acc', verdict);

        line('dim', '');
        played.forEach(function (p) {
          line('out', p.hash + '  ' + p.msg);
        });
      }

      log.appendChild(pre);
      result.appendChild(log);
    });

    renderRows();
  }

  window.Sandbox = { rebaseSim: rebaseSim, INITIAL: INITIAL };
})();

/* quiz.js — 课程通用测验组件（即时反馈环）
   用法（在课程 HTML 里）：
     <div id="quiz"></div>
     <script src="../assets/quiz.js"></script>
     <script>
       Quiz.render(document.getElementById('quiz'), [
         { q: '题干', opts: ['选项A','选项B','选项C','选项D'], answer: 1, why: '解析一句话' },
       ]);
     </script>
   出题守则：各选项字数尽量一致；正确项位置手动错开；不靠格式给线索。 */
(function () {
  'use strict';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function render(root, questions) {
    root.classList.add('quiz');
    var answered = 0;
    var score = 0;

    questions.forEach(function (item, qi) {
      var card = el('div', 'q-card');
      card.appendChild(el('p', 'q-text', (qi + 1) + '. ' + item.q));
      var opts = el('div', 'q-opts');

      item.opts.forEach(function (optText, oi) {
        var b = el('button', 'q-opt', optText);
        b.type = 'button';
        b.addEventListener('click', function () {
          if (card.dataset.done) return;
          card.dataset.done = '1';
          answered++;

          var buttons = opts.querySelectorAll('.q-opt');
          buttons.forEach(function (x) { x.disabled = true; });

          var right = oi === item.answer;
          if (right) { b.classList.add('is-right'); score++; }
          else {
            b.classList.add('is-wrong');
            buttons[item.answer].classList.add('is-right');
          }
          card.appendChild(el('p', 'q-why',
            (right ? '对。' : '不对。') + ' ' + item.why));

          if (answered === questions.length) {
            var line = el('p', 'quiz-score',
              '得分：' + score + ' / ' + questions.length +
              (score === questions.length
                ? ' —— 概念站稳了，往下做真仓库练习。'
                : ' —— 看一遍解析，点"重做"再来一次。'));
            root.appendChild(line);
            var again = el('button', 'q-again', '重做');
            again.type = 'button';
            again.addEventListener('click', function () {
              root.innerHTML = '';
              render(root, questions);
            });
            root.appendChild(again);
          }
        });
        opts.appendChild(b);
      });

      card.appendChild(opts);
      root.appendChild(card);
    });
  }

  window.Quiz = { render: render };
})();

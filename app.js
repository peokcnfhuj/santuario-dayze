
/* O Santuário da Dayze — leitura nativa, sem login. */
(function () {
  "use strict";
  var UNITS = window.SANTUARIO_UNITS || [];
  var POR_ID = {};
  UNITS.forEach(function (u, i) { u._i = i; POR_ID[u.id] = u; });

  /* TODO-DRIVE-LINK: colar aqui o link do Google Drive do PDF final
     ("Acessar pelo Drive") quando o livro for aprovado e subido ao Drive.
     Enquanto estiver vazio, o botão avisa que o link ainda será adicionado. */
  var DRIVE_LINK = "https://drive.google.com/file/d/1xldIlEH0Wxg_dC6EGeV89y17tk1kSOeo/view?usp=drivesdk";

  var LS_ULTIMO = "santuario-dayze-ultimo";
  var LS_PAGINA = "santuario-dayze-pagina";
  var LS_LIDOS = "santuario-dayze-lidos";
  var LS_GRIMORIO = "santuario-dayze-grimorio";

  var $ = function (id) { return document.getElementById(id); };
  function lerJSON(chave, padrao) {
    try { var v = JSON.parse(localStorage.getItem(chave)); return v == null ? padrao : v; }
    catch (e) { return padrao; }
  }
  function salvarJSON(chave, v) { try { localStorage.setItem(chave, JSON.stringify(v)); } catch (e) {} }

  var lidos = lerJSON(LS_LIDOS, []);
  function jaLido(id) { return lidos.indexOf(id) >= 0; }
  function marcarLido(id) {
    if (!jaLido(id)) { lidos.push(id); salvarJSON(LS_LIDOS, lidos); }
    atualizarProgresso();
  }
  /* modo livro: o progresso é em páginas (de 100), refletindo onde a pessoa parou */
  function paginaOndeParou() {
    var ultimo = lerJSON(LS_ULTIMO, null);
    var u = ultimo && POR_ID[ultimo];
    return u ? (u.pagina || 1) : 0;
  }
  function atualizarProgresso() {
    var pag = paginaOndeParou();
    var pct = Math.min(100, Math.max(0, pag));
    var barra = $("barra-preenchida"), txt = $("progresso-texto");
    if (barra) barra.style.width = pct + "%";
    if (txt) txt.innerHTML = "Você já leu <b>" + pag + " de 100</b> páginas · " + pct + "% do livro";
    var btn = $("btn-continuar");
    if (btn) {
      var ultimo = lerJSON(LS_ULTIMO, null);
      if (ultimo && POR_ID[ultimo]) {
        btn.querySelector("span").textContent = "Continuar lendo — Página " + (POR_ID[ultimo].pagina || 1);
        btn.disabled = false;
      } else {
        btn.querySelector("span").textContent = "Começar a ler";
        btn.disabled = false;
      }
    }
  }

  function mostrar(idTela) {
    ["tela-home", "tela-ler"].forEach(function (t) {
      $(t).classList.toggle("escondido", t !== idTela);
    });
    window.scrollTo(0, 0);
  }

  function abrir(id, viaBotao) {
    var u = POR_ID[id];
    if (!u) u = UNITS[0];
    var i = u._i;
    var ant = UNITS[i - 1], prox = UNITS[i + 1];
    $("cap-parte").textContent = u.part;
    $("cap-titulo").textContent = u.title;
    $("cap-sub").textContent = "Página " + (u.pagina || 1) + " de 100";
    $("cap-conteudo").innerHTML = u.html;
    var bAnt = $("btn-ant"), bProx = $("btn-prox");
    bProx.disabled = !prox;
    /* na primeira página não há parte anterior: o botão volta ao início
       (em vez de ficar apagado) e mostra isso no rótulo */
    if (ant) {
      bAnt.disabled = false;
      bAnt.textContent = "← Anterior";
      bAnt.onclick = function () { abrir(ant.id, true); };
    } else {
      bAnt.disabled = false;
      bAnt.textContent = "← Início";
      bAnt.onclick = function () { irHome(); };
    }
    bProx.onclick = prox ? function () { abrir(prox.id, true); } : null;
    /* voltar no celular: cada virada de página entra no histórico,
       então o botão voltar do aparelho volta para a página anterior */
    if (location.hash !== "#/" + u.id) {
      if (viaBotao) history.pushState(null, "", "#/" + u.id);
      else history.replaceState(null, "", "#/" + u.id);
    }
    mostrar("tela-ler");
    salvarJSON(LS_ULTIMO, u.id);
    salvarJSON(LS_PAGINA, u.pagina || 1);
    marcarLido(u.id);
    if (u.kind === "grimorio") ligarGrimorio();
  }

  function irHome() {
    history.replaceState(null, "", "#/");
    mostrar("tela-home");
    atualizarProgresso();
  }

  /* ---- sumário ---- */
  function montarSumario() {
    var lista = $("lista-sumario");
    var html = "", parteAtual = "";
    UNITS.forEach(function (u) {
      if (u.part !== parteAtual) { parteAtual = u.part; html += "<h4>" + parteAtual + "</h4><ul>"; }
      html += '<li><a href="#/' + u.id + '" data-id="' + u.id + '"><span>' + u.title +
        '</span><span style="color:#e8c85a;white-space:nowrap">p. ' + (u.pagina || 1) +
        '</span><span class="ok">' + (jaLido(u.id) ? "✓" : "") + "</span></a></li>";
      var prox = UNITS[u._i + 1];
      if (!prox || prox.part !== parteAtual) html += "</ul>";
    });
    lista.innerHTML = html;
    lista.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        fecharSumario();
        abrir(a.getAttribute("data-id"), true);
      });
    });
  }
  function abrirSumario() { montarSumario(); $("modal-sumario").classList.remove("escondido"); }
  function fecharSumario() { $("modal-sumario").classList.add("escondido"); }

  /* ---- grimório anotável ---- */
  function ligarGrimorio() {
    var dados = lerJSON(LS_GRIMORIO, {});
    document.querySelectorAll(".gr-pagina").forEach(function (pg) {
      var n = pg.getAttribute("data-gr");
      var d = dados[n] || {};
      var dia = pg.querySelector(".gr-dia"), lua = pg.querySelector(".gr-lua"),
          txt = pg.querySelector(".gr-texto");
      if (d.dia) dia.value = d.dia;
      if (d.lua) lua.value = d.lua;
      if (d.texto) txt.value = d.texto;
      [dia, lua, txt].forEach(function (el) {
        el.addEventListener("input", function () {
          var todos = lerJSON(LS_GRIMORIO, {});
          todos[n] = { dia: dia.value, lua: lua.value, texto: txt.value };
          salvarJSON(LS_GRIMORIO, todos);
        });
      });
    });
  }

  /* ---- botões ---- */
  function ligarBotoes() {
    $("btn-comecar").addEventListener("click", function () { abrir("intro"); });
    $("btn-continuar").addEventListener("click", function () {
      var ultimo = lerJSON(LS_ULTIMO, null);
      abrir(ultimo && POR_ID[ultimo] ? ultimo : "intro");
    });
    $("btn-sumario-home").addEventListener("click", abrirSumario);
    $("btn-sumario-ler").addEventListener("click", abrirSumario);
    $("btn-voltar-home").addEventListener("click", irHome);
    $("btn-fechar-sumario").addEventListener("click", fecharSumario);
    $("modal-sumario").addEventListener("click", function (ev) {
      if (ev.target === $("modal-sumario")) fecharSumario();
    });
    var drive = $("btn-drive");
    drive.addEventListener("click", function () {
      if (DRIVE_LINK) { window.open(DRIVE_LINK, "_blank"); }
      else {
        var nota = $("nota-drive");
        nota.textContent = "O link do Drive será adicionado aqui quando o livro for aprovado.";
        nota.style.color = "#e8c85a";
      }
    });
  }

  /* ---- céu estrelado ---- */
  function ceu() {
    var cv = $("estrelas");
    if (!cv) return;
    var ctx = cv.getContext("2d"), W, H, estrelas = [];
    function redim() {
      W = cv.width = window.innerWidth; H = cv.height = window.innerHeight;
      estrelas = [];
      var n = Math.min(140, Math.floor((W * H) / 9000));
      for (var i = 0; i < n; i++)
        estrelas.push({ x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 1.4 + 0.4, p: Math.random() * Math.PI * 2,
          v: 0.4 + Math.random() * 1.2 });
    }
    redim();
    window.addEventListener("resize", redim);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      estrelas.forEach(function (e) {
        ctx.globalAlpha = 0.8; ctx.fillStyle = "#EAE3D3";
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 7); ctx.fill();
      });
      return;
    }
    (function anim(t) {
      ctx.clearRect(0, 0, W, H);
      estrelas.forEach(function (e) {
        var a = 0.35 + 0.55 * Math.abs(Math.sin(t / 1000 * e.v + e.p));
        ctx.globalAlpha = a; ctx.fillStyle = "#EAE3D3";
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 7); ctx.fill();
      });
      requestAnimationFrame(anim);
    })(0);
  }

  /* ---- início ---- */
  window.addEventListener("hashchange", function () {
    var id = (location.hash || "").replace("#/", "");
    if (id && POR_ID[id]) abrir(id);
    else if (id === "") irHome();
  });
  ligarBotoes();
  ceu();
  var inicial = (location.hash || "").replace("#/", "");
  if (inicial && POR_ID[inicial]) abrir(inicial);
  else { irHome(); }
  atualizarProgresso();
})();

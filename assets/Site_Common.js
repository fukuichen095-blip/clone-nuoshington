/* ===== keyid：浏览器唯一 ID =====
 * 取值方式与 leavemessage.js 完全一致：
 *   来源 IndexedDB("UniqueIdDB") 内 "BrowserIdStore" 主键 "unique_long_id" 记录的 value 字段
 *   （写入方是站点的 count.js：{ id: "unique_long_id", value: "<雪花ID>" }）
 * ⚠ IndexedDB 库名大小写敏感："UniqueIdDB" ≠ "UniqueIdDb"，写错会静默开出新空库、永远读不到值。
 *
 * 说明：本文件的提交函数是 jsonp + async:!1 的同步写法，返回值 !1 用于阻止表单默认提交行为，
 *   不能整体改成 async/await；因此这里在脚本加载时就预读 keyid 并缓存，
 *   提交时用 getWmkcKeyId() 同步取缓存值；读不到返回空串，后端 keyid 默认 0，不阻断提交。
 * ========================================================================== */
var wmkcKeyId = "";
(function () {
  function pickIdValue(rec, skipKey) {
    if (rec == null) { return ""; }
    if (typeof rec === "string" || typeof rec === "number") { return String(rec); }
    if (typeof rec !== "object") { return ""; }
    // 优先按常见业务字段名取值
    var keys = ["value", "browserId", "BrowserId", "browserid", "uniqueId", "uuid", "UID", "id", "Id"];
    for (var k = 0; k < keys.length; k++) {
      if (keys[k] === skipKey) { continue; }
      var v = rec[keys[k]];
      if (v != null && v !== "" && typeof v !== "object") { return String(v); }
    }
    // 兜底：取第一个非空非对象字段（跳过主键字段）
    for (var p in rec) {
      if (!rec.hasOwnProperty(p) || p === skipKey) { continue; }
      var pv = rec[p];
      if (pv != null && pv !== "" && typeof pv !== "object") { return String(pv); }
    }
    return "";
  }

  function readKeyIdFromDB(dbName) {
    return new Promise(function (resolve) {
      try {
        if (!window.indexedDB) { resolve(""); return; }
        // 不传 version：库已存在则用其当前版本打开（避免版本不匹配 VersionError）
        var req = indexedDB.open(dbName);
        req.onerror = function () { resolve(""); };
        req.onblocked = function () { resolve(""); };
        req.onupgradeneeded = function (e) {
          // 与 count.js 行为保持一致：顺带把 store 建好
          var db = e.target.result;
          if (!db.objectStoreNames.contains("BrowserIdStore")) {
            db.createObjectStore("BrowserIdStore", { keyPath: "id" });
          }
        };
        req.onsuccess = function () {
          var db = req.result;
          try {
            if (!db.objectStoreNames.contains("BrowserIdStore")) { db.close(); resolve(""); return; }
            var tx = db.transaction("BrowserIdStore", "readonly");
            var store = tx.objectStore("BrowserIdStore");
            var skipKey = typeof store.keyPath === "string" ? store.keyPath : "";
            // 主路径：与 count.js 完全一致 —— 按主键 unique_long_id 直取，读其 value
            var getReq = store.get("unique_long_id");
            getReq.onsuccess = function () {
              var v = getReq.result ? pickIdValue(getReq.result, skipKey) : "";
              if (v) { db.close(); resolve(v); return; }
              // 兜底：主键不是 unique_long_id 时退化为全表扫描
              var allReq = store.getAll();
              allReq.onsuccess = function () {
                var recs = allReq.result || [];
                var vv = "";
                for (var i = 0; i < recs.length; i++) {
                  vv = pickIdValue(recs[i], skipKey);
                  if (vv) { break; }
                }
                db.close();
                resolve(vv);
              };
              allReq.onerror = function () { db.close(); resolve(""); };
            };
            getReq.onerror = function () { db.close(); resolve(""); };
          } catch (e) { db.close(); resolve(""); }
        };
      } catch (e) { resolve(""); }
    });
  }

  // 超时兜底：IDB 被其它标签页阻塞时 indexedDB.open 可能长期挂起，最多等 800ms
  function getBrowserIdFromIDB() {
    var KEYID_TIMEOUT = 800;
    var real = readKeyIdFromDB("UniqueIdDB").then(function (v) {
      if (v) { return v; }
      return readKeyIdFromDB("UniqueIdDb");
    });
    var timeoutGuard = new Promise(function (resolve) {
      setTimeout(function () { resolve(""); }, KEYID_TIMEOUT);
    });
    return Promise.race([real, timeoutGuard]);
  }

  // 脚本加载即预读，用户点提交时缓存已就绪
  try {
    getBrowserIdFromIDB().then(function (v) { wmkcKeyId = v || ""; }, function () { wmkcKeyId = ""; });
  } catch (e) { wmkcKeyId = ""; }
})();

// 提交时同步取 keyid（读不到返回空串）
function getWmkcKeyId() { return wmkcKeyId || ""; }

//Product search
function PSearch() {
  var e = $.trim($("#txtSearch").val());
  return "" == e ? (alert("Please enter product name!"), !1) : !(e.length <= 1) && !(e.indexOf("<") > -1 || e.indexOf(">") > -1) && (e = e.replace("/", "XieXian"), void (location.href = "http://" + document.domain + "/search/" + encodeURIComponent(e.replace(/\+/g, "((()))")) + ".html"))
}

//Header Search
function PSearchTop() {
  var t = $("#txtSearch"), e = t.val();
  return "" == e ? (t.css('border', '1px solid #F00'), t.on('input', function () { t.css('border', '') }), !1) : !(e.length <= 1) && !(e.indexOf("<") > -1 || e.indexOf(">") > -1) && (e = e.replace("/", "XieXian"), void (location.href = "http://" + document.domain + "/search/" + encodeURIComponent(e.replace(/\+/g, "((()))")) + ".html"))
}

//Sidebar Search
function PSearchSidebar() {
  var t = $("#SidebarSearch"), e = t.val();
  return "" == e ? (t.css('border', '1px solid #F00'), t.on('input', function () { t.css('border', '') }), !1) : !(e.length <= 1) && !(e.indexOf("<") > -1 || e.indexOf(">") > -1) && (e = e.replace("/", "XieXian"), void (location.href = "http://" + document.domain + "/search/" + encodeURIComponent(e.replace(/\+/g, "((()))")) + ".html"))
}

//E-mail subscriptions
function submitEmail(element) {
  var e = $("#FootEmail").val();
  if ("" == e) return alert("Please enter a email "), $("#FootEmail").focus(), !1;
  if (!/^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/.test(e) && "" !== $.trim(e)) return alert("Please enter a valid email format"), $("#FootEmail").focus(), !1;
  var t = $("#FootEM_Name").length > 0 ? $("#FootEM_Name").val() : e;
  if (element) {
    element.disabled = true;
  }
  $.ajax({
    type: "POST",
    url: "/OutOpen/SubmitEmail",
    data: {
      email: $("#FootEmail").val(),
      name: t,
      pageUrl:escape(document.URL),
      keyid: getWmkcKeyId()
    },
    dataType: "jsonp",
    crossDomain: !0,
    jsonp: "callback",
    jsonpCallback: "result",
    error: function (e, t, a) {
      setTimeout(function () { if (element) { element.disabled = false; } }, 2000);
      return alert("Submit failed, Please try again later!"), $("#FootEmail").val(""), !1
    },
    success: function (e) {
      alert("Submit successfully, we will contact you soon!"), $("#FootEmail").val("");
      setTimeout(function () { if (element) { element.disabled = false; } }, 2000);
    },
    async: !1
  })
}

function FixJqText(e) {
  return e.replace(/\+/g, "＋")
}

//Custom inquiry
function submitInquiry() {
  var e = $.trim($("#SubmitEmail_I").val());
  if ("" == e || "E-mail Address" == e) return alert("Please enter the Email!"), $("#SubmitEmail_I").val("").focus(), !1;
  if (!/^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/.test(e)) return alert("Please enter a valid email format"), $("#SubmitEmail_I").focus(), !1;
  var t = $.trim($("#SubmitContent_I").val());
  if ($("#SubmitContent_I").length > 0) {
    if ("Content" == t || "" == t) return alert("Please enter the content!"), $("#SubmitContent_I").val("").focus(), !1;
    if (t.length > 2e3) return alert("Contents of the number of characters can not be more than 2000!"), $("#SubmitContent_I").focus(), !1;
    t = escape(FixJqText(t))
  }
  var a = $.trim($("#SubmitName_I").val()),
    n = $.trim($("#SubmitCompanyName_I").val()),
    l = $.trim($("#SubmitTitle_I").val()),
    i = $.trim($("#SubmitPhone_I").val());
  if ("" != a && (a = escape(FixJqText(a))), "" != n && (n = escape(FixJqText(n))), "" != l) {
    if (l.length > 340) return alert("The title you have entered is too long!"), $("#SubmitTitle_I").focus(), !1;
    l = escape(FixJqText(l))
  }
  return "" != i && (i = escape(FixJqText(i))), $.ajax({
    type: "POST",
    url: "/OutOpen/SaveInquirySimp",
    data: {
      name: a,
      company: n,
      proId: Number($.trim($("#productID").val())),
      phone: i,
      email: e,
      title: l,
      content: t,
      pageUrl: escape(document.URL),
      keyid: getWmkcKeyId()
    },
    dataType: "jsonp",
    crossDomain: !0,
    jsonp: "callback",
    jsonpCallback: "result",
    error: function (e, t, a) {
      alert("Submit failed, Please try again later!")
    },
    success: function (e) {
      "1" == e ? ($("#ImgSend_I").removeAttr("disabled"), alert("Submit successfully, we will contact you soon!"), $("#SubmitContent_I").val("")) : "-1" == e ? alert("Send failure, sent too frequently!") : alert("Please don't send it repeatedly!")
    },
    async: !1
  }), !1
}

//Thanks page
function submitInquiryThanks() {
  var e = $.trim($("#SubmitEmail_I").val());
  if ("" == e || "E-mail Address" == e) return alert("Please enter the Email!"), $("#SubmitEmail_I").val("").focus(), !1;
  if (!/^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/.test(e)) return alert("Please enter a valid email format"), $("#SubmitEmail_I").focus(), !1;
  var t = $.trim($("#SubmitContent_I").val());
  if ($("#SubmitContent_I").length > 0) {
    if ("Content" == t || "" == t) return alert("Please enter the content!"), $("#SubmitContent_I").val("").focus(), !1;
    if (t.length > 2e3) return alert("Contents of the number of characters can not be more than 2000!"), $("#SubmitContent_I").focus(), !1;
    t = escape(FixJqText(t))
  }
  var a = $.trim($("#SubmitName_I").val()),
    n = $.trim($("#SubmitCompanyName_I").val()),
    l = $.trim($("#SubmitTitle_I").val()),
    i = $.trim($("#SubmitPhone_I").val());
  if ("" != a && (a = escape(FixJqText(a))), "" != n && (n = escape(FixJqText(n))), "" != l) {
    if (l.length > 340) return alert("The title you have entered is too long!"), $("#SubmitTitle_I").focus(), !1;
    l = escape(FixJqText(l))
  }
  return "" != i && (i = escape(FixJqText(i))), $.ajax({
    type: "POST",
    url: "/OutOpen/SaveInquirySimp",
    data: {
      name: a,
      company: n,
      proId: Number($.trim($("#productID").val())),
      phone: i,
      email: e,
      title: l,
      content: t,
      pageUrl: escape(document.URL),
      keyid: getWmkcKeyId()
    },
    dataType: "jsonp",
    crossDomain: !0,
    jsonp: "callback",
    jsonpCallback: "result",
    error: function (e, t, a) {
      alert("Submit failed, Please try again later!")
    },
    success: function (e) {
      "1" == e ? ($("#ImgSend_I").removeAttr("disabled"), window.location.href = '/thanks', $("#SubmitContent_I").val("")) : "-1" == e ? alert("Send failure, sent too frequently!") : alert("Please don't send it repeatedly!")
    },
    async: !1
  }), !1
}

//Custom inquiry with verification code
function submitInquiryIC() {
  var e = $.trim($("#SubmitEmail_IC").val());
  if ("" == e || "E-mail Address" == e) return alert("Please enter the Email!"), $("#SubmitEmail_IC").val("").focus(), !1;
  if (!/^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/.test(e)) return alert("Please enter a valid email format"), $("#SubmitEmail_IC").focus(), !1;
  var t = $.trim($("#SubmitContent_IC").val());
  if ($("#SubmitContent_IC").length > 0) {
    if ("Content" == t || "" == t) return alert("Please enter the content!"), $("#SubmitContent_IC").val("").focus(), !1;
    if (t.length > 2e3) return alert("Contents of the number of characters can not be more than 2000!"), $("#SubmitContent_IC").focus(), !1;
    t = escape(FixJqText(t))
  }
  var a = $.trim($("#SubmitName_IC").val()),
    n = $.trim($("#SubmitCompanyName_IC").val()),
    l = $.trim($("#SubmitTitle_IC").val()),
    i = $.trim($("#SubmitPhone_IC").val()),
    o = $.trim($("#VCode").val());
  if ("" != a && (a = escape(FixJqText(a))), "" != n && (n = escape(FixJqText(n))), "" != l) {
    if (l.length > 340) return alert("The title you have entered is too long!"), $("#SubmitTitle_IC").focus(), !1;
    l = escape(FixJqText(l))
  }
  return "" != i && (i = escape(FixJqText(i))), "" == o ? (alert("Please enter the validation code!"), $("#VCode").val("").focus(), !1) : null == o.match(/^[A-Za-z0-9]{5,5}$/) ? (alert("validation code is incorrect!"), $("#VCode").val("").focus(), !1) : ($.ajax({
    type: "POST",
    url: "/OutOpen/SaveInquirySimpCode",
    data: {
      name: a,
      company: n,
      code: o,
      phone: i,
      email: e,
      title: l,
      content: t,
      pageUrl: escape(document.URL),
      keyid: getWmkcKeyId()
    },
    dataType: "jsonp",
    crossDomain: !0,
    jsonp: "callback",
    jsonpCallback: "result",
    error: function (e, t, a) {
      alert("Submit failed, Please try again later!")
    },
    success: function (e) {
      "1" == e ? (alert("Submit successfully, we will contact you soon!"), $("#SubmitContent_IC").val(""), $("#VCode").val(""), $("#vcodeimg").attr("src", "/o/IC?rid=" + Math.random())) : "-1" == e ? alert("Send failure, sent too frequently!") : "-333" == e ? alert("validation code is incorrect!") : alert("Send failed, please re submit!")
    },
    async: !1
  }), !1)
}

//Floating inquiry
function submitFloatInquiry() {
  var e = $.trim($("#SubmitEmail_Float").val());
  if ("" == e || "E-mail" == e) return alert("Please enter the Email!"), $("#SubmitEmail_Float").val("").focus(), !1;
  if (!/^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/.test(e)) return alert("Please enter a valid email format"), $("#SubmitEmail_Float").focus(), !1;
  var t = $.trim($("#SubmitContent_Float").val());
  if ($("#SubmitContent_Float").length > 0) {
    if ("Content" == t || "" == t) return alert("Please enter the content!"), $("#SubmitContent_Float").val("").focus(), !1;
    if (t.length > 2e3) return alert("Contents of the number of characters can not be more than 2000!"), $("#SubmitContent_Float").focus(), !1;
    t = escape(FixJqText(t))
  }
  return $.ajax({
    type: "POST",
    url: "/OutOpen/SaveInquirySimp",
    data: {
      name: "",
      company: "",
      proId: 0,
      phone: "",
      email: e,
      title: "",
      content: t,
      pageUrl: escape(document.URL),
      keyid: getWmkcKeyId()
    },
    dataType: "jsonp",
    crossDomain: !0,
    jsonp: "callback",
    jsonpCallback: "result",
    error: function (e, t, a) {
      alert("Submit failed, Please try again later!")
    },
    success: function (e) {
      "1" == e ? ($("#ImgSend_Float").removeAttr("disabled"), alert("Submit successfully, we will contact you soon!"), $("#SubmitContent_Float").val("")) : "-1" == e ? alert("Send failure, sent too frequently!") : alert("Send failed, please re submit!")
    },
    async: !1
  }), !1
}

function ShowHid(e, t) {
  "none" == $("#" + e).css("display") ? ($("#" + e).show(), $("#" + t).removeClass("bodyRight100").addClass("bodyRight")) : ($("#" + e).hide(), $("#" + t).removeClass("bodyRight").addClass("bodyRight100"))
}

function displaySubMenu(e) {
  e.getElementsByTagName("ul")[0].style.display = "block";
}

function hideSubMenu(e) {
  e.getElementsByTagName("ul")[0].style.display = "none";
}

function showdiv(e, t) {
  var a = document.getElementById(e), n = document.getElementById(t);
  "inline" == a.style.display ? (a.style.display = "none", n.innerHTML = '<span class="areaon"> </span>') : (a.style.display = "inline", n.innerHTML = '<span class="areaon1">  </span>')
}

//Email,whatsapp,skype
$(function () {
  $("#txtSearch").keydown(function (e) {
    13 == e.which && PSearch()
  });
  $(document).on("click", "#A_1,#A_2,#A_3,#A_4,#A_6,#A_9,#T9,#M9,#F9", function () {
    $.ajax({
      type: "POST",
      url: "/OutOpen/AddEmailRecord",
      data: {
        fromEmail: $(this).attr("href").replace("mailto:", ""),
        pathPage: document.URL,
        typeid: $(this).attr('id')
      },
      dataType: "jsonp",
      jsonp: "callback",
      crossDomain: !0,
      jsonpCallback: "result",
      error: function () { },
      success: function (e) { },
      async: !1
    })
  });
  $(document).on("click", "#A_8,#T8,#M8,#F8", function () {
    var indexvalue = $(this).attr("href").indexOf("whatsapp");
    if (indexvalue >= 0) {
      let vHref = $(this).attr("href");
      let tel = vHref.replace("https://api.whatsapp.com/send?l=en&phone=", "");
      tel = tel.replace("https://web.whatsapp.com/send?l=en&phone=", "");
      if (tel != null && tel != undefined) {
        $.ajax({
          type: "POST",
          url: "/OutOpen/AddWhatsAppRecord",
          data: {
            fromtel: tel,
            pathPage: document.URL,
            typeid: $(this).attr('id')
          },
          dataType: "jsonp",
          jsonp: "callback",
          crossDomain: true,
          jsonpCallback: "result",
          error: function () { },
          success: function (a) { },
          async: false
        });
      }
    }
  });
  $(document).on("click", "#A_7,#T7,#M7,#F7", function () {
    var indexvalue = $(this).attr("href").indexOf("skype");
    var teamsIndexValue = $(this).attr("href").indexOf("teams.");
    if (indexvalue >= 0 || teamsIndexValue >= 0) {
      var tel = $(this).attr("href")
        .replace("skype:", "")
        .replace("?chat", "")
        .replace("https://teams.live.com/l/invite/", "");
      if (tel != null && tel != undefined) {
        $.ajax({
          type: "POST",
          url: "/OutOpen/AddSkypeRecord",
          data: {
            fromtel: tel,
            pathPage: document.URL,
            typeid: $(this).attr('id')
          },
          dataType: "jsonp",
          jsonp: "callback",
          crossDomain: true,
          jsonpCallback: "result",
          error: function () { },
          success: function (a) { },
          async: false
        });
      }
    }
  });
}), $(function () {
  var e = document.getElementById("pg2");
  null != e && (e.style.display = "none")
});

//Language drop down
$(function () {
  setTimeout(function () {
    if ($(window).width() > 768) {
      if ($('#xyz').length && !$('#xyz').hasClass('nodrop')) {
        window.addEventListener("click",
          function (e) {
            var userBox = document.querySelector("#xyz");
            if (!userBox.contains(e.target)) {
              if ($('#xyz ul li:nth-of-type(n+2)').css('display') != 'none') {
                $('.xyz12 span').removeClass('dp');
                $('#xyz ul li:nth-of-type(n+2)').slideUp();
              }
            }
          });
      }
    }
  }, 500)
})

//Video delay 3 seconds display
$(function () {
  setTimeout(function () {
    $("iframe[youtube-src]").each(function () {
      var youtubeurl = $(this).attr("youtube-src");
      $(this).attr("src", youtubeurl);
    })
  }, 3000)
});

//Tab div
$(function () {
  $("#showroom-content>div").hide();
  $("#showroom-tabs a:first").attr("class", "active");
  $("#showroom-content>div:first").fadeIn();
  $('#showroom-tabs a').click(function (e) {
    e.preventDefault();
    $("#showroom-content>div").hide();
    $("#showroom-tabs a").attr("class", "");
    $(this).attr("class", "active");
    $('#' + $(this).attr('title')).fadeIn();
  });
})


$('.wmkc-template-55 .wmkc-faq-item:not(:first-of-type) .wmkc-faq-tit').removeClass('active').next('.wmkc-faq-box').hide();
$('.wmkc-template-55').on('click', '.wmkc-faq-tit', function () {
  $(this).parent().siblings().children('.wmkc-faq-tit').removeClass('active').next('.wmkc-faq-box').slideUp();
  $(this).toggleClass('active').next('.wmkc-faq-box').stop().slideToggle();
});
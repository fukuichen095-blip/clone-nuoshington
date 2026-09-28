"use strict";
/* ===== keyid：浏览器唯一 ID =====
 * 来源：IndexedDB("UniqueIdDB") 内 "BrowserIdStore" 主键 "unique_long_id" 记录的 value 字段
 *   （写入方是站点的 count.js：{ id: "unique_long_id", value: "<雪花ID>" }）
 * ⚠ IndexedDB 库名大小写敏感："UniqueIdDB" ≠ "UniqueIdDb"，写错会静默开出新空库、永远读不到值。
 * 读取失败/被阻塞/超时一律返回空串，不阻断询盘提交（后端 keyid 默认 0）
 */
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
      // 不传 version：库已存在则用其当前版本打开（避免版本不匹配报 VersionError）
      var req = indexedDB.open(dbName);
      req.onerror = function () { resolve(""); };
      req.onblocked = function () { resolve(""); };
      req.onupgradeneeded = function (e) {
        // 与 count.js 行为保持一致：顺带把 store 建好，避免留下没有 store 的残缺库
        var db = e.target.result;
        if (!db.objectStoreNames.contains("BrowserIdStore")) {
          db.createObjectStore("BrowserIdStore", { keyPath: "id" });
        }
      };
      req.onsuccess = function () {
        var db = req.result;
        try {
          if (!db.objectStoreNames.contains("BrowserIdStore")) {
            db.close();
            resolve("");
            return;
          }
          var tx = db.transaction("BrowserIdStore", "readonly");
          var store = tx.objectStore("BrowserIdStore");
          var skipKey = typeof store.keyPath === "string" ? store.keyPath : "";
          // 主路径：与 count.js 完全一致 —— 按主键 unique_long_id 直取，读其 value
          var getReq = store.get("unique_long_id");
          getReq.onsuccess = function () {
            var v = getReq.result ? pickIdValue(getReq.result, skipKey) : "";
            if (v) { db.close(); resolve(v); return; }
            // 兜底：主键不是 unique_long_id（历史数据结构）时退化为全表扫描
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

// 超时兜底：IDB 若被其他标签页的连接 blocked，indexedDB.open 可能长期挂起，
// 绝不能因此卡住询盘提交 —— 最多等 KEYID_TIMEOUT 毫秒，超时按空串处理
var KEYID_TIMEOUT = 800;
function getBrowserIdFromIDB() {
  // 优先用 count.js 的正式库名（大写 DB）；读不到再兼容历史上出现过的小写写法
  var real = readKeyIdFromDB("UniqueIdDB").then(function (v) {
    if (v) { return v; }
    return readKeyIdFromDB("UniqueIdDb");
  });
  var timeoutGuard = new Promise(function (resolve) {
    setTimeout(function () { resolve(""); }, KEYID_TIMEOUT);
  });
  return Promise.race([real, timeoutGuard]);
}

var ifCustomize=false;var ConfigJson;var SiteLangID;var SiteID;var langType;var $lang;var $qycode='';var $googlegta='';var $gtmcode='';var $customize;var $zdyname='';var $zdyemailcomfirm='';var $zdycompany='';var $zdytitle='';var $zdyphone='';var $content='';var $uploadfile='';var $storageuploadedfiles="";var $verificationcode='';var $quickreplay='';function getLeaveMessage(){var test=document.getElementById("leavemessage");var src=test.getAttribute("src");var theRequest={};if(src.indexOf("?")!=-1){var str=src.substr(src.indexOf('?')+1);var strs=str.split("&");for(var i=0;i<strs.length;i++){theRequest[strs[i].split("=")[0]]=unescape(strs[i].split("=")[1])}}SiteLangID=parseInt(theRequest.langid);SiteID=parseInt(theRequest.id);langType=theRequest.lang;if(theRequest.a=='1'){ifCustomize=true;Promise.all([getConfigJson(),geInquiryEn()]).then(()=>{AllinJs()}).catch((error)=>{})}else{Promise.all([geInquiryEn()]).then(()=>{AllinJs()}).catch((error)=>{})}}getLeaveMessage();function getConfigJson(){return new Promise((resolve,reject)=>{$.ajax({type:'get',url:'https://js05.v15cdn.com/js/'+SiteID+'/newfeedback.json',success:function(data){ConfigJson=data[langType];resolve()},error:function(error){getDefaultConfig().then(resolve).catch(reject)},async:true,})})}function getDefaultConfig(){return new Promise((resolve,reject)=>{$.ajax({type:'get',url:'https://js05.v15cdn.com/js/newfeedback.json',success:function(data){ConfigJson=data[langType];resolve()},error:function(error){reject(error)},async:true,})})}function geInquiryEn(){return new Promise((resolve,reject)=>{$.ajax({type:'get',url:'https://js01.v15cdn.com/inquirylang.js',success:function(data){if(!data){reject("Data is empty")}$lang=eval(`(${data.replace('var $lang =','')})`);$lang=$lang[langType];resolve()},error:function(error){reject(error)},async:true,})})}function validateEmail(id){var email=$.trim($(id).val());if(email==''){toastr.warning($lang.msgInputEmail);return false};const emailPattern=/^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;if(!emailPattern.test(email)){toastr.warning($lang.msgCheckEmail);return false};$(id).removeClass('input-error');return true}function validateEmail1(id){var email=$.trim($(id).val());if(email==''){$(id).addClass('input-error');return false};const emailPattern=/^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;if(!emailPattern.test(email)){$(id).addClass('input-error');return false};$(id).removeClass('input-error');return true}function validateContent(id){var content=$.trim($(id).val());if(content==''){toastr.warning($lang.msgInputContent);return false}if(content.length>2000){toastr.warning($lang.msgTooLongContent);return false};$(id).removeClass('input-error');return true}function validateContent1(id){var content=$.trim($(id).val());if(content==''){$(id).addClass('input-error');return false}if(content.length>2000){$(id).addClass('input-error');return false};$(id).removeClass('input-error');return true}function validateVrification(id){var verification=$.trim($(id).val());const verificationPattern=/^[A-Za-z0-9]{5,5}$/;if(!verificationPattern.test(verification)){toastr.warning($lang.msgInputVerification);return false};$(id).removeClass('input-error');return true}function validateVrification1(id){var verification=$.trim($(id).val());const verificationPattern=/^[A-Za-z0-9]{5,5}$/;if(!verificationPattern.test(verification)){$(id).addClass('input-error');return false};$(id).removeClass('input-error');return true}function validateName(id){var name=$.trim($(id).val());if(name==''){toastr.warning($lang.msgInputName);return false}if(name.length>400){toastr.warning($lang.msgTooLongName);return false};$(id).removeClass('input-error');return true}function validateName1(id){var name=$.trim($(id).val());if(name==''){$(id).addClass('input-error');return false}if(name.length>400){$(id).addClass('input-error');return false};$(id).removeClass('input-error');return true}function validateEmailcomfirm(id){var emailcomfirm=$.trim($(id).val());if(emailcomfirm==''){toastr.warning($lang.msgInputEmail);return false};const emailPattern=/^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;if(!emailPattern.test(emailcomfirm)){toastr.warning($lang.msgCheckEmail);return false};if(emailcomfirm!=$(id).siblings('.wmkcfb-email').val()){toastr.warning($lang.msgCheckEmailConfirm);return false};$(id).removeClass('input-error');return true}function validateEmailcomfirm1(id){var emailcomfirm=$.trim($(id).val());if(emailcomfirm==''){$(id).addClass('input-error');return false};const emailPattern=/^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;if(!emailPattern.test(emailcomfirm)){$(id).addClass('input-error');return false};if(emailcomfirm!=$(id).siblings('.wmkcfb-email').val()){$(id).addClass('input-error');return false};$(id).removeClass('input-error');return true}function validatePhone(id){var phone=$.trim($(id).val());if(phone==''){toastr.warning($lang.msgInputPhone);return false}$(id).removeClass('input-error');return true}function validatePhone1(id){var phone=$.trim($(id).val());if(phone==''){$(id).addClass('input-error');return false}$(id).removeClass('input-error');return true}function validateCompany(id){var company=$.trim($(id).val());if(company==''){toastr.warning($lang.msgInputCompany);return false}$(id).removeClass('input-error');return true}function validateCompany1(id){var company=$.trim($(id).val());if(company==''){$(id).addClass('input-error');return false}$(id).removeClass('input-error');return true}function validateTitle(id){var title=$.trim($(id).val());if(title==''){toastr.warning($lang.msgInputTitle);return false}if(title.length>340){toastr.warning($lang.msgTooLongTitle);return false};$(id).removeClass('input-error');return true}function validateTitle1(id){var title=$.trim($(id).val());if(title==''){$(id).addClass('input-error');return false}if(title.length>340){$(id).addClass('input-error');return false};$(id).removeClass('input-error');return true}function clearForm(val){$(val).siblings('.send-inquiry').find('.wmkcfb-name').val('');$(val).siblings('.send-inquiry').find('.wmkcfb-email').val('');$(val).siblings('.send-inquiry').find('.wmkcfb-emailcomfirm').val('');$(val).siblings('.send-inquiry').find('.wmkcfb-phone').val('');$(val).siblings('.send-inquiry').find('.wmkcfb-title').val('');$(val).siblings('.send-inquiry').find('.wmkcfb-company').val('');$(val).siblings('.send-inquiry').find('.wmkcfb-content').val('');$(val).siblings('.send-inquiry').find('.wmkcfb-verification').val('');$(val).siblings('.send-inquiry').find('.wmkcfb-fileupload span').html('File Upload');
  // 评分复位到初始值，避免下一次提交沿用了上一次的分值
  $(val).siblings('.send-inquiry').find('.feedbackratebox').each(function () {
    var $box = $(this);
    var initRate = parseFloat($box.attr('data-initrate'));
    if (isNaN(initRate)) return;
    var api = $box.data('proinitialrate-api');
    if (api) { api.setValue(initRate); } else { $box.attr('data-rate', initRate); }
  });
$storageuploadedfiles="";localStorage.clear("productCachePC")}var lastClickTime=0;function verificationShow(val){var currentTime=new Date().getTime();if(currentTime-lastClickTime>=3000){lastClickTime=currentTime;$(val).attr("src","/o/VCI?rid="+Math.random())}}async function sendInquiry(val){if(ifCustomize&&ConfigJson.customize&&ConfigJson.components.name_show&&ConfigJson.components.name_required){validateName1($(val).siblings('.send-inquiry').find('.wmkcfb-name'))}validateEmail1($(val).siblings('.send-inquiry').find('.wmkcfb-email'));if(ifCustomize&&ConfigJson.customize&&ConfigJson.components.emailconfirmation){validateEmailcomfirm1($(val).siblings('.send-inquiry').find('.wmkcfb-emailcomfirm'))}if(ifCustomize&&ConfigJson.customize&&ConfigJson.components.phone_show&&ConfigJson.components.phone_required){validatePhone1($(val).siblings('.send-inquiry').find('.wmkcfb-phone'))}if(ifCustomize&&ConfigJson.customize&&ConfigJson.components.company_show&&ConfigJson.components.company_required){validateCompany1($(val).siblings('.send-inquiry').find('.wmkcfb-company'))}if(ifCustomize&&ConfigJson.customize&&ConfigJson.components.title_show&&ConfigJson.components.title_required){validateTitle1($(val).siblings('.send-inquiry').find('.wmkcfb-title'))}validateContent1($(val).siblings('.send-inquiry').find('.wmkcfb-content'));if((ifCustomize&&ConfigJson.qycode)||(ifCustomize&&ConfigJson.components.verificationcode)){validateVrification1($(val).siblings('.send-inquiry').find('.wmkcfb-verification'))}if(ifCustomize&&ConfigJson.customize&&ConfigJson.components.name_show&&ConfigJson.components.name_required){if(validateName($(val).siblings('.send-inquiry').find('.wmkcfb-name'))!=true){$(val).siblings('.send-inquiry').find('.wmkcfb-name').focus();return false}}if(validateEmail($(val).siblings('.send-inquiry').find('.wmkcfb-email'))!=true){$(val).siblings('.send-inquiry').find('.wmkcfb-email').focus();return false}if(ifCustomize&&ConfigJson.customize&&ConfigJson.components.emailconfirmation){if(validateEmailcomfirm($(val).siblings('.send-inquiry').find('.wmkcfb-emailcomfirm'))!=true){$(val).siblings('.send-inquiry').find('.wmkcfb-emailcomfirm').focus();return false}}if(ifCustomize&&ConfigJson.customize&&ConfigJson.components.phone_show&&ConfigJson.components.phone_required){if(validatePhone($(val).siblings('.send-inquiry').find('.wmkcfb-phone'))!=true){$(val).siblings('.send-inquiry').find('.wmkcfb-phone').focus();return false}}if(ifCustomize&&ConfigJson.customize&&ConfigJson.components.company_show&&ConfigJson.components.company_required){if(validateCompany($(val).siblings('.send-inquiry').find('.wmkcfb-company'))!=true){$(val).siblings('.send-inquiry').find('.wmkcfb-company').focus();return false}}if(ifCustomize&&ConfigJson.customize&&ConfigJson.components.title_show&&ConfigJson.components.title_required){if(validateTitle($(val).siblings('.send-inquiry').find('.wmkcfb-title'))!=true){$(val).siblings('.send-inquiry').find('.wmkcfb-title').focus();return false}}if(validateContent($(val).siblings('.send-inquiry').find('.wmkcfb-content'))!=true){$(val).siblings('.send-inquiry').find('.wmkcfb-content').focus();return false}if((ifCustomize&&ConfigJson.qycode)||(ifCustomize&&ConfigJson.components.verificationcode)){if(validateVrification($(val).siblings('.send-inquiry').find('.wmkcfb-verification'))!=true){$(val).siblings('.send-inquiry').find('.wmkcfb-verification').focus();return false}}$(this).attr('disabled','disabled');if($(this).attr('disabled','disabled')){var sendData={email:$.trim($(val).siblings('.send-inquiry').find('.wmkcfb-email').val()),name:$.trim($(val).siblings('.send-inquiry').find('.wmkcfb-name').val()),phone:$.trim($(val).siblings('.send-inquiry').find('.wmkcfb-phone').val()),content:$.trim($(val).siblings('.send-inquiry').find('.wmkcfb-content').val()),title:$.trim($(val).siblings('.send-inquiry').find('.wmkcfb-title').val()),company:$.trim($(val).siblings('.send-inquiry').find('.wmkcfb-company').val()),proId:$.trim($('#productID').val()),verification:$.trim($(val).siblings('.send-inquiry').find('.wmkcfb-verification').val()),};var $ratingBox=$(val).siblings('.send-inquiry').find('.feedbackratebox');if($ratingBox.length){var ratingVal=$ratingBox.find('input[name="rating"]').val();if(ratingVal===undefined||ratingVal===null||ratingVal===''){ratingVal=$ratingBox.attr('data-rate')||''}sendData.RatingScore=$.trim(ratingVal)}for(var i in sendData){sendData[i]=escape(sendData[i])}var productList=[];var cacheList=localStorage.getItem('productCachePC');if(cacheList!='[]'&&cacheList!=null){productList=JSON.parse(cacheList)}var proids='';productList.forEach((item)=>{if(proids==''){proids=item.id}else{proids=proids+','+item.id}});if(ifCustomize&&ConfigJson.codeinterface){var codeInterfaceVal=ConfigJson.codeinterface}else{var codeInterfaceVal='AddInquiry'}if($('.feed-verification').length>0){var codeInterfaceVal='AddInquiryVCode'}if($('.wmkcfb-fileupload').length>0){var codeInterfaceVal='AddInquiryUpLoad'}$(val).append('<em class="loading"></em>');$(val).attr('disabled','disabled');$(val).siblings('.send-inquiry').find('input,textarea').attr('disabled','disabled');var formData=new FormData();for(var key in sendData){formData.append(key,sendData[key])}formData.append('uploadfile',$storageuploadedfiles);var currentUrlai='';if(performance&&performance.getEntriesByType){const navEntries=performance.getEntriesByType('navigation');if(navEntries.length>0){currentUrlai=escape(navEntries[0].name)}else{currentUrlai=escape(document.URL)}}else{currentUrlai=escape(document.URL)}formData.append('pageUrl',currentUrlai);formData.append('proidlist',proids);var keyid=await getBrowserIdFromIDB();formData.append('keyid',keyid);$.ajax({type:'POST',url:'/OutOpen/'+codeInterfaceVal,data:formData,processData:false,contentType:false,dataType:'json',success:function success(data){$(val).find('em').remove();$(val).removeAttr('disabled');$(val).siblings('.send-inquiry').find('input,textarea').removeAttr('disabled');if(data=='1'){toastr.success($lang.msgSendSucess);clearForm(val);if(ifCustomize==true&&ConfigJson.thanks==true){location.href='/thanks'}}else if(data=='2'){toastr.info($lang.msgSameContent)}else if(data=='3'){if($('.feed-verification').length==false){$('.wmkcfb-content').after(`<div class="feed-verification"><input type="text"class="wmkcfb-verification require"placeholder="${$lang.tdVerification}*"maxlength="5"><img class="verification-img"src="/o/VCI"alt="${$lang.tdVerification}"width="80"height="25"onclick="verificationShow(this)"title="${$lang.tdChange}"></div>`)};toastr.info($lang.msgInputVerification)}else if(data=='4'){toastr.info($lang.msgSensitiveContent)}else if(data=='5'){toastr.info($lang.msgtoolongcontent)}else if(data=="7"){toastr.info($lang.msgCheckVerification)}else if(data=='-1'){toastr.info($lang.msgFrequentlyContent)}else if(data=='8'){toastr.info("Wrong upload format")}else if(data=='9'){toastr.info("upload failed")}else{toastr.info($lang.msgSendFailed)}verificationShow('.verification-img')},error:function error(){toastr.error($lang.msgSendFailed);$(val).find('em').remove();$(val).removeAttr('disabled');$(val).siblings('.send-inquiry').find('input,textarea').removeAttr('disabled')},async:true})}return false}/* ===========================================================================
 * 询盘区「可点击」评分（与 leavemessagedemo.js 保持一致）
 * ---------------------------------------------------------------------------
 * 触发条件：页面存在 #productrate（产品详情页）时，AllinJs() 会在
 *   form.inquiry-form 末尾注入 .feedbackratebox，提交时以 RatingScore 参数一并提交。
 * 插件名：feedbackRateInit（与 productrate.js 的 proinitialrate 分离，避免互相覆盖）
 * =========================================================================== */
(function ($) {
  if (!$) return;

  var hasClip = (function () {
    var s = document.documentElement.style;
    return 'clipPath' in s || 'webkitClipPath' in s;
  })();

  $.fn.feedbackRateInit = function (options) {
    var opts = $.extend(
      {
        decimals: 1,
        min: 1, // 询盘建议 1：不允许 0 星
        readonly: false,
        step: 1,
        hoverPreview: true,
        name: 'rating',
        onChange: null
      },
      options || {}
    );

    return this.each(function () {
      var $el = $(this);
      if ($el.data('proinitialrate-init')) return;
      $el.data('proinitialrate-init', true);

      var $items = $el.find('.rateitem');
      var $num = $el.find('.ratenum, .feedbackratenum').first();
      var max = $items.length || 5;
      var step = +opts.step > 0 ? +opts.step : 1;

      $items.find('.actrate img').each(function () {
        this.style.flex = '0 0 auto';
        this.style.maxWidth = 'none';
      });

      function clamp(v) {
        if (isNaN(v)) v = opts.min;
        return Math.max(opts.min, Math.min(max, v));
      }
      function snap(v) {
        return clamp(Math.floor((v + step / 2 + 1e-9) / step) * step);
      }
      function fmt(v) {
        return (+v).toFixed(Math.max(0, +opts.decimals));
      }
      function syncInput(v) {
        if (!opts.name) return;
        var $inp = $el.find('input[name="' + opts.name + '"]');
        if (!$inp.length)
          $inp = $('<input type="hidden" />')
            .attr('name', opts.name)
            .appendTo($el);
        $inp.val(fmt(v));
      }
      function paint($act, fill) {
        var st = $act[0].style;
        $act.css('opacity', fill <= 0 ? 0 : 1);
        st.clipPath = '';
        st.webkitClipPath = '';
        st.width = '';
        st.overflow = '';
        st.justifyContent = '';
        if (fill <= 0 || fill >= 1) return;
        if (hasClip) {
          var inset = 'inset(0 ' + (100 - fill * 100).toFixed(2) + '% 0 0)';
          st.webkitClipPath = inset;
          st.clipPath = inset;
        } else {
          st.display = 'flex';
          st.justifyContent = 'flex-start';
          st.overflow = 'hidden';
          st.width = (fill * 100).toFixed(2) + '%';
        }
      }
      function render(v, isPreview) {
        v = clamp(parseFloat(v));
        $items.each(function (i) {
          paint($(this).find('.actrate'), Math.max(0, Math.min(1, v - i)));
        });
        if ($num.length) $num.text(fmt(v));
        if (!isPreview) syncInput(v);
        return v;
      }
      function getValue() {
        var v = parseFloat($el.attr('data-rate'));
        if (isNaN(v)) v = parseFloat($num.text());
        return clamp(v);
      }

      $el.data('proinitialrate-api', {
        render: render,
        getValue: getValue,
        setValue: function (v) {
          v = clamp(parseFloat(v));
          $el.attr('data-rate', v);
          var nv = render(v);
          current = nv; // 同步内部当前值，否则复位后 hover 的 mouseleave 会回弹到旧值
          if (typeof opts.onChange === 'function') opts.onChange(nv, $el);
          return nv;
        },
        setCount: function (n) {
          $el.find('.count').text(n);
        }
      });

      $el.toggleClass('is-rateonly', opts.readonly !== false);
      render(getValue());

      // ===== 只读分支（本场景不会走到）=====
      if (opts.readonly !== false) return;

      // ===== 可评分模式 =====
      var $list = $items.first().parent();
      var current = getValue();

      function posToValue(clientX) {
        if (!$list.length) return current;
        var rect = $list[0].getBoundingClientRect();
        if (rect.width <= 0) return current;
        // +0.5 抵消 MouseEvent 的整数像素量化
        return ((clientX + 0.5 - rect.left) / rect.width) * max;
      }
      // hover 预览：用星元素中心做接管边界，进入第 N 颗星立即高亮 N 颗
      function hoverValue(clientX) {
        if (!$list.length) return current;
        var items = $items.toArray();
        if (!items.length) return current;
        var centers = items.map(function (it) {
          var r = it.getBoundingClientRect();
          return r.left + r.width / 2;
        });
        var firstRect = items[0].getBoundingClientRect();
        if (clientX < firstRect.left) return clamp(1);
        var idx = centers.length;
        for (var i = 0; i < centers.length; i++) {
          if (clientX <= centers[i]) {
            idx = i;
            break;
          }
        }
        return clamp(idx + 1);
      }

      $list
        .on('mouseenter mousemove', function (e) {
          if (!opts.hoverPreview) return;
          render(hoverValue(e.clientX), true);
        })
        .on('mouseleave', function () {
          if (!opts.hoverPreview) return;
          render(current, true);
        })
        .on('click', function (e) {
          // step>=1（整星）时直接复用 hover 的星中心接管规则：
          //   原实现走「槽位比例 + 过半吸附」，而星图标(14px)比槽位(18px)窄，
          //   星中心恰好落在吸附临界点上，再加上 Chrome 把 clientX 量化到整数像素，
          //   点第 5 颗星正中心会算成 4.479 → 吸附到 4。改用与 hover 同一套映射后，
          //   所见即所得：hover 亮几颗，点击就是几颗。
          //   step<1（半星）仍走分数吸附，保留半星精度。
          var v = step >= 1 ? hoverValue(e.clientX) : snap(posToValue(e.clientX));
          if (v === current) return;
          current = v;
          $el.attr('data-rate', v);
          render(current);
          if (typeof opts.onChange === 'function') opts.onChange(current, $el);
        });
    });
  };
})(window.jQuery);

function AllinJs(){if(ifCustomize){if(ConfigJson.customize){$content=ConfigJson.customizecontent}else{$content=$lang.tdContent}}else{$content=$lang.tdContent}if($('.wmkcfeedback').length>0){$('.wmkcfeedback').each(function(){var i=$(this).attr('id').replace(/wmkcfeedback/g,'');if(ifCustomize&&ConfigJson.qycode){$qycode=`<div class="feed-verification"><input type="text"id="wmkcfb-verification${i}"class="wmkcfb-verification require"placeholder="${$lang.tdVerification}*"maxlength="5"><img class="verification-img"src="/o/VCI"alt="${$lang.tdVerification}"width="80"height="25"onclick="verificationShow(this)"title="${$lang.tdChange}"></div>`};if(ifCustomize&&ConfigJson.googlegta){$googlegta='onclick="'+ConfigJson.googlegta+'"'};if(ifCustomize&&ConfigJson.gtmcode){$gtmcode=' '+ConfigJson.gtmcode};if(ifCustomize){if(ConfigJson.customize){if(ConfigJson.components.name_show){$zdyname=`<input type="text"id="wmkcfb-name${i}"class="wmkcfb-name${$gtmcode}"placeholder="${$lang.tdName}">`;if(ConfigJson.components.name_required){$zdyname=`<input type="text"id="wmkcfb-name${i}"class="wmkcfb-name require${$gtmcode}"placeholder="${$lang.tdName}*">`}}}else{$zdyname=`<input type="text"id="wmkcfb-name${i}"class="wmkcfb-name${$gtmcode}"placeholder="${$lang.tdName}">`}}else{$zdyname=`<input type="text"id="wmkcfb-name${i}"class="wmkcfb-name${$gtmcode}"placeholder="${$lang.tdName}">`};if(ifCustomize&&ConfigJson.customize&&ConfigJson.components.emailconfirmation){$zdyemailcomfirm=`<input type="email"id="wmkcfb-emailcomfirm${i}"class="wmkcfb-emailcomfirm require${$gtmcode}"placeholder="${$lang.tdEmailConfirm}*">`};if(ifCustomize&&ConfigJson.customize&&ConfigJson.components.phone_show){$zdyphone=`<input type="text"id="wmkcfb-phone${i}"class="wmkcfb-phone${$gtmcode}"placeholder="${$lang.tdPhone}">`;if(ConfigJson.components.phone_required){$zdyphone=`<input type="text"id="wmkcfb-phone${i}"class="wmkcfb-phone require${$gtmcode}"placeholder="${$lang.tdPhone}*">`}};if(ifCustomize&&ConfigJson.customize&&ConfigJson.components.company_show){$zdycompany=`<input type="text"id="wmkcfb-company${i}"class="wmkcfb-company${$gtmcode}"placeholder="${$lang.tdCompanyName}">`;if(ConfigJson.components.company_required){$zdycompany=`<input type="text"id="wmkcfb-company${i}"class="wmkcfb-company require${$gtmcode}"placeholder="${$lang.tdCompanyName}*">`}};if(ifCustomize&&ConfigJson.customize&&ConfigJson.components.title_show){$zdytitle=`<input type="text"id="wmkcfb-title${i}"class="wmkcfb-title${$gtmcode}"placeholder="${$lang.tdTitle}">`;if(ConfigJson.components.title_required){$zdytitle=`<input type="text"id="wmkcfb-title${i}"class="wmkcfb-title require${$gtmcode}"placeholder="${$lang.tdTitle}*">`}};if(ifCustomize&&ConfigJson.customize&&ConfigJson.components.isuploadfile){$uploadfile=`<label for="wmkcfb-fileupload${i}"class="wmkcfb-fileupload"><span>${$lang.nouploadfile}</span><input type="file"id="wmkcfb-fileupload${i}"class="wmkcfb-fileuploadbtn"name="fileupload${i}"style="display:none"></label>`};if(ifCustomize&&ConfigJson.customize&&ConfigJson.components.verificationcode){$verificationcode=`<div class="feed-verification"><input type="text"id="wmkcfb-verification${i}"class="wmkcfb-verification require"placeholder="${$lang.tdVerification}*"maxlength="5"><img class="verification-img"src="/o/VCI"alt="${$lang.tdVerification}"width="80"height="25"onclick="verificationShow(this)"title="${$lang.tdChange}"></div>`;$qycode=''};if(ifCustomize){if(ConfigJson.quickreply){$quickreplay=`<div class="select-menu"><div class="select-menu-div"><input readonly class="select-menu-input"placeholder="${$lang.defaultprompt}"><em></em></div><ul id="wmkcfb-select${i}"class="select-menu-ul"></ul></div>`}};      // 产品详情页（存在 #productrate）才在询盘表单末尾注入评分
      var $ratebox = '';
      if ($('#productrate').length > 0) {
        var stars = '';
        for (var s = 1; s <= 5; s++) {
          stars += `<div class="rateitem" title="${s}.0"><span class="initialrate"></span><span class="actrate"></span></div>`;
        }
        $ratebox =
          `<div class="feedbackratebox" data-rate="5.0">` +
          `<div class="ratetit">Rating:</div>` +
          `<div class="feedbackrate">${stars}</div>` +
          `<span class="feedbackratenum">5.0</span>` +
          `<input type="hidden" id="feedbackRate${i}" name="rating" value="5.0">` +
          `</div>`;
      }

$(this).html(`<div class="send-inquiry"><form class="inquiry-form">${$zdyname}<input type="email"id="wmkcfb-email${i}"class="wmkcfb-email require${$gtmcode}"placeholder="${$lang.tdEmail}*">${$zdyemailcomfirm}${$zdyphone}${$zdycompany}${$zdytitle}${$quickreplay}${$uploadfile}<textarea id="wmkcfb-content${i}"class="wmkcfb-content require${$gtmcode}"cols="30"rows="10"placeholder="${$content}*"></textarea>${$qycode}${$verificationcode}${$ratebox}</form></div><button class="send-btn"${$googlegta}>${$lang.btnleavemessage}</button>`);
      // 评分箱初始化（只在详情页注入时执行）
      var $fbBox = $(this).find('.feedbackratebox');
      if ($fbBox.length) {
        $fbBox.attr('data-initrate', $fbBox.attr('data-rate') || '5.0');
        $fbBox.feedbackRateInit({
          decimals: 1,
          min: 1,
          readonly: false,
          step: 1,
          hoverPreview: true,
          name: 'rating'
        });
        // 取值入口（原 feedbackrate.js 暴露的全局方法，保留兼容）
        window.getFeedbackRate = function () {
          var $box = $('.feedbackratebox').first();
          var api = $box.data('proinitialrate-api');
          return api ? api.getValue() : null;
        };
      }

$('.require#wmkcfb-name'+i).on('blur',function(){validateName1('#wmkcfb-name'+i)});$('.require#wmkcfb-email'+i).on('blur',function(){validateEmail1('#wmkcfb-email'+i)});$('.require#wmkcfb-emailcomfirm'+i).on('blur',function(){validateEmailcomfirm1('#wmkcfb-emailcomfirm'+i)});$('.require#wmkcfb-phone'+i).on('blur',function(){validatePhone1('#wmkcfb-phone'+i)});$('.require#wmkcfb-company'+i).on('blur',function(){validateCompany1('#wmkcfb-company'+i)});$('.require#wmkcfb-title'+i).on('blur',function(){validateTitle1('#wmkcfb-title'+i)});$('.require#wmkcfb-content'+i).on('blur',function(){validateContent1('#wmkcfb-content'+i)});$('.require#wmkcfb-verification'+i).on('blur',function(){validateVrification1('#wmkcfb-verification'+i)})});const feedbackInputs=document.querySelectorAll('.wmkcfeedback input');feedbackInputs.forEach(input=>{input.addEventListener('input',function(){if(input.value.length>100){input.value=input.value.slice(0,100)}})});if(ifCustomize&&ConfigJson.quickreply){$.each(ConfigJson.customizereply,function(index,value){var listItem='<li>'+value+'</li>';$('.select-menu-ul').append(listItem)});$('.select-menu-ul li').each(function(){$(this).click(function(){$(this).parents('.wmkcfeedback').find('.wmkcfb-content').val($(this).html());$(this).parents('.select-menu').find('.select-menu-ul').slideToggle(200)})});selectul()}fileUpload();$('.wmkcfeedback .send-btn').click(function(){sendInquiry(this)})}}function selectul(){$('.select-menu-ul').hide();$('.select-menu-input').each(function(){$(this).click(function(){$(this).parents('.select-menu').find('.select-menu-ul').slideToggle(200)})})}function fileUpload(){const allowedExtensions=['txt','doc','docx','ppt','pptx','xlsx','xls','pdf','jpg','png','bmp','gif','jpeg','rar','zip','step','stp','dwg','dxf','stl','obj','3mf','x_t','igs','iges','sldprt','prt'];const maxFileSize=20*1024*1024;const maxFileNameLength=100;$('.wmkcfb-fileuploadbtn').change(function(event){const file=this.files[0];if(file){if(file.size>maxFileSize){toastr.warning("File size exceeds 20MB");return false}if(file.name.length>maxFileNameLength){toastr.warning("File name longer than 100 characters");return false}const fileExtension=file.name.split('.').pop().toLowerCase();if($.inArray(fileExtension,allowedExtensions)===-1){toastr.warning("Invalid file type");return false}$storageuploadedfiles=file;$(this).siblings('span').html(file.name);toastr.success("Upload Successful")}})}
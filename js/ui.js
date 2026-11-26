/* ============================ i18n (EN / HI) ============================ */
/* Lightweight two-language layer. Mark any element with data-i18n="key"
   (textContent), data-i18n-ph="key" (placeholder) or data-i18n-al="key"
   (aria-label); I18N.apply() fills them for the current language, and a
   MutationObserver auto-translates anything added later (dynamic cards, other
   pages). Product data from the sheet stays in its original language. */
window.I18N = (function () {
  var KEY = "mm_lang";
  var LANGS = { en: { name: "English", flag: "🇬🇧", code: "EN" }, hi: { name: "हिन्दी", flag: "🇮🇳", code: "HI" } };
  var DICT = {
    en: {
      "nav.home": "Home", "nav.flash": "Flash Sale", "nav.blogs": "Blogs", "nav.brands": "All Brands", "nav.cats": "All categories",
      "search.ph": "What are you looking for?", "lang.label": "Language", "a11y.account": "Account", "a11y.basket": "Basket", "a11y.menu": "Menu",
      "foot.information": "Information & Contact", "foot.track": "Track orders", "foot.returns": "Return or withdrawal", "foot.help": "Need help?", "foot.contact": "Contact us", "foot.seller": "Become a seller",
      "foot.report": "Report illicit content", "foot.joinus": "Join Us", "foot.affiliate": "Affiliate Program", "foot.coupons": "Terms and conditions of use of coupons",
      "foot.more": "Find Out More", "foot.advice": "Our advice", "foot.popcats": "The most popular product categories", "foot.compare": "Our comparisons", "foot.best": "Best sellers", "foot.brands": "Our brands",
      "foot.international": "International", "foot.app": "The application", "foot.secure": "Secure payment", "foot.conversation": "Join the conversation!",
      "drawer.browse": "Browse", "drawer.catalog": "Catalog", "drawer.account": "Account", "drawer.signin": "Sign in / Register", "drawer.today": "Today's deals",
      "drawer.dash": "Seller Dashboard", "drawer.myproducts": "My Products", "drawer.wallet": "My Wallet", "drawer.logout": "Log out",
      "bn.home": "Home", "bn.cats": "Categories", "bn.deals": "Deals", "bn.basket": "Basket", "bn.account": "Account",
      "home.today": "Today's Deals", "home.hot": "Hot", "home.seeall": "See all deals ›", "home.topsel": "Our top selection",
      "home.best": "Our best sellers", "home.seeall2": "See all", "home.shopcat": "Shop by category", "home.finds": "Today's best finds",
      "home.sponsored": "Sponsored", "home.brands": "Our biggest brands", "cta.add": "Add",
      "sd.dashboard": "Dashboard", "sd.products": "Products", "sd.storehouse": "Product Storehouse", "sd.orders": "Orders",
      "sd.package": "Package", "sd.spread": "Spread Packages", "sd.affiliate": "Affiliate System", "sd.withdraw": "Money Withdraw",
      "sd.conversations": "Conversations", "sd.support": "Support", "sd.chatsub": "Support team · usually replies within a few minutes", "sd.newchat": "New message from Support", "sd.shopsetting": "Shop Setting", "sd.refund": "Received Refund Request",
      "sd.commission": "Commission History", "sd.queries": "Product Queries", "sd.logout": "Log out", "sd.profile": "Show Profile", "sd.changepw": "Change Password", "sd.sellercenter": "Seller Center",
      "sd.credit": "Credit Score", "sd.seller": "Seller", "sd.guarantee": "Guarantee Money", "sd.welcome": "Welcome back",
      "sd.overview": "Here's what's happening with your shop today.", "sd.rating": "Rating", "sd.verified": "Shop verified",
      "sd.unverified": "Shop unverified", "sd.verifynow": "Verify Now", "sd.totalproducts": "Total Products", "sd.totalorder": "Total Orders",
      "sd.totalsales": "Total Sales", "sd.balance": "Wallet Balance", "sd.salesstat": "Sales Statistics", "sd.last7": "Last 7 days",
      "sd.catcount": "Category wise product count", "sd.orders.month": "Orders", "sd.thismonth": "This Month", "sd.neworder": "New Order",
      "sd.cancelled": "Cancelled", "sd.ondelivery": "On delivery", "sd.purchased": "Purchased Package", "sd.current": "Current Package",
      "sd.uploadlimit": "Products Upload Limit", "sd.times": "Times", "sd.expires": "Package Expires at", "sd.upgrade": "Upgrade Plan",
      "sd.noproducts": "No products yet.", "sd.soon": "is coming soon.", "sd.verifymsg": "Your shop is reviewed by our team — you'll be verified once your documents are approved.",
      "sd.editshop": "Edit Shop", "sd.shopname": "Shop name", "sd.contactname": "Contact name", "sd.phone": "Phone", "sd.email": "Email",
      "sd.shopimage": "Shop image", "sd.changephoto": "Change photo", "sd.save": "Save changes", "sd.saving": "Saving…", "sd.cancel": "Cancel",
      "sd.saved": "Profile updated.", "sd.relogin": "Your session has expired — please sign in again.", "sd.nonotif": "No new notifications.", "sd.optional": "optional",
      "sd.currentpw": "Current password", "sd.newpw": "New password", "sd.confirmpw": "Confirm new password", "sd.pwchanged": "Password changed.",
      "sd.pwmismatch": "The new passwords don't match.", "sd.pwshort": "New password must be at least 8 characters.", "sd.pwwrong": "Your current password is incorrect.",
      "sd.storehousesub": "Browse the full product catalog.", "sd.searchph": "Search by product name", "sd.allcats": "All categories",
      "sd.allstock": "All stock", "sd.instock": "In stock", "sd.outstock": "Out of stock", "sd.noresults": "No products found.", "sd.loading": "Loading…",
      "sd.products.n": "products", "sd.profit": "Profit",
      "sd.selected": "Selected", "sd.clear": "Clear", "sd.subtotal": "Subtotal", "sd.totalprofit": "Total profit", "sd.total": "Total",
      "sd.addall": "Add all to My Product", "sd.addmy": "Add to My Product", "sd.addmore": "Add products", "sd.add": "Add",
      "sd.added": "Added ✓", "sd.addedmsg": "Product has been updated successfully", "sd.myempty": "No products in your shop yet — add some from the Storehouse.",
      "sd.remove": "Remove", "sd.removed": "Removed from your products.", "sd.inmyshop": "In your shop",
      "sd.removetitle": "Remove product", "sd.removeconfirm": "Remove “{x}” from your shop? This can't be undone.",
      "sd.th.product": "Product", "sd.th.price": "Price", "sd.th.qty": "Qty", "sd.status": "Status",
      "sd.active": "Active", "sd.hidden": "Hidden", "sd.totalamount": "Total amount",
      "sd.pendingbal": "Pending Balance", "sd.walletmoney": "Wallet Money", "sd.sendwithdraw": "Send Withdraw Request",
      "sd.offlinerecharge": "Offline Recharge Wallet", "sd.guaranteerecharge": "Guarantee Recharge", "sd.txhistory": "Transaction history",
      "sd.amount": "Amount", "sd.photo": "Photo", "sd.confirm": "Confirm", "sd.copy": "Copy", "sd.copied": "Address copied",
      "sd.noorders": "No orders yet. Customer orders will appear here.", "sd.customer": "Customer", "sd.loading": "Loading…",
      "sd.st.received": "Received", "sd.st.processing": "Processing", "sd.st.shipped": "Shipped", "sd.st.delivered": "Delivered", "sd.st.cancelled": "Cancelled", "sd.viewshop": "View your shop", "sd.mywallet": "My Wallet", "sd.sellerdash": "Seller Dashboard", "sd.orderssub": "Orders from your customers.",
      "sd.uploadvoucher": "After payment, please upload the transaction voucher.", "sd.method": "Method", "sd.bank": "Bank", "sd.usdt": "USDT-TRC20",
      "sd.account": "Payout account details", "sd.accountph": "Bank account / USDT address", "sd.date": "Date", "sd.type": "Type",
      "sd.deposit": "Deposit", "sd.withdraw2": "Withdraw", "sd.guaranteet": "Guarantee", "sd.pending": "Pending", "sd.approved": "Approved", "sd.rejected": "Rejected",
      "sd.notx": "No transactions yet.", "sd.reqsent": "Request submitted for review.", "sd.view": "View", "sd.amountreq": "Enter a valid amount.",
      "sd.guarbystaff": "Guarantee money is managed by our team.", "sd.browse": "Browse", "sd.chooseimg": "Choose image",
      "sd.available": "Available to withdraw", "sd.nowithdraw": "Your wallet money must be above your guarantee money to withdraw.", "sd.maxwithdraw": "You can withdraw up to {x}.",
      "sd.addproduct": "Add New Product", "sd.paymentsetting": "Payment Settings", "sd.gotosetting": "Go to setting", "sd.configurenow": "Configure Now",
      "sd.cashpay": "Cash Payment", "sd.bankpay": "Bank Payment", "sd.bankname": "Bank Name", "sd.bankaccname": "Bank Account Name", "sd.bankaccno": "Bank Account Number", "sd.ifsc": "IFSC Code",
      "sd.usdtpay": "USDT Payment", "sd.usdtlink": "USDT Link", "sd.usdtaddr": "USDT Address", "sd.updateprofile": "Update Profile", "sd.savebtn": "Save", "sd.bankadded": "Bank Account added Successfully!", "sd.paymentdesc": "Set how buyers pay you — cash, bank or USDT.",
      "sd.wallet": "Wallet", "sd.more": "More",
      "sd.withdrawtitle": "Send A Withdraw Request", "sd.walletbalance": "Your wallet balance", "sd.guaranteebalance": "Your guarantee balance",
      "sd.operatype": "Opera Type", "sd.userbalance": "User Balance", "sd.withdrawtype": "Withdraw Type", "sd.message": "Message",
      "sd.messageph": "I want to withdraw my money", "sd.send": "Send", "sd.messagereq": "Please enter a message."
    },
    hi: {
      "nav.home": "होम", "nav.flash": "फ्लैश सेल", "nav.blogs": "ब्लॉग", "nav.brands": "सभी ब्रांड", "nav.cats": "सभी श्रेणियाँ",
      "search.ph": "आप क्या ढूँढ रहे हैं?", "lang.label": "भाषा", "a11y.account": "खाता", "a11y.basket": "बास्केट", "a11y.menu": "मेन्यू",
      "foot.information": "जानकारी और संपर्क", "foot.track": "ऑर्डर ट्रैक करें", "foot.returns": "रिटर्न या वापसी", "foot.help": "मदद चाहिए?", "foot.contact": "संपर्क करें", "foot.seller": "विक्रेता बनें",
      "foot.report": "अवैध सामग्री की रिपोर्ट करें", "foot.joinus": "हमसे जुड़ें", "foot.affiliate": "एफ़िलिएट प्रोग्राम", "foot.coupons": "कूपन उपयोग के नियम व शर्तें",
      "foot.more": "और जानें", "foot.advice": "हमारी सलाह", "foot.popcats": "सबसे लोकप्रिय श्रेणियाँ", "foot.compare": "हमारी तुलनाएँ", "foot.best": "बेस्ट सेलर", "foot.brands": "हमारे ब्रांड",
      "foot.international": "अंतरराष्ट्रीय", "foot.app": "एप्लिकेशन", "foot.secure": "सुरक्षित भुगतान", "foot.conversation": "बातचीत में शामिल हों!",
      "drawer.browse": "ब्राउज़ करें", "drawer.catalog": "कैटलॉग", "drawer.account": "खाता", "drawer.signin": "साइन इन / रजिस्टर", "drawer.today": "आज के ऑफ़र",
      "drawer.dash": "सेलर डैशबोर्ड", "drawer.myproducts": "मेरे प्रोडक्ट", "drawer.wallet": "मेरा वॉलेट", "drawer.logout": "लॉग आउट",
      "bn.home": "होम", "bn.cats": "श्रेणियाँ", "bn.deals": "ऑफ़र", "bn.basket": "बास्केट", "bn.account": "खाता",
      "home.today": "आज के ऑफ़र", "home.hot": "हॉट", "home.seeall": "सभी ऑफ़र देखें ›", "home.topsel": "हमारा शीर्ष चयन",
      "home.best": "हमारे बेस्ट सेलर", "home.seeall2": "सभी देखें", "home.shopcat": "श्रेणी अनुसार खरीदें", "home.finds": "आज की बेहतरीन खोज",
      "home.sponsored": "प्रायोजित", "home.brands": "हमारे सबसे बड़े ब्रांड", "cta.add": "जोड़ें",
      "sd.dashboard": "डैशबोर्ड", "sd.products": "प्रोडक्ट्स", "sd.storehouse": "प्रोडक्ट स्टोरहाउस", "sd.orders": "ऑर्डर",
      "sd.package": "पैकेज", "sd.spread": "स्प्रेड पैकेज", "sd.affiliate": "एफिलिएट सिस्टम", "sd.withdraw": "पैसे निकालें",
      "sd.conversations": "बातचीत", "sd.support": "सपोर्ट", "sd.chatsub": "सपोर्ट टीम · आमतौर पर कुछ ही मिनटों में जवाब देती है", "sd.newchat": "सपोर्ट से नया संदेश", "sd.shopsetting": "शॉप सेटिंग", "sd.refund": "रिफंड अनुरोध",
      "sd.commission": "कमीशन इतिहास", "sd.queries": "प्रोडक्ट प्रश्न", "sd.logout": "लॉग आउट", "sd.profile": "प्रोफ़ाइल देखें", "sd.changepw": "पासवर्ड बदलें", "sd.sellercenter": "सेलर सेंटर",
      "sd.credit": "क्रेडिट स्कोर", "sd.seller": "विक्रेता", "sd.guarantee": "गारंटी राशि", "sd.welcome": "वापसी पर स्वागत है",
      "sd.overview": "आज आपकी दुकान में क्या हो रहा है।", "sd.rating": "रेटिंग", "sd.verified": "शॉप सत्यापित",
      "sd.unverified": "शॉप असत्यापित", "sd.verifynow": "अभी सत्यापित करें", "sd.totalproducts": "कुल प्रोडक्ट", "sd.totalorder": "कुल ऑर्डर",
      "sd.totalsales": "कुल बिक्री", "sd.balance": "वॉलेट बैलेंस", "sd.salesstat": "बिक्री आँकड़े", "sd.last7": "पिछले 7 दिन",
      "sd.catcount": "श्रेणी अनुसार प्रोडक्ट गिनती", "sd.orders.month": "ऑर्डर", "sd.thismonth": "इस महीने", "sd.neworder": "नया ऑर्डर",
      "sd.cancelled": "रद्द", "sd.ondelivery": "डिलीवरी पर", "sd.purchased": "खरीदा गया पैकेज", "sd.current": "वर्तमान पैकेज",
      "sd.uploadlimit": "प्रोडक्ट अपलोड सीमा", "sd.times": "बार", "sd.expires": "पैकेज समाप्ति", "sd.upgrade": "प्लान अपग्रेड करें",
      "sd.noproducts": "अभी कोई प्रोडक्ट नहीं।", "sd.soon": "जल्द आ रहा है।", "sd.verifymsg": "आपकी दुकान की समीक्षा हमारी टीम कर रही है — दस्तावेज़ अनुमोदित होते ही आप सत्यापित हो जाएंगे।",
      "sd.editshop": "शॉप संपादित करें", "sd.shopname": "शॉप का नाम", "sd.contactname": "संपर्क नाम", "sd.phone": "फ़ोन", "sd.email": "ईमेल",
      "sd.shopimage": "शॉप इमेज", "sd.changephoto": "फ़ोटो बदलें", "sd.save": "बदलाव सहेजें", "sd.saving": "सहेजा जा रहा है…", "sd.cancel": "रद्द करें",
      "sd.saved": "प्रोफ़ाइल अपडेट हुई।", "sd.relogin": "आपका सत्र समाप्त हो गया — कृपया फिर से साइन इन करें।", "sd.nonotif": "कोई नई सूचना नहीं।", "sd.optional": "वैकल्पिक",
      "sd.currentpw": "वर्तमान पासवर्ड", "sd.newpw": "नया पासवर्ड", "sd.confirmpw": "नया पासवर्ड की पुष्टि करें", "sd.pwchanged": "पासवर्ड बदल गया।",
      "sd.pwmismatch": "नए पासवर्ड मेल नहीं खाते।", "sd.pwshort": "नया पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।", "sd.pwwrong": "आपका वर्तमान पासवर्ड गलत है।",
      "sd.storehousesub": "पूरा प्रोडक्ट कैटलॉग देखें।", "sd.searchph": "प्रोडक्ट नाम से खोजें", "sd.allcats": "सभी श्रेणियाँ",
      "sd.allstock": "सभी स्टॉक", "sd.instock": "स्टॉक में", "sd.outstock": "स्टॉक ख़त्म", "sd.noresults": "कोई प्रोडक्ट नहीं मिला।", "sd.loading": "लोड हो रहा है…",
      "sd.products.n": "प्रोडक्ट", "sd.profit": "मुनाफ़ा",
      "sd.selected": "चयनित", "sd.clear": "साफ़ करें", "sd.subtotal": "उप-योग", "sd.totalprofit": "कुल मुनाफ़ा", "sd.total": "कुल",
      "sd.addall": "सभी को मेरे प्रोडक्ट में जोड़ें", "sd.addmy": "मेरे प्रोडक्ट में जोड़ें", "sd.addmore": "प्रोडक्ट जोड़ें", "sd.add": "जोड़ें",
      "sd.added": "जोड़ा गया ✓", "sd.addedmsg": "प्रोडक्ट सफलतापूर्वक अपडेट हो गया", "sd.myempty": "अभी आपकी शॉप में कोई प्रोडक्ट नहीं — स्टोरहाउस से जोड़ें।",
      "sd.remove": "हटाएँ", "sd.removed": "आपके प्रोडक्ट से हटाया गया।", "sd.inmyshop": "आपकी शॉप में",
      "sd.removetitle": "प्रोडक्ट हटाएँ", "sd.removeconfirm": "“{x}” को आपकी शॉप से हटाएँ? इसे पूर्ववत नहीं किया जा सकता।",
      "sd.th.product": "प्रोडक्ट", "sd.th.price": "मूल्य", "sd.th.qty": "मात्रा", "sd.status": "स्थिति",
      "sd.active": "सक्रिय", "sd.hidden": "छिपा", "sd.totalamount": "कुल राशि",
      "sd.pendingbal": "लंबित राशि", "sd.walletmoney": "वॉलेट राशि", "sd.sendwithdraw": "निकासी अनुरोध भेजें",
      "sd.offlinerecharge": "ऑफ़लाइन वॉलेट रिचार्ज", "sd.guaranteerecharge": "गारंटी रिचार्ज", "sd.txhistory": "लेन-देन इतिहास",
      "sd.amount": "राशि", "sd.photo": "फ़ोटो", "sd.confirm": "पुष्टि करें", "sd.copy": "कॉपी", "sd.copied": "पता कॉपी हुआ",
      "sd.noorders": "अभी कोई ऑर्डर नहीं। ग्राहक ऑर्डर यहाँ दिखेंगे।", "sd.customer": "ग्राहक", "sd.loading": "लोड हो रहा है…",
      "sd.st.received": "प्राप्त", "sd.st.processing": "प्रोसेसिंग", "sd.st.shipped": "भेजा गया", "sd.st.delivered": "डिलीवर", "sd.st.cancelled": "रद्द", "sd.viewshop": "अपनी दुकान देखें", "sd.mywallet": "मेरा वॉलेट", "sd.sellerdash": "सेलर डैशबोर्ड", "sd.orderssub": "आपके ग्राहकों के ऑर्डर।",
      "sd.uploadvoucher": "भुगतान के बाद, कृपया लेन-देन रसीद अपलोड करें।", "sd.method": "माध्यम", "sd.bank": "बैंक", "sd.usdt": "USDT-TRC20",
      "sd.account": "भुगतान खाता विवरण", "sd.accountph": "बैंक खाता / USDT पता", "sd.date": "तारीख", "sd.type": "प्रकार",
      "sd.deposit": "जमा", "sd.withdraw2": "निकासी", "sd.guaranteet": "गारंटी", "sd.pending": "लंबित", "sd.approved": "स्वीकृत", "sd.rejected": "अस्वीकृत",
      "sd.notx": "अभी कोई लेन-देन नहीं।", "sd.reqsent": "अनुरोध समीक्षा हेतु भेजा गया।", "sd.view": "देखें", "sd.amountreq": "मान्य राशि दर्ज करें।",
      "sd.guarbystaff": "गारंटी राशि हमारी टीम द्वारा प्रबंधित की जाती है।", "sd.browse": "ब्राउज़ करें", "sd.chooseimg": "इमेज चुनें",
      "sd.available": "निकासी योग्य राशि", "sd.nowithdraw": "निकासी के लिए आपकी वॉलेट राशि गारंटी राशि से अधिक होनी चाहिए।", "sd.maxwithdraw": "आप अधिकतम {x} निकाल सकते हैं।",
      "sd.addproduct": "नया प्रोडक्ट जोड़ें", "sd.paymentsetting": "भुगतान सेटिंग", "sd.gotosetting": "सेटिंग पर जाएँ", "sd.configurenow": "अभी कॉन्फ़िगर करें",
      "sd.cashpay": "कैश भुगतान", "sd.bankpay": "बैंक भुगतान", "sd.bankname": "बैंक का नाम", "sd.bankaccname": "बैंक खाता नाम", "sd.bankaccno": "बैंक खाता संख्या", "sd.ifsc": "IFSC कोड",
      "sd.usdtpay": "USDT भुगतान", "sd.usdtlink": "USDT लिंक", "sd.usdtaddr": "USDT पता", "sd.updateprofile": "प्रोफ़ाइल अपडेट करें", "sd.savebtn": "सहेजें", "sd.bankadded": "बैंक खाता सफलतापूर्वक जोड़ा गया!", "sd.paymentdesc": "तय करें कि खरीदार आपको कैसे भुगतान करें — कैश, बैंक या USDT।",
      "sd.wallet": "वॉलेट", "sd.more": "और",
      "sd.withdrawtitle": "निकासी अनुरोध भेजें", "sd.walletbalance": "आपका वॉलेट बैलेंस", "sd.guaranteebalance": "आपका गारंटी बैलेंस",
      "sd.operatype": "ऑपरेशन प्रकार", "sd.userbalance": "यूज़र बैलेंस", "sd.withdrawtype": "निकासी प्रकार", "sd.message": "संदेश",
      "sd.messageph": "मैं अपना पैसा निकालना चाहता/चाहती हूँ", "sd.send": "भेजें", "sd.messagereq": "कृपया एक संदेश दर्ज करें।"
    }
  };
  var lang = read();
  function read() { try { var l = localStorage.getItem(KEY); return LANGS[l] ? l : "en"; } catch (e) { return "en"; } }
  function t(k) { var d = DICT[lang] || {}; return d[k] != null ? d[k] : (DICT.en[k] != null ? DICT.en[k] : k); }
  function one(el) {
    var k = el.getAttribute("data-i18n"); if (k != null) el.textContent = t(k);
    var p = el.getAttribute("data-i18n-ph"); if (p != null) el.setAttribute("placeholder", t(p));
    var a = el.getAttribute("data-i18n-al"); if (a != null) el.setAttribute("aria-label", t(a));
  }
  function apply(root) {
    root = root || document;
    if (root.nodeType === 1 && (root.hasAttribute("data-i18n") || root.hasAttribute("data-i18n-ph") || root.hasAttribute("data-i18n-al"))) one(root);
    if (root.querySelectorAll) root.querySelectorAll("[data-i18n],[data-i18n-ph],[data-i18n-al]").forEach(one);
  }
  function setLang(l) {
    if (!LANGS[l] || l === lang) return;
    lang = l; try { localStorage.setItem(KEY, l); } catch (e) {}
    document.documentElement.setAttribute("lang", l);
    apply(document);
    document.dispatchEvent(new CustomEvent("i18n:change", { detail: { lang: l } }));
  }
  document.documentElement.setAttribute("lang", lang);
  if ("MutationObserver" in window) {
    new MutationObserver(function (muts) {
      muts.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) apply(n); }); });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  return { t: t, apply: apply, setLang: setLang, get: function () { return lang; }, langs: LANGS };
})();

/* =============================== UI shell ================================ */
(function () {
  var C = window.CONFIG;
  var ic = {
    search:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>',
    user:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M5 21c0-4 3-6 7-6s7 2 7 6"/></svg>',
    cart:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h3l2.4 12.4a1 1 0 0 0 1 .8h8.2a1 1 0 0 0 1-.8L21 7H6"/></svg>',
    menu:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    home:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
    grid:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    tag:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l8-8 10 10-8 8z"/><circle cx="8.5" cy="8.5" r="1.4"/></svg>',
    close:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    chev:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    truck:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="13" height="10" rx="1"/><path d="M14 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="1.6"/><circle cx="18" cy="18" r="1.6"/></svg>',
    shield:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/></svg>',
    card:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
    star:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.2l5.9-.9z"/></svg>'
  };
  var LOGO = '<img class="logo" src="images/logo-192.png" alt="" width="36" height="36">';

  function esc(s){return String(s==null?"":s).replace(/[<&>"]/g,function(m){return{"<":"&lt;","&":"&amp;",">":"&gt;",'"':"&quot;"}[m];});}
  function brandMarkup(){ // bold the tail of the brand name in the accent colour
    var n = C.BRAND_NAME, cut = Math.min(Math.ceil(n.length/2), n.length-1);
    if (n.length < 2) return esc(n);
    return esc(n.slice(0,cut)) + "<b>" + esc(n.slice(cut)) + "</b>";
  }

  function navLink(key, label, href, on) {
    return '<a class="nav-link'+(on ? ' active' : '')+'" href="'+href+'" data-i18n="'+key+'"'+(on ? ' aria-current="page"' : '')+'>'+esc(label)+'</a>';
  }

  // Language dropdown (flags) — sits just before the account icon.
  function langSwitch() {
    return '<div class="lang-switch" id="langSwitch">'+
      '<button class="icon-btn lang-btn" id="langBtn" type="button" aria-haspopup="true" aria-expanded="false" data-i18n-al="lang.label">'+
        '<span class="lang-cur" id="langCur"></span>'+
      '</button>'+
      '<div class="lang-menu" id="langMenu" role="menu" hidden></div>'+
    '</div>';
  }

  function header(active) {
    return '' +
    '<header class="app">' +
      '<div class="app-top"><div class="app-bar">' +
        '<button class="icon-btn" id="menuBtn" data-i18n-al="a11y.menu" aria-label="Menu">'+ic.menu+'</button>'+
        '<a class="brand" href="index.html">'+LOGO+'<span>'+brandMarkup()+'</span></a>'+
        '<form class="search" id="searchForm" role="search">'+ic.search+
          '<input id="searchInput" type="search" placeholder="What are you looking for?" data-i18n-ph="search.ph" aria-label="Search products" autocomplete="off">'+
        '</form>'+
        langSwitch()+
        '<a class="icon-btn" href="'+(sellerSess() ? "seller-dashboard.html" : "login.html")+'" data-i18n-al="a11y.account" aria-label="Account">'+ic.user+'</a>'+
        '<a class="icon-btn" href="cart.html" data-i18n-al="a11y.basket" aria-label="Basket">'+ic.cart+'<span class="cart-count" data-cart-count hidden>0</span></a>'+
      '</div></div>'+
      '<div class="nav-row"><nav class="scroll-x nav-links" aria-label="Main menu">'+
        navLink("nav.home", "Home", "index.html", active === "home") +
        navLink("nav.flash", "Flash Sale", "deals.html", active === "deals") +
        navLink("nav.blogs", "Blogs", "blog.html", active === "blog") +
        navLink("nav.brands", "All Brands", "brands.html", active === "brands") +
        navLink("nav.cats", "All categories", "category.html", active === "cats") +
      '</nav></div>'+
    '</header>';
  }

  function bottomNav(active) {
    function a(key, href, i18n, label, icon) {
      return '<a href="'+href+'" class="'+(active===key?'active':'')+'">'+icon+
        '<span data-i18n="'+i18n+'">'+label+'</span></a>';
    }
    // The basket is a raised circular button in the centre (like big retail apps).
    var cart = '<a href="cart.html" class="bn-cart'+(active==="cart"?" active":"")+'" aria-label="Basket">'+
      '<span class="bn-cart-btn">'+ic.cart+'<span class="nc" data-cart-count hidden>0</span></span>'+
      '<span data-i18n="bn.basket">Basket</span></a>';
    return '<nav class="bottom-nav">'+
      a('home','index.html','bn.home','Home',ic.home)+
      a('cats','category.html','bn.cats','Categories',ic.grid)+
      cart+
      a('deals','deals.html','bn.deals','Deals',ic.tag)+
      a('account','login.html','bn.account','Account',ic.user)+
    '</nav>';
  }

  function footer() {
    function links(arr) { return arr.map(function (l) { return '<a href="'+l[2]+'" data-i18n="'+l[0]+'">'+l[1]+'</a>'; }).join(''); }
    var col1 = [['foot.track','Track orders','account.html'],['foot.returns','Return or withdrawal','#'],['foot.help','Need help?','#'],['foot.contact','Contact us','#'],['foot.report','Report illicit content','#'],['foot.seller','Become a seller','sell.html'],['foot.joinus','Join Us','#'],['foot.affiliate','Affiliate Program','#'],['foot.coupons','Terms and conditions of use of coupons','#']];
    var col2 = [['foot.advice','Our advice','blog.html'],['foot.popcats','The most popular product categories','category.html'],['foot.compare','Our comparisons','#'],['foot.brands','Our brands','brands.html'],['foot.best','Best sellers','deals.html']];

    // Country flags (International) — inline SVG circular flags render the same on
    // every OS (emoji flags don't on Windows/Chrome).
    function circleFlag(code, label) {
      var id = "flg_" + code, gid = "glo_" + code, s;
      if (code === "fr") s = '<rect width="13.33" height="40" fill="#0055A4"/><rect x="13.33" width="13.34" height="40" fill="#fff"/><rect x="26.67" width="13.33" height="40" fill="#EF4135"/>';
      else if (code === "it") s = '<rect width="13.33" height="40" fill="#008C45"/><rect x="13.33" width="13.34" height="40" fill="#F4F5F0"/><rect x="26.67" width="13.33" height="40" fill="#CD212A"/>';
      else if (code === "de") s = '<rect width="40" height="13.33" fill="#0A0A0A"/><rect y="13.33" width="40" height="13.34" fill="#DD0000"/><rect y="26.67" width="40" height="13.33" fill="#FFCE00"/>';
      else s = '<rect width="40" height="10" fill="#AD1519"/><rect y="10" width="40" height="20" fill="#FABD00"/><rect y="30" width="40" height="10" fill="#AD1519"/>';
      return '<svg viewBox="0 0 40 40" width="40" height="40" role="img" aria-label="'+label+'">'+
        '<defs><clipPath id="'+id+'"><circle cx="20" cy="20" r="20"/></clipPath>'+
          '<radialGradient id="'+gid+'" cx="34%" cy="28%" r="72%">'+
            '<stop offset="0%" stop-color="#fff" stop-opacity=".42"/><stop offset="42%" stop-color="#fff" stop-opacity="0"/>'+
            '<stop offset="100%" stop-color="#000" stop-opacity=".16"/></radialGradient></defs>'+
        '<g clip-path="url(#'+id+')">'+s+'<circle cx="20" cy="20" r="20" fill="url(#'+gid+')"/></g>'+
        '<circle cx="20" cy="20" r="19.5" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1"/></svg>';
    }
    var flags = [['fr','France'],['it','Italy'],['de','Germany'],['es','Spain']]
      .map(function (f) { return '<a href="#" class="ft-flag" aria-label="'+f[1]+'">'+circleFlag(f[0], f[1])+'</a>'; }).join('');

    // Secure-payment tiles — small brand marks on white.
    var appleBlack = '<svg viewBox="0 0 24 24" width="13" height="13" fill="#000" aria-hidden="true"><path d="M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.8 3-.8s1.8.8 3 .7c1.2 0 2-1.1 2.8-2.2.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.8zM14.3 5.6c.6-.8 1.1-1.9 1-3-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2-.5 2.7-1.3z"/></svg>';
    var pay = [
      '<span class="pay-tile"><span class="pl-visa">VISA</span></span>',
      '<span class="pay-tile"><span class="pl-mc"><i></i><i></i></span></span>',
      '<span class="pay-tile klarna"><span class="pl-klarna">Klarna</span></span>',
      '<span class="pay-tile"><span class="pl-pp">Pay<span>Pal</span></span></span>',
      '<span class="pay-tile"><span class="pl-apay">'+appleBlack+'Pay</span></span>',
      '<span class="pay-tile"><span class="pl-gpay"><b>G</b>Pay</span></span>'
    ].join('');

    // Social icons
    function soc(label, path) { return '<a href="#" class="ft-soc" aria-label="'+label+'"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">'+path+'</svg></a>'; }
    var social =
      soc('LinkedIn','<path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-1 1.82-2.05 3.75-2.05 4 0 4.4 2.63 4.4 6V21h-4v-5.3c0-1.26-.03-2.9-1.77-2.9-1.77 0-2.04 1.38-2.04 2.8V21h-4z"/>') +
      soc('Facebook','<path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.5-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0022 12z"/>') +
      soc('Instagram','<path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.37 1.06.42 2.23.06 1.25.07 1.65.07 4.85s0 3.6-.07 4.85c-.05 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.17-1.06.37-2.23.42-1.25.06-1.65.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.42a3.8 3.8 0 01-1.38-.9 3.8 3.8 0 01-.9-1.38c-.17-.42-.37-1.06-.42-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.37 2.23-.42C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.14 0-3.5 0-4.74.07-.9.04-1.38.2-1.7.32-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.12.32-.28.8-.32 1.7C3.42 8.95 3.4 9.3 3.4 12s0 3.05.07 4.26c.04.9.2 1.38.32 1.7.17.43.37.74.69 1.06.32.32.63.52 1.06.69.32.12.8.28 1.7.32 1.24.07 1.6.07 4.74.07s3.5 0 4.74-.07c.9-.04 1.38-.2 1.7-.32.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.12-.32.28-.8.32-1.7.07-1.21.07-1.56.07-4.26s0-3.05-.07-4.26c-.04-.9-.2-1.38-.32-1.7a2.85 2.85 0 00-.69-1.06 2.85 2.85 0 00-1.06-.69c-.32-.12-.8-.28-1.7-.32C15.5 4 15.14 4 12 4zm0 3.06A4.94 4.94 0 1112 17a4.94 4.94 0 010-9.88zm0 1.8a3.14 3.14 0 100 6.28 3.14 3.14 0 000-6.28zm5.14-.9a1.15 1.15 0 11-2.3 0 1.15 1.15 0 012.3 0z"/>') +
      soc('Pinterest','<path d="M12 2a10 10 0 00-3.6 19.3c-.08-.78-.15-1.98.03-2.83.16-.74 1.05-4.7 1.05-4.7s-.27-.54-.27-1.33c0-1.25.72-2.18 1.62-2.18.76 0 1.13.57 1.13 1.26 0 .77-.49 1.92-.74 2.98-.21.9.45 1.63 1.33 1.63 1.6 0 2.83-1.69 2.83-4.12 0-2.15-1.55-3.66-3.76-3.66-2.56 0-4.07 1.92-4.07 3.9 0 .77.3 1.6.67 2.05.07.09.08.17.06.26l-.25 1c-.04.17-.13.2-.3.12-1.12-.52-1.82-2.15-1.82-3.46 0-2.82 2.05-5.4 5.9-5.4 3.1 0 5.51 2.21 5.51 5.16 0 3.08-1.94 5.56-4.64 5.56-.9 0-1.76-.47-2.05-1.03l-.56 2.13c-.2.78-.75 1.76-1.11 2.36A10 10 0 1012 2z"/>');

    var html = '<footer class="app"><div class="cols">'+
      '<div><h4 data-i18n="foot.information">Information &amp; Contact</h4>'+links(col1)+'</div>'+
      '<div><h4 data-i18n="foot.more">Find Out More</h4>'+links(col2)+
        '<h4 style="margin-top:18px" data-i18n="foot.international">International</h4><div class="ft-flags">'+flags+'</div></div>'+
      '<div>'+
        '<h4><span data-i18n="foot.app">The application</span></h4>'+
        '<div class="ft-apps">'+
          '<a href="https://play.google.com/store" target="_blank" rel="noopener" class="ft-appimg" aria-label="Get it on Google Play"><img src="images/googleplay.png" alt="Get it on Google Play"></a>'+
          '<a href="https://www.apple.com/app-store/" target="_blank" rel="noopener" class="ft-appimg" aria-label="Download on the App Store"><img src="images/appstore.svg" alt="Download on the App Store"></a>'+
        '</div>'+
        '<h4 style="margin-top:20px" data-i18n="foot.secure">Secure payment</h4><div class="pay">'+pay+'</div>'+
        '<h4 style="margin-top:20px" data-i18n="foot.conversation">Join the conversation!</h4><div class="ft-socials">'+social+'</div>'+
      '</div>'+
    '</div>'+
    '</footer>'+
    // Awards strip (white band)
    '<div class="ft-awards"><div class="ft-awards-in">'+
      '<img src="images/award-1.png" alt="Retail Systems Awards 2022 — Winner">'+
      '<img src="images/award-2.png" alt="DIY Week Awards 2023">'+
      '<img src="images/award-3.png" alt="Online Retailer Awards 2022 — Winner">'+
      '<img src="images/award-4.png" alt="Retail Systems Awards 2021 — Winner">'+
    '</div></div>'+
    // Bottom legal bar
    '<div class="ft-legalbar">'+
      '<div class="ft-copy">© '+new Date().getFullYear()+' '+esc(C.BRAND_NAME)+'</div>'+
      '<nav class="ft-legal">'+
        ['Manage cookies','Sitemap','Legal Notice','Data Protection Policy','Trust Center','Terms and conditions','Consumer information']
          .map(function (t) { return '<a href="#">'+t+'</a>'; }).join('')+
      '</nav>'+
    '</div>';
    return html;
  }

  // The drawer renders immediately; its category list fills in when the catalog
  // arrives, so a slow or failed catalog load never delays the page.
  // Signed-in seller (shared with the dashboard via the "mm_seller" key).
  function sellerSess() { try { return JSON.parse(localStorage.getItem("mm_seller") || "null"); } catch (e) { return null; } }

  function drawer() {
    var s = sellerSess();
    var account = s
      ? '<a class="d-item" href="seller-dashboard.html"><span class="di">'+ic.user+'<span data-i18n="drawer.dash">Seller Dashboard</span></span>'+ic.chev+'</a>'+
        '<a class="d-item" href="seller-dashboard.html#products"><span class="di">'+ic.tag+'<span data-i18n="drawer.myproducts">My Products</span></span>'+ic.chev+'</a>'+
        '<a class="d-item" href="seller-dashboard.html#wallet"><span class="di">'+ic.tag+'<span data-i18n="drawer.wallet">My Wallet</span></span>'+ic.chev+'</a>'+
        '<a class="d-item" href="#" id="drawerLogout"><span class="di">'+ic.user+'<span data-i18n="drawer.logout">Log out</span></span>'+ic.chev+'</a>'
      : '<a class="d-item" href="login.html"><span class="di">'+ic.user+'<span data-i18n="drawer.signin">Sign in / Register</span></span>'+ic.chev+'</a>';
    return '<div class="drawer-back" id="drawerBack"></div>'+
      '<aside class="drawer" id="drawer">'+
        '<div class="d-head"><strong style="font-size:18px"><span data-i18n="drawer.browse">Browse</span> '+esc(C.BRAND_NAME)+'</strong>'+
          '<button class="icon-btn" id="drawerClose" style="color:var(--ink)">'+ic.close+'</button></div>'+
        '<h3 data-i18n="drawer.catalog">Catalog</h3><div id="drawerCats"></div>'+
        '<h3 data-i18n="drawer.account">Account</h3>'+
        account +
        '<a class="d-item" href="deals.html"><span class="di">'+ic.tag+'<span data-i18n="drawer.today">Today\'s deals</span></span>'+ic.chev+'</a>'+
      '</aside>';
  }

  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  function updateCartBadges() {
    var n = CART.count();
    document.querySelectorAll("[data-cart-count]").forEach(function (el) {
      el.textContent = n; el.hidden = n === 0;
    });
  }

  async function mount(opts) {
    opts = opts || {};
    document.getElementById("site-header").innerHTML = header(opts.active);
    document.getElementById("site-footer").innerHTML = footer();
    // Floating "back to top" — appears once the page is scrolled down.
    if (!document.getElementById("scrollTop")) {
      var st = document.createElement("button");
      st.id = "scrollTop"; st.className = "scroll-top"; st.type = "button"; st.setAttribute("aria-label", "Back to top");
      st.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
      document.body.appendChild(st);
      st.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
      var onScroll = function () { st.classList.toggle("show", (window.scrollY || document.documentElement.scrollTop) > 400); };
      window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    }
    document.body.insertAdjacentHTML("beforeend", bottomNav(opts.active));
    document.body.insertAdjacentHTML("beforeend", drawer());
    DATA.categories().then(function (cats) {
      document.getElementById("drawerCats").innerHTML = cats.map(function (c) {
        return '<a class="d-item" href="category.html?cat='+c.id+'"><span class="di">'+
          '<span style="width:34px;height:34px;border-radius:9px;display:inline-grid;place-items:center;background:'+c.color+'22;color:'+c.color+'">'+ic.tag+'</span>'+
          esc(c.name)+'</span>'+ic.chev+'</a>';
      }).join('');
    }).catch(function (e) { console.warn("Catalog unavailable:", e); });

    // search
    var form = document.getElementById("searchForm");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = document.getElementById("searchInput").value.trim();
      location.href = "category.html?q=" + encodeURIComponent(q);
    });

    // drawer open/close
    function openD(){document.getElementById("drawer").classList.add("open");document.getElementById("drawerBack").classList.add("open");}
    function closeD(){document.getElementById("drawer").classList.remove("open");document.getElementById("drawerBack").classList.remove("open");}
    ["menuBtn","menuBtn2"].forEach(function(id){var b=document.getElementById(id);if(b)b.addEventListener("click",openD);});
    document.getElementById("drawerClose").addEventListener("click",closeD);
    document.getElementById("drawerBack").addEventListener("click",closeD);
    var dLogout = document.getElementById("drawerLogout");
    if (dLogout) dLogout.addEventListener("click", function (e) { e.preventDefault(); try { localStorage.removeItem("mm_seller"); } catch (x) {} location.href = "index.html"; });

    languageSwitcher();
    updateCartBadges();
    document.addEventListener("cart:change", updateCartBadges);
    stickyHeader();
    passwordToggles();
    I18N.apply(document);   // immediate pass so there's no English flash in Hindi
  }

  // Wire the header language dropdown (flags). Selecting a language re-applies
  // translations in place — no reload — via I18N.
  function languageSwitcher() {
    var sw = document.getElementById("langSwitch"); if (!sw) return;
    var btn = document.getElementById("langBtn"), menu = document.getElementById("langMenu"), cur = document.getElementById("langCur");
    var langs = I18N.langs;
    menu.innerHTML = Object.keys(langs).map(function (l) {
      return '<button type="button" class="lang-opt" role="menuitem" data-lang="'+l+'">'+
        '<span class="lang-flag">'+langs[l].flag+'</span><span>'+esc(langs[l].name)+'</span></button>';
    }).join("");
    function paint() {
      var l = I18N.get();
      cur.innerHTML = '<span class="lang-flag">'+langs[l].flag+'</span><span class="lang-code">'+esc(langs[l].code)+'</span>';
      menu.querySelectorAll(".lang-opt").forEach(function (o) { o.classList.toggle("on", o.dataset.lang === l); });
    }
    function close() { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); }
    function open() { menu.hidden = false; btn.setAttribute("aria-expanded", "true"); }
    btn.addEventListener("click", function (e) { e.stopPropagation(); menu.hidden ? open() : close(); });
    menu.addEventListener("click", function (e) { var o = e.target.closest(".lang-opt"); if (!o) return; I18N.setLang(o.dataset.lang); close(); });
    document.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    document.addEventListener("i18n:change", paint);
    paint();
  }

  // Show/hide button on every password field on every page — including fields
  // added later (e.g. the Edit profile form), via a MutationObserver.
  var EYE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M3 3l18 18"/></svg>';

  function enhancePassword(input) {
    if (input.dataset.pwToggle) return;
    input.dataset.pwToggle = "1";
    var wrap = document.createElement("span"); wrap.className = "pw-wrap";
    input.parentNode.insertBefore(wrap, input); wrap.appendChild(input);
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "pw-toggle";
    btn.setAttribute("aria-label", "Show password"); btn.setAttribute("aria-pressed", "false");
    if (input.id) btn.setAttribute("aria-controls", input.id);
    btn.innerHTML = EYE;
    btn.addEventListener("mousedown", function (e) { e.preventDefault(); }); // keep focus in the field
    btn.addEventListener("click", function () {
      var show = input.type === "password";
      var start = input.selectionStart, end = input.selectionEnd;
      input.type = show ? "text" : "password";
      btn.innerHTML = show ? EYE_OFF : EYE;
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      btn.setAttribute("aria-pressed", String(show));
      if (document.activeElement === input && start != null) { try { input.setSelectionRange(start, end); } catch (e) {} }
    });
    wrap.appendChild(btn);
  }
  function passwordToggles() {
    var scan = function (root) {
      if (root.matches && root.matches('input[type="password"]')) enhancePassword(root);
      if (root.querySelectorAll) root.querySelectorAll('input[type="password"]').forEach(enhancePassword);
    };
    scan(document.body);
    if (!("MutationObserver" in window)) return;
    new MutationObserver(function (muts) {
      muts.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n); }); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  // Pinned header: the search bar always stays visible; the category row slides
  // away while scrolling down and returns on scroll up (like big retail sites).
  function stickyHeader() {
    var wrap = document.getElementById("site-header");
    var navRow = wrap && wrap.querySelector(".nav-row");
    if (!wrap || !navRow) return;
    var root = document.documentElement, lastY = window.scrollY, ticking = false;

    function setVisible() {
      var full = wrap.offsetHeight;
      var hidden = wrap.classList.contains("compact") ? navRow.offsetHeight : 0;
      root.style.setProperty("--header-visible", (full - hidden) + "px");
    }
    function update() {
      ticking = false;
      var y = Math.max(0, window.scrollY), dy = y - lastY;
      wrap.classList.toggle("scrolled", y > 4);
      if (Math.abs(dy) < 8) return;              // ignore tiny jitters
      var compact = dy > 0 && y > wrap.offsetHeight;
      if (compact !== wrap.classList.contains("compact")) {
        wrap.classList.toggle("compact", compact);
        setVisible();
      }
      lastY = y;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", setVisible);
    // Keep the full header visible while typing a search.
    var input = document.getElementById("searchInput");
    if (input) input.addEventListener("focus", function () { wrap.classList.remove("compact"); setVisible(); });
    setVisible(); update();
  }

  window.UI = { mount: mount, toast: toast, icons: ic, esc: esc, updateCartBadges: updateCartBadges };
})();
